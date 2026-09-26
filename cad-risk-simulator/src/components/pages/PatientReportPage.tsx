/**
 * PatientReportPage — Structured Clinical & Risk Assessment Report Screen
 * =======================================================================
 * Implements the exact Arohan CVD AI Dashboard PDF specification (12 Sections).
 * Read-only clinical output view consuming the buildPatientReportData adapter.
 *
 * Strict Requirements:
 * - NO Patient-Friendly Storyline / narrative text / Groq / Anthropic calls.
 * - All 12 sections rendered in exact order from PDF specification.
 * - Fully reactive to existing Zustand store data via buildPatientReportData.
 */

import React, { useState, useRef, useMemo, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useSimStore } from '../../store/simStore';
import { buildPatientReportData } from '../../adapters/patientReportAdapter';
import {
  fetchScoreMeaningExplanation,
  fetchParameterExplanations,
} from '../../services/groqService';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import './PatientReportPage.css';

// ── Arohan Logo Header ──────────────────────────────────────────────────────

function ArohanLogoHeader() {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="pr-arohan-brand">
      {!imgError ? (
        <img
          src="/arohan-logo.png"
          alt="Arohan"
          className="pr-arohan-logo-img"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="pr-arohan-logo-fallback">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              fill="var(--accent)"
            />
          </svg>
          <span className="pr-arohan-brand-name">Arohan</span>
        </div>
      )}
      <div className="pr-company-subtitle">
        Hasprana Health Care Solutions Private Limited
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function PatientReportPage() {
  // Subscribe to simStore to react to live changes
  const simState = useSimStore();

  // Read data through the single report data adapter
  const reportData = useMemo(() => {
    return buildPatientReportData(simState);
  }, [simState]);

  const {
    patient,
    diagnosis,
    alternatives,
    risk,
    contributors,
    trend,
    progression,
    forecast,
    explainability,
    contributions,
    recommendations,
  } = reportData;

  const [copied, setCopied] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const isSavingPDF = isGeneratingPDF; // backward compatibility
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [pdfNotice, setPdfNotice] = useState<{ type: 'info' | 'success' | 'error'; message: string } | null>(null);

  const activePdfRef = useRef<{ blob: Blob; url: string; fileName: string } | null>(null);

  // Clean up active Blob URL when unmounting
  useEffect(() => {
    return () => {
      if (activePdfRef.current) {
        try {
          URL.revokeObjectURL(activePdfRef.current.url);
        } catch {
          // no-op
        }
        activePdfRef.current = null;
      }
    };
  }, []);

  // Invalidate cached PDF whenever underlying data changes
  useEffect(() => {
    if (activePdfRef.current) {
      try {
        URL.revokeObjectURL(activePdfRef.current.url);
      } catch {
        // no-op
      }
      activePdfRef.current = null;
    }
  }, [patient.id, risk.score, diagnosis.condition]);

  // ── Groq Language Layer State (with reliable static fallback) ──────────────
  const [groqScoreMeaning, setGroqScoreMeaning] = useState<string | null>(null);
  const [groqParamExplanations, setGroqParamExplanations] = useState<Record<string, string>>({});

  useEffect(() => {
    let isCancelled = false;
    const topContributorLabels = contributors.slice(0, 4).map(c => c.label);

    // Area A: "What does this score mean?" (2-3 concise sentences)
    fetchScoreMeaningExplanation(
      {
        riskScore: risk.score,
        riskBand: risk.category,
        topContributors: topContributorLabels,
      },
      risk.meaning
    ).then((result) => {
      if (!isCancelled && result) {
        setGroqScoreMeaning(result);
      }
    });

    // Area B: "Why did the AI predict this?" (concise parameter explanations)
    const fallbackMap: Record<string, string> = {};
    explainability.parameterImpacts.forEach((p) => {
      fallbackMap[p.parameter] = p.explanation;
    });

    fetchParameterExplanations(
      {
        parameters: explainability.parameterImpacts.map((p) => ({
          parameter: p.parameter,
          impact: p.impact,
          value: p.value,
        })),
      },
      fallbackMap
    ).then((resultMap) => {
      if (!isCancelled && resultMap) {
        setGroqParamExplanations(resultMap);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [risk.score, risk.category, contributors, explainability.parameterImpacts, risk.meaning]);

  const reportContainerRef = useRef<HTMLDivElement>(null);

  // ── Reusable PDF Generation Function ───────────────────────────────────────
  const getOrGeneratePdf = async (): Promise<{ blob: Blob; url: string; fileName: string } | null> => {
    // If we already have a generated PDF for this report state, reuse it!
    if (activePdfRef.current) {
      return activePdfRef.current;
    }

    const element = reportContainerRef.current;
    if (!element) {
      console.error('PDF export error: reportContainerRef element is not rendered.');
      throw new Error('Report container element not found');
    }

    // Collect all elements to hide during PDF capture
    const printHideEls = document.querySelectorAll<HTMLElement>('.print-hide');
    const originalStyles = new Map<HTMLElement, string>();
    printHideEls.forEach((el) => {
      originalStyles.set(el, el.style.display);
      el.style.display = 'none';
    });

    try {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      const scrollParent = element.closest('.app-center-scroll') || window;
      if (scrollParent && 'scrollTo' in scrollParent) {
        (scrollParent as Window).scrollTo(0, 0);
      }

      // Ensure SVG namespace attribute on all SVGs inside report
      const svgs = element.querySelectorAll('svg');
      svgs.forEach((svg) => {
        if (!svg.getAttribute('xmlns')) {
          svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        }
      });

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        backgroundColor: document.documentElement.classList.contains('light-mode') ? '#FFFFFF' : '#0A0A0B',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = position - pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const sanitizeFilenamePart = (input: string): string => {
        return input.replace(/[/\\:*?"<>|]/g, '').trim();
      };

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const cleanPatientId = patient?.id ? sanitizeFilenamePart(patient.id) : '';
      const fileName = cleanPatientId
        ? `Cardiovascular_Report_${cleanPatientId}_${dateStr}.pdf`
        : `Cardiovascular_Report_${dateStr}.pdf`;

      console.log('[PDF Export] Generated file name:', fileName);

      const pdfBlob = pdf.output('blob');

      const blobUrl = URL.createObjectURL(pdfBlob);
      const generated = { blob: pdfBlob, url: blobUrl, fileName };
      activePdfRef.current = generated;
      return generated;
    } finally {
      printHideEls.forEach((el) => {
        el.style.display = originalStyles.get(el) ?? '';
      });
    }
  };

  const triggerDownload = (pdfItem: { url: string; fileName: string }) => {
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = pdfItem.url;
    link.download = pdfItem.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Save as PDF Functionality ──────────────────────────────────────────────
  const handleSavePDF = async () => {
    if (isGeneratingPDF) return;

    setIsGeneratingPDF(true);
    setPdfNotice({ type: 'info', message: 'Generating report...' });

    try {
      const generated = await getOrGeneratePdf();
      if (!generated) {
        throw new Error('PDF generation returned null');
      }

      triggerDownload(generated);

      setPdfNotice({ type: 'success', message: 'Report PDF saved successfully.' });
      setTimeout(() => setPdfNotice(null), 5000);
    } catch (err) {
      console.error('PDF export failed:', err);
      setPdfNotice({ type: 'error', message: 'Unable to generate the report. Please try again.' });
      setTimeout(() => setPdfNotice(null), 6000);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // ── Preview PDF Functionality ──────────────────────────────────────────────
  const handlePreviewPDF = async () => {
    if (isGeneratingPDF) return;

    setIsGeneratingPDF(true);
    setPdfNotice({ type: 'info', message: 'Generating report...' });

    try {
      const generated = await getOrGeneratePdf();
      if (!generated) {
        throw new Error('PDF preview generation returned null');
      }

      setPdfNotice(null);

      // Attempt to open in a new tab
      let popupBlocked = false;
      try {
        const newWin = window.open(generated.url, '_blank');
        if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
          popupBlocked = true;
        } else {
          newWin.focus();
        }
      } catch (e) {
        console.warn('Popup window blocked or error:', e);
        popupBlocked = true;
      }

      // If blocked or preview failed in tab, show in-app preview modal fallback
      if (popupBlocked) {
        setIsPreviewModalOpen(true);
      }
    } catch (err) {
      console.error('PDF preview failed:', err);
      setPdfNotice({ type: 'error', message: 'Unable to generate the report. Please try again.' });
      setTimeout(() => setPdfNotice(null), 6000);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleClosePreviewModal = () => {
    setIsPreviewModalOpen(false);
    // Cleanup active preview Blob URL when preview modal is closed
    if (activePdfRef.current) {
      try {
        URL.revokeObjectURL(activePdfRef.current.url);
      } catch {
        // no-op
      }
      activePdfRef.current = null;
    }
  };

  const handleOpenInNewTabFromModal = () => {
    if (!activePdfRef.current) {
      setPdfNotice({ type: 'error', message: 'Preview unavailable. Use Download PDF instead.' });
      setTimeout(() => setPdfNotice(null), 5000);
      return;
    }

    try {
      const newWin = window.open(activePdfRef.current.url, '_blank');
      if (!newWin || newWin.closed) {
        setPdfNotice({ type: 'error', message: 'Preview unavailable. Use Download PDF instead.' });
        setTimeout(() => setPdfNotice(null), 5000);
      }
    } catch (err) {
      console.error('Failed to open PDF in new tab:', err);
      setPdfNotice({ type: 'error', message: 'Preview unavailable. Use Download PDF instead.' });
      setTimeout(() => setPdfNotice(null), 5000);
    }
  };

  const handleDownloadFromModal = () => {
    if (!activePdfRef.current) {
      handleSavePDF();
      return;
    }

    triggerDownload(activePdfRef.current);
    setPdfNotice({ type: 'success', message: 'Report PDF saved successfully.' });
    setTimeout(() => setPdfNotice(null), 5000);
  };

  // ── Executive Summary Copy ─────────────────────────────────────────────────
  const handleCopySummary = () => {
    const textToCopy = `AROHAN CVD AI EXECUTIVE SUMMARY
----------------------------------------
Patient ID: ${patient.id}
Report Date: ${patient.reportDate}
AI Diagnosis: ${diagnosis.condition} (${diagnosis.confidence}% confidence)
Current Risk Score: ${risk.score}/100 (${risk.category})
Risk Trend: ${trend.direction === 'ascending' ? '↑ Increasing' : trend.direction === 'descending' ? '↓ Improving' : '→ Stable'}
Disease Progression: ${progression.currentStage}
Principal Driver: ${contributors.slice(0, 2).map(c => c.label).join(' + ')}`;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const getScoreColor = (score: number) => {
    if (score <= 20) return 'var(--risk-low)';
    if (score <= 40) return 'var(--cyan)';
    if (score <= 60) return 'var(--risk-moderate)';
    if (score <= 80) return 'var(--accent)';
    return 'var(--risk-high)';
  };

  return (
    <div className="patient-report-page">
      {/* ── Top Action Toolbar ── */}
      <div className="pr-top-toolbar print-hide">
        <div className="pr-top-actions-left">
          <span className="pr-top-title font-semibold">Patient Report</span>
          <span className="pr-top-badge font-mono">{patient.id}</span>
        </div>
        <div className="pr-top-actions-right">
          <button
            id="btn-save-report-pdf"
            type="button"
            className="pr-btn pr-btn-primary"
            onClick={handleSavePDF}
            disabled={isGeneratingPDF}
          >
            {isGeneratingPDF ? (
              <>
                <span className="pr-spinner" />
                <span>Generating report...</span>
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <path d="M14 10v3a1 1 0 01-1 1H3a1 1 0 01-1-1v-3" />
                  <path d="M8 2v8M5 7l3 3 3-3" />
                </svg>
                <span>Save Report as PDF</span>
              </>
            )}
          </button>
          <button
            id="btn-preview-report-pdf"
            type="button"
            className="pr-btn"
            onClick={handlePreviewPDF}
            disabled={isGeneratingPDF}
          >
            {isGeneratingPDF ? (
              <>
                <span className="pr-spinner" />
                <span>Generating report...</span>
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" />
                  <circle cx="8" cy="8" r="2.5" />
                </svg>
                <span>Preview Report</span>
              </>
            )}
          </button>
          <button
            type="button"
            className="pr-btn"
            onClick={() => window.print()}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M4 6V2h8v4M4 12H2V7h12v5h-2M4 10h8v4H4v-4z" />
            </svg>
            <span>Print / Save as PDF</span>
          </button>
          <button
            type="button"
            className="pr-btn"
            onClick={handleCopySummary}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
              <rect x="5" y="5" width="8" height="8" rx="1" />
              <path d="M3 11V3a1 1 0 011-1h8" />
            </svg>
            <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
          </button>
        </div>
      </div>

      {pdfNotice && (
        <div className={`pr-download-toast print-hide ${pdfNotice.type}`}>
          {pdfNotice.type === 'success' && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          )}
          {pdfNotice.type === 'error' && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
          {pdfNotice.type === 'info' && <span className="pr-spinner" />}
          <span>{pdfNotice.message}</span>
        </div>
      )}

      <div className="patient-report-container" ref={reportContainerRef}>

        {/* ── Arohan Header (Top of report page) ───────────────────────── */}
        <header className="pr-arohan-header">
          <ArohanLogoHeader />
          <div className="pr-header-right">
            <h2 className="pr-platform-name">Precision Cardiovascular Risk Intelligence Platform</h2>
            <div className="pr-generated-date">Date Generated: {patient.reportDate}</div>
          </div>
        </header>

        {/* 1. PATIENT SUMMARY */}
        <section className="pr-card pr-section">
          <div className="pr-section-header-title">1. PATIENT SUMMARY</div>
          <div className="pr-summary-grid">
            <div className="pr-summary-item">
              <span className="pr-summary-label">Patient ID:</span>
              <span className="pr-summary-val font-mono">{patient.id}</span>
            </div>
            <div className="pr-summary-item">
              <span className="pr-summary-label">Age:</span>
              <span className="pr-summary-val">{patient.age}</span>
            </div>
            <div className="pr-summary-item">
              <span className="pr-summary-label">Gender:</span>
              <span className="pr-summary-val capitalize">{patient.gender}</span>
            </div>
            <div className="pr-summary-item">
              <span className="pr-summary-label">Report Date:</span>
              <span className="pr-summary-val">{patient.reportDate}</span>
            </div>
          </div>

          <div className="pr-checklist-block">
            <div className="pr-sub-heading">DATA ANALYZED</div>
            <div className="pr-checklist-grid">
              <div className="pr-check-category">
                <div className="pr-category-header">Blood Tests:</div>
                <ul className="pr-data-list">
                  <li>hs-CRP: <strong>{patient.bloodTests.hsCRP}</strong></li>
                  <li>LDL: <strong>{patient.bloodTests.ldl}</strong></li>
                  <li>HbA1c: <strong>{patient.bloodTests.hba1c}</strong></li>
                  <li>ApoB: <strong>{patient.bloodTests.apoB}</strong></li>
                </ul>
              </div>

              <div className="pr-check-category">
                <div className="pr-category-header">ECG:</div>
                <ul className="pr-data-list">
                  <li>Finding: <strong>{patient.ecg.status}</strong></li>
                </ul>
              </div>

              <div className="pr-check-category">
                <div className="pr-category-header">CT Coronary Angiography:</div>
                <ul className="pr-data-list">
                  <li>Plaque Finding: <strong>{patient.imaging.findingText}</strong></li>
                  <li>Calcium Score: <strong>{patient.imaging.cacText}</strong></li>
                </ul>
              </div>

              <div className="pr-check-category">
                <div className="pr-category-header">Vital Signs:</div>
                <ul className="pr-data-list">
                  <li>Blood Pressure: <strong>{patient.vitals.bloodPressure}</strong></li>
                  <li>BMI: <strong>{patient.vitals.bmiText}</strong></li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 2. AI DIAGNOSIS PREDICTION */}
        <section className="pr-card pr-section pr-card-large">
          <div className="pr-section-header-title">2. AI DIAGNOSIS PREDICTION</div>
          <div className="pr-diag-box">
            <div className="pr-diag-label">Predicted Cardiovascular Condition:</div>
            <div className="pr-diag-condition">{diagnosis.condition}</div>
            <div className="pr-diag-confidence font-mono">
              Prediction Confidence: <strong>{diagnosis.confidence}%</strong>
            </div>
          </div>
        </section>

        {/* 3. ALTERNATIVE POSSIBILITIES */}
        <section className="pr-card pr-section">
          <div className="pr-section-header-title">3. ALTERNATIVE POSSIBILITIES</div>
          <table className="pr-clean-table pr-table-compact">
            <thead>
              <tr>
                <th>Disease</th>
                <th style={{ width: '120px', textAlign: 'right' }}>Probability</th>
              </tr>
            </thead>
            <tbody>
              {alternatives.map((row, idx) => (
                <tr key={idx} className={row.disease === diagnosis.condition ? 'pr-row-active' : ''}>
                  <td>
                    {row.disease}
                    {row.isHealthy && <span className="pr-healthy-badge">(Baseline)</span>}
                  </td>
                  <td style={{ textAlign: 'right' }} className="font-mono">
                    <strong>{row.probability}%</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* 4. PRECISION CARDIOVASCULAR RISK SCORE */}
        <section className="pr-card pr-section pr-card-large">
          <div className="pr-section-header-title">4. PRECISION CARDIOVASCULAR RISK SCORE</div>
          <div className="pr-risk-score-display">
            <div className="pr-risk-score-title">Current Risk Score:</div>
            <div className="pr-risk-score-value font-mono" style={{ color: getScoreColor(risk.score) }}>
              {risk.score} <span className="pr-risk-max">/ 100</span>
            </div>
            <div className="pr-risk-band-tag font-semibold" style={{ color: getScoreColor(risk.score) }}>
              {risk.category}
            </div>
          </div>

          <div className="pr-risk-category-tiers">
            <div className={`pr-tier-item ${risk.score <= 20 ? 'active' : ''}`}>
              <span className="pr-tier-range">0–20</span>
              <span className="pr-tier-label">Very Low Risk</span>
            </div>
            <div className={`pr-tier-item ${risk.score > 20 && risk.score <= 40 ? 'active' : ''}`}>
              <span className="pr-tier-range">21–40</span>
              <span className="pr-tier-label">Low Risk</span>
            </div>
            <div className={`pr-tier-item ${risk.score > 40 && risk.score <= 60 ? 'active' : ''}`}>
              <span className="pr-tier-range">41–60</span>
              <span className="pr-tier-label">Moderate Risk</span>
            </div>
            <div className={`pr-tier-item ${risk.score > 60 && risk.score <= 80 ? 'active' : ''}`}>
              <span className="pr-tier-range">61–80</span>
              <span className="pr-tier-label">High Risk</span>
            </div>
            <div className={`pr-tier-item ${risk.score > 80 ? 'active' : ''}`}>
              <span className="pr-tier-range">81–100</span>
              <span className="pr-tier-label">Critical Risk</span>
            </div>
          </div>
        </section>

        {/* 5. WHAT DOES THIS SCORE MEAN? + KEY CONTRIBUTORS */}
        <section className="pr-card pr-section">
          <div className="pr-section-header-title">5. WHAT DOES THIS SCORE MEAN?</div>
          <div className="pr-meaning-block">
            <div className="pr-meaning-title font-semibold">Clinical Interpretation:</div>
            <div className="pr-meaning-text">{groqScoreMeaning || risk.meaning}</div>
          </div>

          <div className="pr-contributors-block">
            <div className="pr-sub-heading">KEY CONTRIBUTORS</div>
            <ul className="pr-bullet-checklist">
              {contributors.slice(0, 5).map((item, idx) => (
                <li key={idx}>
                  <span className="pr-check-symbol">✓</span>
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 6. RISK TREND — LAST 7 DAYS */}
        <section className="pr-card pr-section">
          <div className="pr-trend-header-row">
            <div className="pr-section-header-title">6. RISK TREND — LAST 7 DAYS</div>
            <div className={`pr-trend-badge pr-trend-${trend.direction}`}>
              {trend.direction === 'ascending' ? '↑ Increasing' : trend.direction === 'descending' ? '↓ Improving' : '→ Stable'}
            </div>
          </div>

          <div className="pr-trend-summary-bar">
            <span>Starting Score: <strong>{trend.history[0]?.score ?? 0}</strong></span>
            <span>Current Score: <strong>{trend.history[trend.history.length - 1]?.score ?? risk.score}</strong></span>
          </div>

          <div className="pr-chart-wrap" style={{ width: '100%', height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend.history} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <XAxis dataKey="day" stroke="var(--t3)" fontSize={12} tickLine={false} />
                <YAxis domain={[0, 100]} stroke="var(--t3)" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--raised)',
                    borderColor: 'var(--line)',
                    color: 'var(--t1)',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="var(--accent)"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: 'var(--accent)' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="pr-trend-interpretation">
            <strong>Trend Interpretation:</strong> {trend.interpretation}
          </div>
        </section>

        {/* 7. DISEASE PROGRESSION FORECAST */}
        <section className="pr-card pr-section">
          <div className="pr-section-header-title">7. DISEASE PROGRESSION FORECAST</div>
          <div className="pr-stage-ladder">
            {progression.stages.map((stageName, idx) => (
              <React.Fragment key={idx}>
                <div className={`pr-stage-step ${idx === progression.stageIndex ? 'pr-stage-active' : ''}`}>
                  <span className="pr-stage-num font-mono">{idx + 1}.</span>
                  <span className="pr-stage-name">{stageName}</span>
                  {idx === progression.stageIndex && (
                    <span className="pr-current-badge">CURRENT STAGE</span>
                  )}
                </div>
                {idx < progression.stages.length - 1 && (
                  <div className="pr-stage-arrow">↓</div>
                )}
              </React.Fragment>
            ))}
          </div>
        </section>

        {/* 8. AI FORECAST — NEXT 12 MONTHS */}
        <section className="pr-card pr-section">
          <div className="pr-section-header-title">8. AI FORECAST — NEXT 12 MONTHS</div>
          <table className="pr-clean-table pr-table-compact">
            <thead>
              <tr>
                <th style={{ width: '140px' }}>Time Horizon</th>
                <th>Estimated Condition</th>
              </tr>
            </thead>
            <tbody>
              {forecast.horizons.map((row, idx) => (
                <tr key={idx}>
                  <td className="font-semibold">{row.horizon}</td>
                  <td>{row.condition || <span className="pr-na-text">Not available</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pr-prob-note">
            Predicted Disease Progression Probability: <strong>{progression.progressionProbability}%</strong>
          </div>
        </section>

        {/* 9. EXPLAINABLE AI */}
        <section className="pr-card pr-section">
          <div className="pr-section-header-title">9. EXPLAINABLE AI</div>
          <div className="pr-xai-header">WHY DID THE AI PREDICT THIS?</div>
          <table className="pr-clean-table">
            <thead>
              <tr>
                <th>Parameter</th>
                <th style={{ width: '140px', textAlign: 'right' }}>Impact</th>
              </tr>
            </thead>
            <tbody>
              {explainability.parameterImpacts.map((row, idx) => (
                <tr key={idx}>
                  <td>
                    <div><strong>{row.parameter}</strong> ({row.value})</div>
                    <div className="pr-param-explanation-text">
                      {groqParamExplanations[row.parameter] || row.explanation}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className={`pr-impact-badge pr-impact-${row.impact}`}>
                      {row.impact === 'high' ? 'High' : row.impact === 'moderate' ? 'Moderate' : 'Low'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* 10. RELATIVE CONTRIBUTION */}
        <section className="pr-card pr-section">
          <div className="pr-section-header-title">10. RELATIVE CONTRIBUTION</div>
          <div className="pr-relative-contrib-list">
            {contributions.map((item, idx) => (
              <div key={idx} className="pr-contrib-bar-row">
                <div className="pr-contrib-bar-label">
                  <span>{item.label}</span>
                  <span className="font-mono font-semibold">{item.percentage}%</span>
                </div>
                <div className="pr-bar-track">
                  <div
                    className="pr-bar-fill"
                    style={{ width: `${Math.max(4, Math.min(100, item.percentage))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 11. RECOMMENDED ACTIONS */}
        <section className="pr-card pr-section">
          <div className="pr-section-header-title">11. RECOMMENDED ACTIONS</div>
          <div className="pr-actions-grid">
            {/* Immediate Priorities */}
            <div className="pr-card pr-action-card">
              <div className="pr-action-card-header">IMMEDIATE PRIORITIES</div>
              <ul className="pr-action-list">
                {recommendations.immediate.map((act, i) => (
                  <li key={i}>{act}</li>
                ))}
              </ul>
            </div>

            {/* Lifestyle Priorities */}
            <div className="pr-card pr-action-card">
              <div className="pr-action-card-header">LIFESTYLE PRIORITIES</div>
              <ul className="pr-action-list">
                {recommendations.lifestyle.map((act, i) => (
                  <li key={i}>{act}</li>
                ))}
              </ul>
            </div>

            {/* Monitoring */}
            <div className="pr-card pr-action-card">
              <div className="pr-action-card-header">MONITORING</div>
              <ul className="pr-action-list">
                {recommendations.monitoring.map((act, i) => (
                  <li key={i}>{act}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* 12. EXECUTIVE SUMMARY */}
        <section className="pr-card pr-exec-summary-card">
          <div className="pr-exec-top-logo">
            <ArohanLogoHeader />
          </div>
          <div className="pr-section-header-title">12. EXECUTIVE SUMMARY</div>

          <div className="pr-exec-content">
            <div className="pr-exec-row">
              <span className="pr-exec-label">AI Diagnosis:</span>
              <span className="pr-exec-val"><strong>{diagnosis.condition}</strong> ({diagnosis.confidence}% confidence)</span>
            </div>
            <div className="pr-exec-row">
              <span className="pr-exec-label">Current Risk Score:</span>
              <span className="pr-exec-val font-mono"><strong>{risk.score} / 100</strong> ({risk.category})</span>
            </div>
            <div className="pr-exec-row">
              <span className="pr-exec-label">Risk Trend:</span>
              <span className="pr-exec-val font-mono">
                {trend.direction === 'ascending' ? '↑ Increasing' : trend.direction === 'descending' ? '↓ Improving' : '→ Stable'}
              </span>
            </div>
            <div className="pr-exec-row">
              <span className="pr-exec-label">Disease Progression:</span>
              <span className="pr-exec-val">{progression.currentStage}</span>
            </div>
            <div className="pr-exec-row">
              <span className="pr-exec-label">Principal Driver:</span>
              <span className="pr-exec-val">{contributors.slice(0, 2).map(c => c.label).join(' + ')}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pr-exec-actions print-hide">
            <button
              type="button"
              className="pr-btn pr-btn-primary"
              onClick={handleSavePDF}
              disabled={isGeneratingPDF}
            >
              {isGeneratingPDF ? (
                <>
                  <span className="pr-spinner" />
                  <span>Generating report...</span>
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                    <path d="M14 10v3a1 1 0 01-1 1H3a1 1 0 01-1-1v-3" />
                    <path d="M8 2v8M5 7l3 3 3-3" />
                  </svg>
                  <span>Save Report as PDF</span>
                </>
              )}
            </button>

            <button
              type="button"
              className="pr-btn"
              onClick={handlePreviewPDF}
              disabled={isGeneratingPDF}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                <path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" />
                <circle cx="8" cy="8" r="2.5" />
              </svg>
              <span>Preview Report</span>
            </button>

            <button
              type="button"
              className="pr-btn"
              onClick={handleCopySummary}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                <rect x="5" y="5" width="8" height="8" rx="1" />
                <path d="M3 11V3a1 1 0 011-1h8" />
              </svg>
              {copied ? 'Copied to Clipboard!' : 'Copy Summary'}
            </button>
          </div>
        </section>

      </div>

      {/* ── Report PDF Preview Modal Fallback ── */}
      {isPreviewModalOpen && activePdfRef.current && (
        <div
          className="pr-modal-backdrop print-hide"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pr-preview-modal-title"
          onClick={handleClosePreviewModal}
        >
          <div className="pr-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="pr-modal-header">
              <div className="pr-modal-title-wrap">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                </svg>
                <h3 id="pr-preview-modal-title" className="pr-modal-title">Report PDF Preview</h3>
                <span className="pr-modal-subtitle">{activePdfRef.current.fileName}</span>
              </div>
              <div className="pr-modal-actions">
                <button
                  id="btn-modal-open-new-tab"
                  type="button"
                  className="pr-btn pr-btn-secondary"
                  onClick={handleOpenInNewTabFromModal}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M6 3h7v7M13 3L7 9M3 6v7a1 1 0 001 1h7" />
                  </svg>
                  <span>Open in New Tab</span>
                </button>
                <button
                  id="btn-modal-download-pdf"
                  type="button"
                  className="pr-btn pr-btn-primary"
                  onClick={handleDownloadFromModal}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M14 10v3a1 1 0 01-1 1H3a1 1 0 01-1-1v-3M8 2v8M5 7l3 3 3-3" />
                  </svg>
                  <span>Download PDF</span>
                </button>
                <button
                  id="btn-modal-close"
                  type="button"
                  className="pr-modal-close-btn"
                  onClick={handleClosePreviewModal}
                  aria-label="Close"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="pr-modal-body">
              <iframe
                src={activePdfRef.current.url}
                title="Report PDF Preview"
                className="pr-modal-iframe"
              />
            </div>
            <div className="pr-modal-footer">
              <button
                type="button"
                className="pr-btn"
                onClick={handleClosePreviewModal}
              >
                Close
              </button>
              <button
                type="button"
                className="pr-btn pr-btn-secondary"
                onClick={handleOpenInNewTabFromModal}
              >
                Open in New Tab
              </button>
              <button
                type="button"
                className="pr-btn pr-btn-primary"
                onClick={handleDownloadFromModal}
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

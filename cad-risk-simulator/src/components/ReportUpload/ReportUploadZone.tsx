/**
 * ReportUploadZone — Automated Report Upload & Reading Drop Zone
 * ==============================================================
 * Dashed-border file upload zone. Accepts PDF, JPG, PNG.
 * Automatically scans and extracts clinical data with OCR, auto-populating
 * and updating the dashboard parameters in real-time.
 */

import React, { useRef } from 'react';
import { useSimStore } from '../../store/simStore';
import { useShallow } from 'zustand/react/shallow';
import type { UploadedReport } from '../../store/simStore';
import { parseReportFile } from '../../services/reportParser';

interface ReportUploadZoneProps {
  /** Callback fired when a file is selected and metadata stored */
  onFileSelected?: () => void;
  /** Compact mode for top bar (smaller, icon-only) */
  compact?: boolean;
}

export function ReportUploadZone({ onFileSelected, compact }: ReportUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { uploadedReport, setUploadedReport, setReportFields } = useSimStore(
    useShallow(s => ({
      uploadedReport: s.uploadedReport,
      setUploadedReport: s.setUploadedReport,
      setReportFields: s.setReportFields,
    }))
  );

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset so same file can be re-uploaded
    e.target.value = '';

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(file.name);
    const isText = file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt');

    const fileUrl = URL.createObjectURL(file);
    const now = new Date();
    const timestamp = now.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    }) + ' · ' + now.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const initialReport: UploadedReport = {
      fileName: file.name,
      timestamp,
      fileUrl,
      fileType: isPdf || isText ? 'pdf' : 'image',
      status: 'analyzing',
      analysisProgress: 15,
      analysisStatusText: 'Reading and analyzing clinical report...',
    };

    setUploadedReport(initialReport);
    onFileSelected?.();

    if (!isPdf && !isImage && !isText) {
      setUploadedReport({
        ...initialReport,
        status: 'error',
        analysisProgress: 0,
        analysisStatusText: 'Unsupported file format. Please upload a PDF, PNG, JPG, or TXT report.',
      });
      return;
    }

    if (file.size === 0) {
      setUploadedReport({
        ...initialReport,
        status: 'error',
        analysisProgress: 0,
        analysisStatusText: `File "${file.name}" is empty (0 bytes).`,
      });
      return;
    }

    try {
      const extracted = await parseReportFile(file, (progress, statusText) => {
        setUploadedReport({
          ...initialReport,
          analysisProgress: progress,
          analysisStatusText: statusText,
        });
      });

      // Auto-apply all extracted fields directly to dashboard and state
      if (extracted.extractedCount > 0 || Object.keys(extracted.fields).length > 0) {
        setReportFields(extracted.fields);
        const unmappedMsg = extracted.unmappedFields && extracted.unmappedFields.length > 0
          ? ` (${extracted.unmappedFields.length} unmapped)`
          : '';
        setUploadedReport({
          ...initialReport,
          status: 'applied',
          extractedFields: extracted.fields,
          extractedCount: extracted.extractedCount,
          unmappedFields: extracted.unmappedFields,
          patientName: extracted.patientName,
          patientId: extracted.patientId,
          summaryNote: extracted.summaryNote,
          analysisProgress: 100,
          analysisStatusText: `✓ Auto-read ${extracted.extractedCount} values and applied to dashboard${unmappedMsg}`,
        });
      } else {
        setUploadedReport({
          ...initialReport,
          status: 'error',
          extractedFields: {},
          extractedCount: 0,
          unmappedFields: extracted.unmappedFields,
          analysisProgress: 100,
          analysisStatusText: 'No supported clinical parameters found in the report.',
        });
      }
    } catch (err: any) {
      console.error('Report parsing error:', err);
      setUploadedReport({
        ...initialReport,
        status: 'error',
        analysisProgress: 0,
        analysisStatusText: err?.message || 'Failed to extract values automatically. You can enter them manually.',
      });
    }
  };

  if (compact) {
    return (
      <>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.txt"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <button
          type="button"
          className="topbar-upload-btn"
          onClick={handleClick}
          title="Upload Patient Report (Auto-extracts values)"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 10v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-3" />
            <polyline points="5,6 8,3 11,6" />
            <line x1="8" y1="3" x2="8" y2="11" />
          </svg>
          <span className="topbar-upload-label">
            {uploadedReport?.status === 'analyzing' ? 'Reading Report...' : 'Upload Report'}
          </span>
        </button>
      </>
    );
  }

  const isAnalyzing = uploadedReport?.status === 'analyzing';

  return (
    <div className="report-upload-zone-wrap">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.txt"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <button
        type="button"
        className={`report-upload-zone${isAnalyzing ? ' report-upload-analyzing' : ''}`}
        onClick={handleClick}
        disabled={isAnalyzing}
      >
        {isAnalyzing ? (
          <div className="report-upload-spinner" />
        ) : (
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6, flexShrink: 0 }}>
            <path d="M14 10v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-3" />
            <polyline points="5,6 8,3 11,6" />
            <line x1="8" y1="3" x2="8" y2="11" />
          </svg>
        )}
        <span>
          {isAnalyzing
            ? uploadedReport.analysisStatusText || 'Scanning & reading report with AI / OCR...'
            : 'Upload blood report, ECG report, or imaging results (PDF, JPG, PNG) — Auto-reads values'}
        </span>
      </button>

      {/* Status strip */}
      {uploadedReport && (
        <div className="report-status-strip">
          {uploadedReport.status === 'analyzing' ? (
            <span style={{ color: 'var(--accent, #2563eb)' }}>
              ⏳ {uploadedReport.fileName} · {uploadedReport.analysisStatusText || 'Extracting parameters...'} ({uploadedReport.analysisProgress || 0}%)
            </span>
          ) : uploadedReport.status === 'applied' ? (
            <span style={{ color: 'var(--success, #16a34a)' }}>
              ✓ {uploadedReport.fileName} · Auto-read {uploadedReport.extractedCount ?? 0} values · Applied {uploadedReport.timestamp}
            </span>
          ) : (
            <span>
              📄 {uploadedReport.fileName} · Uploaded {uploadedReport.timestamp}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * EchoNextArchitecturePage — EchoNext 1D ResNet-34 Neural Network Viewer
 * =======================================================================
 * Directly implements and visualizes the EchoNext architecture:
 *   ECG waveform ➔ Convolutional layers ➔ Learn waveform patterns ➔ Combine patterns ➔ Disease-specific predictions
 *
 * Lower layers identify smaller waveform features (QRS, ST, P-waves).
 * Deeper layers combine these features into complex diagnostic patterns.
 */

import React, { useState, useMemo } from 'react';
import { useSimStore } from '../../store/simStore';
import { LEAD_NAMES, LeadName } from '../../ml/echonextResNet34';

// ── Mini Lead Sparkline Component ─────────────────────────────────────────────

function MiniLeadSparkline({
  leadName,
  samples,
}: {
  leadName: LeadName;
  samples: number[];
}) {
  const pathD = useMemo(() => {
    if (!samples || samples.length === 0) return '';
    const step = Math.max(1, Math.floor(samples.length / 80));
    const pts: number[] = [];
    for (let i = 0; i < samples.length; i += step) {
      pts.push(samples[i]);
    }

    const min = -1.6;
    const max = 2.2;
    const w = 150;
    const h = 32;

    return pts
      .map((val, idx) => {
        const x = (idx / (pts.length - 1)) * w;
        const normalizedY = Math.max(0, Math.min(1, (val - min) / (max - min)));
        const y = h - normalizedY * h;
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [samples]);

  const lastVal = samples && samples.length > 0 ? samples[samples.length - 1] : 0;

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        padding: '6px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '3px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700, color: 'var(--accent)' }}>
          {leadName}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-secondary)' }}>
          {lastVal.toFixed(2)} mV
        </span>
      </div>
      <svg viewBox="0 0 150 32" style={{ width: '100%', height: '26px' }}>
        <line x1="0" y1="16" x2="150" y2="16" stroke="var(--border)" strokeDasharray="2 3" />
        <path
          d={pathD || 'M 0 16 L 150 16'}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

// ── Main Page Component ───────────────────────────────────────────────────────

export function EchoNextArchitecturePage() {
  const { echonextResult, applyProfile, runEchoNext, params, activeEcgRhythm } = useSimStore();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastInferredTime, setLastInferredTime] = useState<string | null>(null);

  const handleReinfer = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      runEchoNext();
      setIsAnalyzing(false);
      const now = new Date();
      setLastInferredTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 350);
  };

  const { lowerFeatures, deeperPatterns, predictions, detectedClasses, waveforms, latencyMs } = echonextResult;

  return (
    <div style={{ padding: 'var(--space-md)', maxWidth: '1200px', margin: '0 auto', color: 'var(--text-primary)' }}>
      {/* ── Top Header: Essential Item 1 (Input Specs & Performance Counter) ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-md)',
          paddingBottom: 'var(--space-md)',
          borderBottom: '1px solid var(--border)',
          marginBottom: 'var(--space-md)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: 'var(--risk-low)',
                boxShadow: '0 0 10px var(--risk-low)',
                display: 'inline-block',
              }}
            />
            <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
              EchoNext CNN Diagnostic Summary
            </h1>
            <span
              style={{
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '4px',
                padding: '3px 8px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--accent)',
              }}
            >
              10s 12-Lead ECG (1000 × 12 Tensor @ 100Hz)
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '6px 0 0 20px' }}>
            Automated deep learning assessment of 12-lead electrocardiograms for acute cardiovascular events.
          </p>
        </div>

        {/* Live Status Badge & Reinfer Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              background: 'var(--surface)',
              border: '1px solid var(--risk-low)',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <span style={{ color: 'var(--risk-low)' }}>● Neural Inference</span>
            <span style={{ color: 'var(--text-secondary)' }}>· {latencyMs}ms</span>
          </div>

          {lastInferredTime && (
            <span style={{ fontSize: '11px', color: 'var(--risk-low)', fontFamily: 'var(--font-mono)' }}>
              ✓ Updated {lastInferredTime}
            </span>
          )}

          <button
            onClick={handleReinfer}
            disabled={isAnalyzing}
            style={{
              background: 'var(--accent)',
              color: '#000',
              fontWeight: 600,
              fontSize: '12px',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              cursor: isAnalyzing ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: isAnalyzing ? 0.8 : 1,
              boxShadow: '0 2px 8px rgba(56, 189, 248, 0.2)',
              transition: 'all 0.2s ease',
            }}
          >
            {isAnalyzing ? (
              <>
                <span className="animate-spin" style={{ display: 'inline-block' }}>◌</span>
                Running Inference...
              </>
            ) : (
              <>
                <span>⚡</span>
                Re-Infer Model
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Essential Item 5: Quick Scenario Test Strip ─────────────────────── */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: 'var(--space-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Quick Patient Scenarios:
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
            Test live model response across distinct clinical presentations:
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => applyProfile('healthy-baseline')}
            style={{
              background: 'var(--surface-alt)',
              border: '1px solid var(--border)',
              borderRadius: '5px',
              padding: '6px 12px',
              fontSize: '11px',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            💚 Healthy Baseline (NORM)
          </button>
          <button
            onClick={() => applyProfile('cad-high-stemi')}
            style={{
              background: 'rgba(217, 83, 79, 0.15)',
              border: '1px solid rgba(217, 83, 79, 0.4)',
              borderRadius: '5px',
              padding: '6px 12px',
              fontSize: '11px',
              color: 'var(--risk-high)',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            🚨 Anterior STEMI (MI)
          </button>
          <button
            onClick={() => applyProfile('cad-unstable-angina')}
            style={{
              background: 'rgba(216, 161, 59, 0.15)',
              border: '1px solid rgba(216, 161, 59, 0.4)',
              borderRadius: '5px',
              padding: '6px 12px',
              fontSize: '11px',
              color: 'var(--risk-moderate)',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            ⚠️ Ischemia (STTC)
          </button>
          <button
            onClick={() => applyProfile('cvd-arrhythmia-afib')}
            style={{
              background: 'var(--surface-alt)',
              border: '1px solid var(--border)',
              borderRadius: '5px',
              padding: '6px 12px',
              fontSize: '11px',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            ⚡ Atrial Fibrillation (CD)
          </button>
        </div>
      </div>

      {/* ── Main Executive Grid: Essential Items 2, 3 & 4 ────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: 'var(--space-md)',
        }}
      >
        {/* ── Essential Item 2: Primary Disease Classification (Core Output) ── */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '18px',
            gridColumn: 'span 1',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.05em' }}>
              PRIMARY DIAGNOSTIC HEAD
            </span>
            <span
              style={{
                background: 'var(--surface-alt)',
                fontSize: '10px',
                padding: '2px 8px',
                borderRadius: '4px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-secondary)',
              }}
            >
              Sigmoid Probabilities
            </span>
          </div>
          <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 4px 0' }}>
            Disease Probabilities & Decision Cutoffs
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 16px 0', lineHeight: 1.4 }}>
            Multi-label outputs evaluated against tuned clinical cutoff thresholds:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { key: 'MI', label: 'Myocardial Infarction (STEMI)', prob: predictions.MI, thresh: 0.35, color: 'var(--risk-high)', desc: 'Acute Heart Attack' },
              { key: 'STTC', label: 'ST-T Changes / Ischemia', prob: predictions.STTC, thresh: 0.33, color: 'var(--risk-moderate)', desc: 'Myocardial Oxygen Deficit' },
              { key: 'CD', label: 'Conduction Disturbance', prob: predictions.CD, thresh: 0.28, color: 'var(--accent)', desc: 'Electrical Block / Arrhythmia' },
              { key: 'HYP', label: 'Ventricular Hypertrophy', prob: predictions.HYP, thresh: 0.25, color: 'var(--risk-moderate)', desc: 'Heart Wall Overload' },
              { key: 'NORM', label: 'Normal Sinus Rhythm', prob: predictions.NORM, thresh: 0.44, color: 'var(--risk-low)', desc: 'Unremarkable Waveform' },
              { key: 'SHD', label: 'Structural Heart Disease (SHD)', prob: predictions.SHD, thresh: 0.30, color: 'var(--risk-high)', desc: 'EchoNext Composite Score' },
            ].map(({ key, label, prob, thresh, color, desc }) => {
              const isFlagged = prob >= thresh;
              return (
                <div key={key} style={{ background: 'var(--surface-alt)', padding: '10px 12px', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '13px', color: isFlagged ? color : 'var(--text-primary)' }}>
                        {key}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>{label}</span>
                      {isFlagged && (
                        <span style={{ background: color, color: '#000', padding: '1px 5px', borderRadius: '3px', fontSize: '9px', fontWeight: 700, letterSpacing: '0.03em' }}>
                          FLAGGED
                        </span>
                      )}
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '13px', color: isFlagged ? color : 'var(--text-primary)' }}>
                      {(prob * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    {desc} · Cutoff: {(thresh * 100).toFixed(0)}%
                  </div>
                  <div style={{ height: '6px', background: 'var(--surface)', borderRadius: '3px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${prob * 100}%`, background: isFlagged ? color : 'var(--accent)', borderRadius: '3px', transition: 'width 0.3s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Essential Items 3 & 4: Key Micro-Features & Territorial Ischemia ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {/* Essential Item 3: Key Micro-Features */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '18px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.05em' }}>
                STAGE 01 · WAVEFORM MARKERS
              </span>
              <span
                style={{
                  background: 'var(--surface-alt)',
                  fontSize: '10px',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-secondary)',
                }}
              >
                Key Signals
              </span>
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 12px 0' }}>
              Essential Waveform Micro-Features
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ background: 'var(--surface-alt)', padding: '10px 12px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>ST Segment Offset</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Acute Ischemia / STEMI Indicator</div>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 700, color: lowerFeatures.stSegmentElevationMv > 0.05 ? 'var(--risk-high)' : 'var(--text-primary)' }}>
                  {lowerFeatures.stSegmentElevationMv > 0 ? `+${lowerFeatures.stSegmentElevationMv}` : lowerFeatures.stSegmentElevationMv} mV
                </span>
              </div>

              <div style={{ background: 'var(--surface-alt)', padding: '10px 12px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>QRS Duration</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Ventricular Conduction Speed</div>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 700, color: lowerFeatures.qrsDurationMs > 115 ? 'var(--risk-high)' : 'var(--text-primary)' }}>
                  {lowerFeatures.qrsDurationMs} ms
                </span>
              </div>

              <div style={{ background: 'var(--surface-alt)', padding: '10px 12px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>P-Wave Status</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Sinus vs Fibrillatory Baseline</div>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, color: lowerFeatures.pWaveDetected ? 'var(--risk-low)' : 'var(--risk-high)' }}>
                  {lowerFeatures.pWaveDetected ? `Present (+${lowerFeatures.pWaveAmplitudeMv} mV)` : 'Absent (AFib)'}
                </span>
              </div>
            </div>
          </div>

          {/* Essential Item 4: Territorial Ischemia Location */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '18px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.05em' }}>
                STAGE 02 · ANATOMICAL PATTERNS
              </span>
              <span
                style={{
                  background: 'var(--surface-alt)',
                  fontSize: '10px',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-secondary)',
                }}
              >
                Localization
              </span>
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 12px 0' }}>
              Territorial Ischemia Localization
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ background: 'var(--surface-alt)', padding: '10px 12px', borderRadius: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>Anterior Ischemia (Leads V1–V4):</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '13px', color: deeperPatterns.anteriorTerritorialIschemia > 0.3 ? 'var(--risk-high)' : 'var(--text-primary)' }}>
                    {(deeperPatterns.anteriorTerritorialIschemia * 100).toFixed(0)}%
                  </span>
                </div>
                <div style={{ height: '6px', background: 'var(--surface)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${deeperPatterns.anteriorTerritorialIschemia * 100}%`, background: deeperPatterns.anteriorTerritorialIschemia > 0.3 ? 'var(--risk-high)' : 'var(--accent)', transition: 'width 0.3s ease' }} />
                </div>
              </div>

              <div style={{ background: 'var(--surface-alt)', padding: '10px 12px', borderRadius: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>Inferior Ischemia (Leads II, III, aVF):</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '13px', color: deeperPatterns.inferiorTerritorialIschemia > 0.3 ? 'var(--risk-high)' : 'var(--text-primary)' }}>
                    {(deeperPatterns.inferiorTerritorialIschemia * 100).toFixed(0)}%
                  </span>
                </div>
                <div style={{ height: '6px', background: 'var(--surface)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${deeperPatterns.inferiorTerritorialIschemia * 100}%`, background: deeperPatterns.inferiorTerritorialIschemia > 0.3 ? 'var(--risk-high)' : 'var(--accent)', transition: 'width 0.3s ease' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          COMMENTED OUT NON-ESSENTIAL SECTIONS (RETAINED FOR TECHNICAL REFERENCE)
         ─────────────────────────────────────────────────────────────────────── */}
      {/*
      <div style={{ marginTop: 'var(--space-lg)', opacity: 0.6 }}>
        {/* Secondary Layer Specifications Table & Individual Sparkline Grids commented out to streamline Executive View */}
        {/*
        Total Weight Layers: 34 Convolutional Layers
        Total Parameters: 35,364,358
        Python Reference: ml/echonext_resnet34.py
        */}
      {/* </div> */}
    </div>
  );
}


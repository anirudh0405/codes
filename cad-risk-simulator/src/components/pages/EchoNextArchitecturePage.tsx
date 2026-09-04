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
  const [activeTab, setActiveTab] = useState<'pipeline' | 'layers' | 'leads'>('pipeline');
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
    <div style={{ padding: 'var(--space-md)', maxWidth: '1280px', margin: '0 auto', color: 'var(--text-primary)' }}>
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 'var(--space-md)',
          paddingBottom: 'var(--space-md)',
          borderBottom: '1px solid var(--border)',
          marginBottom: 'var(--space-lg)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'var(--risk-low)',
                boxShadow: '0 0 8px var(--risk-low)',
                display: 'inline-block',
              }}
            />
            <h1 style={{ fontSize: '18px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
              EchoNext 1D ResNet-34 Architecture
            </h1>
            <span
              style={{
                background: 'var(--surface-alt)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '2px 8px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--accent)',
              }}
            >
              1D CNN for ECG Time-Series
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 16px' }}>
            Structurally adapted from ResNet-34 for 12-lead ECG time series. Lower layers identify micro waveform features; deeper layers combine them into complex diagnostic patterns.
          </p>
        </div>

        {/* Live Status & Quick Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
            <span style={{ color: 'var(--risk-low)' }}>● Native In-App Engine</span>
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
              background: isAnalyzing ? 'var(--accent)' : 'var(--accent)',
              color: '#000',
              fontWeight: 600,
              fontSize: '12px',
              border: 'none',
              borderRadius: '6px',
              padding: '7px 14px',
              cursor: isAnalyzing ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: isAnalyzing ? 0.8 : 1,
              transition: 'all 0.2s ease',
            }}
          >
            {isAnalyzing ? (
              <>
                <span className="animate-spin" style={{ display: 'inline-block' }}>◌</span>
                Analyzing ResNet-34...
              </>
            ) : (
              <>
                <span>⚡</span>
                Re-Infer EchoNext
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Scenario Quick-Test Strip ────────────────────────────────────────── */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: 'var(--space-lg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Test Patient Scenario:
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
            Switch presets to watch how the 1D ResNet-34 layers and disease predictions adapt live:
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => applyProfile('healthy-baseline')}
            style={{
              background: 'var(--surface-alt)',
              border: '1px solid var(--border)',
              borderRadius: '5px',
              padding: '5px 10px',
              fontSize: '11px',
              color: 'var(--text-primary)',
              cursor: 'pointer',
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
              padding: '5px 10px',
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
              padding: '5px 10px',
              fontSize: '11px',
              color: 'var(--risk-moderate)',
              cursor: 'pointer',
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
              padding: '5px 10px',
              fontSize: '11px',
              color: 'var(--text-primary)',
              cursor: 'pointer',
            }}
          >
            ⚡ Atrial Fibrillation (CD)
          </button>
        </div>
      </div>

      {/* ── View Tab Selector ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: 'var(--space-md)' }}>
        <button
          onClick={() => setActiveTab('pipeline')}
          style={{
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: 600,
            borderRadius: '6px',
            background: activeTab === 'pipeline' ? 'var(--surface-alt)' : 'transparent',
            border: `1px solid ${activeTab === 'pipeline' ? 'var(--accent)' : 'transparent'}`,
            color: activeTab === 'pipeline' ? 'var(--text-primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          1. Concept Flow: Waveform ➔ Lower Features ➔ Combined Patterns ➔ Predictions
        </button>
        <button
          onClick={() => setActiveTab('layers')}
          style={{
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: 600,
            borderRadius: '6px',
            background: activeTab === 'layers' ? 'var(--surface-alt)' : 'transparent',
            border: `1px solid ${activeTab === 'layers' ? 'var(--accent)' : 'transparent'}`,
            color: activeTab === 'layers' ? 'var(--text-primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          2. ResNet-34 Layer-by-Layer Architecture Details
        </button>
        <button
          onClick={() => setActiveTab('leads')}
          style={{
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: 600,
            borderRadius: '6px',
            background: activeTab === 'leads' ? 'var(--surface-alt)' : 'transparent',
            border: `1px solid ${activeTab === 'leads' ? 'var(--accent)' : 'transparent'}`,
            color: activeTab === 'leads' ? 'var(--text-primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          3. 12-Lead Input Tensor View (I, II, III, aVR, aVL, aVF, V1–V6)
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          TAB 1: CONCEPTUAL FLOW PIPELINE
         ─────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'pipeline' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {/* Visual Concept Banner (Quoting Image) */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '14px 18px',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <span>
              ECG waveform ➔ Convolutional layers ➔ Learn waveform patterns ➔ Combine patterns ➔ Disease-specific predictions
            </span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
              EchoNext 1D ResNet-34 Deep Learning Pipeline
            </span>
          </div>

          {/* 3-Column Main Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: 'var(--space-md)',
            }}
          >
            {/* Step 1: Lower Layers Feature Extraction */}
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 700 }}>
                  STAGE 01 & 02 · CONV LAYERS
                </span>
                <span
                  style={{
                    background: 'var(--surface-alt)',
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Stem + Stage 1
                </span>
              </div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 6px 0' }}>
                Learn Smaller Waveform Features
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 14px 0', lineHeight: 1.4 }}>
                Lower 1D convolutional layers identify local, micro-scale morphological components directly from the raw signals:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ background: 'var(--surface-alt)', padding: '8px 10px', borderRadius: '5px', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>QRS Duration:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: lowerFeatures.qrsDurationMs > 115 ? 'var(--risk-high)' : 'var(--text-primary)' }}>
                    {lowerFeatures.qrsDurationMs} ms
                  </span>
                </div>
                <div style={{ background: 'var(--surface-alt)', padding: '8px 10px', borderRadius: '5px', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>ST Segment Offset:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: lowerFeatures.stSegmentElevationMv > 0.05 ? 'var(--risk-high)' : 'var(--text-primary)' }}>
                    {lowerFeatures.stSegmentElevationMv > 0 ? `+${lowerFeatures.stSegmentElevationMv}` : lowerFeatures.stSegmentElevationMv} mV
                  </span>
                </div>
                <div style={{ background: 'var(--surface-alt)', padding: '8px 10px', borderRadius: '5px', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>QRS Peak Voltage:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: lowerFeatures.qrsPeakVoltageMv > 2.0 ? 'var(--risk-moderate)' : 'var(--text-primary)' }}>
                    {lowerFeatures.qrsPeakVoltageMv} mV
                  </span>
                </div>
                <div style={{ background: 'var(--surface-alt)', padding: '8px 10px', borderRadius: '5px', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>P-Wave Morphology:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: lowerFeatures.pWaveDetected ? 'var(--risk-low)' : 'var(--risk-high)' }}>
                    {lowerFeatures.pWaveDetected ? `Present (+${lowerFeatures.pWaveAmplitudeMv} mV)` : 'Absent (Fibrillatory Baseline)'}
                  </span>
                </div>
                <div style={{ background: 'var(--surface-alt)', padding: '8px 10px', borderRadius: '5px', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>T-Wave Polarity:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: lowerFeatures.tWaveInversion ? 'var(--risk-high)' : 'var(--text-primary)' }}>
                    {lowerFeatures.tWaveInversion ? 'Inverted (Ischemia Sign)' : 'Normal Upright'}
                  </span>
                </div>
              </div>
            </div>

            {/* Step 2: Deeper Layers Combine Features */}
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 700 }}>
                  STAGE 03 & 04 · DEEP RESIDUALS
                </span>
                <span
                  style={{
                    background: 'var(--surface-alt)',
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Stages 2–4
                </span>
              </div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 6px 0' }}>
                Combine Patterns Across 12 Leads
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 14px 0', lineHeight: 1.4 }}>
                Deeper layers aggregate receptive fields across all 12 channels into complex regional and structural patterns:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ background: 'var(--surface-alt)', padding: '8px 10px', borderRadius: '5px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Anterior Ischemia (V1–V4):</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: deeperPatterns.anteriorTerritorialIschemia > 0.3 ? 'var(--risk-high)' : 'var(--text-primary)' }}>
                      {(deeperPatterns.anteriorTerritorialIschemia * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${deeperPatterns.anteriorTerritorialIschemia * 100}%`, background: deeperPatterns.anteriorTerritorialIschemia > 0.3 ? 'var(--risk-high)' : 'var(--accent)' }} />
                  </div>
                </div>

                <div style={{ background: 'var(--surface-alt)', padding: '8px 10px', borderRadius: '5px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Inferior Ischemia (II, III, aVF):</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: deeperPatterns.inferiorTerritorialIschemia > 0.3 ? 'var(--risk-high)' : 'var(--text-primary)' }}>
                      {(deeperPatterns.inferiorTerritorialIschemia * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${deeperPatterns.inferiorTerritorialIschemia * 100}%`, background: deeperPatterns.inferiorTerritorialIschemia > 0.3 ? 'var(--risk-high)' : 'var(--accent)' }} />
                  </div>
                </div>

                <div style={{ background: 'var(--surface-alt)', padding: '8px 10px', borderRadius: '5px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Conduction Delay Pattern:</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: deeperPatterns.ventricularConductionDelay > 0.3 ? 'var(--risk-high)' : 'var(--text-primary)' }}>
                      {(deeperPatterns.ventricularConductionDelay * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${deeperPatterns.ventricularConductionDelay * 100}%`, background: deeperPatterns.ventricularConductionDelay > 0.3 ? 'var(--risk-high)' : 'var(--accent)' }} />
                  </div>
                </div>

                <div style={{ background: 'var(--surface-alt)', padding: '8px 10px', borderRadius: '5px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Hypertrophic Voltage Strain:</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: deeperPatterns.voltageHypertrophyStrain > 0.3 ? 'var(--risk-moderate)' : 'var(--text-primary)' }}>
                      {(deeperPatterns.voltageHypertrophyStrain * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${deeperPatterns.voltageHypertrophyStrain * 100}%`, background: 'var(--risk-moderate)' }} />
                  </div>
                </div>

                <div style={{ background: 'var(--surface-alt)', padding: '8px 10px', borderRadius: '5px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Atrial Fibrillation Dynamic:</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: deeperPatterns.atrialFibrillationPattern > 0.3 ? 'var(--risk-high)' : 'var(--text-primary)' }}>
                      {(deeperPatterns.atrialFibrillationPattern * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${deeperPatterns.atrialFibrillationPattern * 100}%`, background: deeperPatterns.atrialFibrillationPattern > 0.3 ? 'var(--risk-high)' : 'var(--accent)' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Disease-Specific Predictions */}
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 700 }}>
                  STAGE 05 · CLASSIFICATION
                </span>
                <span
                  style={{
                    background: 'var(--surface-alt)',
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Global Pooling
                </span>
              </div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 6px 0' }}>
                Disease-Specific Predictions
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 14px 0', lineHeight: 1.4 }}>
                Final calibrated disease probabilities and EchoNext Structural Heart Disease (SHD) index:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { key: 'NORM', label: 'Normal Sinus', prob: predictions.NORM, thresh: 0.44, color: 'var(--risk-low)' },
                  { key: 'MI', label: 'Myocardial Infarction', prob: predictions.MI, thresh: 0.35, color: 'var(--risk-high)' },
                  { key: 'STTC', label: 'Ischemia / ST-T Change', prob: predictions.STTC, thresh: 0.33, color: 'var(--risk-moderate)' },
                  { key: 'CD', label: 'Conduction Block', prob: predictions.CD, thresh: 0.28, color: 'var(--accent)' },
                  { key: 'HYP', label: 'Ventricular Hypertrophy', prob: predictions.HYP, thresh: 0.25, color: 'var(--risk-moderate)' },
                  { key: 'SHD', label: 'Structural Heart Disease', prob: predictions.SHD, thresh: 0.30, color: 'var(--risk-high)' },
                ].map(({ key, label, prob, thresh, color }) => {
                  const isFlagged = prob >= thresh;
                  return (
                    <div key={key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px', fontSize: '11px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: isFlagged ? color : 'var(--text-primary)' }}>
                            {key}
                          </span>
                          <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                          {isFlagged && (
                            <span style={{ background: color, color: '#000', padding: '0 4px', borderRadius: '2px', fontSize: '9px', fontWeight: 700 }}>
                              POSITIVE
                            </span>
                          )}
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: isFlagged ? color : 'var(--text-primary)' }}>
                          {(prob * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div style={{ height: '6px', background: 'var(--surface-alt)', borderRadius: '3px', position: 'relative' }}>
                        <div style={{ height: '100%', width: `${prob * 100}%`, background: isFlagged ? color : 'var(--accent)', borderRadius: '3px', transition: 'width 0.3s ease' }} />
                        {/* Cutoff pin */}
                        <div style={{ position: 'absolute', left: `${thresh * 100}%`, top: '-2px', bottom: '-2px', width: '2px', background: '#fff', zIndex: 2 }} title={`Cutoff: ${(thresh*100).toFixed(0)}%`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          TAB 2: RESNET-34 ARCHITECTURAL SPECIFICATIONS
         ─────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'layers' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '18px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 4px 0' }}>
            EchoNext 1D ResNet-34 Layer Configuration
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 16px 0' }}>
            Adapted from 2D image ResNet-34 to 1D ECG time-series with wide kernel sizes (k=15) to capture full cardiac cycles.
          </p>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                <th style={{ padding: '8px' }}>Stage</th>
                <th style={{ padding: '8px' }}>Layer Type</th>
                <th style={{ padding: '8px' }}>Channels & Filters</th>
                <th style={{ padding: '8px' }}>Kernel & Stride</th>
                <th style={{ padding: '8px' }}>Output Dimensions</th>
                <th style={{ padding: '8px' }}>Clinical Feature Role</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px', color: 'var(--accent)', fontWeight: 700 }}>Stem</td>
                <td style={{ padding: '8px' }}>Conv1D + BN + MaxPool</td>
                <td style={{ padding: '8px' }}>64 filters</td>
                <td style={{ padding: '8px' }}>k=15, s=2</td>
                <td style={{ padding: '8px' }}>(250, 64)</td>
                <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>Micro waveform features (QRS spike gradients, onset)</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px', color: 'var(--accent)', fontWeight: 700 }}>Stage 1</td>
                <td style={{ padding: '8px' }}>3x BasicBlock1D</td>
                <td style={{ padding: '8px' }}>64 filters (6 convs)</td>
                <td style={{ padding: '8px' }}>k=15, s=1</td>
                <td style={{ padding: '8px' }}>(250, 64)</td>
                <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>P-wave, ST segment, T-wave morphology</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px', color: 'var(--accent)', fontWeight: 700 }}>Stage 2</td>
                <td style={{ padding: '8px' }}>4x BasicBlock1D</td>
                <td style={{ padding: '8px' }}>128 filters (8 convs)</td>
                <td style={{ padding: '8px' }}>k=15, s=2</td>
                <td style={{ padding: '8px' }}>(125, 128)</td>
                <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>Beat-to-beat transitions & rhythm irregularities</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px', color: 'var(--accent)', fontWeight: 700 }}>Stage 3</td>
                <td style={{ padding: '8px' }}>6x BasicBlock1D</td>
                <td style={{ padding: '8px' }}>256 filters (12 convs)</td>
                <td style={{ padding: '8px' }}>k=15, s=2</td>
                <td style={{ padding: '8px' }}>(63, 256)</td>
                <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>Regional ischemia patterns (Anterior vs Inferior)</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px', color: 'var(--accent)', fontWeight: 700 }}>Stage 4</td>
                <td style={{ padding: '8px' }}>3x BasicBlock1D</td>
                <td style={{ padding: '8px' }}>512 filters (6 convs)</td>
                <td style={{ padding: '8px' }}>k=15, s=2</td>
                <td style={{ padding: '8px' }}>(32, 512)</td>
                <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>Multi-lead combined structural heart disease features</td>
              </tr>
              <tr>
                <td style={{ padding: '8px', color: 'var(--risk-low)', fontWeight: 700 }}>Head</td>
                <td style={{ padding: '8px' }}>GlobalAvgPool1D + Dense</td>
                <td style={{ padding: '8px' }}>6 disease logits</td>
                <td style={{ padding: '8px' }}>Sigmoid</td>
                <td style={{ padding: '8px' }}>(6,)</td>
                <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>Disease predictions (NORM, MI, STTC, CD, HYP, SHD)</td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: '16px', fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', gap: '20px' }}>
            <span>Total Weight Layers: <strong style={{ color: 'var(--text-primary)' }}>34 Convolutional Layers</strong></span>
            <span>Total Parameters: <strong style={{ color: 'var(--text-primary)' }}>35,364,358</strong></span>
            <span>Python Reference: <strong style={{ color: 'var(--accent)' }}>ml/echonext_resnet34.py</strong></span>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          TAB 3: 12-LEAD INPUT TENSOR VIEW
         ─────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'leads' && (
        <div>
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>
              Live 12-Lead Electrocardiogram Input Tensor
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              1000 time-steps per lead sampled at 100 Hz across standard limb leads and precordial chest leads:
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '12px',
            }}
          >
            {LEAD_NAMES.map((leadName) => (
              <MiniLeadSparkline
                key={leadName}
                leadName={leadName}
                samples={waveforms.leads[leadName] ?? []}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

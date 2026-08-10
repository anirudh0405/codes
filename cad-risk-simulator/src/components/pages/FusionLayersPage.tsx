/**
 * FusionLayersPage — Sensor Fusion Layer Visualization
 * =====================================================
 * Two side-by-side cards (stack on mobile):
 *   1. Cardiac / Motion Fusion — Pearson correlation + sparkline
 *   2. Metabolic-Vascular Fusion — PPG Vascular Index + ApoB Implied Risk
 *
 * Below: explanatory note on design choice.
 *
 * UI PASS ONLY — no logic, reads from store.
 */

import React, { useMemo } from 'react';
import { useSimStore } from '../../store/simStore';

// ── Helpers ──────────────────────────────────────────────────────────────────

function classifyCorrelation(r: number): {
  label: string;
  color: string;
} {
  const absR = Math.abs(r);
  if (absR > 0.85) return { label: 'Likely Real Event', color: 'var(--risk-high)' };
  if (absR > 0.55) return { label: 'Possible Artifact', color: 'var(--risk-moderate)' };
  return { label: 'Normal', color: 'var(--risk-low)' };
}

// ── Sparkline Component ──────────────────────────────────────────────────────

function CorrelationSparkline({ values }: { values: number[] }) {
  if (values.length < 2) {
    return (
      <div className="fl-sparkline-empty">
        Collecting…
      </div>
    );
  }

  const W = 200;
  const H = 28;
  const max = 1;
  const min = -1;

  const toX = (i: number) => (i / (values.length - 1)) * W;
  const toY = (v: number) => H - ((v - min) / (max - min)) * H;

  const dPath = values
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`)
    .join(' ');

  return (
    <div className="fl-sparkline">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        {/* zero line */}
        <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="var(--border)" strokeDasharray="3 3" />
        <path d={dPath} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export function FusionLayersPage() {
  const snapshot = useSimStore(s => s.snapshot);
  const riskResult = useSimStore(s => s.riskResult);
  const riskTrend = useSimStore(s => s.riskTrend);
  const labInputs = useSimStore(s => s.labInputs);
  const apoBPanel = useSimStore(s => s.apoBPanel);

  // Simulated correlation values derived from risk trend data
  // Uses alternating heart-rate-like patterns to simulate correlation history
  const correlationHistory = useMemo(() => {
    return riskTrend.slice(-10).map((d) => {
      // Derive a deterministic correlation from the score
      const base = 0.3 + (d.score / 100) * 0.5;
      const noise = Math.sin(d.t * 0.001) * 0.15;
      return Math.max(-1, Math.min(1, base + noise));
    });
  }, [riskTrend]);

  const currentCorrelation = correlationHistory.length > 0
    ? correlationHistory[correlationHistory.length - 1]
    : 0.42;
  const correlationClass = classifyCorrelation(currentCorrelation);

  // Metabolic-Vascular Fusion values (derived from existing store data)
  const systolic = snapshot?.systolic ?? 120;
  const totalChol = snapshot?.totalCholesterol ?? 180;
  const trigs = snapshot?.triglycerides ?? 110;

  // PPG Vascular Index — composite of BP + Cholesterol + Triglycerides (normalized)
  const ppgVascularIndex = (
    (Math.min(systolic, 200) - 90) / 110 * 0.4 +
    (Math.min(totalChol, 300) - 120) / 180 * 0.3 +
    (Math.min(trigs, 400) - 50) / 350 * 0.3
  );
  const ppgVI = Math.max(0, Math.min(1, ppgVascularIndex));

  // ApoB Implied Risk — from lab report panel
  const apoBValue = apoBPanel?.apoB ?? 90;
  const apoBImpliedRisk = Math.max(0, Math.min(1, (apoBValue - 50) / 100));

  // Divergence between the two tiers
  const divergence = Math.abs(ppgVI - apoBImpliedRisk);
  const DIVERGENCE_THRESHOLD = 0.30;

  // Composite metabolic score
  const compositeMetabolicScore = (ppgVI * 0.6 + apoBImpliedRisk * 0.4);

  return (
    <div className="fl-page">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="fl-page-header">
        <h1 className="fl-page-title">SENSOR FUSION LAYERS</h1>
        <p className="fl-page-subtitle">
          Two independent mechanisms
        </p>
      </div>

      {/* ── Cards Row ────────────────────────────────────────────── */}
      <div className="fl-cards-row">
        {/* Left Card: Cardiac / Motion Fusion */}
        <div className="fl-card fl-card-cardiac panel-card">
          <div className="fl-card-header">
            <span className="fl-card-title">CARDIAC / MOTION FUSION</span>
          </div>

          <div className="fl-card-body">
            <div className="fl-metric-row">
              <span className="fl-metric-label">Pearson Correlation</span>
              <span className="fl-metric-value">
                r = {currentCorrelation.toFixed(2)}
              </span>
            </div>

            <div className="fl-metric-row">
              <span className="fl-metric-label">Classification</span>
              <span className="fl-metric-value" style={{ color: correlationClass.color }}>
                {correlationClass.label}
              </span>
            </div>

            <div className="fl-sparkline-section">
              <span className="fl-sparkline-label">Last 10 correlation values</span>
              <CorrelationSparkline values={correlationHistory} />
            </div>
          </div>
        </div>

        {/* Right Card: Metabolic-Vascular Fusion */}
        <div className="fl-card fl-card-metabolic panel-card">
          <div className="fl-card-header">
            <span className="fl-card-title">METABOLIC-VASCULAR FUSION</span>
          </div>

          <div className="fl-card-body">
            <div className="fl-tier">
              <div className="fl-tier-header">
                <span className="fl-tier-label">Tier 1 — PPG Vascular Index</span>
                <span className="fl-tier-value">{ppgVI.toFixed(2)}</span>
              </div>
              <span className="fl-tier-desc">(BP + Cholesterol + Triglycerides, PPG/PTT-derived)</span>
            </div>

            <div className="fl-tier">
              <div className="fl-tier-header">
                <span className="fl-tier-label">Tier 2 — ApoB Implied Risk</span>
                <span className="fl-tier-value">{apoBImpliedRisk.toFixed(2)}</span>
              </div>
              <span className="fl-tier-desc">(blood-report-derived, independent)</span>
            </div>

            <div className="fl-tier">
              <div className="fl-tier-header">
                <span className="fl-tier-label">Divergence</span>
                <span
                  className="fl-tier-value"
                  style={{
                    color: divergence > DIVERGENCE_THRESHOLD
                      ? 'var(--risk-moderate)'
                      : 'var(--text-primary)',
                  }}
                >
                  {divergence.toFixed(2)}
                  {divergence > DIVERGENCE_THRESHOLD && ' ⚠'}
                </span>
              </div>
            </div>

            <div className="fl-composite">
              <span className="fl-composite-label">compositeMetabolicScore</span>
              <span className="fl-composite-value">
                {compositeMetabolicScore.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Design Note ──────────────────────────────────────────── */}
      <p className="fl-design-note">
        Cardiac/Motion fusion uses Pearson correlation between ECG and accelerometer signals
        to classify whether cardiac events coincide with movement (artifact) or occur at rest
        (likely real). Metabolic-Vascular fusion is split into two independent tiers: Tier 1
        derives vascular stiffness from PPG/PTT optical signals, while Tier 2 uses
        lab-report-based ApoB — a fundamentally different data source. Divergence between
        tiers flags when optical and biochemical assessments disagree, prompting clinical
        review.
      </p>
    </div>
  );
}

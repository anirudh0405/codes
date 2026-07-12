/**
 * Vital Signs Metrics — HR, BP, HRV, Stress, QTc, ST Segment
 */

import React from 'react';
import { useSimStore } from '../../store/simStore';

const BP_CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  normal: { label: 'Normal', color: 'var(--risk-low)' },
  elevated: { label: 'Elevated', color: 'var(--accent-cyan)' },
  stage1: { label: 'Stage 1 HTN', color: 'var(--risk-moderate)' },
  stage2: { label: 'Stage 2 HTN', color: 'var(--risk-high)' },
  crisis: { label: 'Crisis', color: 'var(--risk-high)' },
};

function MetricCard({
  id, label, value, unit, sub, color, accent,
}: {
  id: string; label: string; value: string | number;
  unit?: string; sub?: React.ReactNode; color?: string; accent?: string;
}) {
  return (
    <div className="metric-card" id={id}
      style={accent ? { borderColor: `${accent}33`, boxShadow: `0 0 20px ${accent}10` } : undefined}
    >
      <div className="metric-label">{label}</div>
      <div className="metric-value" style={{ color: color ?? 'var(--text-primary)' }}>
        {value}
        {unit && <span className="metric-unit"> {unit}</span>}
      </div>
      {sub && <div className="metric-sub">{sub}</div>}
    </div>
  );
}

function bpArrow(systolic: number) {
  if (systolic > 140) return { arrow: '↑', color: 'var(--risk-high)' };
  if (systolic > 120) return { arrow: '↗', color: 'var(--risk-moderate)' };
  if (systolic < 90) return { arrow: '↓', color: 'var(--accent-cyan)' };
  return { arrow: '→', color: 'var(--risk-low)' };
}

export function VitalSigns() {
  const snapshot = useSimStore(s => s.snapshot);

  if (!snapshot) {
    return (
      <div className="grid-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="metric-card" style={{ height: 90 }} />
        ))}
      </div>
    );
  }

  const { arrow: bpAr, color: bpCol } = bpArrow(snapshot.systolic);

  const stColor = Math.abs(snapshot.stSegment) > 0.1
    ? 'var(--risk-high)'
    : Math.abs(snapshot.stSegment) > 0.05
    ? 'var(--risk-moderate)'
    : 'var(--risk-low)';

  const qtColor = snapshot.qtcBazett > 500
    ? 'var(--risk-high)'
    : snapshot.qtcBazett > 440
    ? 'var(--risk-moderate)'
    : 'var(--text-primary)';

  const hrvColor = snapshot.hrv < 20
    ? 'var(--risk-high)'
    : snapshot.hrv < 40
    ? 'var(--risk-moderate)'
    : 'var(--risk-low)';

  return (
    <div className="grid-3">
      <MetricCard
        id="metric-hr"
        label="Heart Rate"
        value={snapshot.heartRate}
        unit="bpm"
        sub={snapshot.heartRate > 100 ? '⚠ Tachycardia' : snapshot.heartRate < 60 ? '⚠ Bradycardia' : 'Normal sinus'}
        color={snapshot.heartRate < 60 || snapshot.heartRate > 100 ? 'var(--risk-moderate)' : 'var(--text-primary)'}
      />
      <MetricCard
        id="metric-bp"
        label="Blood Pressure"
        value={`${snapshot.systolic}/${snapshot.diastolic}`}
        unit="mmHg"
        sub={<span style={{ color: bpCol }}>{bpAr} MAP {snapshot.hrv ? Math.round(snapshot.diastolic + (snapshot.systolic - snapshot.diastolic) / 3) : '—'} mmHg</span>}
        color={bpCol}
        accent={snapshot.systolic > 140 ? 'var(--risk-high)' : undefined}
      />
      <MetricCard
        id="metric-hrv"
        label="HRV (RMSSD)"
        value={Math.round(snapshot.hrv)}
        unit="ms"
        sub={snapshot.hrv < 20 ? '⚠ Very Low' : snapshot.hrv < 40 ? 'Low' : 'Healthy'}
        color={hrvColor}
      />
      <MetricCard
        id="metric-stress"
        label="Stress Index"
        value={Math.round(snapshot.stressScore)}
        unit="/ 100"
        sub={snapshot.stressScore > 70 ? '⚠ High stress' : snapshot.stressScore > 40 ? 'Moderate' : 'Low'}
        color={snapshot.stressScore > 70 ? 'var(--risk-high)' : snapshot.stressScore > 40 ? 'var(--risk-moderate)' : 'var(--risk-low)'}
      />
      <MetricCard
        id="metric-qtc"
        label="QTc (Bazett)"
        value={snapshot.qtcBazett}
        unit="ms"
        sub={snapshot.qtcBazett > 500 ? '⚠ Prolonged' : snapshot.qtcBazett > 440 ? 'Borderline' : 'Normal'}
        color={qtColor}
      />
      <MetricCard
        id="metric-st"
        label="ST Segment"
        value={snapshot.stSegment.toFixed(2)}
        unit="mV"
        sub={Math.abs(snapshot.stSegment) > 0.1 ? '⚠ Elevation' : 'Isoelectric'}
        color={stColor}
        accent={Math.abs(snapshot.stSegment) > 0.1 ? 'var(--risk-high)' : undefined}
      />
    </div>
  );
}

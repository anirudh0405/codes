/**
 * DashboardHome — Default Landing View
 * ======================================
 * Top row: 4 stat cards (Risk Score, Heart Rate, Blood Pressure, HRV RMSSD)
 * Below: INTERHEART Weights panel
 *
 * UI PASS ONLY — no logic, reads from store.
 */

import React, { useState } from 'react';
import { useSimStore } from '../../store/simStore';
import { WEIGHTS } from '../../riskEngine';
import { classifyBP } from '../../lib/bpRanges';
import { CardiacReadouts } from '../layout/RightPanelContent';
import { CVDInfoPanel } from './CVDInfoPanel';
import { RangeIndicator } from '../RangeIndicator';

// ── Risk helpers ─────────────────────────────────────────────────────────────

function getRiskColor(band: string): string {
  if (band === 'High') return 'var(--risk-high)';
  if (band === 'Moderate') return 'var(--risk-moderate)';
  return 'var(--risk-low)';
}

function hrvStatusLabel(hrv: number): { label: string; color: string } {
  if (hrv < 20) return { label: 'Low', color: 'var(--risk-moderate)' };
  return { label: 'Healthy', color: 'var(--risk-low)' };
}

// ── INTERHEART weight factors for display ────────────────────────────────────

const INTERHEART_FACTORS: { key: keyof typeof WEIGHTS; label: string }[] = [
  { key: 'apoB',          label: 'ApoB/ApoA1 Ratio' },
  { key: 'bloodPressure', label: 'Hypertension' },
  { key: 'smoking',       label: 'Smoking' },
  { key: 'stress',        label: 'Psychosocial Stress' },
  { key: 'heartRate',     label: 'Dyslipidaemia' },
];

// Max weight among displayed factors, for relative bar scaling
const MAX_WEIGHT = Math.max(...INTERHEART_FACTORS.map(f => WEIGHTS[f.key]));

// ── Component ────────────────────────────────────────────────────────────────

export function DashboardHome() {
  const snapshot = useSimStore(s => s.snapshot);
  const riskResult = useSimStore(s => s.riskResult);
  const patientProfile = useSimStore(s => s.patientProfile);
  const echonextResult = useSimStore(s => s.echonextResult);
  const runEchoNext = useSimStore(s => s.runEchoNext);

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

  const band  = riskResult?.band ?? 'Low';
  const score = riskResult?.score ?? 0;
  const hr    = snapshot?.heartRate ?? 0;
  const sys   = snapshot?.systolic ?? 120;
  const dia   = snapshot?.diastolic ?? 80;
  const hrvVal = snapshot?.hrv ?? 0;

  const bpInfo = classifyBP(sys, dia);
  const hrv = hrvStatusLabel(hrvVal);

  return (
    <div className="dashboard-home">
      {/* ── Top Row: 4 Stat Cards ──────────────────────────────────── */}
      <div className="dash-stat-grid">
        {/* Card 1: Current Risk Score */}
        <div className="panel-card dash-stat-card">
          <span className="dash-stat-label">Current Risk Score</span>
          <span className="dash-stat-value" style={{ fontFamily: 'var(--font-mono)' }}>
            {Math.round(score)}
          </span>
          <span className="dash-stat-sub" style={{ color: getRiskColor(band) }}>
            {band} Risk
          </span>
        </div>

        {/* Card 2: Heart Rate */}
        <div className="panel-card dash-stat-card">
          <span className="dash-stat-label">Heart Rate</span>
          <span className="dash-stat-value" style={{ fontFamily: 'var(--font-mono)' }}>
            {hr} <span className="dash-stat-unit">BPM</span>
          </span>
          <span className="dash-stat-sub" style={{ color: 'var(--text-secondary)' }}>
            NSR
          </span>
          <RangeIndicator rangeKey="heartRate" value={hr} />
        </div>

        {/* Card 3: Blood Pressure */}
        <div className="panel-card dash-stat-card">
          <span className="dash-stat-label">Blood Pressure</span>
          <span className="dash-stat-value" style={{ fontFamily: 'var(--font-mono)' }}>
            {sys}/{dia} <span className="dash-stat-unit">mmHg</span>
          </span>
          <span className="dash-stat-sub" style={{ color: bpInfo.color }}>
            {bpInfo.label} ({bpInfo.shortLabel})
          </span>
          <div style={{ marginTop: 'var(--space-xs)', display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
            <RangeIndicator rangeKey="systolicBP" value={sys} />
            <RangeIndicator rangeKey="diastolicBP" value={dia} />
          </div>
        </div>

        {/* Card 4: HRV RMSSD */}
        <div className="panel-card dash-stat-card">
          <span className="dash-stat-label">HRV RMSSD</span>
          <span className="dash-stat-value" style={{ fontFamily: 'var(--font-mono)' }}>
            {Math.round(hrvVal)} <span className="dash-stat-unit">ms</span>
          </span>
          <span className="dash-stat-sub" style={{ color: hrv.color }}>
            {hrv.label}
          </span>
          <RangeIndicator rangeKey="hrv" value={hrvVal} />
        </div>
      </div>

      {/* ── EchoNext 1D ResNet-34 Diagnostic Card ─────────────────── */}
      <div
        className="panel-card"
        style={{
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '9px',
              height: '9px',
              borderRadius: '50%',
              background: echonextResult.detectedClasses.includes('NORM') ? 'var(--risk-low)' : 'var(--risk-high)',
              boxShadow: echonextResult.detectedClasses.includes('NORM') ? '0 0 8px var(--risk-low)' : '0 0 8px var(--risk-high)',
            }}
          />
          <div>
            <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
              ECHONEXT 1D RESNET-34 DEEP LEARNING (IN-APP)
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Classified:</span>
              {echonextResult.detectedClasses.map(cls => (
                <span
                  key={cls}
                  style={{
                    background: cls === 'NORM' ? 'rgba(52, 199, 89, 0.2)' : 'rgba(217, 83, 79, 0.2)',
                    color: cls === 'NORM' ? 'var(--risk-low)' : 'var(--risk-high)',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    padding: '1px 6px',
                    borderRadius: '3px',
                    fontWeight: 700,
                  }}
                >
                  {cls}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>SHD Index: </span>
            <strong style={{ color: echonextResult.predictions.SHD >= 0.3 ? 'var(--risk-high)' : 'var(--accent)' }}>
              {(echonextResult.predictions.SHD * 100).toFixed(0)}%
            </strong>
          </div>
          {lastInferredTime && (
            <span style={{ fontSize: '10px', color: 'var(--risk-low)', fontFamily: 'var(--font-mono)' }}>
              ✓ {lastInferredTime}
            </span>
          )}
          <button
            onClick={handleReinfer}
            disabled={isAnalyzing}
            style={{
              background: isAnalyzing ? 'var(--accent)' : 'var(--surface-alt)',
              border: '1px solid var(--border)',
              borderRadius: '5px',
              padding: '4px 12px',
              fontSize: '11px',
              color: isAnalyzing ? '#000' : 'var(--text-primary)',
              cursor: isAnalyzing ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: isAnalyzing ? 600 : 400,
              transition: 'all 0.2s ease',
            }}
          >
            {isAnalyzing ? (
              <>
                <span className="animate-spin" style={{ display: 'inline-block' }}>◌</span>
                Analyzing...
              </>
            ) : (
              <>
                <span>⚡</span>
                Re-Infer
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Cardiac Readouts ─────────────────────────────────────── */}
      <div className="panel-card dash-cardiac-panel">
        <div className="dash-panel-header">CARDIAC READOUTS</div>
        <div className="dash-cardiac-body">
          <CardiacReadouts />
        </div>
      </div>

      {/* ── Bottom Row: INTERHEART Weights ───────────────────────── */}
      <div className="dash-summary-row">
        <div className="panel-card dash-interheart-panel">
          <div className="dash-panel-header">INTERHEART WEIGHTS</div>
          <div className="dash-interheart-list">
            {INTERHEART_FACTORS.map(({ key, label }) => {
              const weight = WEIGHTS[key];
              const pct = (weight / MAX_WEIGHT) * 100;
              return (
                <div key={key} className="dash-interheart-row">
                  <span className="dash-interheart-name">{label}</span>
                  <div className="dash-interheart-bar-track">
                    <div
                      className="dash-interheart-bar-fill"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="dash-interheart-val">{weight.toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── CVD Disease Info Panel (only renders when CVD scenario is active) ── */}
      <CVDInfoPanel />
    </div>
  );
}

/**
 * DashboardHome — Default Landing View
 * ======================================
 * Top row: 4 stat cards (Risk Score, Heart Rate, Blood Pressure, HRV RMSSD)
 * Below: INTERHEART Weights panel + Sensor Status panel side by side
 *
 * UI PASS ONLY — no logic, reads from store.
 */

import React from 'react';
import { useSimStore } from '../../store/simStore';
import { WEIGHTS } from '../../riskEngine';
import { SensorType } from '../../hal/ISensorSource';
import { classifyBP } from '../../lib/bpRanges';
import { CVDInfoPanel } from './CVDInfoPanel';

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

// ── Sensor list ──────────────────────────────────────────────────────────────

const SENSORS: { type: SensorType; label: string }[] = [
  { type: 'ecg',    label: 'ECG' },
  { type: 'ppg',    label: 'PPG' },
  { type: 'bp',     label: 'BP' },
  { type: 'stress', label: 'Stress' },
  { type: 'ppg',    label: 'Motion' },
];

// ── Component ────────────────────────────────────────────────────────────────

export function DashboardHome() {
  const snapshot = useSimStore(s => s.snapshot);
  const riskResult = useSimStore(s => s.riskResult);
  const patientProfile = useSimStore(s => s.patientProfile);

  const band  = riskResult?.band ?? 'Low';
  const score = riskResult?.score ?? 0;
  const hr    = snapshot?.heartRate ?? 0;
  const sys   = snapshot?.systolic ?? 120;
  const dia   = snapshot?.diastolic ?? 80;
  const hrvVal = snapshot?.hrv ?? 0;
  const whoBand = riskResult?.whoRiskBand;

  // Calculate BMI from patient profile
  const height = patientProfile.height ?? 170;
  const weight = patientProfile.weight ?? 70;
  const bmi = weight / Math.pow(height / 100, 2);

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
          <div className="mt-1.5 pt-1.5 border-t border-[var(--border)] text-[10px] text-[var(--text-tertiary)] flex flex-col gap-0.5">
            <span style={{ color: 'var(--risk-low)' }}>Healthy: &lt;120/80 mmHg</span>
            <span style={{ color: sys >= 130 || dia >= 80 ? 'var(--risk-high)' : 'var(--text-tertiary)' }}>
              Risk Threshold: ≥130/80 mmHg
            </span>
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
        </div>
      </div>

      {/* ── WHO South-Asia Reference Panel ─────────────────────────── */}
      <div className="panel-card dash-who-panel">
        <div className="dash-who-panel-header">
          <span className="dash-who-panel-title">WHO SOUTH-ASIA REFERENCE</span>
          <span className="dash-who-panel-sub">(non-lab chart, 2019)</span>
        </div>

        <div className="dash-who-inputs">
          <div className="dash-who-input-item">
            <span className="dash-who-input-label">Age</span>
            <span className="dash-who-input-value">{patientProfile.ageRange ?? '<40'}</span>
          </div>
          <div className="dash-who-input-item">
            <span className="dash-who-input-label">Sex</span>
            <span className="dash-who-input-value">{(patientProfile.sex ?? 'male').toUpperCase()}</span>
          </div>
          <div className="dash-who-input-item">
            <span className="dash-who-input-label">Systolic BP</span>
            <span className="dash-who-input-value">{sys} mmHg</span>
          </div>
          <div className="dash-who-input-item">
            <span className="dash-who-input-label">Smoking</span>
            <span className="dash-who-input-value">{(patientProfile.smoking ?? 'never').toUpperCase()}</span>
          </div>
          <div className="dash-who-input-item">
            <span className="dash-who-input-label">BMI</span>
            <span className="dash-who-input-value">{bmi.toFixed(1)} kg/m²</span>
          </div>
        </div>

        <div className="dash-who-output">
          <span className="dash-who-output-label">10-YEAR CVD RISK BAND</span>
          <span
            className="dash-who-output-value"
            style={{ color: whoBand?.color ?? 'var(--accent)' }}
          >
            {whoBand?.displayLabel ?? '<10% — Low Risk'}
          </span>
        </div>
      </div>

      {/* ── Bottom Row: INTERHEART Weights + Sensor Status ─────────── */}
      <div className="dash-summary-row">
        {/* Left: INTERHEART WEIGHTS panel */}
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

        {/* Right: SENSOR STATUS compact panel */}
        <div className="panel-card dash-sensor-panel">
          <div className="dash-panel-header">SENSOR STATUS</div>
          <div className="dash-sensor-list">
            {SENSORS.map(({ type, label }, i) => (
              <div key={`${type}-${i}`} className="dash-sensor-row">
                <span
                  className="dash-sensor-dot"
                  style={{ background: 'var(--risk-low)' }}
                />
                <span className="dash-sensor-name">{label}</span>
                <span className="dash-sensor-mode">SIMULATED</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CVD Disease Info Panel (only renders when CVD scenario is active) ── */}
      <CVDInfoPanel />
    </div>
  );
}

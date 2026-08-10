/**
 * RiskEnginePage — CAD Risk Engine Breakdown View
 * =================================================
 * Full-width breakdown table with normalized scores, weights, contributions.
 * WHO South-Asia Reference panel below with current patient inputs.
 *
 * UI PASS ONLY — no logic, reads from store.
 */

import React from 'react';
import { useSimStore } from '../../store/simStore';
import { WEIGHTS } from '../../riskEngine';

// ── Risk color helper ────────────────────────────────────────────────────────

function getRiskColor(band: string): string {
  if (band === 'High') return 'var(--risk-high)';
  if (band === 'Moderate') return 'var(--risk-moderate)';
  return 'var(--risk-low)';
}

// ── Table row config ─────────────────────────────────────────────────────────

interface BreakdownRow {
  key: string;
  label: string;
  weightKey: keyof typeof WEIGHTS;
  getValue: (snapshot: any) => string;
  getNormalized: (riskResult: any) => number;
}

const BREAKDOWN_ROWS: BreakdownRow[] = [
  {
    key: 'heartRate',
    label: 'HR',
    weightKey: 'heartRate',
    getValue: (s) => s ? `${s.heartRate} bpm` : '—',
    getNormalized: (r) => r?.rawContributions?.heartRate ?? 0,
  },
  {
    key: 'hrv',
    label: 'HRV',
    weightKey: 'hrv',
    getValue: (s) => s ? `${s.hrv} ms` : '—',
    getNormalized: (r) => r?.rawContributions?.hrv ?? 0,
  },
  {
    key: 'stress',
    label: 'Stress',
    weightKey: 'stress',
    getValue: (s) => s ? `${Math.round(s.stressScore)}` : '—',
    getNormalized: (r) => r?.rawContributions?.stress ?? 0,
  },
  {
    key: 'qtInterval',
    label: 'QTc',
    weightKey: 'qtInterval',
    getValue: (s) => s ? `${s.qtcBazett} ms` : '—',
    getNormalized: (r) => r?.rawContributions?.qtInterval ?? 0,
  },
  {
    key: 'stSegment',
    label: 'ST-Segment',
    weightKey: 'stSegment',
    getValue: (s) => s ? `${s.stSegment.toFixed(2)} mV` : '—',
    getNormalized: (r) => r?.rawContributions?.stSegment ?? 0,
  },
  {
    key: 'metabolicVascular',
    label: 'Metabolic-Vascular ∑(BP+TG+Chol+ApoB)',
    weightKey: 'apoB',
    getValue: (s) => {
      if (!s) return '—';
      return `${s.systolic}/${s.diastolic} · ${s.triglycerides} · ${s.totalCholesterol}`;
    },
    getNormalized: (r) => r?.rawContributions?.apoB ?? 0,
  },
];

// ── Component ────────────────────────────────────────────────────────────────

export function RiskEnginePage() {
  const snapshot = useSimStore(s => s.snapshot);
  const riskResult = useSimStore(s => s.riskResult);
  const patientProfile = useSimStore(s => s.patientProfile);

  const score = riskResult?.score ?? 0;
  const band = riskResult?.band ?? 'Low';
  const whoBand = riskResult?.whoRiskBand;

  // Calculate BMI from patient profile
  const height = patientProfile.height ?? 170;
  const weight = patientProfile.weight ?? 70;
  const bmi = weight / Math.pow(height / 100, 2);

  return (
    <div className="re-page">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="re-page-header">
        <h1 className="re-page-title">CAD RISK ENGINE</h1>
        <p className="re-page-subtitle">
          Weighted composite model — rule-based, INTERHEART-referenced
        </p>
      </div>

      {/* ── Breakdown Table ──────────────────────────────────────── */}
      <div className="re-table-wrap panel-card">
        <table className="re-table">
          <thead>
            <tr className="re-table-head-row">
              <th className="re-th re-th-label">Parameter</th>
              <th className="re-th re-th-value">Current Value</th>
              <th className="re-th re-th-norm">Normalized (0–1)</th>
              <th className="re-th re-th-weight">Weight</th>
              <th className="re-th re-th-contrib">Contribution Pts</th>
            </tr>
          </thead>
          <tbody>
            {BREAKDOWN_ROWS.map((row, i) => {
              const currentValue = row.getValue(snapshot);
              const rawNorm = row.getNormalized(riskResult);
              const normalized = rawNorm / 100;
              const w = WEIGHTS[row.weightKey];
              const contribPts = riskResult?.contributions[row.weightKey as keyof typeof riskResult.contributions] ?? 0;

              return (
                <tr
                  key={row.key}
                  className={`re-table-row ${i % 2 === 0 ? 're-row-even' : 're-row-odd'}`}
                >
                  <td className="re-td re-td-label">{row.label}</td>
                  <td className="re-td re-td-mono">{currentValue}</td>
                  <td className="re-td re-td-mono">{normalized.toFixed(2)}</td>
                  <td className="re-td re-td-mono">{w.toFixed(2)}</td>
                  <td className="re-td re-td-mono">{contribPts}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="re-table-footer-row">
              <td className="re-td re-td-label re-td-total">TOTAL SCORE</td>
              <td className="re-td"></td>
              <td className="re-td"></td>
              <td className="re-td"></td>
              <td className="re-td re-td-mono re-td-total-score" style={{ color: 'var(--accent)' }}>
                {score}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── WHO Reference Panel ──────────────────────────────────── */}
      <div className="re-who-panel panel-card">
        <div className="re-who-panel-header">
          <span className="re-who-panel-title">WHO SOUTH-ASIA REFERENCE</span>
          <span className="re-who-panel-sub">(non-lab chart, 2019)</span>
        </div>

        <div className="re-who-inputs">
          <div className="re-who-input-item">
            <span className="re-who-input-label">Age</span>
            <span className="re-who-input-value">{patientProfile.ageRange ?? '<40'}</span>
          </div>
          <div className="re-who-input-item">
            <span className="re-who-input-label">Sex</span>
            <span className="re-who-input-value">{(patientProfile.sex ?? 'male').toUpperCase()}</span>
          </div>
          <div className="re-who-input-item">
            <span className="re-who-input-label">Systolic BP</span>
            <span className="re-who-input-value">{snapshot?.systolic ?? 120} mmHg</span>
          </div>
          <div className="re-who-input-item">
            <span className="re-who-input-label">Smoking</span>
            <span className="re-who-input-value">{(patientProfile.smoking ?? 'never').toUpperCase()}</span>
          </div>
          <div className="re-who-input-item">
            <span className="re-who-input-label">BMI</span>
            <span className="re-who-input-value">{bmi.toFixed(1)} kg/m²</span>
          </div>
        </div>

        <div className="re-who-output">
          <span className="re-who-output-label">10-year CVD risk band</span>
          <span
            className="re-who-output-value"
            style={{ color: whoBand?.color ?? 'var(--accent)' }}
          >
            {whoBand?.displayLabel ?? '<10% — Low Risk'}
          </span>
        </div>
      </div>
    </div>
  );
}

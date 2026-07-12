/**
 * Sensor Fusion Engine — Layer 4
 * ================================
 * Combines extracted features from all sensors into a single normalized
 * physiological snapshot. Handles cross-sensor consistency and gap-filling.
 *
 * Phase 1: Straightforward aggregation with min-max normalization to 0–100 sub-scales.
 * Phase 3 seam: Replace the normalizeXxx() functions below with a weighted/learned
 *               fusion (e.g. trained regression or Kalman filter) without touching
 *               the CAD Risk Engine or Dashboard above.
 */

import { ECGFeatures, PPGFeatures, BPFeatures, StressFeatures, ExtractedFeatures } from '../features';

// ─── Output: Unified Physiological Snapshot ───────────────────────────────────

export interface PhysiologicalSnapshot {
  // Normalized sub-scales (0–100, higher = more abnormal/risky)
  heartRateIndex: number;      // from ECG/PPG HR
  bpIndex: number;             // from BP readings
  stressIndex: number;         // from stress score
  hrvIndex: number;            // from HRV (inverted: low HRV → high index)
  qtIndex: number;             // from QTc interval
  stIndex: number;             // from ST segment elevation

  // Raw values (for display)
  heartRate: number;
  systolic: number;
  diastolic: number;
  hrv: number;
  stressScore: number;
  qtcBazett: number;
  stSegment: number;
  pulseTransitTime: number;

  // Sensor confidence (1.0 = all sensors present, <1.0 = partial data)
  confidence: number;

  timestamp: number;
}

// ─── Normalization Functions ─────────────────────────────────────────────────
// Phase 3: Replace these with weighted/learned fusion models

function normalizeHeartRate(bpm: number): number {
  // Normal: 60–100 bpm → 0–20. Bradycardia (<60) or Tachycardia (>100) elevates index.
  if (bpm >= 60 && bpm <= 100) return Math.round(((bpm - 60) / 40) * 20);
  if (bpm < 60) return Math.round(((60 - bpm) / 40) * 100);
  return Math.round(Math.min(100, ((bpm - 100) / 100) * 100));
}

function normalizeBP(systolic: number, diastolic: number): number {
  // AHA categories → 0–100 index
  if (systolic >= 180 || diastolic >= 120) return 100;
  if (systolic >= 140 || diastolic >= 90) return 75;
  if (systolic >= 130 || diastolic >= 80) return 50;
  if (systolic >= 120) return 25;
  return 10;
}

function normalizeStress(score: number): number {
  return Math.round(Math.min(100, score));
}

function normalizeHRV(hrv: number): number {
  // RMSSD: >80ms = excellent (index=0), <20ms = poor (index=100)
  return Math.round(Math.max(0, Math.min(100, 100 - (hrv - 10) * (100 / 90))));
}

function normalizeQT(qtcBazett: number): number {
  // QTc: <440ms = normal (0–20), 440–500ms = borderline, >500ms = high risk
  if (qtcBazett <= 440) return Math.round((qtcBazett / 440) * 20);
  if (qtcBazett <= 500) return Math.round(20 + ((qtcBazett - 440) / 60) * 50);
  return Math.round(Math.min(100, 70 + ((qtcBazett - 500) / 100) * 30));
}

function normalizeST(stMv: number): number {
  // ST elevation >0.1mV is concerning, >0.2mV = significant
  const abs = Math.abs(stMv);
  if (abs < 0.05) return 0;
  if (abs < 0.1) return 25;
  if (abs < 0.2) return 60;
  return Math.min(100, Math.round(60 + (abs - 0.2) * 200));
}

// ─── Fusion Entry Point ───────────────────────────────────────────────────────

export function fuseFeatures(features: ExtractedFeatures): PhysiologicalSnapshot {
  const { ecg, ppg, bp, stress } = features;

  // Use ECG HR preferentially; fall back to PPG HR
  const heartRate = ecg?.heartRate ?? ppg?.heartRate ?? 72;
  const hrv = ppg?.hrv ?? ecg?.rrInterval ? 1000 / (ecg!.rrInterval / 1000) : 50;
  const hrv_ms = ppg?.hrv ?? 50;

  const presentSensors = [ecg, ppg, bp, stress].filter(Boolean).length;
  const confidence = presentSensors / 4;

  return {
    heartRateIndex: normalizeHeartRate(heartRate),
    bpIndex: bp ? normalizeBP(bp.systolic, bp.diastolic) : 10,
    stressIndex: stress ? normalizeStress(stress.stressScore) : 30,
    hrvIndex: normalizeHRV(hrv_ms),
    qtIndex: ecg ? normalizeQT(ecg.qtcBazett) : 15,
    stIndex: ecg ? normalizeST(ecg.stSegment) : 0,

    heartRate,
    systolic: bp?.systolic ?? 120,
    diastolic: bp?.diastolic ?? 80,
    hrv: hrv_ms,
    stressScore: stress?.stressScore ?? 30,
    qtcBazett: ecg?.qtcBazett ?? 400,
    stSegment: ecg?.stSegment ?? 0,
    pulseTransitTime: ppg?.pulseTransitTime ?? 250,

    confidence,
    timestamp: features.timestamp,
  };
}

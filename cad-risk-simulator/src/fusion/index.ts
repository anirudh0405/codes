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
import { estimateLipids } from '../features/lipidEstimation';

// ─── Output: Unified Physiological Snapshot ───────────────────────────────────

export interface PhysiologicalSnapshot {
  // Normalized sub-scales (0–100, higher = more abnormal/risky)
  heartRateIndex: number;      // from ECG/PPG HR
  bpIndex: number;             // from BP readings
  stressIndex: number;         // from stress score
  hrvIndex: number;            // from HRV (inverted: low HRV → high index)
  qtIndex: number;             // from QTc interval
  stIndex: number;             // from ST segment elevation

  // Lipid normalized indices (0–100, higher = more cardiovascular risk)
  // These participate in the weighted fusedScore alongside existing indices.
  cholesterolIndex: number;    // from totalCholesterol estimate
  triglycerideIndex: number;   // from triglycerides estimate

  // Raw values (for display)
  heartRate: number;
  systolic: number;
  diastolic: number;
  hrv: number;
  stressScore: number;
  qtcBazett: number;
  stSegment: number;
  pulseTransitTime: number;

  // Lipid raw values (mg/dL, for display in Dashboard readout cards)
  totalCholesterol: number;
  triglycerides: number;

  // Lipid signal confidence (0–1); reduced when motion artifact is detected.
  // Used by Risk Engine to dampen lipid contributions and by Dashboard to
  // show the "low confidence — motion detected" indicator.
  lipidConfidence: number;

  // Cross-sensor motion artifact flag (set by the correlation stage).
  // True when stress > 60 AND hrv < 25, a proxy for sympathetic overdrive /
  // motion-coupled noise in a wearable PPG context.
  // Consumed (not produced) by the lipid estimation path.
  motionArtifactFlag: boolean;

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

/**
 * Normalize total cholesterol to a 0–100 risk index.
 * <200 mg/dL = desirable (low index); 200–239 = borderline; ≥240 = high risk.
 * References: AHA/ACC cholesterol guidelines (2018).
 */
function normalizeCholesterol(chol: number): number {
  if (chol < 200) return Math.round((chol - 120) / 80 * 20);     // 120–199 → 0–20
  if (chol < 240) return Math.round(20 + (chol - 200) / 40 * 40); // 200–239 → 20–60
  return Math.round(Math.min(100, 60 + (chol - 240) / 60 * 40));  // 240–300 → 60–100
}

/**
 * Normalize triglycerides to a 0–100 risk index.
 * <150 mg/dL = normal; 150–199 = borderline; 200–499 = high; ≥500 = very high.
 * References: ATP III / NCEP guidelines.
 */
function normalizeTriglycerides(trig: number): number {
  if (trig < 150) return Math.round((trig - 50) / 100 * 20);      // 50–149 → 0–20
  if (trig < 200) return Math.round(20 + (trig - 150) / 50 * 25); // 150–199 → 20–45
  if (trig < 500) return Math.round(45 + (trig - 200) / 300 * 55); // 200–499 → 45–100
  return 100;
}

// ─── Cross-Sensor Correlation Stage ───────────────────────────────────────────
// Detects possible motion artifact by cross-checking stress and HRV.
// When sympathetic overdrive (high stress) coincides with suppressed HRV
// (low parasympathetic activity), this is consistent with either genuine
// physiological stress OR motion-coupled noise in wearable optical sensors.
//
// This is the "correlation stage" described in the design spec.
// It produces a flag that downstream modules consume — the logic here is NOT
// changed when downstream consumers are updated.
//
// Thresholds chosen to match the "Possible artifact — motion-linked"
// classification pattern: stress > 60 and HRV < 25 ms.

function detectMotionArtifact(stressScore: number, hrv: number): boolean {
  return stressScore > 60 && hrv < 25;
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

  // ── Correlation stage: motion artifact detection ───────────────────────────
  const stressScore = stress?.stressScore ?? 30;
  const motionArtifactFlag = detectMotionArtifact(stressScore, hrv_ms);

  // ── Lipid estimation ──────────────────────────────────────────────────────
  // Morphology features come from the PPG reading. If PPG is unavailable,
  // use safe defaults that produce near-normal lipid estimates with full confidence.
  const morphologyInput = ppg
    ? {
        reflectionIndex:    ppg.reflectionIndex,
        stiffnessIndex:     ppg.stiffnessIndex,
        augmentationIndex:  ppg.augmentationIndex,
      }
    : {
        reflectionIndex:    0.28,
        stiffnessIndex:     6.5,
        augmentationIndex: -0.10,
      };

  const lipids = estimateLipids(morphologyInput, motionArtifactFlag);

  return {
    heartRateIndex: normalizeHeartRate(heartRate),
    bpIndex: bp ? normalizeBP(bp.systolic, bp.diastolic) : 10,
    stressIndex: stress ? normalizeStress(stress.stressScore) : 30,
    hrvIndex: normalizeHRV(hrv_ms),
    qtIndex: ecg ? normalizeQT(ecg.qtcBazett) : 15,
    stIndex: ecg ? normalizeST(ecg.stSegment) : 0,

    // Lipid normalized indices — participate in Risk Engine weighted scoring
    cholesterolIndex:   normalizeCholesterol(lipids.totalCholesterol),
    triglycerideIndex:  normalizeTriglycerides(lipids.triglycerides),

    heartRate,
    systolic: bp?.systolic ?? 120,
    diastolic: bp?.diastolic ?? 80,
    hrv: hrv_ms,
    stressScore: stress?.stressScore ?? 30,
    qtcBazett: ecg?.qtcBazett ?? 400,
    stSegment: ecg?.stSegment ?? 0,
    pulseTransitTime: ppg?.pulseTransitTime ?? 250,

    // Lipid raw values for Dashboard display
    totalCholesterol: lipids.totalCholesterol,
    triglycerides:    lipids.triglycerides,
    lipidConfidence:  lipids.confidence,

    motionArtifactFlag,
    confidence,
    timestamp: features.timestamp,
  };
}

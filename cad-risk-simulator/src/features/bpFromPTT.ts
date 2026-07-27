/**
 * Blood Pressure Estimation from Pulse Transit Time (PTT) — Layer 3
 * ================================================================
 * Regression-based relationship grounded in the Moens-Korteweg equation and
 * Pulse Wave Velocity (PWV) theory:
 *   - Shorter PTT -> Stiffer vessel wall / higher PWV -> Higher Blood Pressure
 *   - Longer PTT -> Compliant vessel wall / lower PWV -> Lower Blood Pressure
 *
 * PROMINENT CLINICAL DISCLAIMER & CALIBRATION NOTICE:
 * --------------------------------------------------
 * This module uses a generic, uncalibrated linear PTT-to-BP regression relationship.
 * In actual clinical applications, PTT-based cuffless blood pressure estimation REQUIRES
 * individual per-subject calibration (e.g. baseline cuff measurement) to establish
 * subject-specific arterial compliance constants. The default calibration coefficients below
 * are PLACEHOLDER / ILLUSTRATIVE ONLY and are NOT clinically validated or diagnostic.
 */

export interface PTTCalibration {
  a: number; // Systolic intercept (mmHg)
  b: number; // Systolic slope (mmHg / ms)
  c: number; // Diastolic intercept (mmHg)
  d: number; // Diastolic slope (mmHg / ms)
}

/** Default uncalibrated population-average regression parameters (illustrative placeholder) */
export const DEFAULT_PTT_CALIBRATION: PTTCalibration = {
  a: 220,  // Baseline systolic intercept
  b: 0.45, // Systolic decay slope with PTT
  c: 135,  // Baseline diastolic intercept
  d: 0.25, // Diastolic decay slope with PTT
};

export interface PTTDerivedBPResult {
  systolic: number;        // mmHg (clamped 80–200)
  diastolic: number;       // mmHg (clamped 50–130)
  ptt: number;             // ms
  confidence: number;      // 0–1 confidence score (dampened during motion artifacts)
  motionArtifactFlag: boolean; // true if signal was degraded by motion
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

/**
 * Estimates Systolic and Diastolic Blood Pressure from Pulse Transit Time (PTT).
 * Incorporates motion artifact classification from the Fusion Engine to reduce
 * confidence when motion is detected ("Dampen, don't discard").
 *
 * @param ptt Pulse Transit Time in milliseconds
 * @param calibration Subject calibration parameters (defaults to population placeholder)
 * @param fusionConfidence Propagated confidence from Fusion Engine (0–1)
 * @param isMotionArtifact True if motion artifact was flagged by Fusion layer
 */
export function estimateBPFromPTT(
  ptt: number,
  calibration: PTTCalibration = DEFAULT_PTT_CALIBRATION,
  fusionConfidence: number = 1.0,
  isMotionArtifact: boolean = false
): PTTDerivedBPResult {
  // Moens-Korteweg regression: BP decreases linearly as PTT increases
  const rawSystolic = calibration.a - calibration.b * ptt;
  const rawDiastolic = calibration.c - calibration.d * ptt;

  const systolic = clamp(rawSystolic, 80, 200);
  const diastolic = clamp(rawDiastolic, 50, 130);

  // Motion-awareness: if motion artifact flagged, dampen confidence score
  let confidence = fusionConfidence;
  if (isMotionArtifact) {
    confidence = Math.min(confidence, 0.45); // reduce confidence on motion-linked cycle
  }

  return {
    systolic,
    diastolic,
    ptt,
    confidence: parseFloat(confidence.toFixed(2)),
    motionArtifactFlag: isMotionArtifact || confidence < 0.70,
  };
}

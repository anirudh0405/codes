/**
 * Lipid Estimation Module
 * =======================
 * Estimates Total Cholesterol and Triglycerides from PPG waveform morphology
 * features extracted by src/features/index.ts.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  ⚠  PLACEHOLDER ESTIMATION FORMULA — NOT CLINICALLY VALIDATED          │
 * │                                                                         │
 * │  This module implements a simple linear/rule-based combination of PPG  │
 * │  morphology indices based on published research correlating arterial   │
 * │  stiffness markers with lipid levels:                                  │
 * │                                                                         │
 * │  • Relation between augmentation index and lipids:                     │
 * │    McEniery et al. (2005) — J Hypertens 23(8):1473–1479               │
 * │  • Stiffness index and cardiovascular risk:                            │
 * │    Millasseau et al. (2002) — Clin Sci 103(4):371–377                 │
 * │  • Reflection index and dyslipidemia:                                  │
 * │    Nürnberger et al. (2002) — J Am Coll Cardiol 40(10):1810–1816      │
 * │                                                                         │
 * │  These correlations are POPULATION-LEVEL associations, NOT direct      │
 * │  measurement. Individual estimates can deviate by ±40–60 mg/dL.       │
 * │                                                                         │
 * │  THIS MODULE MUST BE REPLACED by a properly trained machine-learning   │
 * │  regression model (XGBoost / neural network) in Phase 3, trained on   │
 * │  paired PPG + laboratory lipid panel data from a clinical dataset.     │
 * │                                                                         │
 * │  DO NOT use these estimates for clinical decision-making.              │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Design: Pure functions only — no React, no DOM, no I/O, no side effects.
 * Input/output types are plain data objects, fully unit-testable in isolation.
 */

// ─── Input Feature Subset ─────────────────────────────────────────────────────

/** The subset of PPGFeatures required by the lipid estimator.
 *  Using a structural sub-type keeps this module decoupled from the full
 *  PPGFeatures interface — any object with these three fields is accepted. */
export interface PPGMorphologyInput {
  /** Ratio of diastolic peak to systolic peak amplitude (0–1).
   *  Higher = more wave reflection = stiffer arteries. */
  reflectionIndex: number;

  /** Millasseau stiffness index in m/s.
   *  Healthy: ~5–8. Stiff arteries: ~10+. */
  stiffnessIndex: number;

  /** Augmentation index: (diastolicAmp - notchAmp) / systolicAmp.
   *  Negative = healthy; higher = more reflected-wave contribution. */
  augmentationIndex: number;
}

// ─── Output Type ──────────────────────────────────────────────────────────────

export interface LipidEstimate {
  /** Estimated total cholesterol in mg/dL.
   *  Physiologically clamped to 120–300 mg/dL regardless of formula output. */
  totalCholesterol: number;

  /** Estimated triglycerides in mg/dL.
   *  Physiologically clamped to 50–500 mg/dL regardless of formula output. */
  triglycerides: number;

  /** Signal quality confidence for this cycle (0–1).
   *  1.0 = clean signal; reduced when motion artifact is detected.
   *  Low confidence: estimate is still shown but flagged in the UI. */
  confidence: number;
}

// ─── Physiological Clamp Ranges ───────────────────────────────────────────────
// These bounds prevent nonsensical values during testing while still
// covering the full clinical range of interest.

const CHOL_MIN = 120;  // mg/dL — below this is physiologically implausible
const CHOL_MAX = 300;  // mg/dL — above this is severe hypercholesterolaemia
const TRIG_MIN = 50;   // mg/dL
const TRIG_MAX = 500;  // mg/dL — above this is severe hypertriglyceridaemia

// ─── Confidence Parameters ────────────────────────────────────────────────────

/**
 * Confidence penalty applied when the upstream motion-artifact flag is set.
 * "Dampen, don't discard" — we still show the estimate but at reduced confidence.
 * 0.4 leaves confidence at 0.6 for motion cycles, which is still informative.
 */
const MOTION_CONFIDENCE_PENALTY = 0.40;

// ─── Reference Baselines ─────────────────────────────────────────────────────
// Healthy-adult reference values for each morphology feature.
// The formula shifts away from the healthy-baseline cholesterol/triglyceride
// reference proportionally as each feature deviates from its healthy norm.

const REF = {
  // Healthy reference morphology values (young, low-risk adult)
  reflectionIndex:    0.28,  // diastolic/systolic ~ 0.28 in healthy arteries
  stiffnessIndex:     6.5,   // m/s — Millasseau 2002 healthy mean
  augmentationIndex: -0.10,  // slightly negative in healthy young adults

  // Healthy reference lipid values — starting point for formula
  cholesterol:   180,  // mg/dL — healthy adult mean
  triglycerides: 110,  // mg/dL — healthy adult mean

  // Scale factors: how many mg/dL the estimate shifts per unit deviation
  // from the reference morphology value.
  // Calibrated to produce ≈200–250 mg/dL cholesterol in a stiff-artery profile.
  cholPerRI:   120,    // mg/dL per unit reflectionIndex above ref
  cholPerSI:    10,    // mg/dL per m/s stiffnessIndex above ref
  cholPerAIx:  100,    // mg/dL per unit augmentationIndex above ref

  trigPerRI:    200,   // mg/dL per unit reflectionIndex above ref
  trigPerSI:     8,    // mg/dL per m/s above ref
  trigPerAIx:   80,    // mg/dL per unit augmentationIndex above ref
};

// ─── Main Estimation Function ─────────────────────────────────────────────────

/**
 * Estimate Total Cholesterol and Triglycerides from PPG waveform morphology.
 *
 * Formula structure (linear deviation from healthy reference):
 *
 *   cholesterol  = REF.cholesterol
 *                + (reflectionIndex  - REF.reflectionIndex)  × REF.cholPerRI
 *                + (stiffnessIndex   - REF.stiffnessIndex)   × REF.cholPerSI
 *                + (augmentationIndex - REF.augmentationIndex) × REF.cholPerAIx
 *
 *   triglycerides = REF.triglycerides
 *                 + (reflectionIndex  - REF.reflectionIndex)  × REF.trigPerRI
 *                 + (stiffnessIndex   - REF.stiffnessIndex)   × REF.trigPerSI
 *                 + (augmentationIndex - REF.augmentationIndex) × REF.trigPerAIx
 *
 * Both outputs are clamped to physiological bounds before returning.
 *
 * @param morphology   - PPG morphology features from extractPPGFeatures()
 * @param motionArtifact - true when the upstream motion/correlation check flags
 *                         a possible artifact in the current cycle
 */
export function estimateLipids(
  morphology: PPGMorphologyInput,
  motionArtifact: boolean,
): LipidEstimate {
  const { reflectionIndex, stiffnessIndex, augmentationIndex } = morphology;

  // ── Deviation from healthy reference ──────────────────────────────────────
  const dRI  = reflectionIndex  - REF.reflectionIndex;
  const dSI  = stiffnessIndex   - REF.stiffnessIndex;
  const dAIx = augmentationIndex - REF.augmentationIndex;

  // ── Total Cholesterol estimate ────────────────────────────────────────────
  const rawChol = REF.cholesterol
    + dRI  * REF.cholPerRI
    + dSI  * REF.cholPerSI
    + dAIx * REF.cholPerAIx;

  const totalCholesterol = Math.round(
    Math.max(CHOL_MIN, Math.min(CHOL_MAX, rawChol))
  );

  // ── Triglycerides estimate ────────────────────────────────────────────────
  const rawTrig = REF.triglycerides
    + dRI  * REF.trigPerRI
    + dSI  * REF.trigPerSI
    + dAIx * REF.trigPerAIx;

  const triglycerides = Math.round(
    Math.max(TRIG_MIN, Math.min(TRIG_MAX, rawTrig))
  );

  // ── Confidence ────────────────────────────────────────────────────────────
  // Baseline confidence is 1.0. Motion artifact reduces it by MOTION_CONFIDENCE_PENALTY.
  // This implements "dampen, don't discard" — the estimate is still surfaced
  // but the Dashboard shows a low-confidence indicator so the clinician is aware.
  const confidence = parseFloat(
    (motionArtifact ? 1.0 - MOTION_CONFIDENCE_PENALTY : 1.0).toFixed(2)
  );

  return { totalCholesterol, triglycerides, confidence };
}

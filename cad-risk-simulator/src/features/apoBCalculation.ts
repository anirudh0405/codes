/**
 * ApoB Calculation Module
 * =======================
 * Pure, unit-testable functions for estimating Apolipoprotein B (ApoB) and
 * related lipid panel values from standard clinical chemistry inputs.
 *
 * All functions: no side effects, no I/O, no React/DOM dependencies.
 *
 * Design: Consistent with src/features/lipidEstimation.ts — pure functions only.
 * This module is intentionally decoupled from the sensor pipeline so that it can
 * be driven by both PPG-estimated values (Phase 1) and real lab-report inputs
 * (Phase 2 / WHO risk chart integration).
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  ⚠  ESTIMATED VALUES — NOT A DIRECT LAB MEASUREMENT                   │
 * │                                                                         │
 * │  calculateApoB() uses a published population-level regression of       │
 * │  Non-HDL Cholesterol against directly measured ApoB (mg/dL):           │
 * │                                                                         │
 * │    ApoB (mg/dL) = 0.65 × Non-HDL-C + 6.3                              │
 * │                                                                         │
 * │  Source: Sniderman et al. (2012), "Apolipoprotein B Versus Non-HDL     │
 * │  Cholesterol", JAMA Internal Medicine, 172(10):761–763.                │
 * │  Validated slope = 0.65, intercept = 6.3 mg/dL.                        │
 * │                                                                         │
 * │  Individual estimates can deviate from true ApoB by ±15–25 mg/dL.     │
 * │  Direct ApoB immunoassay (particle count) is more accurate when        │
 * │  available and is preferred for clinical decision-making.               │
 * │                                                                         │
 * │  The Friedewald LDL estimate is unreliable when TG > 400 mg/dL         │
 * │  (VLDL does not equal TG/5 at high triglyceride levels). This module   │
 * │  flags this condition via the `friedewaldValid` boolean.               │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

// ─── Input / Output Types ─────────────────────────────────────────────────────

/** Manual lab-report values entered by the user. */
export interface LabInputs {
  /** Total cholesterol in mg/dL. Clamped to 100–400. */
  totalCholesterol: number;

  /** HDL cholesterol in mg/dL. Clamped to 20–100. */
  hdl: number;

  /**
   * Triglycerides in mg/dL. Clamped to 30–600.
   * Defaults to the PPG-derived estimate from the Fusion layer,
   * but is overridden by the user's lab-report entry once edited.
   */
  triglycerides: number;

  /**
   * True once the user has manually edited the Triglycerides field.
   * When false, the pipeline auto-updates triglycerides from the PPG estimate
   * each tick. When true, the user's value is frozen until they clear it.
   */
  trigsManuallySet: boolean;
}

/** Calculated ApoB-panel outputs derived from LabInputs. */
export interface ApoBPanel {
  /** Non-HDL Cholesterol (mg/dL): totalCholesterol − HDL */
  nonHDL: number;

  /**
   * LDL Cholesterol estimate (mg/dL) via Friedewald equation.
   * LDL = TC − HDL − (TG / 5)
   * Valid only when TG ≤ 400 mg/dL.
   */
  ldl: number;

  /**
   * ApoB estimate (mg/dL) via published Non-HDL regression.
   * Formula: 0.65 × Non-HDL-C + 6.3
   * (Sniderman et al., JAMA Intern Med 2012)
   */
  apoB: number;

  /**
   * False when triglycerides > 400 mg/dL.
   * At high TG, the Friedewald equation overestimates VLDL, making
   * the LDL estimate unreliable. The ApoB estimate is still shown
   * (it depends on Non-HDL only) but LDL is flagged as invalid.
   */
  friedewaldValid: boolean;
}

// ─── Physiological Clamp Ranges ───────────────────────────────────────────────

export const LAB_CLAMPS = {
  totalCholesterol: { min: 100, max: 400 },
  hdl:              { min: 20,  max: 100  },
  triglycerides:    { min: 30,  max: 600  },
} as const;

/** Friedewald equation is invalid above this TG threshold. */
const FRIEDEWALD_TG_LIMIT = 400; // mg/dL

// ─── Pure Calculation Functions ───────────────────────────────────────────────

/**
 * Non-HDL Cholesterol = Total Cholesterol − HDL.
 * Includes all atherogenic lipoprotein fractions (LDL, VLDL, IDL, Lp(a)).
 * AHA recommends Non-HDL as a secondary treatment target.
 */
export function calculateNonHDL(totalCholesterol: number, hdl: number): number {
  return Math.max(0, totalCholesterol - hdl);
}

/**
 * Estimated LDL Cholesterol via the Friedewald equation (mg/dL units).
 * LDL = Total Cholesterol − HDL − (Triglycerides / 5)
 *
 * The TG/5 term estimates VLDL-C under the assumption that VLDL-TG ratio ≈ 5.
 * This assumption breaks down when TG > 400 mg/dL (use `friedewaldValid` flag).
 *
 * Reference: Friedewald WT et al. (1972), Clin Chem 18(6):499–502.
 */
export function calculateLDL(
  totalCholesterol: number,
  hdl: number,
  triglycerides: number,
): number {
  return Math.max(0, totalCholesterol - hdl - triglycerides / 5);
}

/**
 * Estimated ApoB (mg/dL) from Non-HDL Cholesterol using the validated
 * population-level regression formula:
 *
 *   ApoB = 0.65 × Non-HDL-C + 6.3
 *
 * Published regression from Sniderman et al. (2012), JAMA Intern Med
 * 172(10):761–763. Slope = 0.65, intercept = 6.3 mg/dL.
 *
 * ⚠ This is an ESTIMATE, NOT a direct ApoB measurement. Direct immunoassay
 * is more accurate and preferred for clinical decision-making. Individual
 * values may deviate ±15–25 mg/dL from true ApoB.
 */
export function calculateApoB(nonHDL: number): number {
  return 0.65 * nonHDL + 6.3;
}

// ─── Convenience Wrapper ─────────────────────────────────────────────────────

/**
 * Compute the full ApoB panel from LabInputs in one call.
 * All outputs are rounded to 1 decimal place for display.
 */
export function calculateApoBPanel(inputs: Pick<LabInputs, 'totalCholesterol' | 'hdl' | 'triglycerides'>): ApoBPanel {
  const { totalCholesterol, hdl, triglycerides } = inputs;

  const nonHDL           = calculateNonHDL(totalCholesterol, hdl);
  const ldl              = calculateLDL(totalCholesterol, hdl, triglycerides);
  const apoB             = calculateApoB(nonHDL);
  const friedewaldValid  = triglycerides <= FRIEDEWALD_TG_LIMIT;

  return {
    nonHDL:          Math.round(nonHDL * 10) / 10,
    ldl:             Math.round(ldl   * 10) / 10,
    apoB:            Math.round(apoB  * 10) / 10,
    friedewaldValid,
  };
}

// ─── Default Lab Inputs ───────────────────────────────────────────────────────

/**
 * Physiologically normal defaults for a healthy adult.
 * Triglycerides starts at 110 mg/dL — the same healthy-adult reference
 * used by lipidEstimation.ts, so the ApoB card shows a sensible value
 * before the PPG pipeline has produced its first estimate.
 */
export const DEFAULT_LAB_INPUTS: LabInputs = {
  totalCholesterol: 180,
  hdl:              55,
  triglycerides:    110,
  trigsManuallySet: false,
};

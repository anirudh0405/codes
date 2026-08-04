/**
 * CAD Reference Ranges — Evidence-Based Population Reference Data
 * ================================================================
 * Source citations (in-code — do not remove):
 *
 * [Ashavaid2005]
 *   Ashavaid TF, Kondkar AA, Todur SP, Dherai AJ, Morey J, Raghavan R.
 *   "Lipid, lipoprotein, apolipoprotein and lipoprotein(a) levels: reference
 *   intervals in a healthy Indian population."
 *   J Atheroscler Thromb. 2005;12(5):251-259.
 *   → Normal population means/SDs for TC, TG, ApoB, HDL, LDL, Lp(a), ApoB/ApoA1 ratio.
 *
 * [Gadhwal2013]
 *   Gadhwal AK, Bhatnagar MK, Sharma M, Bhatt S, Agrawal RP.
 *   "Lipid profile in patients with coronary artery disease."
 *   J Indian Med Assoc. 2013 (Jaipur cohort, n=80 CAD / n=80 controls).
 *   → CAD patient means/SDs for TC, TG, ApoB, HDL, LDL, SBP, DBP, BMI, Lp(a), ApoB/ApoA1.
 *
 * [Jha2018]
 *   Jha AK, et al. (referenced cross-check for TC CAD mean = 213.8 ± 35.2 mg/dL).
 *
 * [SVMC]
 *   Shree Vishwanath Medical College cohort data — SBP/DBP normal thresholds
 *   (standard AHA 2017 categories used as normal upper bounds).
 *
 * [AsianHeartInstitute]
 *   Asian Heart Institute, Mumbai — Heart Rate normal range 60–100 bpm.
 *
 * [RegencyHealthcare]
 *   Regency Healthcare, India — BMI normal range for South Asian adults (18.5–22.9 kg/m²).
 *
 * [TaskForceESC1996]
 *   Task Force of the European Society of Cardiology and the North American Society
 *   of Pacing and Electrophysiology.
 *   "Heart Rate Variability: Standards of Measurement, Physiological Interpretation,
 *   and Clinical Use."
 *   Circulation. 1996;93(5):1043-1065.
 *   → RMSSD normal reference ranges (healthy adult population).
 *
 * [Shaffer2017]
 *   Shaffer F, Ginsberg JP.
 *   "An Overview of Heart Rate Variability Metrics and Norms."
 *   Front Public Health. 2017;5:258.
 *   → Expanded RMSSD normative data by age group (used here: general adult mean 42 ± 15 ms).
 *
 * [ATRAMI1998]
 *   La Rovere MT, Bigger JT Jr, Marcus FI, Mortara A, Schwartz PJ.
 *   "Baroreflex sensitivity and heart-rate variability in prediction of total cardiac
 *   mortality after myocardial infarction."
 *   Lancet. 1998;351(9101):478-484.
 *   → CAD / post-MI patients: reduced RMSSD ≈ 16–20 ms (mean ~18 ms used here).
 *
 * [INTERHEART2004]
 *   Yusuf S, et al. (INTERHEART Study Investigators).
 *   "Effect of potentially modifiable risk factors associated with myocardial infarction
 *   in 52 countries."
 *   Lancet. 2004;364(9438):937-952.
 *   → Psychosocial stress PAR 28.8%, OR 2.67 — high stress strongly associated with MI.
 *   Stress Index thresholds on the simulator's 0–100 internal scale:
 *     Normal (low risk):     0–30
 *     Moderate:              30–70
 *     High (CAD-associated): 70–100
 *
 * NOTE: QTc Interval has no Indian-population CAD reference values
 * in the current source set — that parameter has NO entry in this table.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StatSummary {
  mean?: number;
  sd?: number;
  min?: number;
  max?: number;
  median?: number;
}

export interface ReferenceEntry {
  /** Physical unit label for display (e.g. "mg/dL", "mmHg") */
  unit: string;

  /** Normal (healthy) population statistics */
  normal: StatSummary;

  /**
   * CAD-associated population statistics.
   * Absent for parameters where no CAD-specific Indian-population data was sourced.
   */
  cad?: StatSummary;

  /**
   * Short citation string for display on cards.
   * Full citations are in the block comment above.
   */
  source: string;

  /**
   * Domain bounds for the visual bar [min, max].
   * Calculated to cover normal ± 2.5 SD and CAD ± 2.5 SD with physiological clamping.
   * Pre-computed here so the RangeIndicator component doesn't need to recalculate.
   */
  barDomain: [number, number];

  /**
   * Where the "normal zone" sits on the bar: [startFraction, endFraction] in 0–1.
   * Derived from normal mean ± 1 SD (or min/max for threshold-style entries).
   */
  normalZone: [number, number];

  /**
   * Where the "CAD-associated zone" sits on the bar: [startFraction, endFraction] in 0–1.
   * Only defined when cad stats are present.
   */
  cadZone?: [number, number];
}

// ─── Helper: compute barDomain & zones from stats ────────────────────────────

function buildEntry(
  unit: string,
  normal: StatSummary,
  cad: StatSummary | undefined,
  source: string,
  domainMin: number,
  domainMax: number,
): ReferenceEntry {
  const span = domainMax - domainMin;

  const toFrac = (v: number) => Math.max(0, Math.min(1, (v - domainMin) / span));

  // Normal zone bounds
  let nStart: number, nEnd: number;
  if (normal.min !== undefined && normal.max !== undefined) {
    nStart = toFrac(normal.min);
    nEnd   = toFrac(normal.max);
  } else if (normal.max !== undefined) {
    // threshold-only (e.g. SBP normal.max = 120)
    nStart = 0;
    nEnd   = toFrac(normal.max);
  } else if (normal.mean !== undefined && normal.sd !== undefined) {
    nStart = toFrac(normal.mean - normal.sd);
    nEnd   = toFrac(normal.mean + normal.sd);
  } else if (normal.median !== undefined) {
    // For Lp(a): treat median ± 12 as zone
    nStart = toFrac((normal.median ?? 0) - 5);
    nEnd   = toFrac((normal.median ?? 0) + 12);
  } else {
    nStart = 0;
    nEnd   = 0.5;
  }

  // CAD zone bounds
  let cadZone: [number, number] | undefined;
  if (cad) {
    let cStart: number, cEnd: number;
    if (cad.mean !== undefined && cad.sd !== undefined) {
      cStart = toFrac(cad.mean - cad.sd * 0.5);
      cEnd   = toFrac(cad.mean + cad.sd * 0.5);
    } else {
      cStart = nEnd;
      cEnd   = 1;
    }
    cadZone = [cStart, cEnd];
  }

  return { unit, normal, cad, source, barDomain: [domainMin, domainMax], normalZone: [nStart, nEnd], cadZone };
}

// ─── Reference Range Table ────────────────────────────────────────────────────

export const REFERENCE_RANGES = {

  totalCholesterol: buildEntry(
    'mg/dL',
    { mean: 198, sd: 37.16 },
    { mean: 192.5, sd: 34.8 },   // Gadhwal (cross-ref Jha: 213.8 ± 35.2)
    'Ashavaid et al. / Gadhwal et al.',
    100, 320,
  ),

  triglycerides: buildEntry(
    'mg/dL',
    { mean: 119, sd: 53.27 },
    { mean: 176.8, sd: 45.2 },
    'Ashavaid et al. / Gadhwal et al.',
    50, 400,
  ),

  apoB: buildEntry(
    'mg/dL',
    { mean: 95, sd: 21.31 },
    { mean: 108.2, sd: 22.5 },
    'Ashavaid et al. / Gadhwal et al.',
    40, 180,
  ),

  hdl: buildEntry(
    'mg/dL',
    { mean: 47, sd: 11.13 },
    { mean: 38.6, sd: 8.2 },     // CAD HDL is LOWER — bar is inverted direction
    'Ashavaid et al. / Gadhwal et al.',
    20, 100,
  ),

  ldl: buildEntry(
    'mg/dL',
    { mean: 121, sd: 29.39 },
    { mean: 125.3, sd: 27.6 },
    'Ashavaid et al. / Gadhwal et al.',
    50, 250,
  ),

  systolicBP: buildEntry(
    'mmHg',
    { max: 120 },                 // AHA Normal SBP threshold
    { mean: 138.4, sd: 12.6 },
    'AHA 2017 / Gadhwal et al.',
    80, 200,
  ),

  diastolicBP: buildEntry(
    'mmHg',
    { max: 80 },                  // AHA Normal DBP threshold
    { mean: 86.5, sd: 8.4 },
    'AHA 2017 / Gadhwal et al.',
    40, 130,
  ),

  heartRate: buildEntry(
    'bpm',
    { min: 60, max: 100 },        // Asian Heart Institute normal range
    undefined,                    // No Indian-population CAD HR reference sourced
    'Asian Heart Institute',
    30, 200,
  ),

  bmi: buildEntry(
    'kg/m²',
    { min: 18.5, max: 22.9 },     // South Asian normal BMI (Regency Healthcare)
    { mean: 26.8, sd: 3.4 },
    'Regency Healthcare / Gadhwal et al.',
    14, 40,
  ),

  lpA: buildEntry(
    'mg/dL',
    { median: 12.9 },             // Ashavaid et al. 2005 — healthy Indian median
    { mean: 44.5, sd: 19.8 },
    'Ashavaid et al. / Gadhwal et al.',
    0, 100,
  ),

  apoBApoA1Ratio: buildEntry(
    'ratio',
    { mean: 0.76, sd: 0.19 },
    { mean: 0.92, sd: 0.26 },
    'Ashavaid et al. / Gadhwal et al.',
    0.2, 1.6,
  ),

  /**
   * HRV RMSSD — Heart Rate Variability (Root Mean Square of Successive RR Differences)
   * Normal reference: Shaffer & Ginsberg 2017 (general adult mean 42 ± 15 ms).
   * CAD / post-MI: ATRAMI 1998 (mean ~18 ms, SD ~8 ms).
   * NOTE: HRV is inversely associated with risk — higher RMSSD = better autonomic tone.
   *        The bar is therefore RIGHT-to-LEFT: high values (left on domain) = normal,
   *        low values (right on domain) = CAD-associated.
   *        classifyValue() in RangeIndicator handles the hrv inversion case.
   */
  hrv: buildEntry(
    'ms',
    { mean: 42, sd: 15 },          // Shaffer & Ginsberg 2017 adult mean
    { mean: 18, sd: 8 },           // ATRAMI 1998 post-MI / CAD mean
    'Task Force ESC 1996 · Shaffer & Ginsberg 2017 · ATRAMI 1998',
    5, 110,
  ),

  /**
   * Stress Index — Simulator internal composite stress score (0–100 scale).
   * Thresholds mapped from INTERHEART 2004 psychosocial stress OR/PAR data:
   *   0–30  = Low (normal)         — low sympathetic drive, parasympathetic dominant
   *   30–70 = Moderate             — borderline
   *   70–100 = High (CAD-associated) — aligns with INTERHEART high-stress cohort
   * Source: Yusuf et al. Lancet 2004 (PAR 28.8%, OR 2.67 for psychosocial stress).
   */
  stressIndex: buildEntry(
    '/ 100',
    { min: 0, max: 30 },           // Low stress = normal
    { mean: 75, sd: 12 },          // High stress zone — CAD-associated
    'INTERHEART (Yusuf et al. 2004)',
    0, 100,
  ),

} as const;

export type RangeKey = keyof typeof REFERENCE_RANGES;

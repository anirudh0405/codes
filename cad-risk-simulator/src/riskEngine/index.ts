/**
 * CAD Risk Engine — Layer 5
 * ==========================
 * Rule-based scoring engine that maps normalized physiological indices to a
 * 0–100 CAD risk score with per-parameter contribution breakdown, updated with
 * evidence-based INTERHEART study relative risk weighting and WHO 2019 South Asia
 * non-laboratory risk chart lookup.
 *
 * Scoring weights sum to 1.0. Weights are adjusted based on INTERHEART relative
 * risk (OR) and Population Attributable Risk (PAR %) data (Yusuf et al., Lancet 2004):
 *
 * 1. apoB: 0.22
 *    INTERHEART: ApoB/ApoA1 ratio is the #1 risk factor for MI (PAR 49.2%, OR 3.25).
 * 2. bloodPressure: 0.22
 *    INTERHEART: Hypertension history/elevated SBP is a primary modifiable factor (PAR 17.9%, OR 2.48).
 * 3. smoking: 0.16
 *    INTERHEART: Current smoking is the #2 risk factor for MI globally (PAR 35.7%, OR 2.87).
 * 4. stress: 0.12
 *    INTERHEART: Psychosocial stress accounts for substantial attributable risk (PAR 28.8%, OR 2.67).
 * 5. heartRate: 0.08
 *    Resting tachycardia reflects sympathetic drive & physical inactivity (INTERHEART protective inverse).
 * 6. hrv: 0.06
 *    Low HRV reflects autonomic dysregulation (sympathetic tone marker).
 * 7. qtInterval: 0.05
 *    Electrophysiological marker for ventricular arrhythmia / ischemic risk.
 * 8. stSegment: 0.05
 *    Acute ST-segment deviation indicating focal myocardial ischemia.
 * 9. totalCholesterol: 0.02
 *    Secondary PPG-derived lipid estimate (dampened weight due to optical estimation).
 * 10. triglycerides: 0.02
 *    Secondary PPG-derived lipid estimate (dampened weight due to optical estimation).
 *
 * Sum = 0.22 + 0.22 + 0.16 + 0.12 + 0.08 + 0.06 + 0.05 + 0.05 + 0.02 + 0.02 = 1.00
 */

import { PhysiologicalSnapshot } from '../fusion';
import { getWHORiskBand, WHORiskBandResult } from './whoRiskChart';

export * from './whoRiskChart';

// ─── Output Types ─────────────────────────────────────────────────────────────

export type RiskBand = 'Low' | 'Moderate' | 'High';

export interface RiskContributions {
  bloodPressure: number;    // 0–100 sub-score (SBP + hypertension history)
  apoB: number;             // 0–100 sub-score (ApoB level - INTERHEART #1 factor)
  smoking: number;          // 0–100 sub-score (Smoking status - INTERHEART #2 factor)
  stress: number;           // 0–100 sub-score (Psychosocial stress)
  heartRate: number;        // 0–100 sub-score
  hrv: number;              // 0–100 sub-score
  qtInterval: number;       // 0–100 sub-score
  stSegment: number;        // 0–100 sub-score
  totalCholesterol: number; // PPG-morphology estimated
  triglycerides: number;    // PPG-morphology estimated
}

export interface RiskResult {
  score: number;                    // 0–100 total CAD risk score
  band: RiskBand;                   // Low / Moderate / High
  contributions: RiskContributions; // per-parameter scores (weighted, sum ≈ score)
  rawContributions: RiskContributions; // unweighted (0–100 each, for display)
  confidence: number;               // propagated from Fusion layer
  timestamp: number;

  /** True when lipidConfidence < LIPID_LOW_CONFIDENCE_THRESHOLD.
   *  Surfaced in the Dashboard to show "estimate uncertain — motion detected"
   *  on the two lipid readout cards. */
  lipidUncertainFlag: boolean;

  /** The lipid confidence value propagated from the Fusion layer (0–1). */
  lipidConfidence: number;

  /** WHO 2019 non-laboratory-based 10-year CVD Risk Band for South Asia. */
  whoRiskBand: WHORiskBandResult;

  /**
   * Lipoprotein(a) [Lp(a)] in mg/dL — passed through from the lab input for
   * downstream consumers (e.g. future scoring pass, export, analytics).
   * Not included in the current weighted score; staged here for Phase 2.
   * Lp(a) is genetically determined and cannot be estimated from sensor data.
   */
  lpa?: number;
}

// ─── Patient Profile Context for Scoring ──────────────────────────────────────

export interface PatientProfileContext {
  ageRange?: string;
  sex?: 'male' | 'female';
  smoking?: 'never' | 'former' | 'current';
  hypertensionHistory?: boolean;
  height?: number; // cm
  weight?: number; // kg
}

// ─── Scoring Weights (INTERHEART-Justified) ──────────────────────────────────
// Weights sum to 1.00 exactly.

export const WEIGHTS: Record<keyof RiskContributions, number> = {
  // INTERHEART #1 Factor: ApoB/ApoA1 ratio (PAR 49.2%, OR 3.25)
  apoB: 0.22,

  // INTERHEART Primary Modifiable Factor: Hypertension history & elevated SBP (PAR 17.9%, OR 2.48)
  bloodPressure: 0.22,

  // INTERHEART #2 Factor: Current smoking (PAR 35.7%, OR 2.87)
  smoking: 0.16,

  // INTERHEART Major Risk Factor: Psychosocial stress (PAR 28.8%, OR 2.67)
  stress: 0.12,

  // Sympathetic tone / resting tachycardia (inverse of physical activity protection)
  heartRate: 0.08,

  // Autonomic tone / Parasympathetic withdrawal
  hrv: 0.06,

  // Electrophysiological ischemia / arrhythmia risk marker
  qtInterval: 0.05,

  // Focal acute myocardial ischemia marker
  stSegment: 0.05,

  // Secondary PPG-derived lipid estimate (optical estimate)
  totalCholesterol: 0.02,

  // Secondary PPG-derived lipid estimate (optical estimate)
  triglycerides: 0.02,
};

// ─── Lipid Confidence Threshold ────────────────────────────────────────────────

const LIPID_LOW_CONFIDENCE_THRESHOLD = 0.70;

// ─── Risk Band Classification ─────────────────────────────────────────────────

function classifyBand(score: number): RiskBand {
  if (score >= 65) return 'High';
  if (score >= 35) return 'Moderate';
  return 'Low';
}

// ─── Sub-Score Rules ──────────────────────────────────────────────────────────

function rawCholesterolContribution(totalCholesterol: number): number {
  if (totalCholesterol >= 240) return 80;   // high risk
  if (totalCholesterol >= 200) return 45;   // borderline
  return 15;                                // desirable
}

function rawTriglycerideContribution(triglycerides: number): number {
  if (triglycerides >= 500) return 100;  // very high
  if (triglycerides >= 200) return 70;   // high
  if (triglycerides >= 150) return 35;   // borderline
  return 10;                             // normal
}

function rawApoBContribution(apoB: number): number {
  if (apoB >= 130) return 90;  // high cardiovascular risk
  if (apoB >= 100) return 60;  // moderate risk
  if (apoB >= 80) return 30;   // optimal/desirable
  return 15;
}

function rawSmokingContribution(smoking?: 'never' | 'former' | 'current'): number {
  if (smoking === 'current') return 90; // Current smoker: high risk multiplier
  if (smoking === 'former') return 40;  // Former smoker: intermediate risk
  return 10;                             // Non-smoker: low baseline
}

function parseAge(ageRange?: string): number {
  switch (ageRange) {
    case '<40': return 35;
    case '40-49': return 45;
    case '50-59': return 55;
    case '60-69': return 65;
    case '70+': return 72;
    default: return 55;
  }
}

// ─── Main Scoring Function ────────────────────────────────────────────────────

export function scoreFromSnapshot(
  snapshot: PhysiologicalSnapshot & { apoB?: number },
  profile?: PatientProfileContext
): RiskResult {
  const lipidConfidence = snapshot.lipidConfidence ?? 1.0;
  const isLipidLowConfidence = lipidConfidence < LIPID_LOW_CONFIDENCE_THRESHOLD;

  // ── Raw (unweighted) contributions 0–100 each ─────────────────────────────
  const rawChol = rawCholesterolContribution(snapshot.totalCholesterol ?? 180);
  const rawTrig = rawTriglycerideContribution(snapshot.triglycerides ?? 110);

  const dampedChol = Math.round(rawChol * lipidConfidence);
  const dampedTrig = Math.round(rawTrig * lipidConfidence);

  const rawApoBVal = rawApoBContribution(snapshot.apoB ?? 90);
  const rawSmokingVal = rawSmokingContribution(profile?.smoking);

  // BP index enhanced with diagnosed hypertension history (+15 if diagnosed)
  let rawBPVal = snapshot.bpIndex;
  if (profile?.hypertensionHistory) {
    rawBPVal = Math.min(100, rawBPVal + 15);
  }

  const rawContributions: RiskContributions = {
    apoB:             rawApoBVal,
    bloodPressure:    rawBPVal,
    smoking:          rawSmokingVal,
    stress:           snapshot.stressIndex,
    heartRate:        snapshot.heartRateIndex,
    hrv:              snapshot.hrvIndex,
    qtInterval:       snapshot.qtIndex,
    stSegment:        snapshot.stIndex,
    totalCholesterol: dampedChol,
    triglycerides:    dampedTrig,
  };

  // ── Weighted contributions ────────────────────────────────────────────────
  const contributions: RiskContributions = {
    apoB:             Math.round(rawContributions.apoB             * WEIGHTS.apoB),
    bloodPressure:    Math.round(rawContributions.bloodPressure    * WEIGHTS.bloodPressure),
    smoking:          Math.round(rawContributions.smoking          * WEIGHTS.smoking),
    stress:           Math.round(rawContributions.stress           * WEIGHTS.stress),
    heartRate:        Math.round(rawContributions.heartRate        * WEIGHTS.heartRate),
    hrv:              Math.round(rawContributions.hrv              * WEIGHTS.hrv),
    qtInterval:       Math.round(rawContributions.qtInterval       * WEIGHTS.qtInterval),
    stSegment:        Math.round(rawContributions.stSegment        * WEIGHTS.stSegment),
    totalCholesterol: Math.round(rawContributions.totalCholesterol * WEIGHTS.totalCholesterol),
    triglycerides:    Math.round(rawContributions.triglycerides    * WEIGHTS.triglycerides),
  };

  const score = Math.min(
    100,
    Object.values(contributions).reduce((sum, v) => sum + v, 0),
  );

  // ── Calculate WHO South Asia 2019 Non-Lab Risk Band ──────────────────────
  const age = parseAge(profile?.ageRange);
  const sex = profile?.sex ?? 'male';
  const systolicBP = snapshot.systolic ?? 120;
  const smokingStatus = profile?.smoking ?? 'never';

  const height = profile?.height ?? 170; // cm
  const weight = profile?.weight ?? 70;  // kg
  const bmi = weight / Math.pow(height / 100, 2);

  const whoRiskBand = getWHORiskBand(age, sex, systolicBP, smokingStatus, bmi);

  return {
    score: Math.round(score),
    band: classifyBand(score),
    contributions,
    rawContributions,
    confidence: snapshot.confidence,
    timestamp: snapshot.timestamp,
    lipidUncertainFlag: isLipidLowConfidence,
    lipidConfidence,
    whoRiskBand,
    // Lp(a) passthrough — not scored yet; available for Phase 2 weighting.
    lpa: (snapshot as { lpa?: number }).lpa,
  };
}

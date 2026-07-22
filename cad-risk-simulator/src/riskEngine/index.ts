/**
 * CAD Risk Engine — Layer 5
 * ==========================
 * Rule-based scoring engine that maps normalized physiological indices to a
 * 0–100 CAD risk score with per-parameter contribution breakdown.
 *
 * This is isolated in a single module so that swapping to an ML-based model
 * (Random Forest, XGBoost, neural network — per Phase 3/§15 of the design doc)
 * requires changing ONLY this file. The interface (RiskResult) stays the same.
 *
 * Phase 3 swap: Replace the scoreFromSnapshot() implementation below with a
 *               model.predict() call. No other code changes needed.
 *
 * Scoring weights (sum to 1.0):
 *   Heart Rate:        0.18
 *   Blood Pressure:    0.28  ← highest weight (strongest CAD predictor)
 *   HRV:               0.18
 *   Stress:            0.14
 *   QT Interval:       0.09
 *   ST Segment:        0.05
 *   Total Cholesterol: 0.05  ← PPG morphology-estimated (see lipidEstimation.ts)
 *   Triglycerides:     0.03  ← PPG morphology-estimated (see lipidEstimation.ts)
 *
 * The lipid contributions are dampened when lipidConfidence is low (motion
 * artifact detected). This implements "dampen, don't discard" — the estimates
 * still contribute to the score but at a reduced magnitude, and a flag is
 * surfaced for the Dashboard to show an uncertainty indicator.
 */

import { PhysiologicalSnapshot } from '../fusion';

// ─── Output Types ─────────────────────────────────────────────────────────────

export type RiskBand = 'Low' | 'Moderate' | 'High';

export interface RiskContributions {
  heartRate: number;        // 0–100 sub-score for this parameter
  bloodPressure: number;
  hrv: number;
  stress: number;
  qtInterval: number;
  stSegment: number;
  totalCholesterol: number; // PPG-morphology estimated (see disclaimer in lipidEstimation.ts)
  triglycerides: number;    // PPG-morphology estimated (see disclaimer in lipidEstimation.ts)
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
}

// ─── Scoring Weights ─────────────────────────────────────────────────────────
// Weights sum to 1.0. Lipid weights were added at 0.05 + 0.03 = 0.08, with
// existing weights proportionally reduced to maintain the sum invariant.

export const WEIGHTS: Record<keyof RiskContributions, number> = {
  heartRate:        0.18,
  bloodPressure:    0.28,
  hrv:              0.18,
  stress:           0.14,
  qtInterval:       0.09,
  stSegment:        0.05,
  totalCholesterol: 0.05,  // equal-weight default per spec (step 4)
  triglycerides:    0.03,  // lower weight as these are estimated, not measured
};

// ─── Lipid Confidence Threshold ────────────────────────────────────────────────
// Below this threshold the lipid contributions are dampened and the Dashboard
// uncertainty flag is set.

const LIPID_LOW_CONFIDENCE_THRESHOLD = 0.70;

// ─── Risk Band Classification ─────────────────────────────────────────────────

function classifyBand(score: number): RiskBand {
  if (score >= 65) return 'High';
  if (score >= 35) return 'Moderate';
  return 'Low';
}

// ─── Lipid Additive Threshold Rules ──────────────────────────────────────────
// Simple rule-based bonus on top of the normalized index, consistent with the
// additive point-based pattern used by existing HR/BP/Stress/HRV/QT rules.

/**
 * Raw cholesterol contribution (0–100) based on clinical thresholds.
 * AHA guidelines: <200 = desirable, 200–239 = borderline, ≥240 = high.
 */
function rawCholesterolContribution(totalCholesterol: number): number {
  if (totalCholesterol >= 240) return 80;   // high risk
  if (totalCholesterol >= 200) return 45;   // borderline
  return 15;                                // desirable
}

/**
 * Raw triglyceride contribution (0–100) based on clinical thresholds.
 * NCEP ATP III: <150 = normal, 150–199 = borderline, 200–499 = high, ≥500 = very high.
 */
function rawTriglycerideContribution(triglycerides: number): number {
  if (triglycerides >= 500) return 100;  // very high
  if (triglycerides >= 200) return 70;   // high — adds points per spec
  if (triglycerides >= 150) return 35;   // borderline
  return 10;                             // normal
}

// ─── Main Scoring Function ────────────────────────────────────────────────────

export function scoreFromSnapshot(snapshot: PhysiologicalSnapshot): RiskResult {
  const lipidConfidence = snapshot.lipidConfidence ?? 1.0;
  const isLipidLowConfidence = lipidConfidence < LIPID_LOW_CONFIDENCE_THRESHOLD;

  // ── Raw (unweighted) contributions 0–100 each ─────────────────────────────
  const rawChol = rawCholesterolContribution(snapshot.totalCholesterol ?? 180);
  const rawTrig = rawTriglycerideContribution(snapshot.triglycerides ?? 110);

  // Apply confidence dampening to lipid contributions:
  // "Dampen, don't discard" — when signal quality is low, contributions shrink
  // proportionally to lipidConfidence, but never disappear entirely.
  const dampedChol = Math.round(rawChol * lipidConfidence);
  const dampedTrig = Math.round(rawTrig * lipidConfidence);

  const rawContributions: RiskContributions = {
    heartRate:        snapshot.heartRateIndex,
    bloodPressure:    snapshot.bpIndex,
    hrv:              snapshot.hrvIndex,
    stress:           snapshot.stressIndex,
    qtInterval:       snapshot.qtIndex,
    stSegment:        snapshot.stIndex,
    totalCholesterol: dampedChol,
    triglycerides:    dampedTrig,
  };

  // ── Weighted contributions ────────────────────────────────────────────────
  const contributions: RiskContributions = {
    heartRate:        Math.round(rawContributions.heartRate        * WEIGHTS.heartRate),
    bloodPressure:    Math.round(rawContributions.bloodPressure    * WEIGHTS.bloodPressure),
    hrv:              Math.round(rawContributions.hrv              * WEIGHTS.hrv),
    stress:           Math.round(rawContributions.stress           * WEIGHTS.stress),
    qtInterval:       Math.round(rawContributions.qtInterval       * WEIGHTS.qtInterval),
    stSegment:        Math.round(rawContributions.stSegment        * WEIGHTS.stSegment),
    totalCholesterol: Math.round(rawContributions.totalCholesterol * WEIGHTS.totalCholesterol),
    triglycerides:    Math.round(rawContributions.triglycerides    * WEIGHTS.triglycerides),
  };

  const score = Math.min(
    100,
    Object.values(contributions).reduce((sum, v) => sum + v, 0),
  );

  return {
    score: Math.round(score),
    band: classifyBand(score),
    contributions,
    rawContributions,
    confidence: snapshot.confidence,
    timestamp: snapshot.timestamp,
    lipidUncertainFlag: isLipidLowConfidence,
    lipidConfidence,
  };
}


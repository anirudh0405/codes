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
 *   Heart Rate:    0.20
 *   Blood Pressure:0.30  ← highest weight (strongest CAD predictor)
 *   HRV:           0.20
 *   Stress:        0.15
 *   QT Interval:   0.10
 *   ST Segment:    0.05
 */

import { PhysiologicalSnapshot } from '../fusion';

// ─── Output Types ─────────────────────────────────────────────────────────────

export type RiskBand = 'Low' | 'Moderate' | 'High';

export interface RiskContributions {
  heartRate: number;    // 0–100 sub-score for this parameter
  bloodPressure: number;
  hrv: number;
  stress: number;
  qtInterval: number;
  stSegment: number;
}

export interface RiskResult {
  score: number;                   // 0–100 total CAD risk score
  band: RiskBand;                  // Low / Moderate / High
  contributions: RiskContributions; // per-parameter scores (weighted, sum = score)
  rawContributions: RiskContributions; // unweighted (0–100 each, for display)
  confidence: number;              // propagated from Fusion layer
  timestamp: number;
}

// ─── Scoring Weights ─────────────────────────────────────────────────────────

const WEIGHTS: Record<keyof RiskContributions, number> = {
  heartRate: 0.20,
  bloodPressure: 0.30,
  hrv: 0.20,
  stress: 0.15,
  qtInterval: 0.10,
  stSegment: 0.05,
};

// ─── Risk Band Classification ─────────────────────────────────────────────────

function classifyBand(score: number): RiskBand {
  if (score >= 65) return 'High';
  if (score >= 35) return 'Moderate';
  return 'Low';
}

// ─── Main Scoring Function ────────────────────────────────────────────────────

export function scoreFromSnapshot(snapshot: PhysiologicalSnapshot): RiskResult {
  const rawContributions: RiskContributions = {
    heartRate: snapshot.heartRateIndex,
    bloodPressure: snapshot.bpIndex,
    hrv: snapshot.hrvIndex,
    stress: snapshot.stressIndex,
    qtInterval: snapshot.qtIndex,
    stSegment: snapshot.stIndex,
  };

  // Weighted contributions (each 0–100, scaled by weight)
  const contributions: RiskContributions = {
    heartRate: Math.round(rawContributions.heartRate * WEIGHTS.heartRate),
    bloodPressure: Math.round(rawContributions.bloodPressure * WEIGHTS.bloodPressure),
    hrv: Math.round(rawContributions.hrv * WEIGHTS.hrv),
    stress: Math.round(rawContributions.stress * WEIGHTS.stress),
    qtInterval: Math.round(rawContributions.qtInterval * WEIGHTS.qtInterval),
    stSegment: Math.round(rawContributions.stSegment * WEIGHTS.stSegment),
  };

  const score = Math.min(
    100,
    Object.values(contributions).reduce((sum, v) => sum + v, 0)
  );

  return {
    score: Math.round(score),
    band: classifyBand(score),
    contributions,
    rawContributions,
    confidence: snapshot.confidence,
    timestamp: snapshot.timestamp,
  };
}

export { WEIGHTS };

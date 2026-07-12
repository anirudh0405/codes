/**
 * Stress Score Generator
 * ======================
 * Derives a composite stress score from HRV (inversely correlated) and
 * a simulated electrodermal activity (EDA/GSR) proxy.
 *
 * Phase 2: Real EDA sensor (e.g. Grove GSR) connected via BLE will feed raw
 *          skin conductance values into this module, replacing the random proxy.
 */

export interface StressRawData {
  stressScore: number;    // 0–100 (0 = relaxed, 100 = extreme stress)
  hrv: number;            // ms RMSSD (lower HRV → higher stress)
  edaProxy: number;       // 0–1 (skin conductance simulation)
  autonomicIndex: number; // 0–100 (sympathetic dominance)
}

interface StressParams {
  hrv?: number;           // ms
  baseStress?: number;    // 0–100 manual override
}

export function generateStress(params: StressParams = {}): StressRawData {
  const { hrv = 50, baseStress } = params;

  // EDA proxy: random variation around a mean driven by HRV (low HRV → high EDA)
  const edaMean = 1 - Math.min(hrv / 120, 1); // normalize HRV 0–120ms → EDA 1→0
  const edaProxy = Math.max(0, Math.min(1, edaMean + (Math.random() - 0.5) * 0.2));

  // HRV contribution: < 20ms = very stressed, > 80ms = relaxed
  const hrvStress = Math.max(0, Math.min(100, 100 - (hrv - 10) * (90 / 90)));

  // Autonomic index: sympathetic/parasympathetic balance
  const autonomicIndex = Math.round(edaProxy * 60 + hrvStress * 0.4);

  // Composite stress score
  const computed = Math.round(hrvStress * 0.6 + edaProxy * 100 * 0.4);
  const stressScore = baseStress !== undefined
    ? Math.max(0, Math.min(100, baseStress + (Math.random() - 0.5) * 5))
    : Math.max(0, Math.min(100, computed));

  return {
    stressScore: Math.round(stressScore),
    hrv,
    edaProxy,
    autonomicIndex: Math.min(100, autonomicIndex),
  };
}

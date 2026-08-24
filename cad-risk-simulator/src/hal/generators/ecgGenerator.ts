/**
 * ECG Waveform & Feature Generator
 * =================================
 * Generates a synthetic QRS-complex ECG waveform using a parametric model
 * based on the sum-of-Gaussians approach (McSharry et al., 2003 simplified).
 *
 * Supports two rhythm modes:
 *   - 'sinus' (default): Normal sinus rhythm with consistent PQRST morphology
 *   - 'afib': Atrial fibrillation — no P waves, fibrillatory baseline, irregular RR intervals
 *
 * ALL synthetic ECG data generation lives here — no other module may produce fake ECG data.
 *
 * Phase 2: This file is replaced by actual ADC buffer parsing from the ECG sensor MCU.
 */

export interface ECGRawData {
  waveform: number[];          // 250 samples at ~250Hz (1 second of data)
  heartRate: number;           // bpm
  qtInterval: number;          // ms
  stSegment: number;           // mV offset from baseline
  qrsDuration: number;         // ms
  rrInterval: number;          // ms
}

interface ECGParams {
  heartRate?: number;          // bpm (40–200)
  stElevation?: number;        // mV (-0.5 to +0.5)
  qtInterval?: number;         // ms (300–600)
  noiseLevel?: number;         // 0–1
  rhythm?: 'sinus' | 'afib';   // ECG rhythm mode
}

/** Gaussian pulse centered at `center` with amplitude `amp` and width `sigma` */
function gaussian(t: number, center: number, amp: number, sigma: number): number {
  return amp * Math.exp(-((t - center) ** 2) / (2 * sigma ** 2));
}

/** Generate one full sinus rhythm ECG waveform cycle (PQRST) */
function generateSinusCycle(params: ECGParams): number[] {
  const { heartRate = 72, stElevation = 0, noiseLevel = 0.02 } = params;
  const samplesPerBeat = Math.round(60000 / heartRate / 4); // ~250Hz
  const samples = new Array(samplesPerBeat).fill(0);

  for (let i = 0; i < samplesPerBeat; i++) {
    const t = i / samplesPerBeat;
    // P wave
    const p = gaussian(t, 0.15, 0.15, 0.04);
    // Q wave
    const q = gaussian(t, 0.38, -0.12, 0.012);
    // R wave (dominant)
    const r = gaussian(t, 0.42, 1.2, 0.018);
    // S wave
    const s = gaussian(t, 0.46, -0.25, 0.012);
    // T wave (affected by ST elevation)
    const t_wave = gaussian(t, 0.65, 0.35 + stElevation * 0.5, 0.055);
    // Baseline wander
    const baseline = stElevation * gaussian(t, 0.55, 1, 0.15);
    // Noise
    const noise = (Math.random() - 0.5) * noiseLevel;

    samples[i] = p + q + r + s + t_wave + baseline + noise;
  }
  return samples;
}

/**
 * Generate one AF (atrial fibrillation) ECG waveform cycle.
 * Key differences from sinus rhythm:
 *   - No P wave (atrial depolarization is chaotic)
 *   - Fibrillatory baseline (low-amplitude irregular oscillations replacing P wave)
 *   - QRS and T wave morphology preserved (ventricular conduction usually normal)
 *   - Beat length varied externally via rrVariation for irregular RR intervals
 */
function generateAFibCycle(params: ECGParams, rrVariation: number): number[] {
  const { heartRate = 118, stElevation = 0, noiseLevel = 0.03 } = params;
  // Apply RR variation: ±20% randomness to simulate irregular ventricular response
  const adjustedHR = heartRate * rrVariation;
  const samplesPerBeat = Math.max(20, Math.round(60000 / adjustedHR / 4));
  const samples = new Array(samplesPerBeat).fill(0);

  for (let i = 0; i < samplesPerBeat; i++) {
    const t = i / samplesPerBeat;

    // NO P wave — replaced with fibrillatory baseline
    // Fibrillatory waves: irregular low-amplitude oscillations (0.05–0.1 mV)
    const fibFreq1 = 6 + Math.random() * 4;  // 6–10 Hz oscillation
    const fibFreq2 = 3 + Math.random() * 3;  // 3–6 Hz secondary
    const fibAmp = 0.04 + Math.random() * 0.06; // 0.04–0.1 mV
    const fib = fibAmp * (
      Math.sin(2 * Math.PI * fibFreq1 * t) * 0.6 +
      Math.sin(2 * Math.PI * fibFreq2 * t + Math.random() * Math.PI) * 0.4
    );

    // Q wave
    const q = gaussian(t, 0.38, -0.12, 0.012);
    // R wave (dominant — preserved in AF)
    const r = gaussian(t, 0.42, 1.2, 0.018);
    // S wave
    const s = gaussian(t, 0.46, -0.25, 0.012);
    // T wave (preserved in AF)
    const t_wave = gaussian(t, 0.65, 0.35 + stElevation * 0.5, 0.055);
    // Baseline wander
    const baseline = stElevation * gaussian(t, 0.55, 1, 0.15);
    // Slightly more noise in AF (chaotic atrial activity)
    const noise = (Math.random() - 0.5) * (noiseLevel * 1.5);

    samples[i] = fib + q + r + s + t_wave + baseline + noise;
  }
  return samples;
}

export function generateECG(params: ECGParams = {}): ECGRawData {
  const {
    heartRate = 72,
    stElevation = 0,
    qtInterval = 400,
    noiseLevel = 0.02,
    rhythm = 'sinus',
  } = params;

  const waveform: number[] = [];

  if (rhythm === 'afib') {
    // AF mode: each beat gets a different RR interval (±20% variation)
    while (waveform.length < 250) {
      const rrVariation = 0.8 + Math.random() * 0.4; // 0.8–1.2 multiplier
      const cycle = generateAFibCycle({ heartRate, stElevation, noiseLevel, rhythm }, rrVariation);
      waveform.push(...cycle);
    }
  } else {
    // Sinus rhythm (default) — unchanged behavior
    const cycle = generateSinusCycle({ heartRate, stElevation, noiseLevel });
    while (waveform.length < 250) {
      waveform.push(...cycle);
    }
  }

  const rrInterval = Math.round(60000 / heartRate);
  const qrsDuration = 80 + Math.round(Math.random() * 20); // 80–100ms

  return {
    waveform: waveform.slice(0, 250),
    heartRate,
    qtInterval,
    stSegment: stElevation,
    qrsDuration,
    rrInterval,
  };
}


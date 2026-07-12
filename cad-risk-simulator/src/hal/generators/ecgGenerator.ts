/**
 * ECG Waveform & Feature Generator
 * =================================
 * Generates a synthetic QRS-complex ECG waveform using a parametric model
 * based on the sum-of-Gaussians approach (McSharry et al., 2003 simplified).
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
}

/** Gaussian pulse centered at `center` with amplitude `amp` and width `sigma` */
function gaussian(t: number, center: number, amp: number, sigma: number): number {
  return amp * Math.exp(-((t - center) ** 2) / (2 * sigma ** 2));
}

/** Generate one full ECG waveform cycle (PQRST) */
function generateQRSCycle(params: ECGParams): number[] {
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

export function generateECG(params: ECGParams = {}): ECGRawData {
  const {
    heartRate = 72,
    stElevation = 0,
    qtInterval = 400,
    noiseLevel = 0.02,
  } = params;

  // Build ~250 samples (1 second) by repeating beats
  const cycle = generateQRSCycle({ heartRate, stElevation, noiseLevel });
  const waveform: number[] = [];
  while (waveform.length < 250) {
    waveform.push(...cycle);
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

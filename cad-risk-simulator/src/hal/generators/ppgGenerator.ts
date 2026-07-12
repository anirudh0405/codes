/**
 * PPG Waveform & Feature Generator
 * =================================
 * Generates a synthetic photoplethysmography (PPG) waveform using a dual-Gaussian
 * model simulating the systolic and diastolic peaks of the pulse wave.
 *
 * ALL synthetic PPG data generation lives here.
 *
 * Phase 2: This file is replaced by actual optical sensor (e.g. MAX30102) data parsing.
 */

export interface PPGRawData {
  waveform: number[];         // 100 samples at ~100Hz (1 second of data)
  heartRate: number;          // bpm
  hrv: number;                // RMSSD in ms
  pulseTransitTime: number;   // ms (proxy for BP estimation)
  pulseWaveAmplitude: number; // normalized 0–1
}

interface PPGParams {
  heartRate?: number;         // bpm
  hrv?: number;               // ms RMSSD
  perfusionIndex?: number;    // 0–1 (amplitude proxy)
  noiseLevel?: number;
}

function gaussian(t: number, center: number, amp: number, sigma: number): number {
  return amp * Math.exp(-((t - center) ** 2) / (2 * sigma ** 2));
}

function generatePPGCycle(params: PPGParams): number[] {
  const { heartRate = 72, perfusionIndex = 0.7, noiseLevel = 0.01 } = params;
  const samplesPerBeat = Math.round(6000 / heartRate); // at 100Hz

  return Array.from({ length: samplesPerBeat }, (_, i) => {
    const t = i / samplesPerBeat;
    // Systolic peak
    const systolic = gaussian(t, 0.2, perfusionIndex, 0.05);
    // Dicrotic notch dip
    const notch = gaussian(t, 0.45, -0.05 * perfusionIndex, 0.02);
    // Diastolic peak (smaller)
    const diastolic = gaussian(t, 0.55, 0.25 * perfusionIndex, 0.06);
    // Baseline (slow decay)
    const baseline = perfusionIndex * 0.1 * (1 - t);
    const noise = (Math.random() - 0.5) * noiseLevel;
    return systolic + notch + diastolic + baseline + noise;
  });
}

export function generatePPG(params: PPGParams = {}): PPGRawData {
  const {
    heartRate = 72,
    hrv = 50,
    perfusionIndex = 0.7,
    noiseLevel = 0.01,
  } = params;

  const cycle = generatePPGCycle({ heartRate, perfusionIndex, noiseLevel });
  const waveform: number[] = [];
  while (waveform.length < 100) {
    waveform.push(...cycle);
  }

  // Pulse Transit Time correlates inversely with blood pressure
  // Healthy: ~250ms, High BP: ~150ms
  const pulseTransitTime = 280 - (heartRate - 60) * 1.5 + (Math.random() - 0.5) * 20;

  return {
    waveform: waveform.slice(0, 100),
    heartRate,
    hrv,
    pulseTransitTime: Math.max(100, Math.round(pulseTransitTime)),
    pulseWaveAmplitude: perfusionIndex,
  };
}

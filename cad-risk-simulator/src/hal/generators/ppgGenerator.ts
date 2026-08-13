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
  systolic?: number;          // mmHg (target BP to derive PTT & waveform delay)
  hrv?: number;               // ms RMSSD
  perfusionIndex?: number;    // 0–1 (amplitude proxy)
  noiseLevel?: number;
}

function gaussian(t: number, center: number, amp: number, sigma: number): number {
  return amp * Math.exp(-((t - center) ** 2) / (2 * sigma ** 2));
}

function generatePPGCycle(params: PPGParams): number[] {
  const { heartRate = 72, systolic = 120, perfusionIndex = 0.7, noiseLevel = 0.01 } = params;
  const samplesPerBeatPPG = Math.round(6000 / heartRate); // at 100Hz

  // Calculate expected PTT for target systolic BP: PTT = (220 - systolic) / 0.45
  const targetPTT = Math.max(100, Math.min(300, (220 - systolic) / 0.45));

  // ECG R-peak is at t = 0.42 of ECG beat cycle (samplesPerBeatECG = 60000 / heartRate / 4)
  const samplesPerBeatECG = Math.round(60000 / heartRate / 4);
  const rWavePeakTime = Math.round(0.42 * samplesPerBeatECG) * 4.0; // ms from beat start

  // Target PPG foot time (ms from beat start)
  const ppgFootTime = rWavePeakTime + targetPTT;

  // Foot index in 100Hz PPG waveform (10ms per sample)
  const footIdx = Math.round(ppgFootTime / 10.0) % samplesPerBeatPPG;
  const t_foot = footIdx / samplesPerBeatPPG;

  return Array.from({ length: samplesPerBeatPPG }, (_, i) => {
    let t_rel = (i / samplesPerBeatPPG) - t_foot;
    if (t_rel < 0) t_rel += 1.0;

    // Foot starts at t_rel = 0. Systolic peak is ~0.15 after foot.
    const sys = gaussian(t_rel, 0.15, perfusionIndex, 0.05);
    // Dicrotic notch dip
    const notch = gaussian(t_rel, 0.35, -0.05 * perfusionIndex, 0.02);
    // Diastolic peak (smaller)
    const diastolic = gaussian(t_rel, 0.45, 0.25 * perfusionIndex, 0.06);
    // Baseline (slow decay)
    const baseline = perfusionIndex * 0.1 * (1 - t_rel);
    const noise = (Math.random() - 0.5) * noiseLevel;

    return sys + notch + diastolic + baseline + noise;
  });
}

export function generatePPG(params: PPGParams = {}): PPGRawData {
  const {
    heartRate = 72,
    systolic = 120,
    hrv = 50,
    perfusionIndex = 0.7,
    noiseLevel = 0.01,
  } = params;

  const cycle = generatePPGCycle({ heartRate, systolic, perfusionIndex, noiseLevel });
  const waveform: number[] = [];
  while (waveform.length < 100) {
    waveform.push(...cycle);
  }

  // Pulse Transit Time correlates inversely with blood pressure
  const pulseTransitTime = Math.max(100, Math.min(300, Math.round((220 - systolic) / 0.45)));

  return {
    waveform: waveform.slice(0, 100),
    heartRate,
    hrv,
    pulseTransitTime,
    pulseWaveAmplitude: perfusionIndex,
  };
}

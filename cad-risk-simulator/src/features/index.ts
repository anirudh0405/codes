/**
 * Feature Extraction — Layer 3
 * ============================
 * Pure functions only — no state, no side effects, no I/O.
 * Input: raw sensor readings from SensorManager
 * Output: structured feature objects ready for Fusion Engine
 *
 * This layer is the LEAST likely to change in Phase 2 — it's entirely
 * hardware-agnostic. Real BLE data goes in, same feature objects come out.
 *
 * Phase 3: Feature extraction may expand to include frequency-domain HRV
 *          analysis (LF/HF ratio), morphological ECG feature detection, etc.
 */

import { SensorReading } from '../hal/ISensorSource';

// ─── Output Feature Types ─────────────────────────────────────────────────────

export interface ECGFeatures {
  heartRate: number;       // bpm
  stSegment: number;       // mV (positive = elevation)
  qtInterval: number;      // ms (corrected QTc)
  qrsDuration: number;     // ms
  rrInterval: number;      // ms
  qtcBazett: number;       // corrected QT (Bazett formula)
}

export interface PPGFeatures {
  heartRate: number;           // bpm
  hrv: number;                 // RMSSD ms
  pulseTransitTime: number;    // ms
  pulseWaveAmplitude: number;  // 0–1
}

export interface BPFeatures {
  systolic: number;             // mmHg
  diastolic: number;            // mmHg
  meanArterialPressure: number; // mmHg
  pulsePressure: number;        // mmHg
  bpCategory: 'normal' | 'elevated' | 'stage1' | 'stage2' | 'crisis';
}

export interface StressFeatures {
  stressScore: number;    // 0–100
  autonomicIndex: number; // 0–100
}

export interface ExtractedFeatures {
  ecg: ECGFeatures | null;
  ppg: PPGFeatures | null;
  bp: BPFeatures | null;
  stress: StressFeatures | null;
  timestamp: number;
}

// ─── BP Category Classification (AHA 2017 guidelines) ─────────────────────────

function classifyBP(systolic: number, diastolic: number): BPFeatures['bpCategory'] {
  if (systolic >= 180 || diastolic >= 120) return 'crisis';
  if (systolic >= 140 || diastolic >= 90) return 'stage2';
  if (systolic >= 130 || diastolic >= 80) return 'stage1';
  if (systolic >= 120 && diastolic < 80) return 'elevated';
  return 'normal';
}

// ─── ECG Feature Extraction ───────────────────────────────────────────────────

export function extractECGFeatures(reading: SensorReading): ECGFeatures {
  const d = reading.data as Record<string, number>;
  const rr = d.rrInterval ?? 833;
  // Bazett's formula: QTc = QT / sqrt(RR in seconds)
  const qtcBazett = Math.round((d.qtInterval ?? 400) / Math.sqrt(rr / 1000));

  return {
    heartRate: d.heartRate ?? 72,
    stSegment: d.stSegment ?? 0,
    qtInterval: d.qtInterval ?? 400,
    qrsDuration: d.qrsDuration ?? 90,
    rrInterval: rr,
    qtcBazett,
  };
}

// ─── PPG Feature Extraction ───────────────────────────────────────────────────

export function extractPPGFeatures(reading: SensorReading): PPGFeatures {
  const d = reading.data as Record<string, number>;
  return {
    heartRate: d.heartRate ?? 72,
    hrv: d.hrv ?? 50,
    pulseTransitTime: d.pulseTransitTime ?? 250,
    pulseWaveAmplitude: d.pulseWaveAmplitude ?? 0.7,
  };
}

// ─── BP Feature Extraction ────────────────────────────────────────────────────

export function extractBPFeatures(reading: SensorReading): BPFeatures {
  const d = reading.data as Record<string, number>;
  return {
    systolic: d.systolic ?? 120,
    diastolic: d.diastolic ?? 80,
    meanArterialPressure: d.meanArterialPressure ?? 93,
    pulsePressure: d.pulsePressure ?? 40,
    bpCategory: classifyBP(d.systolic ?? 120, d.diastolic ?? 80),
  };
}

// ─── Stress Feature Extraction ────────────────────────────────────────────────

export function extractStressFeatures(reading: SensorReading): StressFeatures {
  const d = reading.data as Record<string, number>;
  return {
    stressScore: d.stressScore ?? 30,
    autonomicIndex: d.autonomicIndex ?? 30,
  };
}

// ─── Unified Extraction Entry Point ──────────────────────────────────────────

export function extractFeatures(readings: {
  ecg: SensorReading | null;
  ppg: SensorReading | null;
  bp: SensorReading | null;
  stress: SensorReading | null;
}): ExtractedFeatures {
  return {
    ecg: readings.ecg ? extractECGFeatures(readings.ecg) : null,
    ppg: readings.ppg ? extractPPGFeatures(readings.ppg) : null,
    bp: readings.bp ? extractBPFeatures(readings.bp) : null,
    stress: readings.stress ? extractStressFeatures(readings.stress) : null,
    timestamp: Date.now(),
  };
}

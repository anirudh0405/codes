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

export * from './pulseTransitTime';
export * from './bpFromPTT';

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

  // ── Waveform Morphology Features ─────────────────────────────────────────
  // Computed from the raw PPG waveform array via peak/valley detection.
  // Used downstream by the lipid estimation module (src/features/lipidEstimation.ts).
  // These reflect arterial wall mechanical properties observable in optical signals.

  /** Ratio of diastolic peak amplitude to systolic peak amplitude.
   *  Higher values indicate greater wave reflection, associated with arterial stiffness.
   *  Reference: Millasseau et al. (2003), Clinical Science. */
  reflectionIndex: number;     // 0–1

  /** Height / time-between-peaks proxy for pulse wave velocity / stiffness.
   *  Based on Millasseau et al. (2002): SI = height(m) / ΔT(s)
   *  where ΔT = time between systolic and diastolic peaks.
   *  Uses DEFAULT_HEIGHT_METERS (175 cm) when no patient height is available. */
  stiffnessIndex: number;      // m/s (healthy ~5–8, stiff arteries ~10+)

  /** Augmentation index: (diastolicAmp - notchAmp) / systolicAmp.
   *  Represents the contribution of the reflected wave to aortic pressure.
   *  Negative in healthy young arteries; higher/positive in stiff arteries. */
  augmentationIndex: number;   // dimensionless, typically -0.5 to +0.5

  /** Time from waveform foot (cycle start, index 0) to systolic peak,
   *  expressed as a fraction of the total beat cycle.
   *  Shorter rise time = faster upstroke = stiffer, less compliant arteries. */
  riseTime: number;            // 0–1 (fraction of beat cycle)

  /** Position of the dicrotic notch as a fraction of the beat cycle.
   *  Earlier notch position (smaller value) is associated with higher
   *  peripheral vascular resistance. */
  dicroticNotchPosition: number; // 0–1 (fraction of beat cycle)
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

// ─── PPG Waveform Morphology Helpers ──────────────────────────────────────────

/**
 * Default subject height used for Stiffness Index when no patient height is
 * configured. Millasseau et al. (2002) formulation: SI = height(m) / ΔT(s).
 */
const DEFAULT_HEIGHT_METERS = 1.75;

/** Index of maximum value in wave[start..end) */
function findPeakIndex(wave: number[], start: number, end: number): number {
  let maxIdx = start;
  for (let i = start + 1; i < end; i++) {
    if (wave[i] > wave[maxIdx]) maxIdx = i;
  }
  return maxIdx;
}

/** Index of minimum value in wave[start..end) */
function findValleyIndex(wave: number[], start: number, end: number): number {
  let minIdx = start;
  for (let i = start + 1; i < end; i++) {
    if (wave[i] < wave[minIdx]) minIdx = i;
  }
  return minIdx;
}

/**
 * Extract PPG waveform morphology features from the raw waveform array.
 *
 * The PPG generator (src/hal/generators/ppgGenerator.ts) places:
 *   Systolic peak  at t ≈ 0.20 of cycle
 *   Dicrotic notch at t ≈ 0.45 of cycle
 *   Diastolic peak at t ≈ 0.55 of cycle
 *
 * We detect each landmark from the actual sample values so the extraction
 * remains valid even when noise shifts sample locations slightly.
 */
function extractMorphologyFromWaveform(
  waveform: number[],
  heartRate: number,
): Pick<PPGFeatures, 'reflectionIndex' | 'stiffnessIndex' | 'augmentationIndex' | 'riseTime' | 'dicroticNotchPosition'> {
  const n = waveform.length;

  // Degenerate: insufficient data — return physiologically plausible defaults
  if (n < 10) {
    return {
      reflectionIndex: 0.30,
      stiffnessIndex: 8.0,
      augmentationIndex: -0.10,
      riseTime: 0.20,
      dicroticNotchPosition: 0.45,
    };
  }

  // Estimate samples per beat at 100 Hz; clamp to available waveform length
  const samplesPerBeat = Math.round(6000 / Math.max(heartRate, 30));
  const cycleLen = Math.min(samplesPerBeat, n);

  // ── 1. Systolic peak — dominant peak in first 40% of cycle ───────────────
  const systolicSearchEnd = Math.max(2, Math.round(cycleLen * 0.40));
  const systolicIdx = findPeakIndex(waveform, 0, systolicSearchEnd);
  const systolicAmp = waveform[systolicIdx];

  // ── 2. Dicrotic notch — valley between 35–65% of cycle ───────────────────
  const notchSearchStart = Math.round(cycleLen * 0.35);
  const notchSearchEnd   = Math.round(cycleLen * 0.65);
  const notchIdx = findValleyIndex(
    waveform,
    Math.max(notchSearchStart, systolicIdx + 1),
    Math.min(notchSearchEnd, n),
  );
  const notchAmp = waveform[notchIdx];

  // ── 3. Diastolic peak — peak between notch and 80% of cycle ──────────────
  const diastolicSearchEnd = Math.min(Math.round(cycleLen * 0.80), n);
  const diastolicIdx = findPeakIndex(waveform, notchIdx + 1, diastolicSearchEnd);
  const diastolicAmp = waveform[diastolicIdx];

  // ── Compute features ──────────────────────────────────────────────────────

  // reflectionIndex: diastolic / systolic amplitude (0–1)
  const reflectionIndex = systolicAmp > 0
    ? Math.max(0, Math.min(1, diastolicAmp / systolicAmp))
    : 0.30;

  // stiffnessIndex: subject height / time between systolic and diastolic peaks
  const sampleRateHz = 100;
  const deltaT = (diastolicIdx - systolicIdx) / sampleRateHz; // seconds
  const stiffnessIndex = deltaT > 0.01
    ? parseFloat((DEFAULT_HEIGHT_METERS / deltaT).toFixed(2))
    : 8.0;

  // augmentationIndex: (diastolicAmp - notchAmp) / systolicAmp
  const augmentationIndex = systolicAmp > 0
    ? parseFloat(((diastolicAmp - notchAmp) / systolicAmp).toFixed(3))
    : -0.10;

  // riseTime: fraction of cycle from index 0 to systolic peak
  const riseTime = parseFloat((systolicIdx / cycleLen).toFixed(3));

  // dicroticNotchPosition: fraction of cycle at which the notch falls
  const dicroticNotchPosition = parseFloat((notchIdx / cycleLen).toFixed(3));

  return { reflectionIndex, stiffnessIndex, augmentationIndex, riseTime, dicroticNotchPosition };
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
  const d = reading.data as Record<string, number | number[]>;
  const heartRate = (d.heartRate as number) ?? 72;

  // The raw waveform array is used for morphology feature extraction.
  // It is produced by src/hal/generators/ppgGenerator.ts and passed through
  // MockSensorSources.ts → SensorManager → FeatureExtraction unchanged.
  const waveform: number[] = Array.isArray(d.waveform) ? (d.waveform as number[]) : [];

  const morphology = extractMorphologyFromWaveform(waveform, heartRate);

  return {
    heartRate,
    hrv: (d.hrv as number) ?? 50,
    pulseTransitTime: (d.pulseTransitTime as number) ?? 250,
    pulseWaveAmplitude: (d.pulseWaveAmplitude as number) ?? 0.7,
    ...morphology,
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

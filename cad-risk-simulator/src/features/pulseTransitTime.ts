/**
 * Pulse Transit Time (PTT) Extraction Module — Layer 3
 * ===================================================
 * Pure function taking current ECG waveform buffer (250Hz) and PPG waveform buffer (100Hz)
 * to measure the pulse propagation delay from the ventricular depolarization (ECG R-wave peak)
 * to the arrival of the arterial pressure wave at the peripheral optical sensor (PPG foot/onset).
 *
 * PTT = PPG_foot_time - ECG_R_peak_time (in milliseconds)
 */

const ECG_SAMPLE_PERIOD_MS = 4.0;  // 250 Hz sample rate (1000ms / 250 = 4ms)
const PPG_SAMPLE_PERIOD_MS = 10.0; // 100 Hz sample rate (1000ms / 100 = 10ms)

/**
 * Detect R-wave peak timing (ms) in the ECG waveform buffer.
 * The R-wave is the sharp upward deflection of highest amplitude in the QRS complex.
 */
export function detectRWavePeak(ecgWaveform: number[]): number {
  if (!ecgWaveform || ecgWaveform.length === 0) return 42; // default ~42ms

  let maxIdx = 0;
  for (let i = 1; i < ecgWaveform.length; i++) {
    if (ecgWaveform[i] > ecgWaveform[maxIdx]) {
      maxIdx = i;
    }
  }

  // Sample index converted to milliseconds from cycle start
  return maxIdx * ECG_SAMPLE_PERIOD_MS;
}

/**
 * Detect PPG foot (onset/trough) timing (ms) in the PPG waveform buffer.
 * The PPG foot marks the beginning of the systolic upstroke (minimum preceding pulse peak).
 */
export function detectPPGFoot(ppgWaveform: number[]): number {
  if (!ppgWaveform || ppgWaveform.length === 0) return 260; // default ~260ms

  // Find systolic peak index first to locate the preceding foot
  let peakIdx = 0;
  const searchLimit = ppgWaveform.length;
  for (let i = 1; i < searchLimit; i++) {
    if (ppgWaveform[i] > ppgWaveform[peakIdx]) {
      peakIdx = i;
    }
  }

  // The foot is the minimum value prior to or near the systolic peak
  let footIdx = 0;
  for (let i = 1; i <= peakIdx; i++) {
    if (ppgWaveform[i] < ppgWaveform[footIdx]) {
      footIdx = i;
    }
  }

  // Sample index converted to milliseconds from cycle start
  return footIdx * PPG_SAMPLE_PERIOD_MS;
}

/**
 * Calculate Pulse Transit Time (PTT) in milliseconds between ECG R-wave peak and PPG foot.
 *
 * @param ecgWaveform Raw ECG waveform sample array (~250Hz)
 * @param ppgWaveform Raw PPG waveform sample array (~100Hz)
 * @returns Pulse Transit Time in ms (clamped to physiological range 100–350ms)
 */
export function calculatePTT(ecgWaveform: number[], ppgWaveform: number[]): number {
  if (!ecgWaveform || ecgWaveform.length === 0 || !ppgWaveform || ppgWaveform.length === 0) {
    return 220; // Default physiological PTT fallback (ms)
  }

  const rWavePeakTime = detectRWavePeak(ecgWaveform);
  const ppgFootTime = detectPPGFoot(ppgWaveform);

  let rawPTT = ppgFootTime - rWavePeakTime;

  // Handle beat cycle wrap-around if PPG foot occurs earlier in the buffer than ECG R-peak
  if (rawPTT < 50) {
    rawPTT += 833;
  }

  // Clamp PTT to physiologically plausible range (100–350ms)
  return Math.max(100, Math.min(350, Math.round(rawPTT)));
}

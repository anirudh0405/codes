/**
 * Blood Pressure Generator
 * ========================
 * Generates synthetic BP readings. In Phase 1, direct values are used.
 * In future phases, cuffless estimation from ECG+PPG Pulse Transit Time (PTT)
 * can replace this generator — the seam is at the ISensorSource boundary.
 *
 * Phase 2: BLESensorSource for BP will use PTT-based cuffless estimation
 *          or a direct BLE-connected BP cuff.
 */

export interface BPRawData {
  systolic: number;    // mmHg (80–200)
  diastolic: number;   // mmHg (40–130)
  meanArterialPressure: number; // mmHg
  pulsePressure: number;        // mmHg
}

interface BPParams {
  systolic?: number;
  diastolic?: number;
}

export function generateBP(params: BPParams = {}): BPRawData {
  const { systolic = 120, diastolic = 80 } = params;

  // Add small physiological variability (±3 mmHg beat-to-beat)
  const sysSample = Math.round(systolic + (Math.random() - 0.5) * 6);
  const diaSample = Math.round(diastolic + (Math.random() - 0.5) * 4);

  const map = Math.round(diaSample + (sysSample - diaSample) / 3);
  const pp = sysSample - diaSample;

  return {
    systolic: sysSample,
    diastolic: diaSample,
    meanArterialPressure: map,
    pulsePressure: pp,
  };
}

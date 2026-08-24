/**
 * Mock Sensor Sources — Phase 1 Implementations of ISensorSource
 * ===============================================================
 * Each class implements ISensorSource using the generators in src/hal/generators/.
 *
 * Phase 2 swap point: Replace these classes with BLESensorSource implementations
 * in src/sensorManager/index.ts. The interface contract (ISensorSource) does not change.
 *
 * IMPORTANT: These classes do NOT generate data themselves — they delegate entirely
 * to src/hal/generators/ to maintain the single-source-of-truth rule.
 */

import { ISensorSource, SensorReading, SensorStatus, SensorType } from './ISensorSource';
import { generateECG } from './generators/ecgGenerator';
import { generatePPG } from './generators/ppgGenerator';
import { generateBP } from './generators/bpGenerator';
import { generateStress } from './generators/stressGenerator';

// Shared parameter bag (set by the Control Panel via SimStore)
export interface MockParams {
  heartRate: number;
  systolic: number;
  diastolic: number;
  hrv: number;
  stressScore: number;
  stSegment: number;
  qtInterval: number;
  /** ECG rhythm mode — 'sinus' (default) or 'afib' for atrial fibrillation */
  ecgRhythm?: 'sinus' | 'afib';
}

const DEFAULT_PARAMS: MockParams = {
  heartRate: 72,
  systolic: 120,
  diastolic: 80,
  hrv: 55,
  stressScore: 30,
  stSegment: 0,
  qtInterval: 400,
  ecgRhythm: 'sinus',
};

// ─── ECG Mock Sensor ─────────────────────────────────────────────────────────

export class MockECGSensor implements ISensorSource {
  readonly type: SensorType = 'ecg';
  private params: MockParams = { ...DEFAULT_PARAMS };

  async init(): Promise<void> {
    // Phase 2: Open BLE GATT characteristic for ECG streaming
    console.log('[MockECGSensor] Initialized (simulated)');
  }

  setParams(params: Partial<MockParams>) {
    this.params = { ...this.params, ...params };
  }

  async read(): Promise<SensorReading> {
    const data = generateECG({
      heartRate: this.params.heartRate,
      stElevation: this.params.stSegment,
      qtInterval: this.params.qtInterval,
      rhythm: this.params.ecgRhythm === 'afib' ? 'afib' : 'sinus',
    });
    return {
      type: 'ecg',
      timestamp: Date.now(),
      data: {
        waveform: data.waveform,
        heartRate: data.heartRate,
        qtInterval: data.qtInterval,
        stSegment: data.stSegment,
        qrsDuration: data.qrsDuration,
        rrInterval: data.rrInterval,
      },
      status: 'simulated',
    };
  }

  getStatus(): SensorStatus {
    return 'simulated';
  }
}

// ─── PPG Mock Sensor ─────────────────────────────────────────────────────────

export class MockPPGSensor implements ISensorSource {
  readonly type: SensorType = 'ppg';
  private params: MockParams = { ...DEFAULT_PARAMS };

  async init(): Promise<void> {
    // Phase 2: Open BLE GATT characteristic for PPG (e.g. MAX30102 over BLE)
    console.log('[MockPPGSensor] Initialized (simulated)');
  }

  setParams(params: Partial<MockParams>) {
    this.params = { ...this.params, ...params };
  }

  async read(): Promise<SensorReading> {
    const data = generatePPG({
      heartRate: this.params.heartRate,
      systolic: this.params.systolic,
      hrv: this.params.hrv,
      perfusionIndex: 0.5 + Math.random() * 0.4,
    });
    return {
      type: 'ppg',
      timestamp: Date.now(),
      data: {
        waveform: data.waveform,
        heartRate: data.heartRate,
        hrv: data.hrv,
        pulseTransitTime: data.pulseTransitTime,
        pulseWaveAmplitude: data.pulseWaveAmplitude,
      },
      status: 'simulated',
    };
  }

  getStatus(): SensorStatus {
    return 'simulated';
  }
}

// ─── Blood Pressure Mock Sensor ───────────────────────────────────────────────

export class MockBPSensor implements ISensorSource {
  readonly type: SensorType = 'bp';
  private params: MockParams = { ...DEFAULT_PARAMS };

  async init(): Promise<void> {
    // Phase 2: BLE cuff or cuffless PTT-based estimation via ECG+PPG timing
    console.log('[MockBPSensor] Initialized (simulated)');
  }

  setParams(params: Partial<MockParams>) {
    this.params = { ...this.params, ...params };
  }

  async read(): Promise<SensorReading> {
    const data = generateBP({
      systolic: this.params.systolic,
      diastolic: this.params.diastolic,
    });
    return {
      type: 'bp',
      timestamp: Date.now(),
      data: {
        systolic: data.systolic,
        diastolic: data.diastolic,
        meanArterialPressure: data.meanArterialPressure,
        pulsePressure: data.pulsePressure,
      },
      status: 'simulated',
    };
  }

  getStatus(): SensorStatus {
    return 'simulated';
  }
}

// ─── Stress Mock Sensor ───────────────────────────────────────────────────────

export class MockStressSensor implements ISensorSource {
  readonly type: SensorType = 'stress';
  private params: MockParams = { ...DEFAULT_PARAMS };

  async init(): Promise<void> {
    // Phase 2: BLE EDA/GSR sensor (e.g. Empatica E4 wristband or Grove GSR)
    console.log('[MockStressSensor] Initialized (simulated)');
  }

  setParams(params: Partial<MockParams>) {
    this.params = { ...this.params, ...params };
  }

  async read(): Promise<SensorReading> {
    const data = generateStress({
      hrv: this.params.hrv,
      baseStress: this.params.stressScore,
    });
    return {
      type: 'stress',
      timestamp: Date.now(),
      data: {
        stressScore: data.stressScore,
        hrv: data.hrv,
        edaProxy: data.edaProxy,
        autonomicIndex: data.autonomicIndex,
      },
      status: 'simulated',
    };
  }

  getStatus(): SensorStatus {
    return 'simulated';
  }
}

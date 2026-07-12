/**
 * Sensor Manager — Layer 2
 * ========================
 * Owns the registry of active ISensorSource instances, manages polling timing,
 * monitors sensor health, and exposes getLatestReadings() to the pipeline above.
 *
 * This is the ONLY module that knows which concrete sensor implementation is in use.
 * Everything above (Feature Extraction, Fusion, Risk Engine, Dashboard) only ever
 * sees the output of getLatestReadings() — they never talk to ISensorSource directly.
 *
 * Phase 2 swap: Replace MockECGSensor/MockPPGSensor/etc. registrations below with
 *               BLESensorSource instances. No other code changes needed anywhere.
 */

import { ISensorSource, SensorReading, SensorStatus, SensorType } from '../hal/ISensorSource';
import {
  MockECGSensor,
  MockPPGSensor,
  MockBPSensor,
  MockStressSensor,
  MockParams,
} from '../hal/MockSensorSources';

export interface LatestReadings {
  ecg: SensorReading | null;
  ppg: SensorReading | null;
  bp: SensorReading | null;
  stress: SensorReading | null;
  sensorStatus: Record<SensorType, SensorStatus>;
  lastUpdated: number;
}

type ReadingCallback = (readings: LatestReadings) => void;

export class SensorManager {
  private sensors: Map<SensorType, ISensorSource> = new Map();
  private latestReadings: LatestReadings = {
    ecg: null,
    ppg: null,
    bp: null,
    stress: null,
    sensorStatus: { ecg: 'disconnected', ppg: 'disconnected', bp: 'disconnected', stress: 'disconnected' },
    lastUpdated: 0,
  };
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private callbacks: ReadingCallback[] = [];
  private intervalMs: number;

  // Keep references to mock sensors so we can update their params
  private mockECG = new MockECGSensor();
  private mockPPG = new MockPPGSensor();
  private mockBP = new MockBPSensor();
  private mockStress = new MockStressSensor();

  constructor(intervalMs = 1000) {
    this.intervalMs = intervalMs;
  }

  async init(): Promise<void> {
    // Phase 2: For BLE sensors, this is where you'd call navigator.bluetooth.requestDevice()
    //          and replace these mock registrations with real BLESensorSource instances.
    this.sensors.set('ecg', this.mockECG);
    this.sensors.set('ppg', this.mockPPG);
    this.sensors.set('bp', this.mockBP);
    this.sensors.set('stress', this.mockStress);

    await Promise.all([...this.sensors.values()].map(s => s.init()));
    console.log('[SensorManager] All sensors initialized');
  }

  /** Update simulation parameters on all mock sensors */
  setParams(params: Partial<MockParams>): void {
    this.mockECG.setParams(params);
    this.mockPPG.setParams(params);
    this.mockBP.setParams(params);
    this.mockStress.setParams(params);
  }

  start(): void {
    if (this.pollingInterval) return;
    this.pollingInterval = setInterval(() => this.poll(), this.intervalMs);
    this.poll(); // immediate first read
  }

  stop(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  subscribe(callback: ReadingCallback): () => void {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback);
    };
  }

  getLatestReadings(): LatestReadings {
    return this.latestReadings;
  }

  private async poll(): Promise<void> {
    const readings: Partial<LatestReadings> = {
      sensorStatus: { ...this.latestReadings.sensorStatus },
    };

    for (const [type, sensor] of this.sensors.entries()) {
      try {
        const reading = await sensor.read();
        (readings as Record<string, unknown>)[type] = reading;
        readings.sensorStatus![type] = sensor.getStatus();
      } catch (err) {
        console.error(`[SensorManager] Error reading ${type}:`, err);
        readings.sensorStatus![type] = 'error';
      }
    }

    this.latestReadings = {
      ...this.latestReadings,
      ...(readings as LatestReadings),
      lastUpdated: Date.now(),
    };

    this.callbacks.forEach(cb => cb(this.latestReadings));
  }
}

// Singleton instance — application-wide sensor manager
export const sensorManager = new SensorManager(1000);

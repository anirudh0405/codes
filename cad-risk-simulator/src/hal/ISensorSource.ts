/**
 * HAL — Hardware Abstraction Layer
 * ================================
 * ISensorSource defines the contract every sensor implementation must fulfill.
 *
 * Phase 1: MockSensorSource implements this interface using synthetic data generators.
 * Phase 2: BLESensorSource will implement the SAME interface using navigator.bluetooth.
 *          Swapping Phase 1 → Phase 2 requires changing ONLY src/sensorManager/index.ts
 *          (where the concrete class is registered). No other code changes needed.
 */

export type SensorType = 'ecg' | 'ppg' | 'bp' | 'stress';

export type SensorStatus = 'connected' | 'disconnected' | 'error' | 'simulated';

export interface SensorReading {
  type: SensorType;
  timestamp: number;
  data: Record<string, number | number[]>;
  status: SensorStatus;
}

export interface ISensorSource {
  /** Initialize the sensor (allocate resources, open connections) */
  init(): Promise<void>;

  /** Read the latest sensor data. Called on every polling interval. */
  read(): Promise<SensorReading>;

  /** Return current health/connection status of this sensor */
  getStatus(): SensorStatus;

  /** Sensor type identifier */
  readonly type: SensorType;
}

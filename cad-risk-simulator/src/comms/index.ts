/**
 * Communication Layer — Layer 6 (Phase 1 Stub)
 * ==============================================
 * Phase 1: This is a pure pass-through. Data already lives in browser memory.
 *
 * ═══════════════════════════════════════════════════════════════════
 * PHASE 2 BLE SWAP POINT
 * ───────────────────────────────────────────────────────────────────
 * When real hardware arrives, implement one of the following:
 *
 * Option A — Web Bluetooth (BLE, direct browser ↔ ESP32/nRF52):
 *   Replace transmit() with:
 *     const device = await navigator.bluetooth.requestDevice({...});
 *     const server = await device.gatt.connect();
 *     const service = await server.getPrimaryService('heart_rate');
 *     const char = await service.getCharacteristic('heart_rate_measurement');
 *     await char.writeValue(encodeReading(data));
 *
 * Option B — MQTT over WebSocket (Wi-Fi MCU ↔ broker ↔ browser):
 *   Replace transmit() with an mqtt.js publish() call.
 *
 * Option C — REST/WebSocket to a local edge server on the MCU:
 *   Replace transmit() with a fetch() or WebSocket.send() call.
 * ═══════════════════════════════════════════════════════════════════
 */

export interface CommPayload {
  type: 'reading' | 'command' | 'status';
  data: unknown;
  timestamp: number;
}

export interface CommResult {
  success: boolean;
  latencyMs?: number;
  error?: string;
}

/**
 * Transmit data to the communication target.
 * Phase 1: No-op pass-through — returns immediately with success.
 * Phase 2: Replace the body of this function with BLE/MQTT/REST logic.
 */
export async function transmit(payload: CommPayload): Promise<CommResult> {
  // Phase 1: Pass-through
  return { success: true, latencyMs: 0 };
}

/**
 * Receive data from the communication source.
 * Phase 1: Returns null — no external source in simulation mode.
 * Phase 2: Replace with BLE characteristic read or MQTT subscription callback.
 */
export async function receive(): Promise<CommPayload | null> {
  // Phase 1: No external data source
  return null;
}

/**
 * Get communication layer status.
 * Phase 1: Always reports "pass-through" mode.
 */
export function getCommStatus(): { mode: string; connected: boolean } {
  return { mode: 'pass-through (Phase 1 simulation)', connected: false };
}

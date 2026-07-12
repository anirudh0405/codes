/**
 * Sensor Status Panel — Shows per-sensor connection/simulation status
 * Phase 2: This panel will show 'connected' when real BLE sensors are active.
 */

import React from 'react';
import { useSimStore } from '../../store/simStore';
import { SensorType } from '../../hal/ISensorSource';

const SENSOR_META: Record<SensorType, { name: string; icon: string; desc: string }> = {
  ecg: { name: 'ECG', icon: '💓', desc: 'Electrocardiography' },
  ppg: { name: 'PPG', icon: '💡', desc: 'Photoplethysmography' },
  bp: { name: 'Blood Pressure', icon: '🩺', desc: 'Sphygmomanometer / PTT' },
  stress: { name: 'Stress / EDA', icon: '⚡', desc: 'Galvanic Skin Response' },
};

export function SensorStatus() {
  const sensorStatus = useSimStore(s => s.sensorStatus);

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Sensor Status</span>
        <span style={{ fontSize: '10px', color: 'var(--accent-cyan)' }}>
          Phase 1 — Simulated
        </span>
      </div>
      <div className="card-body">
        <div className="sensor-status-grid">
          {(Object.keys(SENSOR_META) as SensorType[]).map(type => {
            const meta = SENSOR_META[type];
            const status = sensorStatus[type];
            return (
              <div key={type} className="sensor-status-item" id={`sensor-status-${type}`}>
                <div className={`sensor-status-indicator ${status}`} />
                <div>
                  <div className="sensor-name">
                    {meta.icon} {meta.name}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    {meta.desc}
                  </div>
                </div>
                <div className="sensor-mode">
                  {status === 'simulated' ? 'SIM' : status === 'connected' ? 'BLE' : status.toUpperCase()}
                </div>
              </div>
            );
          })}
        </div>
        {/* Phase 2 note */}
        <div style={{
          marginTop: 'var(--gap-md)',
          padding: '8px 12px',
          background: 'rgba(0, 212, 255, 0.05)',
          border: '1px solid rgba(0, 212, 255, 0.15)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '10px',
          color: 'var(--text-muted)',
          lineHeight: 1.5,
        }}>
          <strong style={{ color: 'var(--accent-cyan)' }}>Phase 2:</strong> Real BLE sensors
          (ESP32 / nRF52) will appear here as "BLE" when navigator.bluetooth connects.
        </div>
      </div>
    </div>
  );
}

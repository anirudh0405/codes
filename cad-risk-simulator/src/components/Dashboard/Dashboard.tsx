/**
 * Dashboard — Layer 7
 * ===================
 * Assembles all dashboard panels. Reads exclusively from the Zustand store.
 * Never imports from SensorManager, Feature Extraction, Fusion, or Risk Engine directly.
 */

import React from 'react';
import { ECGWaveform, PPGWaveform } from './WaveformCharts';
import { VitalSigns } from './VitalSigns';
import { RiskGauge } from './RiskGauge';
import { RiskTrend } from './RiskTrend';
import { SensorStatus } from './SensorStatus';
import { ContributionBreakdown } from './ContributionBreakdown';

export function Dashboard() {
  return (
    <div className="dashboard-main">
      {/* Row 1: Waveforms */}
      <div className="grid-waveforms">
        <ECGWaveform />
        <PPGWaveform />
      </div>

      {/* Row 2: Vital Signs (6 metrics) */}
      <VitalSigns />

      {/* Row 3: Risk Gauge + Contribution Breakdown + Sensor Status */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--gap-md)' }}>
        <RiskGauge />
        <ContributionBreakdown />
        <SensorStatus />
      </div>

      {/* Row 4: Risk Trend */}
      <RiskTrend />
    </div>
  );
}

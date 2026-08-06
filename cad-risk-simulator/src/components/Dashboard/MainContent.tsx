import React from 'react';
import { RiskScoreCard } from './RiskScoreCard';
import { BloodPressureCard } from './BloodPressureCard';
import { StressIndexCard, HRVCard } from './StressHrvCards';
import { LipidCard } from './LipidCard';
import { ApoBAnalysis } from './ApoBAnalysis';
import { ECGWaveform, PPGWaveform } from './WaveformCards';
import { SecondaryVitals } from './SecondaryVitals';

/**
 * MainContent — the 12-column clinical grid.
 * Row 1: BP · Stress · HRV · Risk Score (equal height, risk is the anchor)
 * Row 2: Lipids (grouped, 3 equal columns)
 * Row 3: ApoB Analysis (cards inside cards)
 * Row 4: ECG + PPG waveforms
 * Row 5: Secondary vitals
 */
export function MainContent() {
  return (
    <main className="dashboard-main" aria-label="Patient vitals">
      {/* Row 1 — headline vitals */}
      <div className="vitals-row">
        <BloodPressureCard />
        <StressIndexCard />
        <HRVCard />
        <RiskScoreCard />
      </div>

      {/* Row 2 — lipids */}
      <div className="main-grid" style={{ marginTop: 'var(--space-lg)' }}>
        <LipidCard />
      </div>

      {/* Row 3 — ApoB analysis */}
      <div className="main-grid" style={{ marginTop: 'var(--space-lg)' }}>
        <ApoBAnalysis />
      </div>

      {/* Row 4 — waveforms */}
      <div className="main-grid" style={{ marginTop: 'var(--space-lg)' }}>
        <div className="col-span-6"><ECGWaveform /></div>
        <div className="col-span-6"><PPGWaveform /></div>
      </div>

      {/* Row 5 — secondary vitals */}
      <SecondaryVitals />
    </main>
  );
}

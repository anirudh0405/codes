import React from 'react';
import { useSimStore } from '@/store/simStore';
import { Card, CardHeader } from '@/components/ui/Card';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { TOOLTIPS } from '@/lib/tooltips';

/**
 * ContributionCard — Top contributors to the CAD risk score as horizontal
 * progress bars. Only the most influential contributors are shown; tiny
 * contributors are hidden to reduce visual noise.
 */

interface Contributor {
  key: string;
  label: string;
}

const CANDIDATES: Contributor[] = [
  { key: 'bloodPressure', label: 'Blood Pressure' },
  { key: 'apoB',          label: 'ApoB' },
  { key: 'smoking',       label: 'Smoking' },
  { key: 'stress',        label: 'Stress' },
  { key: 'hrv',           label: 'HRV' },
  { key: 'qtInterval',    label: 'QTc' },
  { key: 'heartRate',     label: 'Heart Rate' },
  { key: 'stSegment',     label: 'ST Segment' },
  { key: 'totalCholesterol', label: 'Total Cholesterol' },
  { key: 'triglycerides', label: 'Triglycerides' },
];

const MIN_VISIBLE = 12; // hide contributors below this raw score

export function ContributionCard() {
  const riskResult = useSimStore(s => s.riskResult);
  const raw = riskResult?.rawContributions;

  const visible = CANDIDATES
    .map(c => ({ ...c, value: raw?.[c.key as keyof typeof raw] ?? 0 }))
    .filter(c => c.value >= MIN_VISIBLE)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  if (visible.length === 0) {
    return (
      <Card className="flex flex-col">
        <CardHeader label="Top Contributors" tooltip={TOOLTIPS.contribution} />
        <span className="caption-type" style={{ color: 'var(--text-tertiary)' }}>No significant contributors</span>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col" id="contributions">
      <CardHeader
        label="Top Contributors"
        tooltip={TOOLTIPS.contribution}
        right={
          <span className="caption-type" style={{ color: 'var(--text-tertiary)' }}>
            raw sub-scores
          </span>
        }
      />
      <div className="flex flex-col" style={{ gap: 'var(--space-md)' }}>
        {visible.map(({ key, label, value }) => {
          const barColor = value >= 65 ? 'var(--alert-red)' : value >= 35 ? 'var(--alert-amber)' : 'var(--accent)';
          const isLipid = key === 'totalCholesterol' || key === 'triglycerides';
          return (
            <div key={key} id={`contrib-${key}`}>
              <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-xs)' }}>
                <span className="caption-type flex items-center" style={{ color: 'var(--text-secondary)' }}>
                  {label}
                  {isLipid && <InfoTooltip text="PPG-estimated — not a direct lab measurement" />}
                </span>
                <span className="caption-type tabular-nums font-medium" style={{ color: 'var(--text-primary)' }}>
                  {value}
                </span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${value}%`, background: barColor }}
                  role="progressbar"
                  aria-valuenow={value}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${label} contribution ${value}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

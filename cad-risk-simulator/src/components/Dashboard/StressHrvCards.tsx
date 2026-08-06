import React from 'react';
import { useSimStore } from '@/store/simStore';
import { MetricCard } from '@/components/ui/MetricCard';
import { ReferenceBar } from '@/components/ui/ReferenceBar';
import { useMiniTrend } from '@/hooks/useMiniTrend';
import { Brain, HeartPulse } from 'lucide-react';
import { stressStatus, hrvStatus } from '@/lib/vitals';
import { TOOLTIPS } from '@/lib/tooltips';

/** Stress Index metric card — live index, status, sparkline, reference. */
export function StressIndexCard() {
  const snapshot = useSimStore(s => s.snapshot);
  const value = snapshot ? Math.round(snapshot.stressScore) : 0;
  const status = snapshot ? stressStatus(snapshot.stressScore) : { label: 'Low', color: 'var(--accent)' };
  const spark = useMiniTrend(value);

  return (
    <MetricCard
      id="readout-stress"
      className="card-stress"
      label="Stress Index"
      icon={<Brain size={13} style={{ color: 'var(--accent)' }} aria-hidden="true" />}
      tooltip={TOOLTIPS.stress}
      value={value}
      unit="/ 100"
      status={status}
      spark={spark}
      reference={snapshot && <ReferenceBar rangeKey="stressIndex" value={value} />}
      aria-label={`Stress index ${value}`}
    />
  );
}

/** HRV RMSSD metric card. */
export function HRVCard() {
  const snapshot = useSimStore(s => s.snapshot);
  const value = snapshot ? Math.round(snapshot.hrv) : 0;
  const status = snapshot ? hrvStatus(snapshot.hrv) : { label: 'Healthy', color: 'var(--accent)' };
  const spark = useMiniTrend(value);

  return (
    <MetricCard
      id="metric-hrv"
      className="card-hrv"
      label="HRV RMSSD"
      icon={<HeartPulse size={13} style={{ color: 'var(--accent)' }} aria-hidden="true" />}
      tooltip={TOOLTIPS.hrv}
      value={value}
      unit="ms"
      status={status}
      spark={spark}
      reference={snapshot && <ReferenceBar rangeKey="hrv" value={value} />}
      aria-label={`Heart rate variability ${value} milliseconds`}
    />
  );
}

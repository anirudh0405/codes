import React from 'react';
import { useSimStore } from '@/store/simStore';
import { MetricCard } from '@/components/ui/MetricCard';
import { ReferenceBar } from '@/components/ui/ReferenceBar';
import { useMiniTrend } from '@/hooks/useMiniTrend';
import { Timer, Zap, Activity, Gauge as GaugeIcon, Wind } from 'lucide-react';
import { hrStatus, qtcStatus, stStatus } from '@/lib/vitals';
import { TOOLTIPS } from '@/lib/tooltips';

/**
 * SecondaryVitals — compact strip of remaining live vitals
 * (HR, QTc, ST Segment, Pulse Transit, SpO₂). Lower visual weight than the
 * four headline cards but keeps every existing reading available.
 */
export function SecondaryVitals() {
  const snapshot = useSimStore(s => s.snapshot);
  const hrTrend = useMiniTrend(snapshot?.heartRate ?? 0);
  const qtcTrend = useMiniTrend(snapshot?.qtcBazett ?? 0);

  if (!snapshot) return null;

  const hr = hrStatus(snapshot.heartRate);
  const qtc = qtcStatus(snapshot.qtcBazett);
  const st = stStatus(snapshot.stSegment);

  return (
    <div className="main-grid" style={{ marginTop: 'var(--space-lg)' }} aria-label="Secondary vitals">
      <MetricCard
        id="right-hr"
        className="col-span-3"
        label="Heart Rate"
        icon={<Activity size={13} style={{ color: 'var(--accent)' }} aria-hidden="true" />}
        tooltip={TOOLTIPS.heartRate}
        value={snapshot.heartRate}
        unit="bpm"
        status={hr}
        spark={hrTrend}
        reference={<ReferenceBar rangeKey="heartRate" value={snapshot.heartRate} />}
      />
      <MetricCard
        id="right-qtc"
        className="col-span-3"
        label="QTc Bazett"
        icon={<Timer size={13} style={{ color: 'var(--accent)' }} aria-hidden="true" />}
        tooltip={TOOLTIPS.qtcBazett}
        value={snapshot.qtcBazett}
        unit="ms"
        status={qtc}
        spark={qtcTrend}
      />
      <MetricCard
        id="right-st"
        className="col-span-3"
        label="ST Segment"
        icon={<Zap size={13} style={{ color: 'var(--accent)' }} aria-hidden="true" />}
        tooltip={TOOLTIPS.st}
        value={snapshot.stSegment.toFixed(2)}
        unit="mV"
        status={st}
      />
      <MetricCard
        id="right-ptt"
        className="col-span-3"
        label="Pulse Transit"
        icon={<GaugeIcon size={13} style={{ color: 'var(--accent)' }} aria-hidden="true" />}
        tooltip={TOOLTIPS.ptp}
        value={snapshot.pulseTransitTime}
        unit="ms"
        caption="PTT-derived BP source"
      />
      <MetricCard
        id="right-spo2"
        className="col-span-3"
        label="SpO₂"
        icon={<Wind size={13} style={{ color: 'var(--accent)' }} aria-hidden="true" />}
        tooltip={TOOLTIPS.spo2}
        value={98}
        unit="%"
        caption="Optical estimate"
      />
      <MetricCard
        id="right-map"
        className="col-span-3"
        label="Mean Arterial P."
        icon={<GaugeIcon size={13} style={{ color: 'var(--accent)' }} aria-hidden="true" />}
        tooltip={TOOLTIPS.map}
        value={snapshot ? Math.round(snapshot.diastolic + (snapshot.systolic - snapshot.diastolic) / 3) : '—'}
        unit="mmHg"
        caption="Calculated"
      />
    </div>
  );
}

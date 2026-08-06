import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Droplets } from 'lucide-react';
import { useSimStore } from '@/store/simStore';
import { Card, CardHeader } from '@/components/ui/Card';
import { MetricCard } from '@/components/ui/MetricCard';
import { ReferenceBar } from '@/components/ui/ReferenceBar';
import { bpStatus, mapPressure } from '@/lib/vitals';
import { TOOLTIPS } from '@/lib/tooltips';

/**
 * BloodPressureCard — Large BP readout with a Hypertensive/Elevated badge,
 * a mini comparison bar and PTT/manual source toggle. Reference values are
 * surfaced via tooltip to keep the card clean.
 */
export function BloodPressureCard() {
  const snapshot = useSimStore(s => s.snapshot);
  const bpMode = useSimStore(s => s.bpMode);
  const setBPMode = useSimStore(s => s.setBPMode);
  const pttDerivedBP = useSimStore(s => s.pttDerivedBP);

  const sys = snapshot?.systolic ?? 0;
  const dia = snapshot?.diastolic ?? 0;
  const bp = snapshot ? bpStatus(sys) : { label: 'Normal', color: 'var(--accent)' };
  const pttMotion = pttDerivedBP?.motionArtifactFlag ?? false;

  const sysReference = snapshot ? (
    <ReferenceBar rangeKey="systolicBP" value={sys} />
  ) : null;

  return (
    <Card id="readout-bp" className="card-bp flex flex-col" aria-label={`Blood pressure ${sys} over ${dia}`}>
      <CardHeader
        label="Blood Pressure"
        icon={<Droplets size={13} style={{ color: 'var(--accent)' }} aria-hidden="true" />}
        tooltip={TOOLTIPS.bloodPressure}
        right={
          <button
            type="button"
            onClick={() => setBPMode(bpMode === 'ptt' ? 'manual' : 'ptt')}
            className="caption-type outline-none cursor-pointer transition-colors"
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: bpMode === 'ptt' ? 'var(--text-secondary)' : 'var(--text-tertiary)',
            }}
            title="Toggle between PTT-derived optical estimation and manual slider override"
            aria-label="Toggle blood pressure source"
          >
            {bpMode === 'ptt' ? 'PTT-derived' : 'Manual override'}
          </button>
        }
      />

      <div className="flex items-baseline gap-2" style={{ margin: 'var(--space-sm) 0' }}>
        <span className="metric-type tabular-nums" style={{ color: 'var(--text-primary)', fontSize: 30 }}>
          {snapshot ? sys : '—'}
        </span>
        <span className="metric-type tabular-nums" style={{ color: 'var(--text-tertiary)', fontSize: 22 }}>
          / {snapshot ? dia : '—'}
        </span>
        <span className="caption-type" style={{ color: 'var(--text-tertiary)' }}>mmHg</span>
      </div>

      <div className="flex items-center justify-between">
        <span
          className="caption-type font-medium"
          style={{ color: bp.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}
        >
          {bp.label}
        </span>
        {bpMode === 'ptt' ? (
          <span className="caption-type" style={{ color: pttMotion ? 'var(--alert-amber)' : 'var(--text-tertiary)' }}>
            {pttMotion ? 'Motion detected' : `PTT ${snapshot?.pulseTransitTime ?? 220} ms`}
          </span>
        ) : (
          <span className="caption-type" style={{ color: 'var(--text-tertiary)' }}>
            MAP {snapshot ? mapPressure(sys, dia) : '—'} mmHg
          </span>
        )}
      </div>

      {/* Mini comparison bar — reference values live in the tooltip */}
      {sysReference}

      <div className="flex items-center justify-between" style={{ marginTop: 'var(--space-xs)' }}>
        <span className="caption-type" style={{ color: 'var(--text-tertiary)' }}>Sys {sys}</span>
        <span className="caption-type" style={{ color: 'var(--text-tertiary)' }}>Dia {dia}</span>
      </div>
    </Card>
  );
}

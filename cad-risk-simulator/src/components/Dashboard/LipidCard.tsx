import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Droplets } from 'lucide-react';
import { useSimStore } from '@/store/simStore';
import { Card, CardHeader } from '@/components/ui/Card';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { ReferenceBar } from '@/components/ui/ReferenceBar';
import { apoBStatus, lpaStatus, lipidStatus } from '@/lib/vitals';
import { TOOLTIPS } from '@/lib/tooltips';

/**
 * LipidCard — one grouped card holding Total Cholesterol, Triglycerides and
 * ApoB in three equal columns, plus Lp(a) as a manual-entry strip.
 */
export function LipidCard() {
  const { snapshot, apoBPanel, labInputs, lipidConfidence } = useSimStore(
    useShallow(s => ({
      snapshot: s.snapshot,
      apoBPanel: s.apoBPanel,
      labInputs: s.labInputs,
      lipidConfidence: s.riskResult?.lipidConfidence ?? 1.0,
    }))
  );

  const lowConf = lipidConfidence < 0.7;
  const tc = snapshot?.totalCholesterol ?? 0;
  const tg = snapshot?.triglycerides ?? 0;
  const apoB = apoBPanel.apoB;
  const lpa = labInputs.lpa;

  const tcStatus = lipidStatus(snapshot ? (snapshot.totalCholesterol >= 240 ? 80 : snapshot.totalCholesterol >= 200 ? 45 : 15) : 0);
  const tgStatus = lipidStatus(snapshot ? (snapshot.triglycerides >= 200 ? 70 : snapshot.triglycerides >= 150 ? 35 : 10) : 0);
  const apoBResult = apoBStatus(apoB);
  const lpaResult = lpaStatus(lpa);

  const colStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-sm)',
    padding: 'var(--space-md)',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
  };

  return (
    <Card className="col-span-12" id="readout-lipids" aria-label="Lipid panel">
      <CardHeader
        label="Lipids"
        icon={<Droplets size={13} style={{ color: 'var(--accent)' }} aria-hidden="true" />}
        tooltip={TOOLTIPS.totalCholesterol}
        right={
          <span className="flex items-center gap-1">
            {lowConf && (
              <span className="caption-type" style={{ color: 'var(--alert-amber)' }}>
                Motion — reduced confidence
              </span>
            )}
            <span className="caption-type" style={{ color: 'var(--text-tertiary)' }}>PPG est.</span>
          </span>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 'var(--space-md)' }}>
        {/* Total Cholesterol */}
        <div style={colStyle} id="readout-cholesterol">
          <div className="flex items-center justify-between">
            <span className="caption-type flex items-center" style={{ color: 'var(--text-secondary)' }}>
              Total Cholesterol<InfoTooltip text={TOOLTIPS.totalCholesterol} />
            </span>
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: lowConf ? 'var(--alert-amber)' : 'var(--accent)' }} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="metric-type tabular-nums" style={{ color: 'var(--text-primary)', fontSize: 24 }}>
              {snapshot ? Math.round(tc) : '—'}
            </span>
            <span className="caption-type" style={{ color: 'var(--text-tertiary)' }}>mg/dL</span>
          </div>
          <span className="caption-type font-medium" style={{ color: tcStatus.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {tcStatus.label}
          </span>
          {snapshot && <ReferenceBar rangeKey="totalCholesterol" value={tc} />}
        </div>

        {/* Triglycerides */}
        <div style={colStyle} id="readout-triglycerides">
          <div className="flex items-center justify-between">
            <span className="caption-type flex items-center" style={{ color: 'var(--text-secondary)' }}>
              Triglycerides<InfoTooltip text={TOOLTIPS.triglycerides} />
            </span>
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: lowConf ? 'var(--alert-amber)' : 'var(--accent)' }} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="metric-type tabular-nums" style={{ color: 'var(--text-primary)', fontSize: 24 }}>
              {snapshot ? Math.round(tg) : '—'}
            </span>
            <span className="caption-type" style={{ color: 'var(--text-tertiary)' }}>mg/dL</span>
          </div>
          <span className="caption-type font-medium" style={{ color: tgStatus.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {tgStatus.label}
          </span>
          {snapshot && <ReferenceBar rangeKey="triglycerides" value={tg} />}
        </div>

        {/* ApoB */}
        <div style={colStyle} id="readout-apob">
          <div className="flex items-center justify-between">
            <span className="caption-type flex items-center" style={{ color: 'var(--text-secondary)' }}>
              ApoB<InfoTooltip text={TOOLTIPS.apoB} />
            </span>
            <span className="caption-type" style={{ color: 'var(--text-tertiary)' }}>regression</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="metric-type tabular-nums" style={{ color: apoBResult.color, fontSize: 24 }}>
              {apoB.toFixed(1)}
            </span>
            <span className="caption-type" style={{ color: 'var(--text-tertiary)' }}>mg/dL</span>
          </div>
          <span className="caption-type font-medium" style={{ color: apoBResult.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {apoBResult.label}
          </span>
          <ReferenceBar rangeKey="apoB" value={apoB} />
        </div>
      </div>

      {/* Lp(a) manual entry strip */}
      <div
        className="flex items-center justify-between flex-wrap gap-2"
        style={{
          marginTop: 'var(--space-md)',
          padding: 'var(--space-sm) var(--space-md)',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
        }}
        id="readout-lpa"
      >
        <div className="flex items-center gap-2">
          <span className="caption-type flex items-center" style={{ color: 'var(--text-secondary)' }}>
            Lipoprotein(a) · Lp(a)<InfoTooltip text={TOOLTIPS.lpA} />
          </span>
          <span className="caption-type" style={{ color: 'var(--text-tertiary)' }}>manual entry</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="body-type tabular-nums font-semibold" style={{ color: lpaResult.color }}>
            {lpa.toFixed(1)} <span className="caption-type" style={{ color: 'var(--text-tertiary)' }}>mg/dL</span>
          </span>
          <span className="caption-type font-medium uppercase" style={{ color: lpaResult.color, letterSpacing: '0.04em' }}>
            {lpaResult.label}
          </span>
        </div>
      </div>
    </Card>
  );
}

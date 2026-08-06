import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSimStore } from '@/store/simStore';
import { Card, CardHeader } from '@/components/ui/Card';
import { Sparkline } from '@/components/ui/Sparkline';
import { ReferenceBar } from '@/components/ui/ReferenceBar';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { useMiniTrend } from '@/hooks/useMiniTrend';
import { apoBStatus, getRiskColor } from '@/lib/vitals';
import { TOOLTIPS } from '@/lib/tooltips';
import { Layers, TrendingUp, Sigma } from 'lucide-react';

/**
 * ApoBAnalysis — detailed ApoB card with cards-inside-cards:
 * Estimated LDL · Estimated Non-HDL · Regression confidence · Prediction
 * explanation · Risk contribution · Mini trend.
 */
export function ApoBAnalysis() {
  const { apoBPanel, labInputs, riskResult } = useSimStore(
    useShallow(s => ({
      apoBPanel: s.apoBPanel,
      labInputs: s.labInputs,
      riskResult: s.riskResult,
    }))
  );

  const { apoB, ldl, nonHDL, friedewaldValid } = apoBPanel;
  const apoBResult = apoBStatus(apoB);
  const apoBContrib = riskResult?.rawContributions.apoB ?? 0;
  const contributionColor = apoBContrib >= 65 ? 'var(--alert-red)' : apoBContrib >= 35 ? 'var(--alert-amber)' : 'var(--accent)';

  // ApoB history for the mini trend — rebuild from a small rolling sample
  const apoBHistory = useMiniTrend(parseFloat(apoB.toFixed(1)));

  // Regression confidence derived from LDL validity + lipid confidence
  const lipidConf = riskResult?.lipidConfidence ?? 1.0;
  const regressionConfidence = Math.round((friedewaldValid ? 0.9 : 0.55) * lipidConf * 100);

  const miniStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-sm)',
    padding: 'var(--space-md)',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
  };

  const miniLabel: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: 'var(--text-tertiary)',
  };

  return (
    <Card className="col-span-12" id="readout-apob-analysis" aria-label="ApoB analysis">
      <CardHeader
        label="ApoB Analysis"
        icon={<Layers size={13} style={{ color: 'var(--accent)' }} aria-hidden="true" />}
        tooltip={TOOLTIPS.apoB}
        right={
          <span className="caption-type" style={{ color: 'var(--text-tertiary)' }}>
            Sniderman et al. 2012 · Non-HDL regression
          </span>
        }
      />

      {/* Hero row: ApoB value */}
      <div className="flex items-end gap-3" style={{ marginBottom: 'var(--space-md)' }}>
        <span className="hero-type tabular-nums" style={{ color: apoBResult.color }}>{apoB.toFixed(1)}</span>
        <span className="caption-type" style={{ color: 'var(--text-tertiary)' }}>mg/dL</span>
        <span className="caption-type font-medium uppercase" style={{ color: apoBResult.color, letterSpacing: '0.04em' }}>
          {apoBResult.label}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ gap: 'var(--space-md)' }}>
        {/* Estimated LDL */}
        <div style={miniStyle}>
          <span style={miniLabel}>
            <Sigma size={12} aria-hidden="true" /> Estimated LDL<InfoTooltip text={TOOLTIPS.ldlFriedewald} />
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="metric-type tabular-nums" style={{ color: 'var(--text-primary)', fontSize: 22 }}>
              {friedewaldValid ? ldl.toFixed(0) : 'N/A'}
            </span>
            <span className="caption-type" style={{ color: 'var(--text-tertiary)' }}>mg/dL</span>
          </div>
          {friedewaldValid ? (
            <ReferenceBar rangeKey="ldl" value={ldl} />
          ) : (
            <span className="caption-type" style={{ color: 'var(--text-tertiary)' }}>TG &gt; 400 — Friedewald not valid</span>
          )}
        </div>

        {/* Estimated Non-HDL */}
        <div style={miniStyle}>
          <span style={miniLabel}>
            <Layers size={12} aria-hidden="true" /> Non-HDL<InfoTooltip text={TOOLTIPS.nonHDL} />
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="metric-type tabular-nums" style={{ color: 'var(--text-primary)', fontSize: 22 }}>
              {nonHDL.toFixed(0)}
            </span>
            <span className="caption-type" style={{ color: 'var(--text-tertiary)' }}>mg/dL</span>
          </div>
          <span className="caption-type" style={{ color: 'var(--text-tertiary)' }}>
            TC {Math.round(labInputs.totalCholesterol)} − HDL {labInputs.hdl}
          </span>
        </div>

        {/* Regression confidence */}
        <div style={miniStyle}>
          <span style={miniLabel}>
            <TrendingUp size={12} aria-hidden="true" /> Regression confidence<InfoTooltip text={TOOLTIPS.regressionConfidence} />
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="metric-type tabular-nums" style={{ color: 'var(--accent)', fontSize: 22 }}>
              {regressionConfidence}%
            </span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${regressionConfidence}%`, background: 'var(--accent)' }} />
          </div>
          <span className="caption-type" style={{ color: 'var(--text-tertiary)' }}>
            {friedewaldValid ? 'Friedewald valid' : 'TG > 400 — reduced validity'}
          </span>
        </div>

        {/* Prediction explanation */}
        <div style={miniStyle}>
          <span style={miniLabel}>
            <Layers size={12} aria-hidden="true" /> Prediction<InfoTooltip text={TOOLTIPS.predictionExplanation} />
          </span>
          <p className="body-type" style={{ color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
            ApoB estimated from Non-HDL cholesterol (TC − HDL), capturing LDL and other atherogenic particles without a fasting sample.
          </p>
          <span className="caption-type" style={{ color: 'var(--text-tertiary)' }}>
            Inputs: TC {Math.round(labInputs.totalCholesterol)} · HDL {labInputs.hdl} · TG {Math.round(labInputs.triglycerides)}
            {labInputs.trigsManuallySet ? ' (lab)' : ' (PPG est.)'}
          </span>
        </div>

        {/* Risk contribution */}
        <div style={miniStyle}>
          <span style={miniLabel}>
            <Sigma size={12} aria-hidden="true" /> Risk contribution<InfoTooltip text={TOOLTIPS.riskContribution} />
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="metric-type tabular-nums" style={{ color: contributionColor, fontSize: 22 }}>
              {apoBContrib}
            </span>
            <span className="caption-type" style={{ color: 'var(--text-tertiary)' }}>/ 100</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${apoBContrib}%`, background: contributionColor }} />
          </div>
          <span className="caption-type" style={{ color: 'var(--text-tertiary)' }}>
            Weight 22% · INTERHEART #1 factor
          </span>
        </div>

        {/* Mini trend */}
        <div style={miniStyle}>
          <span style={miniLabel}>
            <TrendingUp size={12} aria-hidden="true" /> Trend<InfoTooltip text={TOOLTIPS.estimate} />
          </span>
          <div style={{ width: '100%' }}>
            <Sparkline
              data={apoBHistory.length > 1 ? apoBHistory : [apoB, apoB]}
              width={180}
              height={34}
              stroke={apoBResult.color}
              ariaLabel="ApoB trend"
            />
          </div>
          <span className="caption-type" style={{ color: 'var(--text-tertiary)' }}>
            Latest {apoBHistory.length || 1} samples
          </span>
        </div>
      </div>
    </Card>
  );
}

export { getRiskColor };

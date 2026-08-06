import React from 'react';
import { useSimStore } from '@/store/simStore';
import { Gauge } from '@/components/ui/Gauge';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { ContributionCard } from './ContributionCard';
import { getRiskColor } from '@/lib/vitals';
import { TOOLTIPS } from '@/lib/tooltips';
import { ShieldCheck } from 'lucide-react';

/**
 * SummaryPanel — right sidebar.
 * 1. Large circular Risk Gauge (hero)
 * 2. WHO 10-year CVD risk band
 * 3. Top contributors
 * Sticky on desktop.
 */
export function SummaryPanel() {
  const riskResult = useSimStore(s => s.riskResult);
  const riskTrend = useSimStore(s => s.riskTrend);
  const whoBand = riskResult?.whoRiskBand;
  const score = riskResult?.score ?? 0;
  const band = riskResult?.band ?? 'Low';
  const color = getRiskColor(band);
  const confidence = Math.round((riskResult?.confidence ?? 1) * 100);

  const delta = riskTrend.length > 1 ? score - riskTrend[riskTrend.length - 2].score : 0;

  return (
    <div className="dashboard-summary flex flex-col" style={{ gap: 'var(--space-lg)' }}>
      {/* Hero risk gauge */}
      <section
        className="card flex flex-col items-center"
        aria-label={`Risk score ${score}, ${band} risk, ${confidence}% confidence`}
        style={{ background: 'linear-gradient(180deg, rgba(74,157,255,0.07), rgba(24,24,27,0) 60%), var(--card)', borderColor: 'rgba(74,157,255,0.15)' }}
      >
        <div className="flex items-center justify-between w-full">
          <span className="eyebrow-label flex items-center gap-1.5">
            <ShieldCheck size={13} style={{ color: 'var(--accent)' }} aria-hidden="true" />
            Current Risk
          </span>
          <InfoTooltip text={TOOLTIPS.cadRiskScore} />
        </div>

        <div style={{ margin: 'var(--space-sm) 0 var(--space-xs)' }}>
          <Gauge value={score} size={210} color={color}>
            <span className="hero-type tabular-nums" style={{ color, fontSize: 44, lineHeight: 1 }}>
              {score}
            </span>
            <span className="caption-type" style={{ color: 'var(--text-tertiary)' }}>/ 100</span>
            <span
              className="caption-type font-semibold uppercase"
              style={{ color, letterSpacing: '0.08em', marginTop: 2 }}
            >
              {band} Risk
            </span>
          </Gauge>
        </div>

        <div className="flex items-center justify-between w-full">
          <span className="caption-type" style={{ color: 'var(--text-secondary)' }}>
            Confidence {confidence}%
          </span>
          <span
            className="caption-type tabular-nums flex items-center gap-1"
            style={{ color: delta > 0 ? 'var(--alert-amber)' : 'var(--text-secondary)' }}
            aria-label={`${Math.abs(delta)} point change`}
          >
            {delta === 0 ? '—' : `${delta > 0 ? '▲' : '▼'} ${Math.abs(delta)}`}
          </span>
        </div>
      </section>

      {/* WHO 10-year CVD risk band */}
      <section className="card" aria-label="WHO 10 year CVD risk band">
        <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-sm)' }}>
          <span className="eyebrow-label flex items-center gap-1.5">
            WHO 10-Year CVD Risk<InfoTooltip text={TOOLTIPS.whoRiskBand} />
          </span>
          <span className="caption-type" style={{ color: 'var(--text-tertiary)' }}>South Asia · non-lab</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="metric-type tabular-nums" style={{ color: getRiskColor(whoBand?.tier ?? 'Low'), fontSize: 24 }}>
            {whoBand?.band ?? '<10%'}
          </span>
          <span className="caption-type font-medium" style={{ color: 'var(--text-secondary)' }}>
            {whoBand?.tier ?? 'Low'}
          </span>
        </div>
        <div className="caption-type" style={{ color: 'var(--text-tertiary)', marginTop: 'var(--space-sm)' }}>
          Age {whoBand?.ageBand ?? '50–54'} · SBP {whoBand?.sbpBand ?? '<120'} · BMI {whoBand?.bmiBand ?? '20–24.9'}
          {whoBand?.isSmoker ? ' · Smoker' : ''}
        </div>
      </section>

      {/* Top contributors */}
      <ContributionCard />

      {/* Non-diagnostic disclaimer — moved here, out of every card */}
      <p className="caption-type" style={{ color: 'var(--text-tertiary)', fontStyle: 'italic', lineHeight: 1.5, padding: '0 var(--space-sm)' }}>
        Research/educational simulation combining an internal composite model with the WHO South Asia chart — not a diagnostic tool.
      </p>
    </div>
  );
}

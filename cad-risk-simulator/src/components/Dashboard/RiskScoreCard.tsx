import React from 'react';
import { Shield } from 'lucide-react';
import { useSimStore } from '@/store/simStore';
import { Card, CardHeader } from '@/components/ui/Card';
import { Sparkline } from '@/components/ui/Sparkline';
import { getRiskColor } from '@/lib/vitals';
import { TOOLTIPS } from '@/lib/tooltips';

/**
 * RiskScoreCard — the primary focal point of the main grid.
 * Large score, band label, confidence and a mini trend.
 */
export function RiskScoreCard() {
  const riskResult = useSimStore(s => s.riskResult);
  const riskTrend = useSimStore(s => s.riskTrend);
  const score = riskResult?.score ?? 0;
  const band = riskResult?.band ?? 'Low';
  const color = getRiskColor(band);
  const confidence = Math.round((riskResult?.lipidConfidence ?? 1) * 100);
  const trend = riskTrend.slice(-30).map(d => d.score);

  return (
    <Card
      id="risk-score-card"
      className="card-risk flex flex-col justify-between"
      aria-label={`CAD risk score ${score}, ${band} risk`}
      style={{ borderColor: 'rgba(74,157,255,0.18)', background: 'linear-gradient(180deg, rgba(74,157,255,0.06), rgba(24,24,27,0) 55%), var(--card)' }}
    >
      <CardHeader
        label="Risk Score"
        icon={<Shield size={13} style={{ color: 'var(--accent)' }} aria-hidden="true" />}
        tooltip={TOOLTIPS.cadRiskScore}
        right={
          <span className="flex items-center gap-1">
            <span className="live-dot" />
            <span className="caption-type" style={{ color: 'var(--text-secondary)' }}>Live</span>
          </span>
        }
      />

      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col">
          <span className="hero-type tabular-nums" style={{ color }}>
            {score}
          </span>
          <span className="caption-type font-medium uppercase" style={{ color, letterSpacing: '0.06em', marginTop: 2 }}>
            {band} Risk
          </span>
        </div>
        <div className="sparkline-wrap" style={{ minWidth: 96, flex: 1, maxWidth: 140 }}>
          <Sparkline data={trend} width={140} height={34} stroke={color} ariaLabel="Risk score trend" />
        </div>
      </div>

      <div className="flex items-center justify-between" style={{ marginTop: 'var(--space-md)' }}>
        <span className="caption-type" style={{ color: 'var(--text-secondary)' }}>
          Confidence {confidence}%
        </span>
        <span className="caption-type" style={{ color: 'var(--text-tertiary)' }}>
          {band === 'Low' ? 'Stable' : band === 'Moderate' ? 'Watch' : 'Action'}
        </span>
      </div>
    </Card>
  );
}

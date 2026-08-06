import React from 'react';
import { useSimStore } from '@/store/simStore';
import { Sparkline } from '@/components/ui/Sparkline';
import { getRiskColor } from '@/lib/vitals';

/**
 * RiskTrendFooter — bottom strip: current score + band + 30-sample sparkline.
 */
export function RiskTrendFooter() {
  const riskTrend = useSimStore(s => s.riskTrend);
  const score = useSimStore(s => s.riskResult?.score ?? 0);
  const band = useSimStore(s => s.riskResult?.band ?? 'Low');
  const color = getRiskColor(band);

  const pts = riskTrend.slice(-30).map(d => d.score);

  return (
    <footer
      className="dashboard-footer flex items-center"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: 'var(--space-sm) var(--space-lg)',
        gap: 'var(--space-lg)',
      }}
      aria-label="CAD risk trend"
    >
      <div className="flex items-center gap-2 shrink-0">
        <span className="eyebrow-label">CAD Risk Trend</span>
        <span className="metric-type tabular-nums" style={{ color, fontSize: 18 }}>{score}</span>
        <span className="caption-type font-medium" style={{ color }}>{band}</span>
      </div>
      <div className="flex-1 h-7 min-w-0">
        {pts.length > 1 ? (
          <Sparkline data={pts} width={500} height={28} stroke={color} ariaLabel="Risk score trend" />
        ) : (
          <span className="caption-type" style={{ color: 'var(--text-tertiary)' }}>Collecting data…</span>
        )}
      </div>
    </footer>
  );
}

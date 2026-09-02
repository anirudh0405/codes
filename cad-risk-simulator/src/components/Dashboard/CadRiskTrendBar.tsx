/**
 * CadRiskTrendBar — Persistent Bottom Real-Time Risk Score Trend Bar
 * ===================================================================
 * Displays persistently across all pages:
 *   1. "CAD RISK TREND" header label
 *   2. Current live Risk Score number + Risk Band label (e.g. "17 Low")
 *   3. Background dashed reference line
 *   4. Real-time SVG sparkline tracking riskTrend history over time
 *
 * Optimized for Desktop/Laptop and Mobile screens via CSS classes.
 */

import React, { useMemo } from 'react';
import { useSimStore } from '../../store/simStore';

function getRiskColor(band: string): string {
  if (band === 'High') return 'var(--risk-high)';
  if (band === 'Moderate') return 'var(--risk-moderate)';
  return 'var(--risk-low)';
}

export function CadRiskTrendBar() {
  const riskResult = useSimStore(s => s.riskResult);
  const riskTrend = useSimStore(s => s.riskTrend);

  const score = riskResult?.score ?? 0;
  const band = riskResult?.band ?? 'Low';
  const bandColor = getRiskColor(band);

  // SVG Sparkline dimensions
  const svgWidth = 600;
  const svgHeight = 24;
  const paddingY = 3;

  // Build SVG path data for the trend line
  const { pathData, pointsCount } = useMemo(() => {
    if (!riskTrend || riskTrend.length === 0) {
      return { pathData: '', pointsCount: 0 };
    }

    const n = riskTrend.length;
    if (n === 1) {
      const y = svgHeight - paddingY - (riskTrend[0].score / 100) * (svgHeight - paddingY * 2);
      return { pathData: `M 0 ${y} L ${svgWidth} ${y}`, pointsCount: 1 };
    }

    const points = riskTrend.map((item, idx) => {
      const x = (idx / (n - 1)) * svgWidth;
      const clampedScore = Math.max(0, Math.min(100, item.score));
      const y = svgHeight - paddingY - (clampedScore / 100) * (svgHeight - paddingY * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return {
      pathData: `M ${points.join(' L ')}`,
      pointsCount: n,
    };
  }, [riskTrend]);

  return (
    <div className="cad-risk-trend-bar">
      {/* ── Label & Current Score ────────────────────────────────────────── */}
      <div className="cad-risk-trend-left">
        <span className="cad-risk-trend-title">CAD RISK TREND</span>
        <span className="cad-risk-trend-score tabular-nums">{Math.round(score)}</span>
        <span className="cad-risk-trend-band" style={{ color: bandColor }}>
          {band}
        </span>
      </div>

      {/* ── Real-Time Sparkline Container ───────────────────────────────── */}
      <div className="cad-risk-trend-chart">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          preserveAspectRatio="none"
          className="cad-risk-trend-svg"
        >
          {/* Dashed Reference Line (Mid-level threshold) */}
          <line
            x1="0"
            y1={svgHeight / 2}
            x2={svgWidth}
            y2={svgHeight / 2}
            stroke="var(--border)"
            strokeWidth="1"
            strokeDasharray="4 4"
            opacity="0.8"
          />

          {/* Real-time Trend Line */}
          {pointsCount > 0 && (
            <path
              d={pathData}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transition: 'd 0.3s ease-out',
              }}
            />
          )}
        </svg>
      </div>
    </div>
  );
}

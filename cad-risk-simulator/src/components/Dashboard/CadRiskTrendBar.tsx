/**
 * CadRiskTrendBar — 7-Day Cardiovascular Risk Trend
 * ===================================================================
 * Persistent bottom bar showing:
 *   1. Title: "7-DAY CARDIOVASCULAR RISK TREND"
 *   2. Current live risk score + band
 *   3. 7-day trend chart with labeled days
 *   4. Starting → Current score with direction
 *
 * If insufficient history exists, shows an "Insufficient history" state.
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

  // Build 7-day data from riskTrend history
  const dayData = useMemo(() => {
    if (!riskTrend || riskTrend.length === 0) return [];

    const totalEntries = riskTrend.length;
    if (totalEntries < 2) {
      return [{ day: 'D1', score: Math.round(riskTrend[0].score) }];
    }

    const recent = riskTrend.slice(-7);
    const dayLabels = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'];

    return recent.map((item, idx) => ({
      day: dayLabels[idx] ?? `D${idx + 1}`,
      score: Math.round(item.score),
    }));
  }, [riskTrend]);

  const hasHistory = dayData.length >= 2;
  const startScore = hasHistory ? dayData[0].score : Math.round(score);
  const currentScore = hasHistory ? dayData[dayData.length - 1].score : Math.round(score);
  const change = currentScore - startScore;
  const trendDirection = change > 2 ? 'Increasing' : change < -2 ? 'Improving' : 'Stable';
  const trendArrow = change > 2 ? '↑' : change < -2 ? '↓' : '→';

  // SVG Chart dimensions
  const svgWidth = 480;
  const svgHeight = 60;
  const paddingX = 30;
  const paddingY = 8;
  const chartWidth = svgWidth - paddingX * 2;
  const chartHeight = svgHeight - paddingY * 2;

  const pathData = useMemo(() => {
    if (dayData.length < 2) return '';

    const minScore = Math.max(0, Math.min(...dayData.map(d => d.score)) - 10);
    const maxScore = Math.min(100, Math.max(...dayData.map(d => d.score)) + 10);
    const range = maxScore - minScore || 1;

    const points = dayData.map((d, idx) => {
      const x = paddingX + (idx / (dayData.length - 1)) * chartWidth;
      const y = paddingY + chartHeight - ((d.score - minScore) / range) * chartHeight;
      return { x, y, score: d.score };
    });

    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  }, [dayData]);

  return (
    <div className="cad-risk-trend-bar" style={{ flexDirection: 'column', gap: '6px', padding: '10px var(--space-md) 8px' }}>
      {/* ── Header Row ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <div className="cad-risk-trend-left">
          <span className="cad-risk-trend-title">7-DAY CARDIOVASCULAR RISK TREND</span>
          <span className="cad-risk-trend-score tabular-nums">{Math.round(score)}</span>
          <span className="cad-risk-trend-band" style={{ color: bandColor }}>
            {band}
          </span>
        </div>

        {hasHistory && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
          }}>
            <span style={{ color: 'var(--text-secondary)' }}>
              {startScore} → {currentScore}
            </span>
            <span style={{
              color: change > 2 ? 'var(--risk-high)' : change < -2 ? 'var(--risk-low)' : 'var(--text-secondary)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
            }}>
              {trendArrow} {trendDirection}
            </span>
          </div>
        )}
      </div>

      {/* ── 7-Day Chart ───────────────────────────────────────────── */}
      <div className="cad-risk-trend-chart" style={{ height: '60px', minHeight: '60px' }}>
        {!hasHistory ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: '3px',
          }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Insufficient historical data
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
              Risk trend will appear as simulation history is collected.
            </span>
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            preserveAspectRatio="none"
            className="cad-risk-trend-svg"
          >
            {/* Dashed reference line at 50% */}
            <line
              x1={paddingX}
              y1={svgHeight / 2}
              x2={svgWidth - paddingX}
              y2={svgHeight / 2}
              stroke="var(--border)"
              strokeWidth="1"
              strokeDasharray="4 4"
              opacity="0.6"
            />

            {/* Trend line */}
            <path
              d={pathData}
              fill="none"
              stroke={bandColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transition: 'd 0.3s ease-out' }}
            />

            {/* Data points */}
            {dayData.map((d, idx) => {
              const minScore = Math.max(0, Math.min(...dayData.map(dd => dd.score)) - 10);
              const maxScore = Math.min(100, Math.max(...dayData.map(dd => dd.score)) + 10);
              const range = maxScore - minScore || 1;
              const x = paddingX + (idx / (dayData.length - 1)) * chartWidth;
              const y = paddingY + chartHeight - ((d.score - minScore) / range) * chartHeight;

              return (
                <g key={idx}>
                  <circle
                    cx={x}
                    cy={y}
                    r="3.5"
                    fill={bandColor}
                    stroke="var(--surface)"
                    strokeWidth="1.5"
                  />
                  {/* Day label below */}
                  <text
                    x={x}
                    y={svgHeight - 1}
                    textAnchor="middle"
                    fontSize="7.5"
                    fill="var(--text-tertiary)"
                    fontFamily="var(--font-ui)"
                  >
                    {d.day}
                  </text>
                  {/* Score label above point */}
                  <text
                    x={x}
                    y={Math.max(7, y - 5)}
                    textAnchor="middle"
                    fontSize="8"
                    fontWeight="600"
                    fill="var(--text-primary)"
                    fontFamily="var(--font-mono)"
                  >
                    {d.score}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}

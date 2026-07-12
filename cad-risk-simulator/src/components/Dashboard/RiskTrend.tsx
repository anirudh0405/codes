/**
 * RiskTrend — Full-width bottom strip sparkline
 * The sparkline color matches the current risk band consistently.
 */

import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer,
  ReferenceLine, Tooltip,
} from 'recharts';
import { useSimStore } from '../../store/simStore';

function bandColor(band: string): string {
  if (band === 'High')     return '#E5534B';
  if (band === 'Moderate') return '#E3A83B';
  return '#34D399';
}

function Tip({ active, payload }: { active?: boolean; payload?: { payload: { score: number; band: string; t: number } }[] }) {
  if (!active || !payload?.length) return null;
  const { score, band, t } = payload[0].payload;
  return (
    <div className="clinical-tooltip">
      {score} — {band}<br />
      <span style={{ color: '#6E737C', fontSize: '9px' }}>
        {new Date(t).toLocaleTimeString()}
      </span>
    </div>
  );
}

export function RiskTrend() {
  const trend      = useSimStore(s => s.riskTrend);
  const riskResult = useSimStore(s => s.riskResult);
  const band       = riskResult?.band ?? 'Low';
  const score      = riskResult?.score ?? 0;
  const color      = bandColor(band);

  const display = trend.slice(-30);

  return (
    <div className="bottom-strip">
      {/* Label column */}
      <div className="bottom-label-col">
        <div className="bottom-label-title">CAD RISK TREND</div>
        <div className={`bottom-label-score ${band === 'High' ? 'high' : band === 'Moderate' ? 'moderate' : ''}`}>
          {score}
        </div>
        <div className={`bottom-label-band ${band === 'High' ? 'high' : band === 'Moderate' ? 'moderate' : ''}`}>
          {band}
        </div>
      </div>

      {/* Sparkline */}
      <div className="bottom-chart">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={display} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <defs>
              <linearGradient id="trend-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={color} stopOpacity={0.18} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="t" hide />
            <YAxis domain={[0, 100]} hide />
            <Tooltip content={<Tip />} />
            {/* Risk band thresholds */}
            <ReferenceLine y={35} stroke="#23262C" strokeDasharray="3 3" />
            <ReferenceLine y={65} stroke="#23262C" strokeDasharray="3 3" />
            <Area
              type="monotone"
              dataKey="score"
              stroke={color}
              strokeWidth={1.2}
              fill="url(#trend-gradient)"
              isAnimationActive={false}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

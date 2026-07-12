/**
 * CAD Risk Gauge — Radial gauge using Recharts RadialBarChart
 * Color-banded: green (Low) / amber (Moderate) / red (High)
 */

import React from 'react';
import {
  RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer,
} from 'recharts';
import { useSimStore } from '../../store/simStore';

const BAND_COLORS = {
  Low: 'var(--risk-low)',
  Moderate: 'var(--risk-moderate)',
  High: 'var(--risk-high)',
};

export function RiskGauge() {
  const riskResult = useSimStore(s => s.riskResult);
  const score = riskResult?.score ?? 0;
  const band = riskResult?.band ?? 'Low';
  const color = BAND_COLORS[band];

  const data = [{ name: 'Risk', value: score, fill: color }];

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">CAD Risk Score</span>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
          Rule-based (Phase 1)
        </span>
      </div>
      <div className="card-body">
        <div className="risk-gauge-wrapper">
          <div style={{ width: '100%', height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%"
                cy="85%"
                innerRadius="65%"
                outerRadius="90%"
                barSize={16}
                data={data}
                startAngle={180}
                endAngle={0}
              >
                <PolarAngleAxis
                  type="number"
                  domain={[0, 100]}
                  tick={false}
                />
                <RadialBar
                  background={{ fill: 'rgba(255,255,255,0.04)' }}
                  dataKey="value"
                  cornerRadius={8}
                />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div className="risk-score-display" style={{ marginTop: -60 }}>
            <div className={`risk-score-number ${band.toLowerCase()}`} id="risk-score-value">
              {score}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>/ 100</div>
            <div className={`risk-band-badge ${band.toLowerCase()}`} id="risk-band-badge">
              {band === 'Low' ? '● ' : band === 'Moderate' ? '◆ ' : '▲ '}
              {band} Risk
            </div>
          </div>
        </div>

        {riskResult && (
          <div style={{ marginTop: 'var(--gap-md)', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
            Confidence: {Math.round(riskResult.confidence * 100)}% |{' '}
            {new Date(riskResult.timestamp).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
}

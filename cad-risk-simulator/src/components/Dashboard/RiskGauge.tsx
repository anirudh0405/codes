/**
 * CAD Risk Gauge & WHO Risk Card — Dual Display Component
 * ========================================================
 * 1. Internal composite 0-100 CAD Risk Score gauge (INTERHEART weighted).
 * 2. WHO 10-Year CVD Risk Band reference card ("WHO South Asia non-lab chart").
 * 3. Research & educational non-diagnostic disclaimer.
 */

import React from 'react';
import {
  RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer,
} from 'recharts';
import { useSimStore } from '../../store/simStore';

function getRiskColor(band: string): string {
  if (band === 'High') return 'var(--alert-red)';
  if (band === 'Moderate') return 'var(--alert-amber)';
  return 'var(--accent)';
}

export function RiskGauge() {
  const riskResult = useSimStore(s => s.riskResult);
  const score = riskResult?.score ?? 0;
  const band = riskResult?.band ?? 'Low';
  const color = getRiskColor(band);

  const whoBand = riskResult?.whoRiskBand;

  const data = [{ name: 'Risk', value: score, fill: color }];

  return (
    <div className="flex flex-col gap-3">
      {/* Card 1: Main Internal Composite CAD Risk Score Gauge */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">CAD Risk Score</span>
          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
            INTERHEART Composite Model
          </span>
        </div>
        <div className="card-body">
          <div className="risk-gauge-wrapper">
            <div style={{ width: '100%', height: 160 }}>
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
                    background={{ fill: 'var(--border)' }}
                    dataKey="value"
                    cornerRadius={8}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <div className="risk-score-display" style={{ marginTop: -55 }}>
              <div className={`risk-score-number ${band.toLowerCase()}`} id="risk-score-value">
                {score}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: 2 }}>/ 100</div>
              <div className={`risk-band-badge ${band.toLowerCase()}`} id="risk-band-badge">
                {band === 'Low' ? '● ' : band === 'Moderate' ? '◆ ' : '▲ '}
                {band} Risk
              </div>
            </div>
          </div>

          {riskResult && (
            <div style={{ marginTop: 'var(--gap-md)', fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center' }}>
              Confidence: {Math.round(riskResult.confidence * 100)}% |{' '}
              {new Date(riskResult.timestamp).toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>

      {/* Card 2: WHO 10-Year CVD Risk Band (Secondary Reference Card) */}
      <div className="card" style={{ padding: '12px 14px' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: '6px' }}>
          <span className="card-title" style={{ fontSize: '12px' }}>WHO 10-Year CVD Risk Band</span>
          <span
            className="text-[9px]"
            style={{ color: 'var(--text-tertiary)' }}
          >
            WHO South Asia non-lab chart
          </span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-baseline gap-1.5">
            <span
              className="text-[16px] font-bold tabular-nums"
              style={{ color: getRiskColor(whoBand?.tier ?? 'Low') }}
            >
              {whoBand?.band ?? '<10%'}
            </span>
            <span className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              — {whoBand?.tier ?? 'Low'}
            </span>
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
            Age: {whoBand?.ageBand ?? '50–54'} | SBP: {whoBand?.sbpBand ?? '<120'}
          </span>
        </div>
      </div>

      {/* Disclaimer */}
      <div
        className="text-[10px] leading-tight px-1 text-center"
        style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}
      >
        Risk scoring combines an internal composite model with the WHO South Asia screening chart for reference; this is a research/educational simulation, not a diagnostic tool.
      </div>
    </div>
  );
}

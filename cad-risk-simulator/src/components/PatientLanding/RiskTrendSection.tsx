import React from 'react';
import { useSimStore } from '@/store/simStore';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

export function RiskTrendSection() {
  const riskResult = useSimStore((s) => s.riskResult);
  const activeProfile = useSimStore((s) => s.activeProfile);
  const isCustomScenario = activeProfile && activeProfile.category !== 'healthy';

  const currentScore = isCustomScenario
    ? Math.max(0, Math.min(100, Math.round(riskResult?.score ?? 19)))
    : 19;

  // Day-wise 7-Day Historical Data
  const chartData = [
    { day: 'Day 1', score: Math.max(1, currentScore - 1) },
    { day: 'Day 2', score: currentScore },
    { day: 'Day 3', score: Math.max(1, currentScore - 1) },
    { day: 'Day 4', score: Math.min(99, currentScore + 1) },
    { day: 'Day 5', score: currentScore },
    { day: 'Day 6', score: currentScore },
    { day: 'Day 7', score: currentScore },
  ];

  return (
    <div className="overview-card overview-trend-card" id="card-risk-trend">
      {/* Header: 7-Day Risk Trend | Subheader: HISTORICAL DATA */}
      <div className="overview-trend-header">
        <div className="overview-trend-title-group">
          <h3 className="overview-trend-title">
            7-Day Risk Trend
          </h3>
          <span className="overview-trend-subheader">
            HISTORICAL DATA
          </span>
        </div>
      </div>

      {/* Day-Wise Chart Visual */}
      <div className="overview-trend-chart-container">
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
            <CartesianGrid stroke="#F1F5F9" vertical={false} strokeDasharray="3 3" />
            <ReferenceLine y={25} stroke="#E2E8F0" strokeDasharray="3 3" />
            <ReferenceLine y={50} stroke="#E2E8F0" strokeDasharray="3 3" />

            <XAxis
              dataKey="day"
              stroke="#94A3B8"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#E2E8F0' }}
            />

            <YAxis
              domain={[0, 100]}
              stroke="#94A3B8"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#E2E8F0' }}
              ticks={[0, 25, 50, 75, 100]}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="overview-chart-tooltip">
                      <p className="overview-chart-tooltip-score">
                        {data.score}% Risk
                      </p>
                      <p className="overview-chart-tooltip-time">
                        {data.day}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />

            <Line
              type="monotone"
              dataKey="score"
              stroke="#1B6FEB"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#1B6FEB', stroke: '#FFFFFF', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: '#1B6FEB', stroke: '#FFFFFF', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Footer text: What does this show? */}
      <div className="overview-trend-footer-explanation">
        <span className="overview-trend-footer-heading">
          What does this show?
        </span>
        <p className="overview-trend-footer-desc">
          This shows how the simulated cardiovascular risk has changed over the last 7 days.
        </p>
      </div>
    </div>
  );
}

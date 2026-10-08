import React from 'react';
import { useSimStore } from '@/store/simStore';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

export function RiskTrendCard() {
  const riskTrend = useSimStore((s) => s.riskTrend);

  // Format trend points for display without fabricating points
  const chartData = (riskTrend || []).map((pt, idx) => {
    const d = new Date(pt.t);
    const timeLabel = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return {
      name: `Pt ${idx + 1}`,
      time: timeLabel,
      score: Math.round(pt.score),
      band: pt.band,
    };
  });

  const hasEnoughData = chartData.length >= 2;

  return (
    <div className="pl-card flex flex-col justify-between" aria-label="7-Day Risk Trend">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-slate-900 tracking-tight">
            7-Day Risk Trend
          </h4>
          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
            Historical Data
          </span>
        </div>

        {/* Chart or Graceful Fallback */}
        <div className="h-32 w-full mt-2">
          {hasEnoughData ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 10, left: -22, bottom: 0 }}>
                <XAxis
                  dataKey="time"
                  stroke="#94A3B8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: '#E2E8F0' }}
                />
                <YAxis
                  domain={[0, 100]}
                  stroke="#94A3B8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: '#E2E8F0' }}
                  ticks={[0, 25, 50, 75, 100]}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-md shadow-md">
                          <p className="font-semibold">{data.score}% Risk</p>
                          <p className="text-[10px] text-slate-300">{data.time} · {data.band}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#2563EB"
                  strokeWidth={2.2}
                  dot={{ r: 3, fill: '#2563EB', stroke: '#FFFFFF', strokeWidth: 1.5 }}
                  activeDot={{ r: 5, fill: '#1D4ED8' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center rounded-lg bg-slate-50/80 border border-dashed border-slate-200 p-4 text-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-400 mb-1">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <p className="text-xs font-medium text-slate-600">
                Not enough historical data available yet.
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Evaluations will populate here as simulations proceed.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Explanatory footer */}
      <div className="border-t border-slate-100 pt-2.5 mt-2">
        <span className="text-[11px] font-semibold text-slate-800 block">
          What does this show?
        </span>
        <p className="text-[11px] text-slate-500 leading-normal mt-0.5">
          This shows how the simulated cardiovascular risk has changed over the last 7 days.
        </p>
      </div>
    </div>
  );
}

/**
 * Waveform Charts — Live-scrolling ECG and PPG waveforms
 */

import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip,
} from 'recharts';
import { useSimStore } from '../../store/simStore';

interface WaveformChartProps {
  title: string;
  bufferKey: 'ecgBuffer' | 'ppgBuffer';
  color: string;
  dotColor: string;
  yDomain?: [number, number];
  id: string;
}

function WaveformChart({ title, bufferKey, color, dotColor, yDomain, id }: WaveformChartProps) {
  const buffer = useSimStore(s => s[bufferKey]);
  // Show last 200 points for smooth rendering
  const data = buffer.slice(-200);

  return (
    <div className="card">
      <div className="card-header">
        <div className="waveform-label" style={{ padding: 0 }}>
          <div className="waveform-dot" style={{ background: dotColor, boxShadow: `0 0 6px ${dotColor}` }} />
          <span className="card-title">{title}</span>
        </div>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          LIVE
        </span>
      </div>
      <div id={id} style={{ height: 120, padding: '8px 0' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <XAxis dataKey="t" hide />
            <YAxis domain={yDomain ?? ['auto', 'auto']} hide />
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <div className="custom-tooltip">
                    {(payload[0].value as number)?.toFixed(3)}
                  </div>
                ) : null
              }
            />
            <Line
              type="monotone"
              dataKey="v"
              stroke={color}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ECGWaveform() {
  return (
    <WaveformChart
      id="ecg-waveform"
      title="ECG Waveform"
      bufferKey="ecgBuffer"
      color="var(--ecg-green)"
      dotColor="var(--ecg-green)"
      yDomain={[-0.5, 1.5]}
    />
  );
}

export function PPGWaveform() {
  return (
    <WaveformChart
      id="ppg-waveform"
      title="PPG Waveform"
      bufferKey="ppgBuffer"
      color="var(--ppg-blue)"
      dotColor="var(--ppg-blue)"
      yDomain={[0, 1.2]}
    />
  );
}

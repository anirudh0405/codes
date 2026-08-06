import React, { ReactNode } from 'react';

interface GaugeProps {
  value: number;          // 0–100
  max?: number;
  size?: number;          // px diameter
  color?: string;
  children?: ReactNode;   // centered content (score, label)
}

const START_ANGLE = 135;   // degrees, clockwise from 3 o'clock
const SWEEP_ANGLE = 270;

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, sweepDeg: number): string {
  const start = polar(cx, cy, r, startDeg);
  const end = polar(cx, cy, r, startDeg + sweepDeg);
  const large = sweepDeg > 180 ? 1 : 0;
  return [
    `M ${start.x.toFixed(2)} ${start.y.toFixed(2)}`,
    `A ${r} ${r} 0 ${large} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`,
  ].join(' ');
}

/**
 * Large circular 270° gauge. Track + progress arc + centered HTML content.
 * Animates width via stroke-dashoffset (200ms, subtle).
 */
export function Gauge({ value, max = 100, size = 220, color = 'var(--accent)', children }: GaugeProps) {
  const clamped = Math.max(0, Math.min(max, value));
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;
  const sw = size * 0.045;

  const track = arcPath(cx, cy, r, START_ANGLE, SWEEP_ANGLE);
  const circumference = 2 * Math.PI * r;
  const arcLength = (SWEEP_ANGLE / 360) * circumference;
  const fillLen = (clamped / max) * arcLength;

  return (
    <div className="relative" style={{ width: size, height: size * 0.82 }}>
      <svg
        width={size}
        height={size * 0.82}
        viewBox={`0 0 ${size} ${size * 0.82}`}
        role="img"
        aria-label={`Gauge value ${Math.round(clamped)} of ${max}`}
        style={{ overflow: 'visible' }}
      >
        <path
          d={track}
          fill="none"
          stroke="var(--border)"
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={`${arcLength.toFixed(2)} ${circumference.toFixed(2)}`}
          strokeDashoffset={0}
        />
        <path
          d={track}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={`${arcLength.toFixed(2)} ${circumference.toFixed(2)}`}
          strokeDashoffset={arcLength - fillLen}
          style={{ transition: 'stroke-dashoffset 0.2s ease, stroke 0.3s ease' }}
        />
      </svg>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ paddingTop: size * 0.08 }}
      >
        {children}
      </div>
    </div>
  );
}

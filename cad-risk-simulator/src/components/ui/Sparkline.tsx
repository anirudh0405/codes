import React, { useId } from 'react';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  stroke?: string;
  max?: number;
  min?: number;
  className?: string;
  ariaLabel?: string;
}

/**
 * Minimal SVG sparkline. No axes, no grid — just a clean trace.
 * Used for tiny trend charts inside metric cards.
 */
export function Sparkline({
  data,
  width = 120,
  height = 32,
  stroke = 'var(--accent)',
  max,
  min,
  className,
  ariaLabel = 'Trend',
}: SparklineProps) {
  const gradientId = useId();
  if (!data || data.length < 2) {
    return <svg width={width} height={height} className={className} aria-hidden="true" />;
  }

  const lo = min ?? Math.min(...data);
  const hi = max ?? Math.max(...data);
  const range = hi - lo || 1;
  const pad = 2;

  const toX = (i: number) => (i / (data.length - 1)) * (width - pad * 2) + pad;
  const toY = (v: number) => height - pad - ((v - lo) / range) * (height - pad * 2);

  const line = data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`).join(' ');

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label={ariaLabel}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.18" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={line} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d={`${line} L ${toX(data.length - 1).toFixed(1)} ${height} L ${toX(0).toFixed(1)} ${height} Z`} fill={`url(#${gradientId})`} />
    </svg>
  );
}

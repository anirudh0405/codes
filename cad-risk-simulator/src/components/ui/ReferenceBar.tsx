import React, { useState } from 'react';
import { REFERENCE_RANGES, RangeKey } from '@/data/referenceRanges';
import { InfoTooltip } from './InfoTooltip';

interface ReferenceBarProps {
  rangeKey: RangeKey;
  value: number;
  compact?: boolean;
}

/**
 * Compact "mini comparison bar": a thin reference track with the current value
 * marked as a dot. Full reference text lives in a tooltip to reduce visual noise.
 */
export function ReferenceBar({ rangeKey, value, compact = true }: ReferenceBarProps) {
  const entry = REFERENCE_RANGES[rangeKey];
  const [domainMin, domainMax] = entry.barDomain;
  const span = domainMax - domainMin;
  const pct = Math.max(0, Math.min(1, (value - domainMin) / span)) * 100;

  const [nStart, nEnd] = entry.normalZone;
  const inverted = rangeKey === 'hdl' || rangeKey === 'hrv';

  const normalStart = nStart * 100;
  const normalEnd = nEnd * 100;

  // Status classification (mirrors RangeIndicator)
  const status = (() => {
    const frac = pct / 100;
    if (inverted) {
      if (entry.cadZone) {
        const cadMid = (entry.cadZone[0] + entry.cadZone[1]) / 2;
        if (frac <= cadMid) return 'cad';
      }
      const nMid = (nStart + nEnd) / 2;
      return frac >= nMid ? 'normal' : 'borderline';
    }
    if (entry.cadZone) {
      if (frac >= entry.cadZone[0]) return 'cad';
      if (frac > nEnd) return 'borderline';
      if (frac >= nStart - 0.02) return 'normal';
      return 'borderline';
    }
    if (frac >= nStart && frac <= nEnd) return 'normal';
    if (frac > nEnd && frac < nEnd + 0.15) return 'borderline';
    if (frac < nStart && frac > nStart - 0.10) return 'borderline';
    return 'cad';
  })();

  const color =
    status === 'normal' ? 'var(--accent)' : status === 'borderline' ? 'var(--alert-amber)' : 'var(--alert-red)';

  const unit = entry.unit;

  return (
    <div className="w-full" style={{ paddingTop: 'var(--space-xs)' }}>
      <div
        className="relative"
        style={{
          height: 4,
          borderRadius: 999,
          background: 'var(--border)',
          overflow: 'visible',
        }}
      >
        <div
          className="absolute top-0 bottom-0 rounded-full"
          style={{
            left: `${normalStart}%`,
            width: `${normalEnd - normalStart}%`,
            background: 'var(--accent)',
            opacity: 0.14,
          }}
        />
        <div
          className="absolute"
          style={{
            top: '50%',
            left: `${pct}%`,
            transform: 'translate(-50%, -50%)',
            width: compact ? 7 : 8,
            height: compact ? 7 : 8,
            borderRadius: '50%',
            background: color,
            border: '1.5px solid var(--card)',
            transition: 'left 0.2s ease, background 0.3s ease',
            zIndex: 2,
          }}
        />
      </div>
      {!compact && (
        <div className="flex items-center justify-between" style={{ marginTop: 'var(--space-xs)' }}>
          <span className="caption-type" style={{ color: 'var(--text-secondary)' }}>
            Ref: {entry.normal.min !== undefined && entry.normal.max !== undefined
              ? `${entry.normal.min}–${entry.normal.max} ${unit}`
              : entry.normal.max !== undefined
              ? `< ${entry.normal.max} ${unit}`
              : entry.normal.mean !== undefined
              ? `${entry.normal.mean} ± ${Math.round(entry.normal.sd ?? 0)} ${unit}`
              : `${entry.normal.median ?? '—'} ${unit}`}
          </span>
          <InfoTooltip text={`Normal reference: ${entry.source}`} />
        </div>
      )}
    </div>
  );
}

/**
 * RangeIndicator — Blood Test Report Style Range Bar
 * ====================================================
 * Renders a thin horizontal bar (like a lab report reference scale) with:
 *   1. A track divided into coloured zone segments (normal / CAD-associated)
 *   2. A marker dot showing where the current live value falls
 *   3. A compact legend line with normal and CAD reference values
 *   4. A tiny citation line
 *
 * Design constraints (matching established design system):
 *   - No gradients, no glow, no box-shadows
 *   - Uses only existing CSS tokens: --accent, --alert-amber, --alert-red,
 *     --border, --text-secondary, --text-tertiary, --space-xs/sm/md
 *   - Zone fills at 12% opacity so they read as subtle zones, not loud blocks
 *   - Marker dot is the focal point, not the fill
 *
 * Props:
 *   value     — current live reading (same unit as the reference entry)
 *   rangeKey  — key into REFERENCE_RANGES table
 *   className — optional extra class string
 */

import React from 'react';
import { REFERENCE_RANGES, RangeKey } from '../../data/referenceRanges';

// ─── Marker status classification ─────────────────────────────────────────────

type MarkerStatus = 'normal' | 'borderline' | 'cad';

function classifyValue(value: number, rangeKey: RangeKey): MarkerStatus {
  const entry = REFERENCE_RANGES[rangeKey];
  const [domainMin, domainMax] = entry.barDomain;
  const span = domainMax - domainMin;
  const pct = Math.max(0, Math.min(1, (value - domainMin) / span));

  // HDL is special: higher is better — CAD zone is BELOW normal
  if (rangeKey === 'hdl') {
    if (entry.cadZone) {
      const cadMid = (entry.cadZone[0] + entry.cadZone[1]) / 2;
      if (pct <= cadMid) return 'cad';
    }
    const normalMid = (entry.normalZone[0] + entry.normalZone[1]) / 2;
    if (pct >= normalMid) return 'normal';
    return 'borderline';
  }

  // All other params: higher = worse
  const [nStart, nEnd] = entry.normalZone;
  if (entry.cadZone) {
    const [cStart, cEnd] = entry.cadZone;
    // In the CAD zone or beyond
    if (pct >= cStart) return 'cad';
    // Between normal and CAD
    if (pct > nEnd) return 'borderline';
    // Within normal (with a little tolerance below nStart for healthy lows)
    if (pct >= nStart - 0.02) return 'normal';
    // Below normal zone (bradycardia-like or very low values)
    return 'borderline';
  }

  // No CAD zone: only normal/borderline
  const normalMid = (nEnd + nStart) / 2;
  if (pct >= nStart && pct <= nEnd) return 'normal';
  // Slightly outside normal
  if (pct > nEnd && pct < nEnd + 0.15) return 'borderline';
  if (pct < nStart && pct > nStart - 0.10) return 'borderline';
  return 'cad';
}

const STATUS_COLOR: Record<MarkerStatus, string> = {
  normal:     'var(--accent)',
  borderline: 'var(--alert-amber)',
  cad:        'var(--alert-red)',
};

// ─── Legend text helpers ───────────────────────────────────────────────────────

function fmtStat(s: typeof REFERENCE_RANGES[RangeKey]['normal'], unit: string): string {
  if (s.mean !== undefined && s.sd !== undefined) {
    return `${s.mean} ± ${Math.round(s.sd)} ${unit}`;
  }
  if (s.min !== undefined && s.max !== undefined) {
    return `${s.min}–${s.max} ${unit}`;
  }
  if (s.max !== undefined) {
    return `< ${s.max} ${unit}`;
  }
  if (s.min !== undefined) {
    return `> ${s.min} ${unit}`;
  }
  if (s.median !== undefined) {
    return `${s.median} ${unit} (median)`;
  }
  return `— ${unit}`;
}

// ─── RangeIndicator component ─────────────────────────────────────────────────

interface RangeIndicatorProps {
  value: number;
  rangeKey: RangeKey;
  className?: string;
}

export function RangeIndicator({ value, rangeKey, className }: RangeIndicatorProps) {
  const entry = REFERENCE_RANGES[rangeKey];
  const [domainMin, domainMax] = entry.barDomain;
  const span = domainMax - domainMin;

  const pct = Math.max(0, Math.min(1, (value - domainMin) / span)) * 100;
  const status = classifyValue(value, rangeKey);
  const markerColor = STATUS_COLOR[status];

  const [nStart, nEnd] = entry.normalZone;

  const normalLegend = fmtStat(entry.normal, entry.unit);
  const cadLegend    = entry.cad ? fmtStat(entry.cad, entry.unit) : null;

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-xs)',
        paddingTop: 'var(--space-xs)',
      }}
    >
      {/* ── Bar track ──────────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'relative',
          height: 4,
          borderRadius: 2,
          background: 'var(--border)',
          overflow: 'visible',
        }}
      >
        {/* Normal zone fill */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${nStart * 100}%`,
            width: `${(nEnd - nStart) * 100}%`,
            background: 'var(--accent)',
            opacity: 0.14,
            borderRadius: 2,
          }}
        />

        {/* CAD zone fill — only if CAD data is sourced */}
        {entry.cadZone && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${entry.cadZone[0] * 100}%`,
              width: `${(entry.cadZone[1] - entry.cadZone[0]) * 100}%`,
              background: 'var(--alert-red)',
              opacity: 0.13,
              borderRadius: 2,
            }}
          />
        )}

        {/* Marker dot — positioned above the bar centre */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: `${pct}%`,
            transform: 'translate(-50%, -50%)',
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: markerColor,
            border: '1.5px solid var(--bg)',
            boxShadow: 'none',
            transition: 'left 0.3s ease, background 0.3s ease',
            zIndex: 2,
          }}
        />
      </div>

      {/* ── Legend row ─────────────────────────────────────────────────────── */}
      <div
        style={{
          fontSize: 9,
          color: 'var(--text-secondary)',
          lineHeight: 1.4,
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0 4px',
        }}
      >
        <span>
          <span style={{ color: 'var(--accent)', opacity: 0.9 }}>Normal:</span>
          {' '}{normalLegend}
        </span>
        {cadLegend && (
          <>
            <span style={{ color: 'var(--text-tertiary)' }}>·</span>
            <span>
              <span style={{ color: 'var(--alert-red)', opacity: 0.8 }}>CAD:</span>
              {' '}{cadLegend}
            </span>
          </>
        )}
      </div>

      {/* ── Citation ───────────────────────────────────────────────────────── */}
      <div
        style={{
          fontSize: 8,
          color: 'var(--text-tertiary)',
          lineHeight: 1.3,
        }}
      >
        {entry.source}
      </div>
    </div>
  );
}

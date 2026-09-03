/**
 * CT Biomarker Cards — FAI & CAC Readout Cards
 * ============================================
 * Displays Fat Attenuation Index (FAI) and Coronary Artery Calcium (CAC)
 * manual entries with status tags and CT-derived citations.
 *
 * Matches the established panel-card-alt surface styling from ApoBCard & LpaCard.
 */

import React from 'react';
import { useSimStore } from '../../store/simStore';
import { useShallow } from 'zustand/react/shallow';

export function getFaiStatus(fai: number) {
  if (fai <= -70.1) {
    return {
      label: 'Normal',
      text: 'Normal · Low inflammation',
      color: 'var(--risk-low, #34C759)',
      bg: 'rgba(52, 199, 89, 0.12)',
      border: '1px solid rgba(52, 199, 89, 0.25)',
    };
  }
  return {
    label: 'Elevated',
    text: 'Elevated · Pericoronary inflammation',
    color: 'var(--alert-red, #FF453A)',
    bg: 'rgba(255, 69, 58, 0.12)',
    border: '1px solid rgba(255, 69, 58, 0.25)',
  };
}

export function getCacStatus(cac: number) {
  if (cac <= 0) {
    return {
      tier: 'None',
      text: 'None · Very low risk (<5%)',
      color: 'var(--risk-low, #34C759)',
      bg: 'rgba(52, 199, 89, 0.12)',
      border: '1px solid rgba(52, 199, 89, 0.25)',
    };
  }
  if (cac <= 10) {
    return {
      tier: 'Minimal',
      text: 'Minimal',
      color: 'var(--risk-low, #34C759)',
      bg: 'rgba(52, 199, 89, 0.12)',
      border: '1px solid rgba(52, 199, 89, 0.25)',
    };
  }
  if (cac <= 100) {
    return {
      tier: 'Mild',
      text: 'Mild',
      color: 'var(--accent, #4A9DFF)',
      bg: 'rgba(74, 157, 255, 0.12)',
      border: '1px solid rgba(74, 157, 255, 0.25)',
    };
  }
  if (cac <= 400) {
    return {
      tier: 'Moderate',
      text: 'Moderate',
      color: 'var(--alert-amber, #FFB340)',
      bg: 'rgba(255, 179, 64, 0.12)',
      border: '1px solid rgba(255, 179, 64, 0.25)',
    };
  }
  if (cac <= 615) {
    return {
      tier: 'Severe',
      text: 'Severe',
      color: 'var(--alert-red, #FF453A)',
      bg: 'rgba(255, 69, 58, 0.12)',
      border: '1px solid rgba(255, 69, 58, 0.25)',
    };
  }
  return {
    tier: 'Severe',
    text: 'Severe · Reclassify to high risk',
    color: 'var(--alert-red, #FF453A)',
    bg: 'rgba(255, 69, 58, 0.15)',
    border: '1px solid rgba(255, 69, 58, 0.35)',
  };
}

export function FaiCard() {
  const fai = useSimStore(useShallow((s) => s.fai));
  const status = getFaiStatus(fai);

  return (
    <div id="readout-fai" className="panel-card-alt flex flex-col justify-between" style={{ padding: 'var(--space-md)' }}>
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="eyebrow-label">Fat Attenuation Index (FAI)</span>
        <span
          style={{
            fontSize: 9,
            color: 'var(--text-tertiary)',
            fontWeight: 400,
            textTransform: 'none',
            letterSpacing: 0,
          }}
        >
          Manual entry
        </span>
      </div>

      {/* Primary value */}
      <div
        className="flex items-baseline justify-between"
        style={{ gap: 'var(--space-xs)', margin: 'var(--space-sm) 0' }}
      >
        <div className="flex items-baseline" style={{ gap: 'var(--space-xs)' }}>
          <span
            className="text-[22px] font-semibold tabular-nums"
            style={{ color: status.color }}
          >
            {fai.toFixed(1)}
          </span>
          <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
            HU
          </span>
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 500,
            padding: '2px 6px',
            borderRadius: 4,
            background: status.bg,
            color: status.color,
            border: status.border,
            whiteSpace: 'nowrap',
          }}
        >
          {status.label}
        </span>
      </div>

      {/* Risk sub-label */}
      <span className="text-[11px]" style={{ color: status.color }}>
        {status.text}
      </span>

      {/* Divider */}
      <div
        style={{
          borderTop: '1px solid var(--border)',
          margin: 'var(--space-sm) 0',
        }}
      />

      {/* Threshold context */}
      <div className="flex flex-col" style={{ gap: 4 }}>
        <div className="flex items-center justify-between">
          <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
            Threshold cutoff
          </span>
          <span className="text-[11px] font-medium tabular-nums" style={{ color: 'var(--text-primary)' }}>
            -70.1 HU
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
            Provenance
          </span>
          <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
            CT-derived · not sensor estimated
          </span>
        </div>
      </div>
    </div>
  );
}

export function CacCard() {
  const cac = useSimStore(useShallow((s) => s.cac));
  const status = getCacStatus(cac);

  return (
    <div id="readout-cac" className="panel-card-alt flex flex-col justify-between" style={{ padding: 'var(--space-md)' }}>
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="eyebrow-label">Calcium Score (CAC)</span>
        <span
          style={{
            fontSize: 9,
            color: 'var(--text-tertiary)',
            fontWeight: 400,
            textTransform: 'none',
            letterSpacing: 0,
          }}
        >
          Manual entry
        </span>
      </div>

      {/* Primary value */}
      <div
        className="flex items-baseline justify-between"
        style={{ gap: 'var(--space-xs)', margin: 'var(--space-sm) 0' }}
      >
        <div className="flex items-baseline" style={{ gap: 'var(--space-xs)' }}>
          <span
            className="text-[22px] font-semibold tabular-nums"
            style={{ color: status.color }}
          >
            {Math.round(cac)}
          </span>
          <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
            AU
          </span>
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 500,
            padding: '2px 6px',
            borderRadius: 4,
            background: status.bg,
            color: status.color,
            border: status.border,
            whiteSpace: 'nowrap',
          }}
        >
          {status.tier}
        </span>
      </div>

      {/* Risk sub-label */}
      <span className="text-[11px]" style={{ color: status.color }}>
        {status.text}
      </span>

      {/* Divider */}
      <div
        style={{
          borderTop: '1px solid var(--border)',
          margin: 'var(--space-sm) 0',
        }}
      />

      {/* Threshold context */}
      <div className="flex flex-col" style={{ gap: 4 }}>
        <div className="flex items-center justify-between">
          <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
            High-risk threshold
          </span>
          <span className="text-[11px] font-medium tabular-nums" style={{ color: 'var(--text-primary)' }}>
            &gt; 400 AU
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
            Provenance
          </span>
          <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
            CT-derived · not sensor estimated
          </span>
        </div>
      </div>
    </div>
  );
}

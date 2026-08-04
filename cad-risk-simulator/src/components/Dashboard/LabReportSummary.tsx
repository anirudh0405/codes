/**
 * Lab Report Summary Panel
 * =========================
 * A toggle-able overlay panel listing ALL parameters with reference ranges
 * in a single table-like view — styled like a real blood test report printout.
 *
 * Columns: Parameter | Value | Normal Range | CAD Range | Status
 *
 * Design: same --surface/--border card treatment as the rest of the dashboard.
 * Inter typography, clean 1px --border row dividers, no monospace fonts.
 * No new design tokens introduced.
 */

import React, { useMemo } from 'react';
import { useSimStore } from '../../store/simStore';
import { useShallow } from 'zustand/react/shallow';
import { REFERENCE_RANGES, RangeKey } from '../../data/referenceRanges';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtStat(s: typeof REFERENCE_RANGES[RangeKey]['normal'], unit: string): string {
  if (s.mean !== undefined && s.sd !== undefined) {
    return `${s.mean} ± ${Math.round(s.sd)} ${unit}`;
  }
  if (s.min !== undefined && s.max !== undefined) {
    return `${s.min}–${s.max} ${unit}`;
  }
  if (s.max !== undefined) return `< ${s.max} ${unit}`;
  if (s.min !== undefined) return `> ${s.min} ${unit}`;
  if (s.median !== undefined) return `${s.median} ${unit} (median)`;
  return `— ${unit}`;
}

type StatusLabel = 'Normal' | 'Borderline' | 'CAD-Associated' | 'N/A';

function getStatus(value: number | undefined, rangeKey: RangeKey): StatusLabel {
  if (value === undefined || isNaN(value)) return 'N/A';
  const entry = REFERENCE_RANGES[rangeKey];
  const [dMin, dMax] = entry.barDomain;
  const span = dMax - dMin;
  const pct = Math.max(0, Math.min(1, (value - dMin) / span));

  // HDL is inverted (higher = better)
  if (rangeKey === 'hdl') {
    if (entry.cadZone) {
      const cadMid = (entry.cadZone[0] + entry.cadZone[1]) / 2;
      if (pct <= cadMid) return 'CAD-Associated';
    }
    const nMid = (entry.normalZone[0] + entry.normalZone[1]) / 2;
    return pct >= nMid ? 'Normal' : 'Borderline';
  }

  const [nStart, nEnd] = entry.normalZone;
  if (entry.cadZone) {
    if (pct >= entry.cadZone[0]) return 'CAD-Associated';
    if (pct > nEnd) return 'Borderline';
    if (pct >= nStart - 0.02) return 'Normal';
    return 'Borderline';
  }
  if (pct >= nStart && pct <= nEnd) return 'Normal';
  if (pct > nEnd && pct < nEnd + 0.15) return 'Borderline';
  if (pct < nStart && pct > nStart - 0.10) return 'Borderline';
  return 'CAD-Associated';
}

const STATUS_STYLE: Record<StatusLabel, { color: string; label: string }> = {
  'Normal':          { color: 'var(--accent)',     label: 'Normal' },
  'Borderline':      { color: 'var(--alert-amber)', label: 'Borderline' },
  'CAD-Associated':  { color: 'var(--alert-red)',   label: 'CAD-Associated' },
  'N/A':             { color: 'var(--text-tertiary)', label: 'N/A' },
};

// ─── Row ──────────────────────────────────────────────────────────────────────

function Row({
  label,
  value,
  formattedValue,
  rangeKey,
  isLast,
}: {
  label: string;
  value: number | undefined;
  formattedValue: string;
  rangeKey: RangeKey;
  isLast?: boolean;
}) {
  const entry = REFERENCE_RANGES[rangeKey];
  const status = getStatus(value, rangeKey);
  const { color, label: statusLabel } = STATUS_STYLE[status];

  const normalStr = fmtStat(entry.normal, entry.unit);
  const cadStr    = entry.cad ? fmtStat(entry.cad, entry.unit) : '—';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '110px 80px 1fr 1fr 90px',
        alignItems: 'center',
        padding: '6px var(--space-md)',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        gap: 'var(--space-sm)',
      }}
    >
      <span style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formattedValue}</span>
      <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{normalStr}</span>
      <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{cadStr}</span>
      <span style={{ fontSize: 10, color, fontWeight: 600, textAlign: 'right' }}>{statusLabel}</span>
    </div>
  );
}

// ─── Header Row ───────────────────────────────────────────────────────────────

function HeaderRow() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '110px 80px 1fr 1fr 90px',
        alignItems: 'center',
        padding: '5px var(--space-md) 5px',
        borderBottom: '1px solid var(--border)',
        gap: 'var(--space-sm)',
        background: 'var(--surface)',
        position: 'sticky',
        top: 0,
        zIndex: 2,
      }}
    >
      {['Parameter', 'Value', 'Normal Range', 'CAD Range', 'Status'].map((h) => (
        <span
          key={h}
          style={{
            fontSize: 9,
            color: 'var(--text-tertiary)',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            textAlign: h === 'Status' ? 'right' : 'left',
          }}
        >
          {h}
        </span>
      ))}
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

interface LabReportSummaryProps {
  onClose: () => void;
}

export function LabReportSummary({ onClose }: LabReportSummaryProps) {
  const { snapshot, apoBPanel, labInputs, patientProfile } = useSimStore(
    useShallow((s) => ({
      snapshot:       s.snapshot,
      apoBPanel:      s.apoBPanel,
      labInputs:      s.labInputs,
      patientProfile: s.patientProfile,
    }))
  );

  const { apoB, ldl, nonHDL, friedewaldValid } = apoBPanel;

  const bmi = useMemo(() => {
    const h = patientProfile?.height ?? 170;
    const w = patientProfile?.weight ?? 70;
    return parseFloat((w / Math.pow(h / 100, 2)).toFixed(1));
  }, [patientProfile]);

  const apoBApoa1Ratio = parseFloat((apoB / Math.max(1, labInputs.hdl * 2.0)).toFixed(2));

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 999,
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(700px, 95vw)',
          maxHeight: '80vh',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Panel header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--space-sm) var(--space-md)',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: 'var(--text-secondary)',
              }}
            >
              Lab Report Summary
            </span>
            <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>
              Reference ranges: Ashavaid et al. · Gadhwal et al. · AHA 2017 · Regency Healthcare · Asian Heart Institute
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 16,
              lineHeight: 1,
              padding: '4px 6px',
            }}
            aria-label="Close lab report"
          >
            ✕
          </button>
        </div>

        {/* Scrollable table body */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <HeaderRow />

          <Row label="Total Cholesterol" value={snapshot?.totalCholesterol} formattedValue={snapshot ? `${Math.round(snapshot.totalCholesterol)} mg/dL` : '—'} rangeKey="totalCholesterol" />
          <Row label="Triglycerides"     value={snapshot?.triglycerides}     formattedValue={snapshot ? `${Math.round(snapshot.triglycerides)} mg/dL` : '—'}     rangeKey="triglycerides" />
          <Row label="ApoB (est.)"       value={apoB}                        formattedValue={`${apoB.toFixed(1)} mg/dL`}                                          rangeKey="apoB" />
          <Row label="HDL-C"             value={labInputs.hdl}               formattedValue={`${labInputs.hdl} mg/dL`}                                            rangeKey="hdl" />
          <Row label="LDL-C (Friedewald)" value={friedewaldValid ? ldl : undefined} formattedValue={friedewaldValid ? `${ldl.toFixed(0)} mg/dL` : 'N/A (TG>400)'}  rangeKey="ldl" />
          <Row label="Lp(a)"             value={labInputs.lpa}               formattedValue={`${labInputs.lpa.toFixed(1)} mg/dL`}                                  rangeKey="lpA" />
          <Row label="ApoB/ApoA1"        value={apoBApoa1Ratio}              formattedValue={`${apoBApoa1Ratio}`}                                                   rangeKey="apoBApoA1Ratio" />
          <Row label="Systolic BP"       value={snapshot?.systolic}          formattedValue={snapshot ? `${snapshot.systolic} mmHg` : '—'}                         rangeKey="systolicBP" />
          <Row label="Diastolic BP"      value={snapshot?.diastolic}         formattedValue={snapshot ? `${snapshot.diastolic} mmHg` : '—'}                        rangeKey="diastolicBP" />
          <Row label="Heart Rate"        value={snapshot?.heartRate}         formattedValue={snapshot ? `${snapshot.heartRate} bpm` : '—'}                         rangeKey="heartRate" />
          <Row label="BMI"               value={bmi}                         formattedValue={`${bmi} kg/m²`}                                                       rangeKey="bmi" isLast />
        </div>

        {/* Footer disclaimer */}
        <div
          style={{
            padding: 'var(--space-xs) var(--space-md)',
            borderTop: '1px solid var(--border)',
            fontSize: 9,
            color: 'var(--text-tertiary)',
            fontStyle: 'italic',
            flexShrink: 0,
          }}
        >
          Reference ranges sourced from Indian-population studies. PPG-derived values (Total Cholesterol, Triglycerides) are estimates — not direct lab measurements. ApoB/ApoA1 ratio uses ApoA1 ≈ HDL × 2.0 proxy (display only, not used in risk scoring).
        </div>
      </div>
    </>
  );
}

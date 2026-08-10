/**
 * LabReportPage — Full-width Lab Report Values section
 * =====================================================
 * Accessible from sidebar "Lab Report" nav item.
 * Two-column layout (single column mobile):
 *   Left: Manual-entry fields (Total Cholesterol, HDL-C, Triglycerides, ApoA1)
 *   Right: Auto-calculated fields (LDL-C, Non-HDL, ApoB, ApoB/ApoA1 Ratio, Lp(a))
 *
 * Each field: label + paired slider + numeric input (synced) + reference footnote.
 * Auto-calculated fields show a read-only input with "AUTO" badge.
 *
 * UI ONLY — reads/writes existing store state, no new logic.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSimStore } from '../../store/simStore';
import { useShallow } from 'zustand/react/shallow';

// ── Lab Field — manual (slider + input synced) ──────────────────────────────

function LabField({
  label,
  value,
  min,
  max,
  step,
  unit,
  refNote,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  refNote: string;
  onChange: (val: number) => void;
}) {
  const [localVal, setLocalVal] = useState(String(value));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) setLocalVal(String(Math.round(value * 10) / 10));
  }, [value, isFocused]);

  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  const handleSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v)) {
      onChange(v);
      setLocalVal(String(Math.round(v * 10) / 10));
    }
  }, [onChange]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setLocalVal(text);
    const v = parseFloat(text);
    if (!isNaN(v) && v >= min && v <= max) onChange(v);
  };

  const handleBlur = () => {
    setIsFocused(false);
    const v = parseFloat(localVal);
    if (isNaN(v)) {
      setLocalVal(String(Math.round(value * 10) / 10));
    } else {
      const clamped = Math.max(min, Math.min(max, v));
      onChange(clamped);
      setLocalVal(String(Math.round(clamped * 10) / 10));
    }
  };

  return (
    <div className="lr-field">
      <label className="lr-field-label">{label}</label>
      <div className="lr-input-row">
        <div className="lr-slider-wrap">
          <div className="lr-slider-track">
            <div className="lr-slider-fill" style={{ width: `${pct}%` }} />
          </div>
          <input
            type="range"
            min={min} max={max} step={step}
            value={value}
            onChange={handleSlider}
            className="lr-slider-input"
          />
        </div>
        <div className="lr-num-wrap">
          <input
            type="number"
            min={min} max={max} step={step}
            inputMode="decimal"
            value={localVal}
            onFocus={() => setIsFocused(true)}
            onChange={handleInput}
            onBlur={handleBlur}
            className="lr-num-input"
          />
          <span className="lr-num-unit">{unit}</span>
        </div>
      </div>
      <p className="lr-ref-note">{refNote}</p>
    </div>
  );
}

// ── Lab Field — auto-calculated (read-only) ─────────────────────────────────

function LabFieldAuto({
  label,
  value,
  unit,
  refNote,
  invalid,
}: {
  label: string;
  value: string;
  unit: string;
  refNote: string;
  invalid?: boolean;
}) {
  return (
    <div className="lr-field">
      <div className="lr-field-label-row">
        <label className="lr-field-label">{label}</label>
        <span className="lr-auto-badge">AUTO</span>
      </div>
      <div className="lr-input-row">
        <div className="lr-auto-value-wrap">
          <span className={`lr-auto-value${invalid ? ' lr-auto-invalid' : ''}`}>
            {value}
          </span>
          <span className="lr-num-unit">{unit}</span>
        </div>
      </div>
      <p className="lr-ref-note">{refNote}</p>
    </div>
  );
}

// ── Main Page Component ──────────────────────────────────────────────────────

export function LabReportPage() {
  const { labInputs, setLabInputs, apoBPanel } = useSimStore(
    useShallow(s => ({
      labInputs: s.labInputs,
      setLabInputs: s.setLabInputs,
      apoBPanel: s.apoBPanel,
    }))
  );

  const { nonHDL, ldl, apoB, friedewaldValid } = apoBPanel;

  // Proxy ApoA1 ≈ HDL × 2.0 (display only)
  const apoA1 = labInputs.hdl * 2.0;
  const apoBApoa1Ratio = apoA1 > 0 ? (apoB / apoA1).toFixed(2) : '—';

  return (
    <div className="lr-page">
      {/* Header */}
      <div className="lr-page-header">
        <h1 className="lr-page-title">LAB REPORT VALUES</h1>
        <p className="lr-page-subtitle">Manual entry — overrides PPG estimates where available</p>
      </div>

      {/* Two-column grid */}
      <div className="lr-grid">
        {/* ── Left Column: Manual Entry ───────────────────────────── */}
        <div className="lr-col">
          <LabField
            label="TOTAL CHOLESTEROL"
            value={labInputs.totalCholesterol}
            min={100} max={400} step={1}
            unit="mg/dL"
            refNote="Ref: 198 ± 37 mg/dL · Ashavaid et al."
            onChange={v => setLabInputs({ totalCholesterol: v })}
          />
          <LabField
            label="HDL-C"
            value={labInputs.hdl}
            min={20} max={100} step={1}
            unit="mg/dL"
            refNote="Ref: 44.6 ± 11.8 mg/dL · Ashavaid et al."
            onChange={v => setLabInputs({ hdl: v })}
          />
          <LabField
            label="TRIGLYCERIDES"
            value={labInputs.triglycerides}
            min={30} max={600} step={1}
            unit="mg/dL"
            refNote="Ref: 130 ± 71 mg/dL · Ashavaid et al."
            onChange={v => setLabInputs({ triglycerides: v }, true)}
          />
          <LabFieldAuto
            label="APOA1 (PROXY)"
            value={apoA1.toFixed(0)}
            unit="mg/dL"
            refNote="Proxy: HDL × 2.0 · Display only"
          />
        </div>

        {/* ── Right Column: Auto-Calculated ───────────────────────── */}
        <div className="lr-col">
          <LabFieldAuto
            label="LDL-C (FRIEDEWALD)"
            value={friedewaldValid ? ldl.toFixed(0) : 'N/A'}
            unit="mg/dL"
            refNote="LDL = TC − HDL − (TG/5) · Friedewald et al."
            invalid={!friedewaldValid}
          />
          <LabFieldAuto
            label="NON-HDL CHOLESTEROL"
            value={nonHDL.toFixed(0)}
            unit="mg/dL"
            refNote="Non-HDL = TC − HDL · AHA secondary target"
          />
          <LabFieldAuto
            label="APOB (ESTIMATED)"
            value={apoB.toFixed(1)}
            unit="mg/dL"
            refNote="ApoB = 0.65 × Non-HDL + 6.3 · Sniderman et al."
          />
          <LabFieldAuto
            label="APOB / APOA1 RATIO"
            value={apoBApoa1Ratio}
            unit=""
            refNote="Ref: < 0.80 desirable · INTERHEART"
          />
          <LabField
            label="LP(A)"
            value={labInputs.lpa}
            min={0} max={200} step={0.1}
            unit="mg/dL"
            refNote="Ref: 12.9 mg/dL median healthy · Ashavaid et al."
            onChange={v => setLabInputs({ lpa: v })}
          />
        </div>
      </div>
    </div>
  );
}

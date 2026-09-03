/**
 * LabReportPage — Full-width Lab Report Values section
 * =====================================================
 * Accessible from sidebar "Lab Report" nav item.
 * Two-column layout (single column mobile):
 *   Left: Manual-entry fields (Total Cholesterol, HDL-C, Triglycerides, FAI, CAC, ApoA1)
 *   Right: Auto-calculated fields (LDL-C, Non-HDL, ApoB, ApoB/ApoA1 Ratio, Lp(a))
 *
 * Each field: label + paired slider + numeric input (synced) + reference footnote.
 * Auto-calculated fields show a read-only input with "AUTO" badge.
 *
 * FAI and CAC: CT-derived manual entry fields with status tags, clinical cutoffs,
 * and logarithmic-feel slider for CAC.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSimStore } from '../../store/simStore';
import { useShallow } from 'zustand/react/shallow';
import { FaiCard, CacCard, getFaiStatus, getCacStatus } from '../Dashboard/CtBiomarkerCards';

// ── Lab Field — manual (slider + input synced) ──────────────────────────────

interface LabFieldProps {
  label: string;
  subLabel?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  refNote: string;
  cutoffNote?: string;
  warningNote?: string;
  statusTag?: { text: string; bg: string; color: string; border: string };
  isLogSlider?: boolean;
  onChange: (val: number) => void;
}

function LabField({
  label,
  subLabel,
  value,
  min,
  max,
  step,
  unit,
  refNote,
  cutoffNote,
  warningNote,
  statusTag,
  isLogSlider,
  onChange,
}: LabFieldProps) {
  const [localVal, setLocalVal] = useState(String(value));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) setLocalVal(String(Math.round(value * 10) / 10));
  }, [value, isFocused]);

  // Logarithmic slider helpers for non-linear scale (e.g. CAC 0–1500)
  const toSliderPos = (v: number) => {
    if (!isLogSlider) return Math.max(min, Math.min(max, v));
    const clamped = Math.max(0, Math.min(1500, v));
    return Math.round(Math.pow(clamped / 1500, 1 / 2.5) * 1000);
  };

  const fromSliderPos = (pos: number) => {
    if (!isLogSlider) return pos;
    return Math.round(Math.pow(pos / 1000, 2.5) * 1500);
  };

  const sliderMin = isLogSlider ? 0 : min;
  const sliderMax = isLogSlider ? 1000 : max;
  const currentSliderPos = toSliderPos(value);
  const pct = isLogSlider
    ? Math.max(0, Math.min(100, (currentSliderPos / 1000) * 100))
    : Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  const handleSlider = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = parseFloat(e.target.value);
      if (!isNaN(raw)) {
        const v = fromSliderPos(raw);
        onChange(v);
        setLocalVal(String(Math.round(v * 10) / 10));
      }
    },
    [onChange, isLogSlider]
  );

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setLocalVal(text);
    const v = parseFloat(text);
    if (!isNaN(v)) {
      if (isLogSlider) {
        if (v >= 0) onChange(v);
      } else if (v >= min && v <= max) {
        onChange(v);
      }
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const v = parseFloat(localVal);
    if (isNaN(v)) {
      setLocalVal(String(Math.round(value * 10) / 10));
    } else {
      const clamped = isLogSlider ? Math.max(0, v) : Math.max(min, Math.min(max, v));
      onChange(clamped);
      setLocalVal(String(Math.round(clamped * 10) / 10));
    }
  };

  return (
    <div className="lr-field">
      <div className="lr-field-label-row flex items-center justify-between">
        <div>
          <label className="lr-field-label">{label}</label>
          {subLabel && (
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: -2, marginBottom: 2 }}>
              {subLabel}
            </div>
          )}
        </div>
        {statusTag && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              padding: '2px 7px',
              borderRadius: 4,
              background: statusTag.bg,
              color: statusTag.color,
              border: statusTag.border,
            }}
          >
            {statusTag.text}
          </span>
        )}
      </div>

      <div className="lr-input-row">
        <div className="lr-slider-wrap">
          <div className="lr-slider-track">
            <div className="lr-slider-fill" style={{ width: `${pct}%` }} />
          </div>
          <input
            type="range"
            min={sliderMin}
            max={sliderMax}
            step={isLogSlider ? 1 : step}
            value={currentSliderPos}
            onChange={handleSlider}
            className="lr-slider-input"
          />
        </div>
        <div className="lr-num-wrap">
          <input
            type="number"
            min={min}
            max={isLogSlider ? undefined : max}
            step={step}
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

      {cutoffNote && (
        <p style={{ fontSize: 10, color: 'var(--accent, #4A9DFF)', margin: '2px 0 0 0' }}>
          {cutoffNote}
        </p>
      )}

      {warningNote && (
        <p style={{ fontSize: 10, color: 'var(--alert-amber, #FFB340)', margin: '2px 0 0 0', fontWeight: 500 }}>
          ⚠ {warningNote}
        </p>
      )}

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
  const { labInputs, setLabInputs, apoBPanel, fai, cac, setFai, setCac } = useSimStore(
    useShallow(s => ({
      labInputs: s.labInputs,
      setLabInputs: s.setLabInputs,
      apoBPanel: s.apoBPanel,
      fai: s.fai,
      cac: s.cac,
      setFai: s.setFai,
      setCac: s.setCac,
    }))
  );

  const { nonHDL, ldl, apoB, friedewaldValid } = apoBPanel;

  // Proxy ApoA1 ≈ HDL × 2.0 (display only)
  const apoA1 = labInputs.hdl * 2.0;
  const apoBApoa1Ratio = apoA1 > 0 ? (apoB / apoA1).toFixed(2) : '—';

  const faiStatus = getFaiStatus(fai);
  const cacStatus = getCacStatus(cac);
  const cacWarning = cac > 1500 ? 'Very high burden — verify entry' : undefined;

  return (
    <div className="lr-page">
      {/* Header */}
      <div className="lr-page-header">
        <h1 className="lr-page-title">LAB REPORT VALUES</h1>
        <p className="lr-page-subtitle">Manual entry — overrides PPG estimates where available</p>
      </div>

      {/* Readout Summary Cards (FAI, CAC) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 'var(--space-md)',
          marginBottom: 'var(--space-md)',
        }}
      >
        <FaiCard />
        <CacCard />
      </div>

      {/* Two-column grid */}
      <div className="lr-grid">
        {/* ── Left Column: Manual Entry ───────────────────────────── */}
        <div className="lr-col">
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
            Lipid Chemistry &amp; CT Radiomics
          </div>

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

          {/* FIELD 1: Fat Attenuation Index (FAI) */}
          <LabField
            label="FAT ATTENUATION INDEX (FAI)"
            subLabel="From CT report — pericoronary adipose tissue"
            value={fai}
            min={-190}
            max={-30}
            step={0.5}
            unit="HU"
            statusTag={{
              text: faiStatus.text,
              bg: faiStatus.bg,
              color: faiStatus.color,
              border: faiStatus.border,
            }}
            cutoffNote="-70.1 HU threshold · above = elevated pericoronary inflammation"
            refNote="Source: Antonopoulos et al. Eur Heart J 2017; Radiology: Cardiothoracic Imaging 2021. CT-derived radiomic biomarker — cannot be estimated from wearable sensors."
            onChange={v => setFai(v)}
          />

          {/* FIELD 2: Coronary Artery Calcium Score (CAC) */}
          <LabField
            label="CORONARY ARTERY CALCIUM SCORE (CAC)"
            subLabel="Agatston score from CT scan"
            value={cac}
            min={0}
            max={1500}
            step={1}
            unit="AU"
            isLogSlider={true}
            statusTag={{
              text: cacStatus.text,
              bg: cacStatus.bg,
              color: cacStatus.color,
              border: cacStatus.border,
            }}
            warningNote={cacWarning}
            refNote="Agatston method. Source: National Lipid Association guidelines; MESA study cohort data."
            onChange={v => setCac(v)}
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
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
            Calculated Panels &amp; Genetic Factors
          </div>

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

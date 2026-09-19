/**
 * ReportUploadPanel — Slide-in Data Entry Panel
 * ===============================================
 * Right-side slide-in panel (360px wide) that appears when a report is uploaded.
 * Contains file preview, auto-extraction indicators, sectioned form fields,
 * and "Apply / Update Report Values" button.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSimStore } from '../../store/simStore';
import { useShallow } from 'zustand/react/shallow';
import type { ReportFields, PlaqueType, StenosisSeverity } from '../../store/simStore';

// ── Numeric Field (slider + input synced) ───────────────────────────────────

interface NumFieldProps {
  label: string;
  field: keyof ReportFields;
  placeholder: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  value: string;
  onChange: (field: keyof ReportFields, val: string) => void;
}

function NumField({ label, field, placeholder, min, max, step, unit, value, onChange }: NumFieldProps) {
  const numVal = value === '' ? placeholder : parseFloat(value);
  const pct = Math.max(0, Math.min(100, ((numVal - min) / (max - min)) * 100));

  const handleSlider = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = parseFloat(e.target.value);
      if (!isNaN(raw)) onChange(field, String(Math.round(raw * 10) / 10));
    },
    [field, onChange]
  );

  return (
    <div className="rp-field">
      <label className="rp-field-label">{label}</label>
      <div className="rp-field-input-row">
        <div className="rp-field-slider-wrap">
          <div className="rp-field-slider-track">
            <div className="rp-field-slider-fill" style={{ width: `${pct}%` }} />
          </div>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={numVal}
            onChange={handleSlider}
            className="rp-field-slider"
          />
        </div>
        <div className="rp-field-num-wrap">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            inputMode="decimal"
            placeholder={String(Math.round(placeholder * 10) / 10)}
            value={value}
            onChange={e => onChange(field, e.target.value)}
            className="rp-field-num-input"
          />
          <span className="rp-field-unit">{unit}</span>
        </div>
      </div>
    </div>
  );
}

// ── Dropdown Field ──────────────────────────────────────────────────────────

interface DropdownFieldProps {
  label: string;
  field: keyof ReportFields;
  options: { value: string; label: string }[];
  value: string;
  onChange: (field: keyof ReportFields, val: string) => void;
}

function DropdownField({ label, field, options, value, onChange }: DropdownFieldProps) {
  return (
    <div className="rp-field">
      <label className="rp-field-label">{label}</label>
      <select
        className="rp-field-select"
        value={value}
        onChange={e => onChange(field, e.target.value)}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ── Multi-select Field (Plaque Location) ─────────────────────────────────────

interface MultiSelectFieldProps {
  label: string;
  field: keyof ReportFields;
  options: string[];
  value: string[];
  onChange: (field: keyof ReportFields, val: string) => void;
}

function MultiSelectField({ label, field, options, value, onChange }: MultiSelectFieldProps) {
  const toggleOption = (opt: string) => {
    let next: string[];
    if (opt === 'Multiple') {
      next = value.includes('Multiple') ? [] : ['Multiple'];
    } else {
      next = value.filter(v => v !== 'Multiple');
      if (next.includes(opt)) {
        next = next.filter(v => v !== opt);
      } else {
        next = [...next, opt];
      }
    }
    onChange(field, next.join(','));
  };

  return (
    <div className="rp-field">
      <label className="rp-field-label">{label}</label>
      <div className="rp-pills">
        {options.map(opt => {
          const active = value.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              className={`rp-pill${active ? ' rp-pill-active' : ''}`}
              onClick={() => toggleOption(opt)}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Section Header ──────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return <div className="rp-section-header">{title}</div>;
}

// ── Panel Component ─────────────────────────────────────────────────────────

interface ReportUploadPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReportUploadPanel({ isOpen, onClose }: ReportUploadPanelProps) {
  const {
    uploadedReport,
    labInputs,
    fai,
    cac,
    params,
    patientProfile,
    hsCRP,
    hba1c,
    fastingGlucose,
    plaqueType,
    plaqueLocation,
    stenosisSeverity,
    setReportFields,
    clearReport,
    apoBPanel,
  } = useSimStore(
    useShallow(s => ({
      uploadedReport: s.uploadedReport,
      labInputs: s.labInputs,
      fai: s.fai,
      cac: s.cac,
      params: s.params,
      patientProfile: s.patientProfile,
      hsCRP: s.hsCRP,
      hba1c: s.hba1c,
      fastingGlucose: s.fastingGlucose,
      plaqueType: s.plaqueType,
      plaqueLocation: s.plaqueLocation,
      stenosisSeverity: s.stenosisSeverity,
      setReportFields: s.setReportFields,
      clearReport: s.clearReport,
      apoBPanel: s.apoBPanel,
    }))
  );

  // Local form state — all strings
  const [fields, setFields] = useState<Record<string, string>>({});
  const panelRef = useRef<HTMLDivElement>(null);

  // Auto-populate form when panel opens or when extracted fields update
  useEffect(() => {
    if (isOpen && uploadedReport?.extractedFields) {
      const ef = uploadedReport.extractedFields;
      const initial: Record<string, string> = {};
      if (ef.totalCholesterol !== undefined) initial.totalCholesterol = String(ef.totalCholesterol);
      if (ef.hdl !== undefined) initial.hdl = String(ef.hdl);
      if (ef.ldl !== undefined) initial.ldl = String(ef.ldl);
      if (ef.triglycerides !== undefined) initial.triglycerides = String(ef.triglycerides);
      if (ef.apoB !== undefined) initial.apoB = String(ef.apoB);
      if (ef.apoBApoa1Ratio !== undefined) initial.apoBApoa1Ratio = String(ef.apoBApoa1Ratio);
      if (ef.lpa !== undefined) initial.lpa = String(ef.lpa);
      if (ef.hsCRP !== undefined) initial.hsCRP = String(ef.hsCRP);
      if (ef.hba1c !== undefined) initial.hba1c = String(ef.hba1c);
      if (ef.fastingGlucose !== undefined) initial.fastingGlucose = String(ef.fastingGlucose);
      if (ef.cac !== undefined) initial.cac = String(ef.cac);
      if (ef.fai !== undefined) initial.fai = String(ef.fai);
      if (ef.plaqueType) initial.plaqueType = ef.plaqueType;
      if (ef.plaqueLocation && ef.plaqueLocation.length > 0) initial.plaqueLocation = ef.plaqueLocation.join(',');
      if (ef.stenosisSeverity) initial.stenosisSeverity = ef.stenosisSeverity;
      if (ef.systolic !== undefined) initial.systolic = String(ef.systolic);
      if (ef.diastolic !== undefined) initial.diastolic = String(ef.diastolic);
      if (ef.heartRate !== undefined) initial.heartRate = String(ef.heartRate);
      if (ef.bmi !== undefined) initial.bmi = String(ef.bmi);
      setFields(initial);
    }
  }, [isOpen, uploadedReport, uploadedReport?.extractedFields]);

  const handleChange = useCallback((field: keyof ReportFields, val: string) => {
    setFields(prev => ({ ...prev, [field as string]: val }));
  }, []);

  const handleApply = () => {
    const report: ReportFields = {};

    // Numeric fields
    const numMap: [string, keyof ReportFields][] = [
      ['totalCholesterol', 'totalCholesterol'],
      ['hdl', 'hdl'],
      ['ldl', 'ldl'],
      ['triglycerides', 'triglycerides'],
      ['apoB', 'apoB'],
      ['apoBApoa1Ratio', 'apoBApoa1Ratio'],
      ['lpa', 'lpa'],
      ['hsCRP', 'hsCRP'],
      ['hba1c', 'hba1c'],
      ['fastingGlucose', 'fastingGlucose'],
      ['cac', 'cac'],
      ['fai', 'fai'],
      ['systolic', 'systolic'],
      ['diastolic', 'diastolic'],
      ['heartRate', 'heartRate'],
      ['bmi', 'bmi'],
    ];
    for (const [key, field] of numMap) {
      const val = fields[key];
      if (val !== undefined && val !== '') {
        const num = parseFloat(val);
        if (!isNaN(num)) (report as any)[field] = num;
      }
    }

    // Dropdown / multi-select fields
    if (fields.plaqueType && fields.plaqueType !== '') {
      report.plaqueType = fields.plaqueType as PlaqueType;
    }
    if (fields.plaqueLocation && fields.plaqueLocation !== '') {
      report.plaqueLocation = fields.plaqueLocation.split(',').filter(Boolean);
    }
    if (fields.stenosisSeverity && fields.stenosisSeverity !== '') {
      report.stenosisSeverity = fields.stenosisSeverity as StenosisSeverity;
    }

    setReportFields(report);
    onClose();
  };

  const isAnalyzing = uploadedReport?.status === 'analyzing';
  const currentBMI = patientProfile.weight / Math.pow((patientProfile.height || 170) / 100, 2);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div className="report-panel-backdrop" onClick={onClose} />
      )}

      {/* Panel */}
      <div
        ref={panelRef}
        className={`report-panel${isOpen ? ' report-panel-open' : ''}`}
      >
        {/* Header */}
        <div className="report-panel-header">
          <div>
            <h2 className="report-panel-title">Report Data & Analysis</h2>
            {uploadedReport?.patientName && (
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                Patient: <strong>{uploadedReport.patientName}</strong>
              </p>
            )}
          </div>
          <button type="button" className="report-panel-close" onClick={onClose} aria-label="Close panel">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="4" y1="4" x2="12" y2="12" />
              <line x1="12" y1="4" x2="4" y2="12" />
            </svg>
          </button>
        </div>

        {/* File Preview */}
        {uploadedReport && (
          <div className="report-panel-preview">
            {uploadedReport.fileType === 'image' ? (
              <img
                src={uploadedReport.fileUrl}
                alt="Uploaded report preview"
                className="report-preview-img"
              />
            ) : (
              <div className="report-preview-pdf">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14,2 14,8 20,8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10,9 9,9 8,9" />
                </svg>
                <span>{uploadedReport.fileName}</span>
              </div>
            )}

            {/* Status strip */}
            <div className={`report-status-strip-panel${isAnalyzing ? ' report-analyzing' : ''}`}>
              {isAnalyzing
                ? `⏳ ${uploadedReport.analysisStatusText || 'Analyzing report with AI OCR...'}`
                : `📄 ${uploadedReport.fileName} · Uploaded ${uploadedReport.timestamp}`
              }
            </div>
          </div>
        )}

        {/* Auto-read success banner */}
        {uploadedReport?.status === 'applied' && (uploadedReport.extractedCount ?? 0) > 0 && (
          <div style={{
            background: 'rgba(22, 163, 74, 0.1)',
            border: '1px solid rgba(22, 163, 74, 0.25)',
            borderRadius: '6px',
            padding: '10px 14px',
            margin: '12px 16px 0 16px',
            fontSize: '12px',
            color: 'var(--success, #16a34a)',
            lineHeight: 1.4,
          }}>
            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>✓</span>
              <span>{uploadedReport.extractedCount} Parameters Auto-Read & Applied</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '3px' }}>
              Values from the clinical report were automatically extracted and applied to your dashboard. Review or adjust any value below.
            </div>
          </div>
        )}

        {/* Scrollable form body */}
        <div className="report-panel-body">
          {/* ── BLOOD TEST VALUES ───────────────────────────────────── */}
          <SectionHeader title="BLOOD TEST VALUES" />

          <NumField
            label="Total Cholesterol"
            field="totalCholesterol"
            placeholder={labInputs.totalCholesterol}
            min={100} max={400} step={1} unit="mg/dL"
            value={fields.totalCholesterol ?? ''}
            onChange={handleChange}
          />
          <NumField
            label="HDL Cholesterol"
            field="hdl"
            placeholder={labInputs.hdl}
            min={20} max={100} step={1} unit="mg/dL"
            value={fields.hdl ?? ''}
            onChange={handleChange}
          />
          <NumField
            label="LDL Cholesterol"
            field="ldl"
            placeholder={apoBPanel.ldl}
            min={20} max={300} step={1} unit="mg/dL"
            value={fields.ldl ?? ''}
            onChange={handleChange}
          />
          <NumField
            label="Triglycerides"
            field="triglycerides"
            placeholder={labInputs.triglycerides}
            min={30} max={600} step={1} unit="mg/dL"
            value={fields.triglycerides ?? ''}
            onChange={handleChange}
          />
          <NumField
            label="Apolipoprotein B (ApoB)"
            field="apoB"
            placeholder={apoBPanel.apoB}
            min={20} max={250} step={1} unit="mg/dL"
            value={fields.apoB ?? ''}
            onChange={handleChange}
          />
          <NumField
            label="ApoB / ApoA1 Ratio"
            field="apoBApoa1Ratio"
            placeholder={labInputs.hdl > 0 ? parseFloat((apoBPanel.apoB / (labInputs.hdl * 2)).toFixed(2)) : 0}
            min={0} max={3} step={0.01} unit=""
            value={fields.apoBApoa1Ratio ?? ''}
            onChange={handleChange}
          />
          <NumField
            label="Lipoprotein(a) [Lp(a)]"
            field="lpa"
            placeholder={labInputs.lpa}
            min={0} max={200} step={0.1} unit="mg/dL"
            value={fields.lpa ?? ''}
            onChange={handleChange}
          />
          <NumField
            label="High-Sensitivity C-Reactive Protein (hs-CRP)"
            field="hsCRP"
            placeholder={hsCRP || 0}
            min={0} max={50} step={0.1} unit="mg/L"
            value={fields.hsCRP ?? ''}
            onChange={handleChange}
          />
          <NumField
            label="HbA1c"
            field="hba1c"
            placeholder={hba1c || 0}
            min={3} max={15} step={0.1} unit="%"
            value={fields.hba1c ?? ''}
            onChange={handleChange}
          />
          <NumField
            label="Fasting Blood Glucose"
            field="fastingGlucose"
            placeholder={fastingGlucose || 0}
            min={40} max={500} step={1} unit="mg/dL"
            value={fields.fastingGlucose ?? ''}
            onChange={handleChange}
          />

          {/* ── IMAGING VALUES ──────────────────────────────────────── */}
          <SectionHeader title="IMAGING VALUES" />

          <NumField
            label="Coronary Artery Calcium Score"
            field="cac"
            placeholder={cac}
            min={0} max={1500} step={1} unit="AU"
            value={fields.cac ?? ''}
            onChange={handleChange}
          />
          <NumField
            label="Fat Attenuation Index"
            field="fai"
            placeholder={fai}
            min={-190} max={-30} step={0.5} unit="HU"
            value={fields.fai ?? ''}
            onChange={handleChange}
          />

          <DropdownField
            label="Coronary Plaque"
            field="plaqueType"
            value={fields.plaqueType ?? plaqueType}
            options={[
              { value: 'none', label: 'None' },
              { value: 'non-calcified', label: 'Non-calcified' },
              { value: 'calcified', label: 'Calcified' },
              { value: 'mixed', label: 'Mixed' },
            ]}
            onChange={handleChange}
          />

          <MultiSelectField
            label="Plaque Location"
            field="plaqueLocation"
            value={fields.plaqueLocation ? fields.plaqueLocation.split(',').filter(Boolean) : plaqueLocation}
            options={['LAD', 'LCX', 'RCA', 'Multiple']}
            onChange={handleChange}
          />

          <DropdownField
            label="Stenosis Severity"
            field="stenosisSeverity"
            value={fields.stenosisSeverity ?? stenosisSeverity}
            options={[
              { value: 'none', label: 'None' },
              { value: '<50%', label: '<50%' },
              { value: '50-70%', label: '50-70%' },
              { value: '>70%', label: '>70%' },
            ]}
            onChange={handleChange}
          />

          {/* ── VITAL SIGNS ─────────────────────────────────────────── */}
          <SectionHeader title="VITAL SIGNS (if in report)" />

          <NumField
            label="Systolic Blood Pressure"
            field="systolic"
            placeholder={params.systolic}
            min={80} max={220} step={1} unit="mmHg"
            value={fields.systolic ?? ''}
            onChange={handleChange}
          />
          <NumField
            label="Diastolic Blood Pressure"
            field="diastolic"
            placeholder={params.diastolic}
            min={40} max={140} step={1} unit="mmHg"
            value={fields.diastolic ?? ''}
            onChange={handleChange}
          />
          <NumField
            label="Heart Rate"
            field="heartRate"
            placeholder={params.heartRate}
            min={30} max={220} step={1} unit="bpm"
            value={fields.heartRate ?? ''}
            onChange={handleChange}
          />
          <NumField
            label="Body Mass Index (BMI)"
            field="bmi"
            placeholder={Math.round(currentBMI * 10) / 10}
            min={12} max={60} step={0.1} unit="kg/m²"
            value={fields.bmi ?? ''}
            onChange={handleChange}
          />
        </div>

        {/* Apply / Clear Footer Buttons */}
        <div className="report-panel-footer" style={{ display: 'flex', gap: '8px' }}>
          {uploadedReport && (
            <button
              type="button"
              className="report-reset-btn"
              onClick={() => {
                clearReport();
                onClose();
              }}
              style={{
                flex: '1',
                padding: '10px',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Clear & Reset
            </button>
          )}
          <button
            type="button"
            className="report-apply-btn"
            style={{ flex: uploadedReport ? '2' : '1' }}
            onClick={handleApply}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? 'Analyzing Report...' : 'Re-apply / Update Values'}
          </button>
        </div>
      </div>
    </>
  );
}

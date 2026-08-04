/**
 * Control Panel — Sidebar
 * Sliders + numeric inputs + profile presets + randomize
 */

import React, { useCallback, useState, useEffect } from 'react';
import { useSimStore } from '../../store/simStore';
import { useShallow } from 'zustand/react/shallow';
import { PATIENT_PROFILES } from '../../store/profiles';
import { MockParams } from '../../hal/MockSensorSources';
import { LAB_CLAMPS, LP_A_CLAMP } from '../../features/apoBCalculation';

// Physiological ranges for each parameter
const PARAM_CONFIGS: {
  key: keyof MockParams;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  decimals?: number;
}[] = [
  { key: 'heartRate', label: 'Heart Rate', unit: 'bpm', min: 30, max: 220, step: 1 },
  { key: 'systolic', label: 'BP Systolic', unit: 'mmHg', min: 70, max: 220, step: 1 },
  { key: 'diastolic', label: 'BP Diastolic', unit: 'mmHg', min: 40, max: 140, step: 1 },
  { key: 'hrv', label: 'HRV (RMSSD)', unit: 'ms', min: 5, max: 150, step: 1 },
  { key: 'stressScore', label: 'Stress Score', unit: '0–100', min: 0, max: 100, step: 1 },
  { key: 'stSegment', label: 'ST Segment', unit: 'mV', min: -0.5, max: 0.5, step: 0.01, decimals: 2 },
  { key: 'qtInterval', label: 'QT Interval', unit: 'ms', min: 280, max: 600, step: 5 },
];

interface SliderRowProps {
  cfg: typeof PARAM_CONFIGS[0];
  value: number;
  onChange: (val: number) => void;
}

function SliderRow({ cfg, value, onChange }: SliderRowProps) {
  const pct = Math.max(0, Math.min(100, ((value - cfg.min) / (cfg.max - cfg.min)) * 100));

  const [localVal, setLocalVal] = useState<string>(cfg.decimals !== undefined ? value.toFixed(cfg.decimals) : String(value));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setLocalVal(cfg.decimals !== undefined ? value.toFixed(cfg.decimals) : String(value));
    }
  }, [value, isFocused, cfg.decimals]);

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v)) {
      onChange(v);
      setLocalVal(cfg.decimals !== undefined ? v.toFixed(cfg.decimals) : String(v));
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setLocalVal(text);
    const raw = parseFloat(text);
    if (!isNaN(raw) && raw >= cfg.min && raw <= cfg.max) {
      onChange(raw);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const raw = parseFloat(localVal);
    if (isNaN(raw)) {
      setLocalVal(cfg.decimals !== undefined ? value.toFixed(cfg.decimals) : String(value));
    } else {
      const clamped = Math.max(cfg.min, Math.min(cfg.max, raw));
      onChange(clamped);
      setLocalVal(cfg.decimals !== undefined ? clamped.toFixed(cfg.decimals) : String(clamped));
    }
  };

  return (
    <div className="param-row">
      <div className="param-label-row">
        <span className="param-label">{cfg.label}</span>
        <span className="param-unit">{cfg.unit}</span>
      </div>
      <div className="param-input-row">
        <input
          id={`slider-${cfg.key}`}
          type="range"
          className="param-slider"
          min={cfg.min}
          max={cfg.max}
          step={cfg.step}
          value={value}
          style={{ '--pct': `${pct}%` } as React.CSSProperties}
          onChange={handleSlider}
        />
        <input
          id={`input-${cfg.key}`}
          type="number"
          className="param-number"
          min={cfg.min}
          max={cfg.max}
          step={cfg.step}
          value={localVal}
          onFocus={() => setIsFocused(true)}
          onChange={handleInput}
          onBlur={handleBlur}
        />
      </div>
    </div>
  );
}

// ─── Lab Report Section ──────────────────────────────────────────────────────

interface LabFieldConfig {
  key: 'totalCholesterol' | 'hdl' | 'triglycerides' | 'lpa';
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  note?: string; // optional explanatory note rendered below the slider row
}

const LAB_FIELD_CONFIGS: LabFieldConfig[] = [
  {
    key: 'totalCholesterol',
    label: 'Total Cholesterol',
    unit: 'mg/dL',
    min: LAB_CLAMPS.totalCholesterol.min,
    max: LAB_CLAMPS.totalCholesterol.max,
    step: 1,
  },
  {
    key: 'hdl',
    label: 'HDL Cholesterol',
    unit: 'mg/dL',
    min: LAB_CLAMPS.hdl.min,
    max: LAB_CLAMPS.hdl.max,
    step: 1,
  },
  {
    key: 'triglycerides',
    label: 'Triglycerides',
    unit: 'mg/dL',
    min: LAB_CLAMPS.triglycerides.min,
    max: LAB_CLAMPS.triglycerides.max,
    step: 1,
  },
  {
    key: 'lpa',
    label: 'Lipoprotein(a) [Lp(a)]',
    unit: 'mg/dL',
    min: LP_A_CLAMP.min,
    max: LP_A_CLAMP.max,
    step: 1,
    note: 'Manual entry — cannot be derived from other lipid values',
  },
];

function LabSliderRow({
  cfg,
  value,
  onChange,
  isLocked,
}: {
  cfg: LabFieldConfig;
  value: number;
  onChange: (val: number, isManual: boolean) => void;
  isLocked?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, ((value - cfg.min) / (cfg.max - cfg.min)) * 100));
  const [localVal, setLocalVal] = useState<string>(String(value));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) setLocalVal(String(value));
  }, [value, isFocused]);

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v)) {
      onChange(v, true);
      setLocalVal(String(v));
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setLocalVal(text);
    const raw = parseFloat(text);
    if (!isNaN(raw) && raw >= cfg.min && raw <= cfg.max) {
      onChange(raw, true);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const raw = parseFloat(localVal);
    if (isNaN(raw)) {
      setLocalVal(String(value));
    } else {
      const clamped = Math.max(cfg.min, Math.min(cfg.max, raw));
      onChange(clamped, true);
      setLocalVal(String(clamped));
    }
  };

  return (
    <div className="param-row">
      <div className="param-label-row">
        <span className="param-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {cfg.label}
          {isLocked && (
            <span
              title="Manually set — auto-sync from PPG is paused"
              style={{ fontSize: 9, color: 'var(--text-tertiary)', opacity: 0.8 }}
            >
              ✎
            </span>
          )}
        </span>
        <span className="param-unit">{cfg.unit}</span>
      </div>
      <div className="param-input-row">
        <input
          id={`lab-slider-${cfg.key}`}
          type="range"
          className="param-slider"
          min={cfg.min}
          max={cfg.max}
          step={cfg.step}
          value={value}
          style={{ '--pct': `${pct}%` } as React.CSSProperties}
          onChange={handleSlider}
        />
        <input
          id={`lab-input-${cfg.key}`}
          type="number"
          className="param-number"
          min={cfg.min}
          max={cfg.max}
          step={cfg.step}
          value={localVal}
          onFocus={() => setIsFocused(true)}
          onChange={handleInput}
          onBlur={handleBlur}
        />
      </div>
    </div>
  );
}

function LabReportSection() {
  const { labInputs, setLabInputs } = useSimStore(useShallow((s) => ({
    labInputs: s.labInputs,
    setLabInputs: s.setLabInputs,
  })));

  const handleChange = useCallback(
    (key: LabFieldConfig['key'], val: number, isManual: boolean) => {
      // triglycerides: honour the isManual flag to control PPG auto-sync lock
      // lpa: always treated as manual (no auto-sync source exists for Lp(a))
      const manualTrig =
        key === 'triglycerides' ? isManual :
        key === 'lpa'           ? false    : false;
      setLabInputs({ [key]: val }, manualTrig);
    },
    [setLabInputs]
  );

  const resetTrigs = useCallback(() => {
    // Clear the manual-lock on triglycerides so PPG auto-sync resumes
    setLabInputs({}, false);
    useSimStore.setState((s) => ({
      labInputs: { ...s.labInputs, trigsManuallySet: false },
    }));
  }, [setLabInputs]);

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Lab Report Values</span>
        <span
          style={{
            fontSize: 9,
            color: 'var(--text-tertiary)',
            fontWeight: 400,
            textTransform: 'none',
            letterSpacing: 0,
          }}
        >
          manual entry
        </span>
      </div>
      <div
        className="card-body"
        style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
      >
        <p
          style={{
            fontSize: 10,
            color: 'var(--text-tertiary)',
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          Enter values from a lab report. Triglycerides pre-fills from the
          PPG estimate until you edit it.
        </p>

        {LAB_FIELD_CONFIGS.map((cfg) => (
          <React.Fragment key={cfg.key}>
            <LabSliderRow
              cfg={cfg}
              value={labInputs[cfg.key]}
              onChange={(v, isManual) => handleChange(cfg.key, v, isManual)}
              isLocked={cfg.key === 'triglycerides' && labInputs.trigsManuallySet}
            />
            {cfg.note && (
              <p
                style={{
                  fontSize: 9,
                  color: 'var(--text-tertiary)',
                  margin: '-8px 0 0',
                  lineHeight: 1.4,
                  fontStyle: 'italic',
                }}
              >
                {cfg.note}
              </p>
            )}
          </React.Fragment>
        ))}

        {labInputs.trigsManuallySet && (
          <button
            id="btn-reset-trigs"
            className="action-btn"
            onClick={resetTrigs}
            style={{ fontSize: 10, padding: '4px 8px' }}
          >
            ↺ Resume PPG auto-sync (Triglycerides)
          </button>
        )}
      </div>
    </div>
  );
}

export function ControlPanel() {
  const { params, activeProfile, setParams, applyProfile, randomize } = useSimStore(useShallow((s) => ({
    params: s.params,
    activeProfile: s.activeProfile,
    setParams: s.setParams,
    applyProfile: s.applyProfile,
    randomize: s.randomize,
  })));

  const handleChange = useCallback((key: keyof MockParams, val: number) => {
    setParams({ [key]: val });
  }, [setParams]);

  return (
    <div className="sidebar">
      {/* Patient Profiles */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Patient Profiles</span>
        </div>
        <div className="card-body" style={{ padding: '12px' }}>
          <div className="profile-grid">
            {PATIENT_PROFILES.map(p => (
              <button
                key={p.id}
                id={`profile-${p.id}`}
                className={`profile-btn ${activeProfile?.id === p.id ? 'active' : ''}`}
                onClick={() => applyProfile(p.id)}
                title={p.description}
              >
                <span className="profile-emoji">{p.emoji}</span>
                <span>{p.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Randomize */}
      <button id="btn-randomize" className="action-btn" onClick={randomize}>
        <span>🎲</span> Randomize (Realistic)
      </button>

      {/* Parameter Sliders */}
      <div className="card" style={{ flex: 1 }}>
        <div className="card-header">
          <span className="card-title">Simulation Parameters</span>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {PARAM_CONFIGS.map(cfg => (
            <SliderRow
              key={cfg.key}
              cfg={cfg}
              value={params[cfg.key] as number}
              onChange={(v) => handleChange(cfg.key, v)}
            />
          ))}
        </div>
      </div>

      {/* Lab Report Values — manual entry */}
      <LabReportSection />
    </div>
  );
}

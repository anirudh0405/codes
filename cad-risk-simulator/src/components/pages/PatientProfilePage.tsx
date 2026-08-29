/**
 * PatientProfilePage — Full-width, scrollable Patient Profile section
 * ====================================================================
 * Accessible from sidebar "Patient Profile" nav item.
 * 4 collapsible sub-sections:
 *   1. Demographics (Age, Sex, BMI)
 *   2. Habits & Lifestyle (INTERHEART-based toggles)
 *   3. Medical History (Yes/No toggles)
 *   4. Symptoms (Yes/No + 3-way toggle)
 *
 * UI ONLY — reads/writes existing store state, no new logic.
 */

import React, { useState } from 'react';
import { useSimStore } from '../../store/simStore';
import { useShallow } from 'zustand/react/shallow';
import type { PatientProfileData } from '../Dashboard/PatientProfilePanel';

// ── Chevron SVG ──────────────────────────────────────────────────────────────

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 16 16" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      style={{
        transition: 'transform 0.2s ease',
        transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        color: 'var(--text-tertiary)',
        flexShrink: 0,
      }}
    >
      <polyline points="4,6 8,10 12,6" />
    </svg>
  );
}

// ── Pill Toggle Group ────────────────────────────────────────────────────────

function PillToggleGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; symbol?: string }[];
  value: T;
  onChange: (val: T) => void;
}) {
  return (
    <div className="pp-pill-group">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          className={`pp-pill-btn${value === opt.value ? ' pp-pill-active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.symbol && <span className="pp-pill-symbol">{opt.symbol}</span>}
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

// ── Yes/No Toggle Switch ─────────────────────────────────────────────────────

function YesNoToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <div className="pp-toggle-row">
      <span className="pp-toggle-label">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`pp-toggle-switch${checked ? ' pp-toggle-on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="pp-toggle-knob" />
      </button>
    </div>
  );
}

// ── Collapsible Section ──────────────────────────────────────────────────────

function CollapsibleSection({
  title,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={`pp-section${isOpen ? ' pp-section-open' : ''}`}>
      <button
        type="button"
        className="pp-section-header"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span className="pp-section-title">{title}</span>
        <ChevronIcon open={isOpen} />
      </button>
      <div className="pp-section-body">
        <div className="pp-section-inner">
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Main Page Component ──────────────────────────────────────────────────────

export function PatientProfilePage() {
  const { patientProfile, setPatientProfile } = useSimStore(
    useShallow(s => ({
      patientProfile: s.patientProfile,
      setPatientProfile: s.setPatientProfile,
    }))
  );

  const [openSections, setOpenSections] = useState({
    demographics: true,
    habits: true,
    medicalHistory: false,
    symptoms: false,
  });

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const update = <K extends keyof PatientProfileData>(
    field: K,
    value: PatientProfileData[K],
  ) => {
    setPatientProfile({ [field]: value });
  };

  // BMI calculation
  const heightM = patientProfile.height / 100;
  const bmi = patientProfile.weight / (heightM * heightM);
  const bmiDisplay = isFinite(bmi) ? bmi.toFixed(1) : '—';

  // Map existing store fields to the new UI shape
  // Age as direct number (the store uses ageRange string, we display as number input)
  const ageFromRange = (r: string): number => {
    if (r === '<40') return 35;
    if (r === '40-49') return 45;
    if (r === '50-59') return 55;
    if (r === '60-69') return 65;
    if (r === '70+') return 75;
    return 50;
  };

  const ageToRange = (age: number): string => {
    if (age < 40) return '<40';
    if (age < 50) return '40-49';
    if (age < 60) return '50-59';
    if (age < 70) return '60-69';
    return '70+';
  };

  const [ageVal, setAgeVal] = useState(() => ageFromRange(patientProfile.ageRange));

  const handleAgeChange = (val: number) => {
    const clamped = Math.max(18, Math.min(100, val));
    setAgeVal(clamped);
    update('ageRange', ageToRange(clamped));
  };

  return (
    <div className="pp-page">
      {/* Header */}
      <div className="pp-page-header">
        <h1 className="pp-page-title">PATIENT PROFILE</h1>
        <p className="pp-page-subtitle">Sensor-independent input layer</p>
      </div>

      {/* ── 1. Demographics ───────────────────────────────────────────── */}
      <CollapsibleSection
        title="DEMOGRAPHICS"
        isOpen={openSections.demographics}
        onToggle={() => toggleSection('demographics')}
      >
        {/* Name */}
        <div className="pp-field-row">
          <label className="pp-field-label">NAME</label>
          <input
            type="text"
            value={patientProfile.name ?? 'Patient'}
            onChange={e => update('name', e.target.value || 'Patient')}
            className="pp-num-input pp-name-input"
            placeholder="Patient"
          />
        </div>

        {/* Age */}
        <div className="pp-field-row">
          <label className="pp-field-label">AGE</label>
          <input
            type="number"
            min={18}
            max={100}
            value={ageVal}
            onChange={e => handleAgeChange(parseInt(e.target.value) || 18)}
            className="pp-num-input"
          />
        </div>

        {/* Sex */}
        <div className="pp-field-row">
          <label className="pp-field-label">SEX</label>
          <PillToggleGroup
            options={[
              { value: 'male' as const, label: 'Male', symbol: '♂' },
              { value: 'female' as const, label: 'Female', symbol: '♀' },
            ]}
            value={patientProfile.sex}
            onChange={v => update('sex', v)}
          />
        </div>

        {/* Height */}
        <div className="pp-field-row">
          <label className="pp-field-label">HEIGHT (CM)</label>
          <input
            type="number"
            min={100}
            max={250}
            value={patientProfile.height}
            onChange={e => update('height', Math.max(100, parseFloat(e.target.value) || 170))}
            className="pp-num-input"
          />
        </div>

        {/* Weight */}
        <div className="pp-field-row">
          <label className="pp-field-label">WEIGHT (KG)</label>
          <input
            type="number"
            min={30}
            max={250}
            value={patientProfile.weight}
            onChange={e => update('weight', Math.max(30, parseFloat(e.target.value) || 70))}
            className="pp-num-input"
          />
        </div>

        {/* BMI — auto-calculated */}
        <div className="pp-field-row">
          <label className="pp-field-label">BMI (AUTO)</label>
          <span className="pp-bmi-value">{bmiDisplay}<span className="pp-bmi-unit"> kg/m²</span></span>
        </div>
        <p className="pp-ref-note">18.5–22.9 healthy · Regency Healthcare</p>
      </CollapsibleSection>

      {/* ── 2. Habits & Lifestyle (INTERHEART-based) ──────────────────── */}
      <CollapsibleSection
        title="HABITS & LIFESTYLE"
        isOpen={openSections.habits}
        onToggle={() => toggleSection('habits')}
      >
        {/* Smoking */}
        <div className="pp-field-block">
          <label className="pp-field-label">SMOKING</label>
          <PillToggleGroup
            options={[
              { value: 'never' as const, label: 'Never' },
              { value: 'former' as const, label: 'Former' },
              { value: 'current' as const, label: 'Current' },
            ]}
            value={patientProfile.smoking}
            onChange={v => update('smoking', v)}
          />
        </div>

        {/* Physical Activity */}
        <div className="pp-field-block">
          <label className="pp-field-label">PHYSICAL ACTIVITY</label>
          <PillToggleGroup
            options={[
              { value: 'sedentary' as const, label: 'Low' },
              { value: 'moderate' as const, label: 'Moderate' },
              { value: 'active' as const, label: 'High' },
            ]}
            value={patientProfile.activity}
            onChange={v => update('activity', v)}
          />
        </div>

        {/* Diet Quality */}
        <div className="pp-field-block">
          <label className="pp-field-label">DIET QUALITY</label>
          <PillToggleGroup
            options={[
              { value: 'high_risk' as const, label: 'Low' },
              { value: 'balanced' as const, label: 'Moderate' },
              { value: 'balanced' as const, label: 'High' },
            ]}
            value={patientProfile.dietAlcohol}
            onChange={v => update('dietAlcohol', v)}
          />
        </div>

        {/* Alcohol */}
        <div className="pp-field-block">
          <label className="pp-field-label">ALCOHOL</label>
          <PillToggleGroup
            options={[
              { value: 'balanced' as const, label: 'None' },
              { value: 'balanced' as const, label: 'Light' },
              { value: 'balanced' as const, label: 'Moderate' },
              { value: 'high_risk' as const, label: 'Heavy' },
            ]}
            value={patientProfile.dietAlcohol}
            onChange={v => update('dietAlcohol', v)}
          />
        </div>
      </CollapsibleSection>

      {/* ── 3. Medical History ──────────────────────────────────────────── */}
      <CollapsibleSection
        title="MEDICAL HISTORY"
        isOpen={openSections.medicalHistory}
        onToggle={() => toggleSection('medicalHistory')}
      >
        <YesNoToggle
          label="Diabetes"
          checked={patientProfile.diabetes}
          onChange={v => update('diabetes', v)}
        />
        <YesNoToggle
          label="Hypertension"
          checked={patientProfile.hypertensionHistory}
          onChange={v => update('hypertensionHistory', v)}
        />
        <YesNoToggle
          label="Family History of CAD"
          checked={patientProfile.familyHistoryCAD}
          onChange={v => update('familyHistoryCAD', v)}
        />
        <YesNoToggle
          label="Abdominal Obesity"
          checked={parseFloat(bmiDisplay) >= 25}
          onChange={() => {/* derived from BMI — visual only */}}
        />
      </CollapsibleSection>

      {/* ── 4. Symptoms ────────────────────────────────────────────────── */}
      <CollapsibleSection
        title="SYMPTOMS"
        isOpen={openSections.symptoms}
        onToggle={() => toggleSection('symptoms')}
      >
        <YesNoToggle
          label="Chest Pain"
          checked={patientProfile.chestPain !== 'none'}
          onChange={v => update('chestPain', v ? 'typical' : 'none')}
        />
        <YesNoToggle
          label="Shortness of Breath"
          checked={patientProfile.dyspnea}
          onChange={v => update('dyspnea', v)}
        />
        <YesNoToggle
          label="Fatigue"
          checked={patientProfile.fatigue}
          onChange={v => update('fatigue', v)}
        />

        {/* Psychosocial Stress — 3-way toggle */}
        <div className="pp-field-block">
          <label className="pp-field-label">PSYCHOSOCIAL STRESS</label>
          <PillToggleGroup
            options={[
              { value: 'none' as const, label: 'Low' },
              { value: 'atypical' as const, label: 'Moderate' },
              { value: 'typical' as const, label: 'High' },
            ]}
            value={patientProfile.chestPain}
            onChange={() => {/* Stress is visual-only mapping */}}
          />
        </div>
      </CollapsibleSection>
    </div>
  );
}

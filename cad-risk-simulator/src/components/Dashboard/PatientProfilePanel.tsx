/**
 * Patient Profile Panel
 * =====================
 * Replaces the dedicated Sensors panel in the left column.
 * Displays collapsible sub-sections for patient risk factors:
 *   1. Demographics (Age Range, Biological Sex, Ethnicity)
 *   2. Habits & Lifestyle (Smoking Status, Physical Activity, Alcohol / Diet)
 *   3. Medical History (Diabetes, Family History of CAD, Prior CVD, Statin Therapy)
 *   4. Symptoms (Chest Pain / Angina, Dyspnea, Fatigue, Palpitations)
 *
 * All inputs are strictly structured (dropdowns, toggles, radio buttons).
 */

import React, { useState } from 'react';

export interface PatientProfileData {
  // Demographics
  ageRange: string;
  sex: 'male' | 'female';
  ethnicity: string;

  // Habits & Lifestyle
  smoking: 'never' | 'former' | 'current';
  activity: 'sedentary' | 'moderate' | 'active';
  dietAlcohol: 'balanced' | 'high_risk';

  // Medical History
  diabetes: boolean;
  familyHistoryCAD: boolean;
  priorCVD: boolean;
  hypertensionHistory: boolean;
  statinTherapy: boolean;

  // Symptoms
  chestPain: 'none' | 'atypical' | 'typical';
  dyspnea: boolean;
  fatigue: boolean;
  palpitations: boolean;
}

export const DEFAULT_PATIENT_PROFILE_DATA: PatientProfileData = {
  ageRange: '50-59',
  sex: 'male',
  ethnicity: 'south_asian',

  smoking: 'never',
  activity: 'moderate',
  dietAlcohol: 'balanced',

  diabetes: false,
  familyHistoryCAD: true,
  priorCVD: false,
  hypertensionHistory: false,
  statinTherapy: false,

  chestPain: 'none',
  dyspnea: false,
  fatigue: false,
  palpitations: false,
};

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer py-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors outline-none"
        style={{
          background: checked ? 'var(--accent)' : 'rgba(255,255,255,0.15)',
          border: '1px solid var(--border)',
        }}
      >
        <span
          className="inline-block h-3 w-3 rounded-full transition-transform"
          style={{
            background: checked ? '#0A0A0B' : 'var(--text-secondary)',
            transform: checked ? 'translateX(12px)' : 'translateX(2px)',
          }}
        />
      </button>
    </label>
  );
}

function SectionAccordion({
  title,
  icon,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  icon: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-md overflow-hidden transition-all"
      style={{
        background: 'var(--surface-alt)',
        border: '1px solid var(--border)',
        marginBottom: 'var(--space-xs)',
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between text-left font-medium text-[12px]"
        style={{
          padding: 'var(--space-xs) var(--space-sm)',
          color: 'var(--text-primary)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <span className="flex items-center" style={{ gap: 'var(--space-xs)' }}>
          <span>{icon}</span>
          <span className="font-semibold">{title}</span>
        </span>
        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
          {isOpen ? '▼' : '►'}
        </span>
      </button>

      {isOpen && (
        <div
          style={{
            padding: 'var(--space-xs) var(--space-sm) var(--space-sm)',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-xs)',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function PatientProfilePanel() {
  const [profileData, setProfileData] = useState<PatientProfileData>(DEFAULT_PATIENT_PROFILE_DATA);

  // Collapsible accordion states
  const [openSections, setOpenSections] = useState({
    demographics: true,
    habits: true,
    medicalHistory: false,
    symptoms: false,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const update = <K extends keyof PatientProfileData>(field: K, value: PatientProfileData[K]) => {
    setProfileData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div style={{ padding: 'var(--space-md)' }}>
      {/* Panel Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-sm)' }}>
        <span className="eyebrow-label">Patient Profile</span>
        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>WHO / ASCVD inputs</span>
      </div>

      {/* Accordions */}
      <div className="flex flex-col">
        {/* 1. Demographics */}
        <SectionAccordion
          title="Demographics"
          icon="👤"
          isOpen={openSections.demographics}
          onToggle={() => toggleSection('demographics')}
        >
          {/* Age Range */}
          <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            <span>Age Range</span>
            <select
              value={profileData.ageRange}
              onChange={(e) => update('ageRange', e.target.value)}
              className="rounded px-1.5 py-0.5 text-[11px] outline-none"
              style={{
                background: 'var(--surface)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
              }}
            >
              <option value="<40">&lt; 40 yrs</option>
              <option value="40-49">40–49 yrs</option>
              <option value="50-59">50–59 yrs</option>
              <option value="60-69">60–69 yrs</option>
              <option value="70+">70+ yrs</option>
            </select>
          </div>

          {/* Sex */}
          <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            <span>Biological Sex</span>
            <div className="flex items-center" style={{ gap: 'var(--space-xs)' }}>
              <button
                type="button"
                onClick={() => update('sex', 'male')}
                className="px-2 py-0.5 rounded text-[10px] font-medium transition-colors"
                style={{
                  background: profileData.sex === 'male' ? 'rgba(74,157,255,0.15)' : 'var(--surface)',
                  color: profileData.sex === 'male' ? 'var(--accent)' : 'var(--text-tertiary)',
                  border: profileData.sex === 'male' ? '1px solid var(--accent)' : '1px solid var(--border)',
                }}
              >
                Male
              </button>
              <button
                type="button"
                onClick={() => update('sex', 'female')}
                className="px-2 py-0.5 rounded text-[10px] font-medium transition-colors"
                style={{
                  background: profileData.sex === 'female' ? 'rgba(74,157,255,0.15)' : 'var(--surface)',
                  color: profileData.sex === 'female' ? 'var(--accent)' : 'var(--text-tertiary)',
                  border: profileData.sex === 'female' ? '1px solid var(--accent)' : '1px solid var(--border)',
                }}
              >
                Female
              </button>
            </div>
          </div>

          {/* Ethnicity */}
          <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            <span>Ethnicity</span>
            <select
              value={profileData.ethnicity}
              onChange={(e) => update('ethnicity', e.target.value)}
              className="rounded px-1.5 py-0.5 text-[11px] outline-none max-w-[110px]"
              style={{
                background: 'var(--surface)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
              }}
            >
              <option value="south_asian">South Asian (1.4x)</option>
              <option value="caucasian">Caucasian</option>
              <option value="east_asian">East Asian</option>
              <option value="african">African / Black</option>
              <option value="other">Other</option>
            </select>
          </div>
        </SectionAccordion>

        {/* 2. Habits & Lifestyle */}
        <SectionAccordion
          title="Habits & Lifestyle"
          icon="🏃"
          isOpen={openSections.habits}
          onToggle={() => toggleSection('habits')}
        >
          {/* Smoking */}
          <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            <span>Smoking</span>
            <select
              value={profileData.smoking}
              onChange={(e) => update('smoking', e.target.value as PatientProfileData['smoking'])}
              className="rounded px-1.5 py-0.5 text-[11px] outline-none"
              style={{
                background: 'var(--surface)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
              }}
            >
              <option value="never">Non-smoker</option>
              <option value="former">Former smoker</option>
              <option value="current">Current smoker</option>
            </select>
          </div>

          {/* Physical Activity */}
          <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            <span>Activity</span>
            <select
              value={profileData.activity}
              onChange={(e) => update('activity', e.target.value as PatientProfileData['activity'])}
              className="rounded px-1.5 py-0.5 text-[11px] outline-none"
              style={{
                background: 'var(--surface)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
              }}
            >
              <option value="sedentary">Sedentary</option>
              <option value="moderate">Moderate</option>
              <option value="active">Active</option>
            </select>
          </div>

          {/* Diet / Risk Factors */}
          <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            <span>Diet Risk</span>
            <select
              value={profileData.dietAlcohol}
              onChange={(e) => update('dietAlcohol', e.target.value as PatientProfileData['dietAlcohol'])}
              className="rounded px-1.5 py-0.5 text-[11px] outline-none"
              style={{
                background: 'var(--surface)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
              }}
            >
              <option value="balanced">Balanced / Low risk</option>
              <option value="high_risk">High Fat / Sodium</option>
            </select>
          </div>
        </SectionAccordion>

        {/* 3. Medical History */}
        <SectionAccordion
          title="Medical History"
          icon="🏥"
          isOpen={openSections.medicalHistory}
          onToggle={() => toggleSection('medicalHistory')}
        >
          <Toggle
            label="Diabetes Mellitus"
            checked={profileData.diabetes}
            onChange={(v) => update('diabetes', v)}
          />
          <Toggle
            label="Family History of CAD"
            checked={profileData.familyHistoryCAD}
            onChange={(v) => update('familyHistoryCAD', v)}
          />
          <Toggle
            label="Prior CVD / Stroke"
            checked={profileData.priorCVD}
            onChange={(v) => update('priorCVD', v)}
          />
          <Toggle
            label="Hypertension Diagnosed"
            checked={profileData.hypertensionHistory}
            onChange={(v) => update('hypertensionHistory', v)}
          />
          <Toggle
            label="Statin Therapy"
            checked={profileData.statinTherapy}
            onChange={(v) => update('statinTherapy', v)}
          />
        </SectionAccordion>

        {/* 4. Symptoms */}
        <SectionAccordion
          title="Symptoms"
          icon="⚠️"
          isOpen={openSections.symptoms}
          onToggle={() => toggleSection('symptoms')}
        >
          {/* Angina / Chest Pain */}
          <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            <span>Chest Pain</span>
            <select
              value={profileData.chestPain}
              onChange={(e) => update('chestPain', e.target.value as PatientProfileData['chestPain'])}
              className="rounded px-1.5 py-0.5 text-[11px] outline-none"
              style={{
                background: 'var(--surface)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
              }}
            >
              <option value="none">None</option>
              <option value="atypical">Atypical</option>
              <option value="typical">Typical / Exertional</option>
            </select>
          </div>

          <Toggle
            label="Shortness of Breath"
            checked={profileData.dyspnea}
            onChange={(v) => update('dyspnea', v)}
          />
          <Toggle
            label="Fatigue / Dizziness"
            checked={profileData.fatigue}
            onChange={(v) => update('fatigue', v)}
          />
          <Toggle
            label="Palpitations"
            checked={profileData.palpitations}
            onChange={(v) => update('palpitations', v)}
          />
        </SectionAccordion>
      </div>
    </div>
  );
}

/**
 * Patient Profile Panel
 * =====================
 * Collapsible sidebar sections for patient risk factors:
 *   1. Patient      (age, sex, ethnicity, height/weight, BMI)
 *   2. Lifestyle    (smoking, activity, diet)
 *   3. Medical History (diabetes, family history, prior CVD, HTN, statins)
 *   4. Symptoms     (chest pain, dyspnea, fatigue, palpitations)
 *
 * All inputs are strictly structured (dropdowns, toggles, radio buttons, numeric inputs).
 * Uses the shared Accordion primitive.
 */

import React from 'react';
import { useSimStore } from '../../store/simStore';
import { RangeIndicator } from '../RangeIndicator';
import { Accordion } from '../ui/Accordion';
import { User, Mountain, ClipboardList, Stethoscope } from 'lucide-react';

export interface PatientProfileData {
  // Demographics
  ageRange: string;
  sex: 'male' | 'female';
  ethnicity: string;
  height: number; // cm
  weight: number; // kg

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
  height: 170,
  weight: 70,

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
    <label className="flex items-center justify-between cursor-pointer py-1" style={{ color: 'var(--text-secondary)' }}>
      <span className="body-type">{label}</span>
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

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <span className="body-type shrink-0" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <div className="flex items-center justify-end min-w-0">{children}</div>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  background: 'var(--surface)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '4px 8px',
  fontSize: 13,
  outline: 'none',
  maxWidth: 150,
};

export function PatientProfilePanel() {
  const patientProfile = useSimStore(s => s.patientProfile);
  const setPatientProfile = useSimStore(s => s.setPatientProfile);

  const profileData = patientProfile ?? DEFAULT_PATIENT_PROFILE_DATA;

  const update = <K extends keyof PatientProfileData>(field: K, value: PatientProfileData[K]) => {
    setPatientProfile({ [field]: value });
  };

  const bmi = profileData.weight / Math.pow(profileData.height / 100, 2);

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between" style={{ padding: 'var(--space-xs) var(--space-sm) var(--space-sm)' }}>
        <span className="eyebrow-label">Patient Profile</span>
        <span className="caption-type" style={{ color: 'var(--text-tertiary)' }}>WHO / ASCVD inputs</span>
      </div>

      {/* 1. Patient */}
      <Accordion title="Patient" icon={<User size={13} aria-hidden="true" />} defaultOpen badge={profileData.ageRange}>
        <div className="flex flex-col" style={{ gap: 'var(--space-sm)' }}>
          <FieldRow label="Age">
            <select value={profileData.ageRange} onChange={(e) => update('ageRange', e.target.value)} style={selectStyle}>
              <option value="<40">&lt; 40 yrs</option>
              <option value="40-49">40–49 yrs</option>
              <option value="50-59">50–59 yrs</option>
              <option value="60-69">60–69 yrs</option>
              <option value="70+">70+ yrs</option>
            </select>
          </FieldRow>

          <FieldRow label="Sex">
            <div className="flex items-center gap-1.5">
              {(['male', 'female'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => update('sex', s)}
                  className="px-2 py-0.5 rounded text-[11px] font-medium transition-colors"
                  style={{
                    background: profileData.sex === s ? 'rgba(74,157,255,0.15)' : 'var(--surface)',
                    color: profileData.sex === s ? 'var(--accent)' : 'var(--text-tertiary)',
                    border: profileData.sex === s ? '1px solid var(--accent)' : '1px solid var(--border)',
                  }}
                >
                  {s === 'male' ? 'Male' : 'Female'}
                </button>
              ))}
            </div>
          </FieldRow>

          <FieldRow label="Ethnicity">
            <select value={profileData.ethnicity} onChange={(e) => update('ethnicity', e.target.value)} style={selectStyle}>
              <option value="south_asian">South Asian (1.4x)</option>
              <option value="caucasian">Caucasian</option>
              <option value="east_asian">East Asian</option>
              <option value="african">African / Black</option>
              <option value="other">Other</option>
            </select>
          </FieldRow>

          <FieldRow label="Height / Wt">
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={100}
                max={250}
                value={profileData.height}
                onChange={(e) => update('height', Math.max(100, parseFloat(e.target.value) || 170))}
                aria-label="Height (cm)"
                className="w-12 rounded text-right text-[12px] outline-none"
                style={{ background: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)', padding: '4px 6px' }}
              />
              <span className="caption-type" style={{ color: 'var(--text-tertiary)' }}>cm</span>
              <input
                type="number"
                min={30}
                max={250}
                value={profileData.weight}
                onChange={(e) => update('weight', Math.max(30, parseFloat(e.target.value) || 70))}
                aria-label="Weight (kg)"
                className="w-12 rounded text-right text-[12px] outline-none"
                style={{ background: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)', padding: '4px 6px' }}
              />
              <span className="caption-type" style={{ color: 'var(--text-tertiary)' }}>kg</span>
            </div>
          </FieldRow>

          <FieldRow label="BMI">
            <span className="font-semibold tabular-nums" style={{ color: 'var(--accent)', fontSize: 13 }}>
              {bmi.toFixed(1)} kg/m²
            </span>
          </FieldRow>
          <RangeIndicator rangeKey="bmi" value={parseFloat(bmi.toFixed(1))} />
        </div>
      </Accordion>

      {/* 2. Lifestyle */}
      <Accordion title="Lifestyle" icon={<Mountain size={13} aria-hidden="true" />} defaultOpen badge={profileData.activity}>
        <div className="flex flex-col" style={{ gap: 'var(--space-sm)' }}>
          <FieldRow label="Smoking">
            <select value={profileData.smoking} onChange={(e) => update('smoking', e.target.value as PatientProfileData['smoking'])} style={selectStyle}>
              <option value="never">Non-smoker</option>
              <option value="former">Former smoker</option>
              <option value="current">Current smoker</option>
            </select>
          </FieldRow>

          <FieldRow label="Activity">
            <select value={profileData.activity} onChange={(e) => update('activity', e.target.value as PatientProfileData['activity'])} style={selectStyle}>
              <option value="sedentary">Sedentary</option>
              <option value="moderate">Moderate</option>
              <option value="active">Active</option>
            </select>
          </FieldRow>

          <FieldRow label="Diet Risk">
            <select value={profileData.dietAlcohol} onChange={(e) => update('dietAlcohol', e.target.value as PatientProfileData['dietAlcohol'])} style={selectStyle}>
              <option value="balanced">Balanced / Low risk</option>
              <option value="high_risk">High Fat / Sodium</option>
            </select>
          </FieldRow>
        </div>
      </Accordion>

      {/* 3. Medical History */}
      <Accordion title="Medical History" icon={<ClipboardList size={13} aria-hidden="true" />}>
        <div className="flex flex-col">
          <Toggle label="Diabetes Mellitus" checked={profileData.diabetes} onChange={(v) => update('diabetes', v)} />
          <Toggle label="Family History of CAD" checked={profileData.familyHistoryCAD} onChange={(v) => update('familyHistoryCAD', v)} />
          <Toggle label="Prior CVD / Stroke" checked={profileData.priorCVD} onChange={(v) => update('priorCVD', v)} />
          <Toggle label="Hypertension Diagnosed" checked={profileData.hypertensionHistory} onChange={(v) => update('hypertensionHistory', v)} />
          <Toggle label="Statin Therapy" checked={profileData.statinTherapy} onChange={(v) => update('statinTherapy', v)} />
        </div>
      </Accordion>

      {/* 4. Symptoms */}
      <Accordion title="Symptoms" icon={<Stethoscope size={13} aria-hidden="true" />}>
        <div className="flex flex-col">
          <FieldRow label="Chest Pain">
            <select value={profileData.chestPain} onChange={(e) => update('chestPain', e.target.value as PatientProfileData['chestPain'])} style={selectStyle}>
              <option value="none">None</option>
              <option value="atypical">Atypical</option>
              <option value="typical">Typical / Exertional</option>
            </select>
          </FieldRow>
          <Toggle label="Shortness of Breath" checked={profileData.dyspnea} onChange={(v) => update('dyspnea', v)} />
          <Toggle label="Fatigue / Dizziness" checked={profileData.fatigue} onChange={(v) => update('fatigue', v)} />
          <Toggle label="Palpitations" checked={profileData.palpitations} onChange={(v) => update('palpitations', v)} />
        </div>
      </Accordion>
    </div>
  );
}

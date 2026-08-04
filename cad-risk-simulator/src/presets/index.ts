/**
 * Scenario Presets Engine — Grouped Categories
 * ============================================
 * Defines coherent combination scenarios under two parent categories:
 *   1. "Healthy"
 *   2. "Coronary Artery Disease (CAD)"
 *
 * Each preset sets BOTH sensor parameters (MockParams) AND Patient Profile fields
 * (PatientProfileData) simultaneously so that physiological and clinical risk factors
 * remain fully coherent.
 */

import { MockParams } from '../hal/MockSensorSources';
import { PatientProfileData } from '../components/Dashboard/PatientProfilePanel';

export type PresetCategory = 'healthy' | 'cad';

export interface ScenarioPreset {
  id: string;
  category: PresetCategory;
  categoryName: string; // "Healthy" | "Coronary Artery Disease (CAD)"
  name: string;
  shortName: string;
  emoji: string;
  description: string;
  params: MockParams;
  patientProfile: PatientProfileData;
  labInputs?: {
    totalCholesterol?: number;
    hdl?: number;
    triglycerides?: number;
    lpa?: number;
  };
}

export const PRESET_CATEGORIES: { id: PresetCategory; label: string; shortLabel: string; description: string }[] = [
  {
    id: 'healthy',
    label: 'Healthy',
    shortLabel: 'Healthy',
    description: 'Normal resting and physiological recovery states without underlying cardiovascular pathology',
  },
  {
    id: 'cad',
    label: 'Coronary Artery Disease (CAD)',
    shortLabel: 'CAD',
    description: 'Established and emerging coronary risk profiles, hypertension, metabolic, and post-MI scenarios',
  },
];

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  // ── Category 1: Healthy ──────────────────────────────────────────────────
  {
    id: 'healthy-baseline',
    category: 'healthy',
    categoryName: 'Healthy',
    name: 'Healthy — Baseline',
    shortName: 'Baseline',
    emoji: '💚',
    description: 'Normal resting state — all vital signs and patient profile within healthy optimal ranges',
    params: {
      heartRate: 68,
      systolic: 115,
      diastolic: 75,
      hrv: 70,
      stressScore: 20,
      stSegment: 0.0,
      qtInterval: 395,
    },
    patientProfile: {
      ageRange: '40-49',
      sex: 'male',
      ethnicity: 'south_asian',
      height: 172,
      weight: 68,
      smoking: 'never',
      activity: 'active',
      dietAlcohol: 'balanced',
      diabetes: false,
      familyHistoryCAD: false,
      priorCVD: false,
      hypertensionHistory: false,
      statinTherapy: false,
      chestPain: 'none',
      dyspnea: false,
      fatigue: false,
      palpitations: false,
    },
    labInputs: {
      totalCholesterol: 175,
      hdl: 55,
      triglycerides: 105,
      lpa: 12.9,
    },
  },
  {
    id: 'healthy-post-exercise',
    category: 'healthy',
    categoryName: 'Healthy',
    name: 'Healthy — Active/Post-Exercise',
    shortName: 'Post-Exercise',
    emoji: '🏃',
    description: 'Normal recovery phase after moderate aerobic exercise with transient physiological elevation',
    params: {
      heartRate: 110,
      systolic: 148,
      diastolic: 86,
      hrv: 25,
      stressScore: 40,
      stSegment: 0.02,
      qtInterval: 370,
    },
    patientProfile: {
      ageRange: '40-49',
      sex: 'male',
      ethnicity: 'south_asian',
      height: 175,
      weight: 72,
      smoking: 'never',
      activity: 'active',
      dietAlcohol: 'balanced',
      diabetes: false,
      familyHistoryCAD: false,
      priorCVD: false,
      hypertensionHistory: false,
      statinTherapy: false,
      chestPain: 'none',
      dyspnea: false,
      fatigue: false,
      palpitations: false,
    },
    labInputs: {
      totalCholesterol: 178,
      hdl: 58,
      triglycerides: 115,
      lpa: 12.9,
    },
  },

  // ── Category 2: Coronary Artery Disease (CAD) ───────────────────────────
  {
    id: 'cad-borderline-hypertensive',
    category: 'cad',
    categoryName: 'Coronary Artery Disease (CAD)',
    name: 'CAD — Borderline Hypertensive',
    shortName: 'Borderline HTN',
    emoji: '🟡',
    description: 'Stage 1 hypertension with mild cardiac compensation and family risk history',
    params: {
      heartRate: 82,
      systolic: 142,
      diastolic: 91,
      hrv: 38,
      stressScore: 45,
      stSegment: 0.05,
      qtInterval: 430,
    },
    patientProfile: {
      ageRange: '50-59',
      sex: 'male',
      ethnicity: 'south_asian',
      height: 170,
      weight: 78,
      smoking: 'never',
      activity: 'moderate',
      dietAlcohol: 'balanced',
      diabetes: false,
      familyHistoryCAD: true,
      priorCVD: false,
      hypertensionHistory: true,
      statinTherapy: false,
      chestPain: 'none',
      dyspnea: false,
      fatigue: false,
      palpitations: false,
    },
    labInputs: {
      totalCholesterol: 215,
      hdl: 42,
      triglycerides: 165,
      lpa: 38,
    },
  },
  {
    id: 'cad-high-stress-low-hrv',
    category: 'cad',
    categoryName: 'Coronary Artery Disease (CAD)',
    name: 'CAD — High Stress / Low HRV',
    shortName: 'High Stress',
    emoji: '🔴',
    description: 'Autonomic dysregulation — high sympathetic tone, low parasympathetic recovery',
    params: {
      heartRate: 96,
      systolic: 135,
      diastolic: 88,
      hrv: 18,
      stressScore: 82,
      stSegment: 0.08,
      qtInterval: 450,
    },
    patientProfile: {
      ageRange: '50-59',
      sex: 'male',
      ethnicity: 'south_asian',
      height: 168,
      weight: 80,
      smoking: 'former',
      activity: 'sedentary',
      dietAlcohol: 'high_risk',
      diabetes: false,
      familyHistoryCAD: true,
      priorCVD: false,
      hypertensionHistory: false,
      statinTherapy: false,
      chestPain: 'none',
      dyspnea: false,
      fatigue: true,
      palpitations: true,
    },
    labInputs: {
      totalCholesterol: 230,
      hdl: 38,
      triglycerides: 195,
      lpa: 47,
    },
  },
  {
    id: 'cad-cardiac-concern',
    category: 'cad',
    categoryName: 'Coronary Artery Disease (CAD)',
    name: 'CAD — Cardiac Concern',
    shortName: 'Cardiac Concern',
    emoji: '⚠️',
    description: 'Elevated QTc interval with ST segment changes and high CAD risk profile',
    params: {
      heartRate: 88,
      systolic: 158,
      diastolic: 98,
      hrv: 14,
      stressScore: 65,
      stSegment: 0.22,
      qtInterval: 510,
    },
    patientProfile: {
      ageRange: '60-69',
      sex: 'male',
      ethnicity: 'south_asian',
      height: 165,
      weight: 84,
      smoking: 'current',
      activity: 'sedentary',
      dietAlcohol: 'high_risk',
      diabetes: true,
      familyHistoryCAD: true,
      priorCVD: false,
      hypertensionHistory: true,
      statinTherapy: true,
      chestPain: 'atypical',
      dyspnea: true,
      fatigue: true,
      palpitations: true,
    },
    labInputs: {
      totalCholesterol: 255,
      hdl: 32,
      triglycerides: 240,
      lpa: 58,
    },
  },
  {
    id: 'cad-smoker-sedentary',
    category: 'cad',
    categoryName: 'Coronary Artery Disease (CAD)',
    name: 'CAD — Smoker + Sedentary',
    shortName: 'Smoker + Sedentary',
    emoji: '🚬',
    description: 'Current active smoker with sedentary lifestyle, elevated BP, and high INTERHEART risk',
    params: {
      heartRate: 92,
      systolic: 146,
      diastolic: 92,
      hrv: 22,
      stressScore: 70,
      stSegment: 0.06,
      qtInterval: 440,
    },
    patientProfile: {
      ageRange: '50-59',
      sex: 'male',
      ethnicity: 'south_asian',
      height: 170,
      weight: 85,
      smoking: 'current',
      activity: 'sedentary',
      dietAlcohol: 'high_risk',
      diabetes: false,
      familyHistoryCAD: true,
      priorCVD: false,
      hypertensionHistory: true,
      statinTherapy: false,
      chestPain: 'none',
      dyspnea: true,
      fatigue: false,
      palpitations: false,
    },
    labInputs: {
      totalCholesterol: 235,
      hdl: 36,
      triglycerides: 210,
      lpa: 42,
    },
  },
  {
    id: 'cad-diabetic-hypertensive',
    category: 'cad',
    categoryName: 'Coronary Artery Disease (CAD)',
    name: 'CAD — Diabetic + Hypertensive',
    shortName: 'Diabetic + HTN',
    emoji: '🩸',
    description: 'Diagnosed Diabetes Mellitus and Stage 2 Hypertension with metabolic risk factors',
    params: {
      heartRate: 84,
      systolic: 154,
      diastolic: 94,
      hrv: 28,
      stressScore: 55,
      stSegment: 0.07,
      qtInterval: 445,
    },
    patientProfile: {
      ageRange: '60-69',
      sex: 'female',
      ethnicity: 'south_asian',
      height: 158,
      weight: 76,
      smoking: 'never',
      activity: 'sedentary',
      dietAlcohol: 'high_risk',
      diabetes: true,
      familyHistoryCAD: true,
      priorCVD: false,
      hypertensionHistory: true,
      statinTherapy: true,
      chestPain: 'none',
      dyspnea: false,
      fatigue: true,
      palpitations: false,
    },
    labInputs: {
      totalCholesterol: 245,
      hdl: 34,
      triglycerides: 230,
      lpa: 51,
    },
  },
  {
    id: 'cad-post-mi-recovery',
    category: 'cad',
    categoryName: 'Coronary Artery Disease (CAD)',
    name: 'CAD — Post-MI Recovery Monitoring',
    shortName: 'Post-MI Recovery',
    emoji: '🏥',
    description: 'Ongoing post-myocardial infarction recovery monitoring — near-normal current vitals under medical therapy',
    params: {
      heartRate: 72,
      systolic: 124,
      diastolic: 80,
      hrv: 45,
      stressScore: 35,
      stSegment: 0.02,
      qtInterval: 415,
    },
    patientProfile: {
      ageRange: '60-69',
      sex: 'male',
      ethnicity: 'south_asian',
      height: 170,
      weight: 74,
      smoking: 'former',
      activity: 'moderate',
      dietAlcohol: 'balanced',
      diabetes: false,
      familyHistoryCAD: true,
      priorCVD: true,
      hypertensionHistory: true,
      statinTherapy: true,
      chestPain: 'none',
      dyspnea: false,
      fatigue: false,
      palpitations: false,
    },
    labInputs: {
      totalCholesterol: 185,
      hdl: 44,
      triglycerides: 145,
      lpa: 45,
    },
  },
];

// Re-export backward compatible patient profiles list
export const PATIENT_PROFILES = SCENARIO_PRESETS;

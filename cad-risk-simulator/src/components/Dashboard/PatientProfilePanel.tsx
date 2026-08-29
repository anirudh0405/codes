/**
 * Patient Profile Panel
 * =====================
 * Replaces the dedicated Sensors panel in the left column.
 * Displays collapsible sub-sections for patient risk factors:
 *   1. Demographics (Age Range, Biological Sex, Ethnicity, Height, Weight, BMI)
 *   2. Habits & Lifestyle (Smoking Status, Physical Activity, Alcohol / Diet)
 *   3. Medical History (Diabetes, Family History of CAD, Prior CVD, Statin Therapy)
 *   4. Symptoms (Chest Pain / Angina, Dyspnea, Fatigue, Palpitations)
 *
 * All inputs are strictly structured (dropdowns, toggles, radio buttons, numeric inputs).
 */

import React from 'react';
import { useSimStore } from '../../store/simStore';
import { RangeIndicator } from '../RangeIndicator';

export interface PatientProfileData {
  // Demographics
  name?: string;
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
  name: 'Patient',
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


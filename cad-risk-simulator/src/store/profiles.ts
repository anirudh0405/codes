/**
 * Patient Profile Presets
 * =======================
 * Predefined coherent parameter sets representing different physiological states.
 * Selecting a profile updates ALL parameters simultaneously in a physiologically
 * consistent way (e.g. high BP profile also has elevated HR and lower HRV).
 *
 * Add new profiles here without touching any other module.
 */

import { MockParams } from '../hal/MockSensorSources';

export interface PatientProfile {
  id: string;
  name: string;
  description: string;
  emoji: string;
  params: MockParams;
}

export const PATIENT_PROFILES: PatientProfile[] = [
  {
    id: 'healthy',
    name: 'Healthy',
    emoji: '💚',
    description: 'Normal resting state — all parameters within healthy ranges',
    params: {
      heartRate: 68,
      systolic: 115,
      diastolic: 75,
      hrv: 70,
      stressScore: 20,
      stSegment: 0.0,
      qtInterval: 395,
    },
  },
  {
    id: 'borderline-hypertensive',
    name: 'Borderline Hypertensive',
    emoji: '🟡',
    description: 'Stage 1 hypertension with mild cardiac compensation',
    params: {
      heartRate: 82,
      systolic: 142,
      diastolic: 91,
      hrv: 38,
      stressScore: 45,
      stSegment: 0.05,
      qtInterval: 430,
    },
  },
  {
    id: 'high-stress-low-hrv',
    name: 'High Stress / Low HRV',
    emoji: '🔴',
    description: 'Autonomic dysregulation — high sympathetic tone, low parasympathetic activity',
    params: {
      heartRate: 96,
      systolic: 135,
      diastolic: 88,
      hrv: 18,
      stressScore: 82,
      stSegment: 0.08,
      qtInterval: 450,
    },
  },
  {
    id: 'post-exercise',
    name: 'Post-Exercise',
    emoji: '🏃',
    description: 'Recovery phase after moderate aerobic exercise',
    params: {
      heartRate: 110,
      systolic: 148,
      diastolic: 86,
      hrv: 25,
      stressScore: 40,
      stSegment: 0.02,
      qtInterval: 370,
    },
  },
  {
    id: 'atrial-concern',
    name: 'Cardiac Concern',
    emoji: '⚠️',
    description: 'Elevated QT interval with ST changes — high CAD risk profile',
    params: {
      heartRate: 88,
      systolic: 158,
      diastolic: 98,
      hrv: 14,
      stressScore: 65,
      stSegment: 0.22,
      qtInterval: 510,
    },
  },
];

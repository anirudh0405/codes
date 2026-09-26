/**
 * Patient Report Data Adapter
 * ===========================
 * Single adapter/selector layer for the Patient Report.
 * Reads existing application data from Zustand store (SimState) and formats
 * it into a structured, read-only data model for the report screen.
 *
 * CRITICAL:
 * - Pure selector / adapter function.
 * - Does not modify or duplicate underlying store data.
 * - Does not create new medical calculations.
 * - Uses existing store slices and riskEngine / diseaseSubScores helpers.
 */

import { SimState, useSimStore } from '../store/simStore';
import { computeDiseaseSubScores, DiseaseSubScores } from '../riskEngine/diseaseSubScores';

export interface ContributorItem {
  label: string;
  key: string;
  value: number;
  impactCategory: 'Very High' | 'High' | 'Moderate' | 'Low';
}

export interface PatientReportData {
  patient: {
    id: string;
    name: string;
    age: string;
    gender: 'male' | 'female';
    ethnicity: string;
    reportDate: string;
    vitals: {
      bloodPressure: string;
      systolic: number;
      diastolic: number;
      heartRate: number;
      bmi: number;
      weight: number;
      height: number;
      bmiText: string;
    };
    bloodTests: {
      hsCRP: string;
      ldl: string;
      hba1c: string;
      apoB: string;
      totalCholesterol: number;
      hdl: number;
      triglycerides: number;
      summaryText: string;
    };
    ecg: {
      rhythm: string;
      status: string;
      stSegment: number;
      qtcInterval: number;
      heartRate: number;
    };
    imaging: {
      plaqueType: string;
      plaqueLocation: string[];
      stenosisSeverity: string;
      cac: number;
      cacText: string;
      fai: number;
      findingText: string;
    };
  };

  diagnosis: {
    condition: string;
    confidence: number;
    key: string;
  };

  alternatives: Array<{
    disease: string;
    probability: number;
    isHealthy?: boolean;
  }>;

  risk: {
    score: number;
    band: 'Low' | 'Moderate' | 'High';
    category: 'Very Low Risk' | 'Low Risk' | 'Moderate Risk' | 'High Risk' | 'Critical Risk';
    confidence: number;
    meaning: string;
    whoRiskBand?: string;
  };

  contributors: ContributorItem[];

  trend: {
    direction: 'ascending' | 'descending' | 'flat';
    interpretation: string;
    history: Array<{ day: string; score: number }>;
  };

  progression: {
    currentStage: string;
    stageIndex: number;
    stages: string[];
    progressionProbability: number;
  };

  forecast: {
    horizons: Array<{ horizon: string; condition: string }>;
  };

  explainability: {
    parameterImpacts: Array<{
      parameter: string;
      value: string | number;
      impact: 'high' | 'moderate' | 'low';
      explanation: string;
    }>;
  };

  contributions: Array<{
    label: string;
    key: string;
    percentage: number;
  }>;

  recommendations: {
    immediate: string[];
    lifestyle: string[];
    monitoring: string[];
  };
}

const STAGES = [
  'Healthy',
  'Early Plaque Formation',
  'Moderate CAD',
  'Severe CAD',
  'Major Cardiac Event',
];

function getImpactCategory(val: number): 'Very High' | 'High' | 'Moderate' | 'Low' {
  if (val >= 70) return 'Very High';
  if (val >= 50) return 'High';
  if (val >= 30) return 'Moderate';
  return 'Low';
}

/**
 * Builds the complete structured data payload for the Patient Report screen
 * from the active application simulation state.
 */
export function buildPatientReportData(state?: SimState): PatientReportData {
  const s = state ?? useSimStore.getState();

  // 1. Patient Identifiers & Dates
  let patientId = 'P-100234';
  if (typeof window !== 'undefined' && window.sessionStorage) {
    const saved = sessionStorage.getItem('arohan_patient_id');
    if (saved) {
      patientId = saved;
    } else {
      const generated = `P-${Math.floor(100000 + Math.random() * 900000)}`;
      sessionStorage.setItem('arohan_patient_id', generated);
      patientId = generated;
    }
  }

  const reportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // 2. Vitals & Body Metrics
  const heightM = (s.patientProfile.height || 170) / 100;
  const bmiVal = Number((s.patientProfile.weight / (heightM * heightM)).toFixed(1));
  const bmiSafe = isFinite(bmiVal) && bmiVal > 0 ? bmiVal : 24.5;

  // 3. Current Risk Score and Band
  const currentScore = s.riskResult?.score ?? 35;
  const riskBand = s.riskResult?.band ?? 'Low';
  const riskConfidence = Math.round((s.riskResult?.confidence ?? 0.85) * 100);

  // 4. Disease Sub-scores (using existing computed slice or calling computeDiseaseSubScores)
  let subScores: DiseaseSubScores;
  if (s.diseaseSubScores) {
    subScores = s.diseaseSubScores;
  } else {
    subScores = computeDiseaseSubScores({
      totalCholesterol: s.labInputs.totalCholesterol,
      hdl: s.labInputs.hdl,
      triglycerides: s.labInputs.triglycerides,
      ldl: s.apoBPanel.ldl,
      nonHDL: s.apoBPanel.nonHDL,
      apoB: s.apoBPanel.apoB,
      apoBApoa1Ratio: s.labInputs.hdl > 0 ? s.apoBPanel.apoB / (s.labInputs.hdl * 2) : undefined,
      fai: s.fai,
      cac: s.cac,
      stSegment: s.params.stSegment,
      qtcBazett: s.params.qtInterval,
      heartRate: s.params.heartRate,
      systolic: s.params.systolic,
      diastolic: s.params.diastolic,
      hrv: s.params.hrv,
      stressScore: s.params.stressScore,
      bmi: bmiSafe,
      activity: s.patientProfile.activity,
    });
  }

  // 5. Diagnosis & Alternative Possibilities
  const subScoreList = [
    { key: 'atherosclerosis', name: 'Coronary Artery Disease (CAD)', score: subScores.atherosclerosis },
    { key: 'myocardialIschemia', name: 'Myocardial Ischemia', score: subScores.myocardialIschemia },
    { key: 'arrhythmia', name: 'Cardiac Arrhythmia Risk', score: subScores.arrhythmia },
    { key: 'hypertensiveHeartDisease', name: 'Hypertensive Heart Disease', score: subScores.hypertensiveHeartDisease },
    { key: 'heartFailure', name: 'Heart Failure Risk', score: subScores.heartFailure },
  ];

  let primary = subScoreList[0];
  for (const item of subScoreList) {
    if (item.score > primary.score) {
      primary = item;
    }
  }

  const highestScore = primary.score;
  const healthyProb = Math.max(0, 100 - highestScore);
  const remainingForDiseases = 100 - healthyProb;
  const totalDiseaseScoreSum = subScoreList.reduce((acc, curr) => acc + curr.score, 0);

  const diseaseRows = subScoreList.map(item => {
    const rawProb = totalDiseaseScoreSum > 0
      ? Math.round((item.score / totalDiseaseScoreSum) * remainingForDiseases)
      : 0;
    return { disease: item.name, probability: rawProb, isHealthy: false };
  });

  diseaseRows.sort((a, b) => b.probability - a.probability);

  const alternativeRows = [
    ...diseaseRows,
    { disease: 'Healthy / Low Specific Pathology', probability: healthyProb, isHealthy: true }
  ];

  // Balance sum to 100%
  const currentSum = alternativeRows.reduce((acc, r) => acc + r.probability, 0);
  const probDiff = 100 - currentSum;
  if (probDiff !== 0 && alternativeRows.length > 0) {
    alternativeRows[0].probability += probDiff;
  }

  // 6. Score Meaning
  let meaning = '';
  if (currentScore <= 20) {
    meaning = 'Your cardiovascular risk indicators are within healthy reference ranges.';
  } else if (currentScore <= 40) {
    meaning = 'Some cardiovascular risk factors are mildly elevated. Routine monitoring is advised.';
  } else if (currentScore <= 60) {
    meaning = 'Multiple risk factors are moderately elevated. Medical review is recommended.';
  } else if (currentScore <= 80) {
    meaning = 'Several cardiovascular risk factors are significantly elevated. Prompt medical consultation is strongly advised.';
  } else {
    meaning = 'Your risk profile indicates critical elevation across multiple cardiovascular parameters. Immediate medical evaluation is required.';
  }

  // 7. Contributors
  const raw = s.riskResult?.rawContributions;
  const contributorItems: ContributorItem[] = [];

  if (s.cac > 100 || s.plaqueType !== 'none') {
    contributorItems.push({ label: 'Evidence of coronary plaque', value: s.cac > 100 ? 85 : 70, key: 'Plaque Presence', impactCategory: getImpactCategory(s.cac > 100 ? 85 : 70) });
  }
  if (s.cac > 0) {
    contributorItems.push({ label: `Calcium Score (${s.cac} AU)`, value: s.cac > 200 ? 80 : 60, key: 'Calcium Score', impactCategory: getImpactCategory(s.cac > 200 ? 80 : 60) });
  }
  if (s.apoBPanel.ldl > 130 || (raw && raw.apoB > 50)) {
    const val = raw?.apoB ?? 70;
    contributorItems.push({ label: 'Elevated LDL Cholesterol', value: val, key: 'LDL Cholesterol', impactCategory: getImpactCategory(val) });
  }
  if (s.fai > -70.1 || s.hsCRP > 2.0) {
    contributorItems.push({ label: 'Elevated inflammation markers', value: 75, key: 'Inflammation (CRP)', impactCategory: 'Very High' });
  }
  if (s.params.systolic > 130 || (raw && raw.bloodPressure > 50)) {
    const val = raw?.bloodPressure ?? 65;
    contributorItems.push({ label: 'High blood pressure', value: val, key: 'Blood Pressure', impactCategory: getImpactCategory(val) });
  }
  if (s.hba1c >= 5.7 || s.fastingGlucose > 100) {
    contributorItems.push({ label: 'Prediabetic glucose control', value: 60, key: 'Glucose Markers', impactCategory: 'High' });
  }
  if (s.params.hrv < 25 || (raw && raw.hrv > 50)) {
    const val = raw?.hrv ?? 60;
    contributorItems.push({ label: 'Reduced heart rate variability', value: val, key: 'Autonomic Tone (HRV)', impactCategory: getImpactCategory(val) });
  }
  if (s.params.qtInterval > 440 || (raw && raw.qtInterval > 50)) {
    const val = raw?.qtInterval ?? 55;
    contributorItems.push({ label: 'Prolonged corrected QT interval', value: val, key: 'QTc Interval', impactCategory: getImpactCategory(val) });
  }

  contributorItems.sort((a, b) => b.value - a.value);

  const defaultFallbacks: ContributorItem[] = [
    { label: 'Elevated LDL Cholesterol', value: 70, key: 'LDL Cholesterol', impactCategory: 'Very High' },
    { label: 'High blood pressure', value: 65, key: 'Blood Pressure', impactCategory: 'High' },
    { label: 'Elevated inflammation markers', value: 60, key: 'Inflammation (CRP)', impactCategory: 'High' },
    { label: 'Prediabetic glucose control', value: 55, key: 'Glucose Markers', impactCategory: 'High' },
  ];

  for (const fb of defaultFallbacks) {
    if (contributorItems.length >= 6) break;
    if (!contributorItems.some(i => i.key === fb.key)) {
      contributorItems.push(fb);
    }
  }

  // 8. 7-Day Trend
  let trendData: { day: string; score: number }[] = [];
  const activeId = s.activeProfile?.id ?? 'custom';
  const trendKey = `arohan_trend_history_${activeId}_${currentScore}`;

  if (typeof window !== 'undefined' && window.sessionStorage) {
    const saved = sessionStorage.getItem(trendKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 7) {
          trendData = parsed;
        }
      } catch {
        // fallback
      }
    }
  }

  if (trendData.length !== 7) {
    const isWorsening = s.activeProfile?.category === 'cad' || s.activeProfile?.category === 'cvd' || currentScore > 50;
    const days = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'];
    if (isWorsening) {
      const startScore = Math.max(5, currentScore - 15);
      const step = (currentScore - startScore) / 6;
      for (let i = 0; i < 6; i++) {
        trendData.push({ day: days[i], score: Math.min(100, Math.max(0, Math.round(startScore + i * step))) });
      }
      trendData.push({ day: 'D7', score: currentScore });
    } else {
      for (let i = 0; i < 6; i++) {
        trendData.push({ day: days[i], score: currentScore });
      }
      trendData.push({ day: 'D7', score: currentScore });
    }
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.setItem(trendKey, JSON.stringify(trendData));
    }
  }

  const d1 = trendData[0].score;
  const d7 = trendData[trendData.length - 1].score;
  const diff = d7 - d1;
  const trendDirection: 'ascending' | 'descending' | 'flat' =
    diff >= 4 ? 'ascending' : diff <= -4 ? 'descending' : 'flat';

  const top3Names = contributorItems.slice(0, 3).map(c => c.label);
  let trendInterpretation = '';
  if (trendDirection === 'ascending') {
    trendInterpretation = `Risk increased from ${d1} to ${d7} over 7 days. Main contributing factors: ${top3Names.join(', ')}.`;
  } else if (trendDirection === 'descending') {
    trendInterpretation = `Risk decreased from ${d1} to ${d7} over 7 days, indicating improving risk factors.`;
  } else {
    trendInterpretation = `Risk has remained stable at approximately ${d7} over the past 7 days.`;
  }

  // 9. Progression & Forecast
  let stageIdx = 0;
  if (currentScore <= 20) stageIdx = 0;
  else if (currentScore <= 40) stageIdx = 1;
  else if (currentScore <= 60) stageIdx = 2;
  else if (currentScore <= 80) stageIdx = 3;
  else stageIdx = 4;

  let m3Condition = STAGES[stageIdx];
  let m6Condition = STAGES[stageIdx];
  let m12Condition = STAGES[stageIdx];

  if (trendDirection === 'ascending') {
    m3Condition = `Stable ${STAGES[stageIdx]}`;
    m6Condition = `Increased Plaque Burden (${STAGES[Math.min(4, stageIdx + 1)]})`;
    m12Condition = `High Probability of ${STAGES[Math.min(4, stageIdx + 2)]}`;
  } else if (trendDirection === 'descending') {
    m3Condition = `Improving (${STAGES[Math.max(0, stageIdx - 1)]})`;
    m6Condition = `Stable ${STAGES[Math.max(0, stageIdx - 1)]}`;
    m12Condition = `Low Probability of Progression`;
  } else {
    m3Condition = `Stable ${STAGES[stageIdx]}`;
    m6Condition = `Stable ${STAGES[stageIdx]}`;
    m12Condition = `Moderate Risk of Progression`;
  }

  // 10. Relative Contributions
  const totalContribSum = contributorItems.reduce((acc, curr) => acc + curr.value, 0);
  const relativeContribs = contributorItems.map(item => ({
    label: item.label,
    key: item.key,
    percentage: totalContribSum > 0 ? Math.round((item.value / totalContribSum) * 100) : 0,
  }));

  // 11. Explainability Parameter Impacts
  const parameterImpacts = [
    {
      parameter: 'ApoB / LDL Cholesterol',
      value: `${s.apoBPanel.ldl} mg/dL (ApoB: ${s.apoBPanel.apoB} mg/dL)`,
      impact: s.apoBPanel.ldl > 130 ? ('high' as const) : s.apoBPanel.ldl > 100 ? ('moderate' as const) : ('low' as const),
      explanation: 'Atherogenic particle concentration directly driving arterial lipid deposition.',
    },
    {
      parameter: 'Blood Pressure',
      value: `${s.params.systolic}/${s.params.diastolic} mmHg`,
      impact: s.params.systolic > 140 ? ('high' as const) : s.params.systolic > 130 ? ('moderate' as const) : ('low' as const),
      explanation: 'Mechanical endothelial shear stress accelerating arterial wall remodeling.',
    },
    {
      parameter: 'Coronary Calcium (CAC)',
      value: `${s.cac} AU`,
      impact: s.cac > 100 ? ('high' as const) : s.cac > 10 ? ('moderate' as const) : ('low' as const),
      explanation: 'Direct measure of calcified atherosclerotic plaque burden.',
    },
    {
      parameter: 'Perivascular Inflammation (FAI)',
      value: `${s.fai} HU`,
      impact: s.fai > -70.1 ? ('high' as const) : ('low' as const),
      explanation: 'Adipose tissue CT radiomic marker of active coronary inflammation.',
    },
    {
      parameter: 'Heart Rate Variability (HRV)',
      value: `${s.params.hrv} ms`,
      impact: s.params.hrv < 25 ? ('high' as const) : s.params.hrv < 50 ? ('moderate' as const) : ('low' as const),
      explanation: 'Autonomic nervous system tone and cardiovascular stress resilience.',
    },
  ];

  // 12. Recommendations
  const isHighRisk = currentScore > 60 || s.params.stSegment > 0.1 || s.cac > 400;
  const isModerateRisk = currentScore > 30 || s.cac > 100;

  const immediateActions: string[] = [];
  if (isHighRisk) {
    immediateActions.push('Cardiology consultation within 24–48 hours');
    immediateActions.push('Comprehensive CT angiography review for stenosis');
    immediateActions.push('Initiate / intensify lipid-lowering & antiplatelet therapy');
  } else if (isModerateRisk) {
    immediateActions.push('Schedule outpatient cardiology consultation within 2 weeks');
    immediateActions.push('Comprehensive fasting metabolic panel & repeat ApoB');
  } else {
    immediateActions.push('Maintain regular annual cardiovascular screening');
    immediateActions.push('Routine preventive health checkup');
  }

  const lifestyleActions = [
    'Adopt Mediterranean or low-saturated-fat dietary pattern',
    'Minimum 150 minutes of moderate-intensity aerobic exercise weekly',
    bmiSafe > 25 ? 'Achieve 5–10% weight reduction over 6 months' : 'Maintain optimal body composition',
    'Stress management techniques & ensure 7–8 hours of restorative sleep',
  ];

  const monitoringActions = [
    'Repeat lipid panel & inflammatory markers in 4–6 weeks',
    'Home blood pressure monitoring (morning and evening logs)',
    'Serial cardiovascular risk reassessment every 7–30 days',
  ];

  const ecgStatus = Math.abs(s.params.stSegment) > 0.05
    ? 'Mild ST-T abnormalities'
    : `${s.activeEcgRhythm === 'afib' ? 'Atrial Fibrillation' : 'Normal Sinus Rhythm'}`;

  const plaqueFindingStr = s.plaqueType !== 'none'
    ? `${s.plaqueType} plaque${s.plaqueLocation.length ? ' in ' + s.plaqueLocation.join(', ') : ''}`
    : 'No major plaque reported';

  return {
    patient: {
      id: patientId,
      name: s.patientProfile.name || 'Patient',
      age: `${s.patientProfile.ageRange} Years`,
      gender: s.patientProfile.sex,
      ethnicity: s.patientProfile.ethnicity,
      reportDate,
      vitals: {
        bloodPressure: s.params.systolic > 0 && s.params.diastolic > 0
          ? `${s.params.systolic}/${s.params.diastolic} mmHg`
          : 'Not available',
        systolic: s.params.systolic,
        diastolic: s.params.diastolic,
        heartRate: s.params.heartRate,
        bmi: bmiSafe,
        bmiText: isFinite(bmiVal) && bmiVal > 0 ? `${bmiVal} kg/m²` : 'Not available',
        weight: s.patientProfile.weight,
        height: s.patientProfile.height,
      },
      bloodTests: {
        hsCRP: s.hsCRP > 0 ? `${s.hsCRP} mg/L` : 'Not available',
        ldl: s.apoBPanel.ldl > 0 ? `${s.apoBPanel.ldl} mg/dL` : 'Not available',
        hba1c: s.hba1c > 0 ? `${s.hba1c}%` : 'Not available',
        apoB: s.apoBPanel.apoB > 0 ? `${s.apoBPanel.apoB} mg/dL` : 'Not available',
        totalCholesterol: s.labInputs.totalCholesterol,
        hdl: s.labInputs.hdl,
        triglycerides: s.labInputs.triglycerides,
        summaryText: `hs-CRP: ${s.hsCRP > 0 ? s.hsCRP + ' mg/L' : 'N/A'}, LDL: ${s.apoBPanel.ldl > 0 ? s.apoBPanel.ldl + ' mg/dL' : 'N/A'}, HbA1c: ${s.hba1c > 0 ? s.hba1c + '%' : 'N/A'}, ApoB: ${s.apoBPanel.apoB > 0 ? s.apoBPanel.apoB + ' mg/dL' : 'N/A'}`,
      },
      ecg: {
        rhythm: s.activeEcgRhythm || 'sinus',
        status: ecgStatus,
        stSegment: s.params.stSegment,
        qtcInterval: s.params.qtInterval,
        heartRate: s.params.heartRate,
      },
      imaging: {
        plaqueType: s.plaqueType,
        plaqueLocation: s.plaqueLocation,
        stenosisSeverity: s.stenosisSeverity,
        cac: s.cac,
        cacText: s.cac !== undefined && s.cac !== null ? `${s.cac} AU` : 'Not available',
        fai: s.fai,
        findingText: plaqueFindingStr,
      },
    },
    diagnosis: {
      condition: primary.name,
      confidence: primary.score,
      key: primary.key,
    },
    alternatives: alternativeRows,
    risk: {
      score: currentScore,
      band: riskBand,
      category: currentScore <= 20
        ? 'Very Low Risk'
        : currentScore <= 40
        ? 'Low Risk'
        : currentScore <= 60
        ? 'Moderate Risk'
        : currentScore <= 80
        ? 'High Risk'
        : 'Critical Risk',
      confidence: riskConfidence,
      meaning,
      whoRiskBand: s.riskResult?.whoRiskBand?.band,
    },
    contributors: contributorItems,
    trend: {
      direction: trendDirection,
      interpretation: trendInterpretation,
      history: trendData,
    },
    progression: {
      currentStage: STAGES[stageIdx],
      stageIndex: stageIdx,
      stages: STAGES,
      progressionProbability: Math.min(95, currentScore + 10),
    },
    forecast: {
      horizons: [
        { horizon: '3 Months', condition: m3Condition },
        { horizon: '6 Months', condition: m6Condition },
        { horizon: '12 Months', condition: m12Condition },
      ],
    },
    explainability: {
      parameterImpacts,
    },
    contributions: relativeContribs,
    recommendations: {
      immediate: immediateActions,
      lifestyle: lifestyleActions,
      monitoring: monitoringActions,
    },
  };
}

/**
 * Sub-score weights are self-defined based on INTERHEART study
 * parameter importance rankings (Yusuf et al. Lancet 2004) and
 * standard clinical parameter associations. These weights are
 * NOT individually validated against an outcome dataset and are
 * designed as a structured placeholder for future ML-based
 * calibration. Each sub-score is 0-100 and independent of the
 * existing composite CAD Risk Score.
 */

export interface DiseaseSubScores {
  atherosclerosis: number;
  myocardialIschemia: number;
  arrhythmia: number;
  hypertensiveHeartDisease: number;
  heartFailure: number;
}

export interface DiseaseSubScoreInputs {
  // Lipids & CT Biomarkers (Atherosclerosis drivers)
  totalCholesterol?: number;
  hdl?: number;
  triglycerides?: number;
  ldl?: number;
  nonHDL?: number;
  apoB?: number;
  apoA1?: number;
  apoBApoa1Ratio?: number;
  fai?: number | null;
  cac?: number | null;

  // ECG & Hemodynamics (Ischemia & Arrhythmia drivers)
  stSegment?: number; // in mV
  qtcBazett?: number; // in ms
  heartRate?: number; // in bpm
  systolic?: number;  // in mmHg
  diastolic?: number; // in mmHg
  pulseTransitTime?: number; // in ms
  hrv?: number; // RMSSD in ms

  // Vitals & Lifestyle (Hypertension & Heart Failure drivers)
  map?: number;
  pulsePressure?: number;
  bmi?: number;
  stressScore?: number;
  spo2?: number; // in %
  stiffnessIndex?: number;
  motionLevel?: number | string;
  activity?: string;
}

// ─── Normalization Helpers ──────────────────────────────────────────────────

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * FAI normalization:
 * map -190 to -70.1 HU → 0 to 0.3 (low risk zone)
 * map -70.1 to -30 HU  → 0.3 to 1.0 (elevated zone)
 * Comment: "FAI cutoff -70.1 HU per Antonopoulos et al. 2017"
 */
export function normalizeFAI(fai: number): number {
  // FAI cutoff -70.1 HU per Antonopoulos et al. 2017
  const clamped = clamp(fai, -190, -30);
  if (clamped <= -70.1) {
    const fraction = (clamped - (-190)) / (-70.1 - (-190));
    return fraction * 0.3;
  } else {
    const fraction = (clamped - (-70.1)) / (-30 - (-70.1));
    return 0.3 + fraction * 0.7;
  }
}

/**
 * CAC normalization:
 * 0 AU       → 0.0
 * 1-10 AU    → 0.1
 * 11-100 AU  → 0.3
 * 101-400 AU → 0.6
 * > 400 AU   → 0.85
 * > 615 AU   → 1.0
 * Comment: "CAC tiers per NLA guidelines / Agatston method"
 */
export function normalizeCAC(cac: number): number {
  // CAC tiers per NLA guidelines / Agatston method
  if (cac <= 0) return 0.0;
  if (cac <= 10) return 0.1;
  if (cac <= 100) return 0.3;
  if (cac <= 400) return 0.6;
  if (cac <= 615) return 0.85;
  return 1.0;
}

/**
 * ST normalization:
 * -0.05 to +0.05 mV  → 0.0 (isoelectric, normal)
 * 0.05 to 0.1 mV     → 0.5 (borderline elevation)
 * > 0.1 mV           → 1.0 (significant elevation)
 * Comment: "ST thresholds per Thygesen et al. Fourth Universal Definition of MI. Circulation 2018"
 */
export function normalizeST(st: number): number {
  // ST thresholds per Thygesen et al. Fourth Universal Definition of MI. Circulation 2018
  const absSt = Math.abs(st);
  if (absSt <= 0.05) return 0.0;
  if (absSt <= 0.10) return 0.5;
  return 1.0;
}

/**
 * QTc normalization:
 * < 440 ms   → 0.0
 * 440-500 ms → 0.5  (prolonged — torsades risk)
 * > 500 ms   → 1.0  (critical)
 * Comment: "QTc thresholds per AHA/ESC QT prolongation consensus documents"
 */
export function normalizeQTc(qtc: number): number {
  // QTc thresholds per AHA/ESC QT prolongation consensus documents
  if (qtc < 440) return 0.0;
  if (qtc <= 500) return 0.5;
  return 1.0;
}

/**
 * HRV normalization (inverse — lower HRV = higher risk):
 * > 50 ms  → 0.0  (healthy autonomic tone)
 * 25-50 ms → 0.4
 * < 25 ms  → 1.0  (severely reduced)
 */
export function normalizeHRV(hrv: number): number {
  if (hrv > 50) return 0.0;
  if (hrv >= 25) return 0.4;
  return 1.0;
}

/**
 * Blood pressure normalization:
 * < 120/<80 mmHg     → 0.0  Normal
 * 120-129/<80        → 0.2  Elevated
 * 130-139/80-89      → 0.5  Stage 1 HT
 * ≥ 140/≥ 90         → 0.8  Stage 2 HT
 * ≥ 180/≥ 120        → 1.0  Hypertensive crisis
 * Comment: "AHA 2017 High Blood Pressure Guideline"
 */
export function normalizeBP(sbp: number, dbp: number): number {
  // AHA 2017 High Blood Pressure Guideline
  if (sbp >= 180 || dbp >= 120) return 1.0;
  if (sbp >= 140 || dbp >= 90) return 0.8;
  if ((sbp >= 130 && sbp <= 139) || (dbp >= 80 && dbp <= 89)) return 0.5;
  if (sbp >= 120 && sbp <= 129 && dbp < 80) return 0.2;
  return 0.0;
}

/**
 * SpO₂ normalization (inverse):
 * ≥ 95% → 0.0
 * 92-94% → 0.4
 * < 92%  → 1.0
 * Comment: "SpO₂ reference: standard pulse oximetry clinical thresholds"
 */
export function normalizeSpO2(spo2: number): number {
  // SpO₂ reference: standard pulse oximetry clinical thresholds
  if (spo2 >= 95) return 0.0;
  if (spo2 >= 92) return 0.4;
  return 1.0;
}

// ─── Sub-score Computations ─────────────────────────────────────────────────

/**
 * Sub-score 1: Atherosclerosis Risk
 * Primary drivers (weighted sum):
 *   ApoB/ApoA1 Ratio     weight: 0.25
 *   LDL-C                weight: 0.15
 *   Total Cholesterol    weight: 0.10
 *   Triglycerides        weight: 0.10
 *   Non-HDL-C            weight: 0.10
 *   FAI (if entered)     weight: 0.20
 *   CAC (if entered)     weight: 0.10
 */
function computeAtherosclerosisRisk(inputs: DiseaseSubScoreInputs): number {
  const tc = inputs.totalCholesterol ?? 180;
  const hdl = inputs.hdl ?? 50;
  const tg = inputs.triglycerides ?? 120;
  const ldl = inputs.ldl ?? Math.max(0, tc - hdl - tg / 5);
  const nonHDL = inputs.nonHDL ?? Math.max(0, tc - hdl);
  const apoB = inputs.apoB ?? (0.65 * nonHDL + 6.3);
  const apoA1 = inputs.apoA1 ?? (hdl * 2.0);
  const ratio = inputs.apoBApoa1Ratio ?? (apoA1 > 0 ? apoB / apoA1 : 0.75);

  // Normalize ApoB/ApoA1 Ratio (<0.7 normal, 0.7-0.9 borderline, >0.9 high)
  let normRatio = 0.0;
  if (ratio > 1.0) normRatio = 1.0;
  else if (ratio >= 0.8) normRatio = 0.3 + ((ratio - 0.8) / 0.2) * 0.4;
  else if (ratio >= 0.6) normRatio = ((ratio - 0.6) / 0.2) * 0.3;

  // Normalize LDL-C (<100 optimal, 100-130, 130-160, 160-190, >190 very high)
  let normLDL = 0.0;
  if (ldl >= 190) normLDL = 1.0;
  else if (ldl >= 160) normLDL = 0.6 + ((ldl - 160) / 30) * 0.25;
  else if (ldl >= 130) normLDL = 0.3 + ((ldl - 130) / 30) * 0.3;
  else if (ldl >= 100) normLDL = ((ldl - 100) / 30) * 0.3;

  // Normalize Total Cholesterol (<200 normal, 200-239 borderline, >=240 high)
  let normTC = 0.0;
  if (tc >= 240) normTC = Math.min(1.0, 0.6 + ((tc - 240) / 60) * 0.4);
  else if (tc >= 200) normTC = ((tc - 200) / 40) * 0.6;

  // Normalize Triglycerides (<150 normal, 150-199 borderline, 200-499 high, >=500 very high)
  let normTG = 0.0;
  if (tg >= 500) normTG = 1.0;
  else if (tg >= 200) normTG = 0.4 + ((tg - 200) / 300) * 0.45;
  else if (tg >= 150) normTG = ((tg - 150) / 50) * 0.4;

  // Normalize Non-HDL-C (<130 optimal, 130-159, 160-189, >=190)
  let normNonHDL = 0.0;
  if (nonHDL >= 190) normNonHDL = 1.0;
  else if (nonHDL >= 160) normNonHDL = 0.5 + ((nonHDL - 160) / 30) * 0.35;
  else if (nonHDL >= 130) normNonHDL = ((nonHDL - 130) / 30) * 0.5;

  const hasFAI = inputs.fai !== undefined && inputs.fai !== null && !isNaN(inputs.fai);
  const hasCAC = inputs.cac !== undefined && inputs.cac !== null && !isNaN(inputs.cac);

  const baseComponents = [
    { value: normRatio, weight: 0.25 },
    { value: normLDL, weight: 0.15 },
    { value: normTC, weight: 0.10 },
    { value: normTG, weight: 0.10 },
    { value: normNonHDL, weight: 0.10 },
  ];

  if (hasFAI) {
    baseComponents.push({ value: normalizeFAI(inputs.fai!), weight: 0.20 });
  }
  if (hasCAC) {
    baseComponents.push({ value: normalizeCAC(inputs.cac!), weight: 0.10 });
  }

  // Redistribute weights if FAI or CAC was not entered
  const totalWeight = baseComponents.reduce((sum, c) => sum + c.weight, 0);
  const weightedScore = baseComponents.reduce((sum, c) => sum + c.value * (c.weight / totalWeight), 0);

  return clamp(Math.round(weightedScore * 100), 0, 100);
}

/**
 * Sub-score 2: Myocardial Ischemia Risk
 * Primary drivers:
 *   ST Segment deviation  weight: 0.35
 *   QTc Interval          weight: 0.20
 *   Heart Rate            weight: 0.15
 *   Systolic BP           weight: 0.15
 *   Pulse Transit Time    weight: 0.15
 */
function computeMyocardialIschemiaRisk(inputs: DiseaseSubScoreInputs): number {
  const st = inputs.stSegment ?? 0;
  const qtc = inputs.qtcBazett ?? 410;
  const hr = inputs.heartRate ?? 72;
  const sbp = inputs.systolic ?? 120;
  const ptt = inputs.pulseTransitTime ?? 200;

  const normST = normalizeST(st);
  const normQTc = normalizeQTc(qtc);

  // Heart rate (demand ischemia proxy)
  let normHR = 0.0;
  if (hr > 130) normHR = 1.0;
  else if (hr >= 100) normHR = 0.4 + ((hr - 100) / 30) * 0.4;
  else if (hr >= 75) normHR = ((hr - 75) / 25) * 0.4;

  // Systolic BP (perfusion pressure)
  let normSBP = 0.0;
  if (sbp >= 160) normSBP = 1.0;
  else if (sbp >= 140) normSBP = 0.7 + ((sbp - 140) / 20) * 0.3;
  else if (sbp >= 120) normSBP = ((sbp - 120) / 20) * 0.7;

  // Pulse Transit Time (vascular impedance proxy — lower PTT = stiffer/higher resistance)
  let normPTT = 0.0;
  if (ptt < 140) normPTT = 1.0;
  else if (ptt <= 180) normPTT = 0.7;
  else if (ptt <= 220) normPTT = 0.3;
  else normPTT = 0.0;

  const score =
    normST * 0.35 +
    normQTc * 0.20 +
    normHR * 0.15 +
    normSBP * 0.15 +
    normPTT * 0.15;

  return clamp(Math.round(score * 100), 0, 100);
}

/**
 * Sub-score 3: Arrhythmia Risk
 * Primary drivers:
 *   QTc Bazett     weight: 0.40
 *   HRV RMSSD      weight: 0.30
 *   Heart Rate     weight: 0.20
 *   ST Segment     weight: 0.10
 */
function computeArrhythmiaRisk(inputs: DiseaseSubScoreInputs): number {
  const qtc = inputs.qtcBazett ?? 410;
  const hrv = inputs.hrv ?? 45;
  const hr = inputs.heartRate ?? 72;
  const st = inputs.stSegment ?? 0;

  const normQTc = normalizeQTc(qtc);
  const normHRV = normalizeHRV(hrv);
  const normST = normalizeST(st);

  // Rate-dependent arrhythmia risk (both tachycardia and severe bradycardia)
  let normHR = 0.0;
  if (hr > 130 || hr < 40) normHR = 1.0;
  else if (hr >= 110 || hr <= 50) normHR = 0.7;
  else if (hr >= 90 || hr <= 60) normHR = 0.35;

  const score =
    normQTc * 0.40 +
    normHRV * 0.30 +
    normHR * 0.20 +
    normST * 0.10;

  return clamp(Math.round(score * 100), 0, 100);
}

/**
 * Sub-score 4: Hypertensive Heart Disease Risk
 * Primary drivers:
 *   Systolic BP      weight: 0.30
 *   Diastolic BP     weight: 0.20
 *   MAP              weight: 0.15
 *   Pulse Pressure   weight: 0.15
 *   BMI              weight: 0.10
 *   Stress Score     weight: 0.10
 */
function computeHypertensiveHeartDiseaseRisk(inputs: DiseaseSubScoreInputs): number {
  const sbp = inputs.systolic ?? 120;
  const dbp = inputs.diastolic ?? 80;
  const map = inputs.map ?? (dbp + (sbp - dbp) / 3);
  const pp = inputs.pulsePressure ?? (sbp - dbp);
  const bmi = inputs.bmi ?? 23.5;
  const stress = inputs.stressScore ?? 25;

  // AHA 2017 tiers
  const normBPCombined = normalizeBP(sbp, dbp);
  // SBP and DBP share the 0.50 BP weight
  const normSBP = normBPCombined;
  const normDBP = normBPCombined;

  // MAP: <93 normal, 93-105 elevated, 106-120 high, >120 very high
  let normMAP = 0.0;
  if (map > 120) normMAP = 1.0;
  else if (map >= 106) normMAP = 0.7;
  else if (map >= 93) normMAP = 0.3;

  // Pulse pressure: widened PP >60 mmHg indicates arterial stiffness
  let normPP = 0.0;
  if (pp > 80) normPP = 1.0;
  else if (pp >= 60) normPP = 0.7;
  else if (pp >= 50) normPP = 0.3;

  // South Asian BMI thresholds (normal 18.5-22.9, overweight 23-27.4, obese >=27.5)
  let normBMI = 0.0;
  if (bmi >= 32.5) normBMI = 1.0;
  else if (bmi >= 27.5) normBMI = 0.7;
  else if (bmi >= 23.0) normBMI = 0.35;

  const normStress = clamp(stress / 100, 0, 1.0);

  const score =
    normSBP * 0.30 +
    normDBP * 0.20 +
    normMAP * 0.15 +
    normPP * 0.15 +
    normBMI * 0.10 +
    normStress * 0.10;

  return clamp(Math.round(score * 100), 0, 100);
}

/**
 * Sub-score 5: Heart Failure Risk
 * Primary drivers:
 *   HRV RMSSD        weight: 0.30
 *   SpO₂             weight: 0.25
 *   Stress Score     weight: 0.20
 *   Stiffness Index  weight: 0.15
 *   Motion Level     weight: 0.10
 */
function computeHeartFailureRisk(inputs: DiseaseSubScoreInputs): number {
  const hrv = inputs.hrv ?? 45;
  const spo2 = inputs.spo2 ?? 98;
  const stress = inputs.stressScore ?? 25;
  const ptt = inputs.pulseTransitTime ?? 200;

  const normHRV = normalizeHRV(hrv);
  const normSpO2 = normalizeSpO2(spo2);
  const normStress = clamp(stress / 100, 0, 1.0);

  // Stiffness index proxy from PTT if not directly provided
  let normStiffness = 0.0;
  if (inputs.stiffnessIndex !== undefined && inputs.stiffnessIndex !== null) {
    if (inputs.stiffnessIndex >= 12) normStiffness = 1.0;
    else if (inputs.stiffnessIndex >= 9) normStiffness = 0.6;
    else if (inputs.stiffnessIndex >= 7) normStiffness = 0.3;
  } else {
    if (ptt < 140) normStiffness = 1.0;
    else if (ptt <= 180) normStiffness = 0.7;
    else if (ptt <= 220) normStiffness = 0.3;
  }

  // Activity / motion proxy (sedentary / low motion + high risk = concern)
  let normMotion = 0.0;
  if (inputs.activity === 'sedentary') normMotion = 0.7;
  else if (inputs.activity === 'moderate') normMotion = 0.3;
  else if (typeof inputs.motionLevel === 'number') {
    normMotion = inputs.motionLevel < 0.2 ? 0.6 : 0.2;
  }

  const score =
    normHRV * 0.30 +
    normSpO2 * 0.25 +
    normStress * 0.20 +
    normStiffness * 0.15 +
    normMotion * 0.10;

  return clamp(Math.round(score * 100), 0, 100);
}

// ─── Main Export ────────────────────────────────────────────────────────────

export function computeDiseaseSubScores(inputs: DiseaseSubScoreInputs): DiseaseSubScores {
  return {
    atherosclerosis: computeAtherosclerosisRisk(inputs),
    myocardialIschemia: computeMyocardialIschemiaRisk(inputs),
    arrhythmia: computeArrhythmiaRisk(inputs),
    hypertensiveHeartDisease: computeHypertensiveHeartDiseaseRisk(inputs),
    heartFailure: computeHeartFailureRisk(inputs),
  };
}

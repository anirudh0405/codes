/**
 * Global Simulation State Store (Zustand)
 * ========================================
 * Single source of truth for all live simulation data.
 * SensorManager WRITES to this store; Dashboard READS from it.
 *
 * Zustand chosen over React Context for performance — only components
 * that subscribe to specific slices re-render, not the entire tree.
 */

import { create } from 'zustand';
import { MockParams } from '../hal/MockSensorSources';
import { PhysiologicalSnapshot } from '../fusion';
import { RiskResult } from '../riskEngine';
import { SensorStatus, SensorType } from '../hal/ISensorSource';
import { SCENARIO_PRESETS, PresetCategory, ScenarioPreset, ECGRhythm } from '../presets';
import { PTTDerivedBPResult } from '../features';
import {
  LabInputs,
  ApoBPanel,
  DEFAULT_LAB_INPUTS,
  calculateApoBPanel,
  LAB_CLAMPS,
  LP_A_CLAMP,
  LP_A_REFERENCE,
} from '../features/apoBCalculation';
import { DiseaseSubScores, computeDiseaseSubScores } from '../riskEngine/diseaseSubScores';
import {
  PatientProfileData,
  DEFAULT_PATIENT_PROFILE_DATA,
} from '../components/Dashboard/PatientProfilePanel';
import {
  EchoNextInferenceResult,
  runEchoNextInference,
  generate12LeadECG,
} from '../ml/echonextResNet34';

export interface WaveformPoint {
  t: number;
  v: number;
}

export interface RiskTrendPoint {
  t: number;
  score: number;
  band: string;
  scenarioId?: string;
}

const STORAGE_KEY_RISK_TREND = 'arohan_cad_risk_trend_history';
const MAX_TREND_HISTORY = 20;

function loadStoredRiskTrend(): RiskTrendPoint[] {
  if (typeof window === 'undefined' || !window.sessionStorage) return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_RISK_TREND);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStoredRiskTrend(trend: RiskTrendPoint[]) {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    sessionStorage.setItem(STORAGE_KEY_RISK_TREND, JSON.stringify(trend));
  } catch {
    // ignore
  }
}

export type BPMode = 'ptt' | 'manual';

export const FAI_CLAMP = { min: -190, max: -30, default: -80 };
export const CAC_CLAMP = { min: 0, default: 0 };

/**
 * Computes deterministic disease-specific sub-scores from the validated patient input state.
 * This guarantees scores only change when relevant clinical/simulation inputs change,
 * completely decoupled from live sensor waveform noise and generator polling intervals.
 */
export function computeValidatedDiseaseSubScores(
  params: MockParams,
  patientProfile: PatientProfileData,
  labInputs: LabInputs,
  apoBPanel: ApoBPanel,
  fai: number,
  cac: number
): DiseaseSubScores {
  const heightM = (patientProfile.height || 170) / 100;
  const bmi = Number((patientProfile.weight / (heightM * heightM)).toFixed(1));
  const bmiSafe = isFinite(bmi) && bmi > 0 ? bmi : 24.5;

  // Pulse Transit Time derived deterministically from systolic blood pressure
  // using Moens-Korteweg relationship (100–300 ms range)
  const pulseTransitTime = Math.max(100, Math.min(300, Math.round((220 - params.systolic) / 0.45)));

  return computeDiseaseSubScores({
    totalCholesterol: labInputs.totalCholesterol,
    hdl: labInputs.hdl,
    triglycerides: labInputs.triglycerides,
    ldl: apoBPanel.ldl,
    nonHDL: apoBPanel.nonHDL,
    apoB: apoBPanel.apoB,
    apoBApoa1Ratio: labInputs.hdl > 0 ? apoBPanel.apoB / (labInputs.hdl * 2) : undefined,
    fai,
    cac,
    stSegment: params.stSegment,
    qtcBazett: params.qtInterval,
    heartRate: params.heartRate,
    systolic: params.systolic,
    diastolic: params.diastolic,
    pulseTransitTime,
    hrv: params.hrv,
    stressScore: params.stressScore,
    bmi: bmiSafe,
    activity: patientProfile.activity,
  });
}

export type PlaqueType = 'none' | 'non-calcified' | 'calcified' | 'mixed';
export type StenosisSeverity = 'none' | '<50%' | '50-70%' | '>70%';

export interface ExtractedParameterDetail {
  parameter: string;
  fieldKey: keyof ReportFields;
  value: number | string | string[];
  unit?: string;
  sourcePage?: number;
  status: 'accepted' | 'review' | 'unconfident';
  rawSnippet?: string;
  sourceFile?: string;
  sourceDate?: string;
  sourceFacility?: string;
}

export interface ParameterConflictSource {
  sourceFile: string;
  sourceDate?: string;
  sourceFacility?: string;
  value: number | string | string[];
  unit?: string;
  sourcePage?: number;
}

export interface ParameterConflict {
  parameter: string;
  fieldKey: keyof ReportFields;
  sources: ParameterConflictSource[];
  resolvedValue?: number | string | string[];
  selectedSourceIndex?: number;
}

export interface UploadedReport {
  id?: string;
  fileName: string;
  timestamp: string;
  fileUrl: string;
  fileType: 'pdf' | 'image' | 'text';
  reportDate?: string;
  facilityName?: string;
  extractedFields?: ReportFields;
  extractedCount?: number;
  parameterDetails?: ExtractedParameterDetail[];
  unmappedFields?: string[];
  status?: 'analyzing' | 'applied' | 'error' | 'pending' | 'success';
  patientName?: string;
  patientId?: string;
  summaryNote?: string;
  analysisProgress?: number;
  analysisStatusText?: string;
  errorMessage?: string;
}

export interface ReportFields {
  patientId?: string;
  totalCholesterol?: number;
  hdl?: number;
  ldl?: number;
  vldl?: number;
  triglycerides?: number;
  apoB?: number;
  apoBApoa1Ratio?: number;
  lpa?: number;
  hsCRP?: number;
  hba1c?: number;
  fastingGlucose?: number;
  postprandialGlucose?: number;
  cac?: number;
  fai?: number;
  plaqueType?: PlaqueType;
  plaqueLocation?: string[];
  stenosisSeverity?: StenosisSeverity;
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
  bmi?: number;
  patientName?: string;
  age?: number;
  sex?: 'male' | 'female';
}

function ageToRange(age: number): string {
  if (age < 30) return '<30';
  if (age < 40) return '30-39';
  if (age < 50) return '40-49';
  if (age < 60) return '50-59';
  if (age < 70) return '60-69';
  if (age < 80) return '70-79';
  return '80+';
}

export interface SimState {
  // ── Control Parameters (set by user via sliders / presets / randomize) ──────
  params: MockParams;
  activeProfile: ScenarioPreset | null;
  lastActiveProfileId: string;
  patientProfile: PatientProfileData;
  selectedCategory: PresetCategory | null;

  // ── Blood Pressure Mode & Derived Data ────────────────────────────────────
  bpMode: BPMode;
  pttDerivedBP: PTTDerivedBPResult | null;

  // ── Live Pipeline Data ────────────────────────────────────────────────────
  snapshot: PhysiologicalSnapshot | null;
  riskResult: RiskResult | null;
  sensorStatus: Record<SensorType, SensorStatus>;

  // ── Waveform Buffers (last N points) ──────────────────────────────────────
  ecgBuffer: WaveformPoint[];
  ppgBuffer: WaveformPoint[];

  // ── Trend History (recorded historical evaluations) ──────────────────────
  riskTrend: RiskTrendPoint[];
  clearRiskTrend: () => void;

  // ── Lab Report Values (manual entry) ─────────────────────────────────────
  labInputs: LabInputs;

  // ── Computed ApoB Panel (reactive, recomputed on every labInputs change) ──
  apoBPanel: ApoBPanel;

  // ── CT Radiomic & Calcium Biomarkers (Manual Entry) ───────────────────────
  fai: number;
  cac: number;

  // ── Disease-Specific Sub-Scores (5 conditions) ────────────────────────────
  diseaseSubScores: DiseaseSubScores | null;

  // ── CVD Disease-Specific State ─────────────────────────────────────────────
  /** Disease-specific parameters for the currently active CVD scenario (null for Healthy/CAD) */
  activeDiseaseParams: Record<string, string | number | boolean> | null;
  /** Active ECG rhythm mode — drives the ECG generator */
  activeEcgRhythm: ECGRhythm;
  /** Mechanism pathway steps for the active CVD scenario */
  activeMechanismSteps: string[] | null;
  /** Severity label for the active scenario */
  activeSeverity: string | null;

  // ── EchoNext 1D ResNet-34 Deep Learning Slice ─────────────────────────────
  echonextResult: EchoNextInferenceResult;

  // ── Report Upload State ────────────────────────────────────────────────────
  hsCRP: number;
  hba1c: number;
  fastingGlucose: number;
  postprandialGlucose: number;
  vldl: number;
  plaqueType: PlaqueType;
  plaqueLocation: string[];
  stenosisSeverity: StenosisSeverity;
  uploadedReport: UploadedReport | null;
  uploadedReports: UploadedReport[];
  reportConflicts: ParameterConflict[];

  // ── Actions ───────────────────────────────────────────────────────────────
  runEchoNext: () => void;
  setParams: (params: Partial<MockParams>) => void;
  applyProfile: (profileId: string) => void;
  setPatientProfile: (data: Partial<PatientProfileData>) => void;
  setSelectedCategory: (category: PresetCategory | null) => void;
  setBPMode: (mode: BPMode) => void;
  setPttDerivedBP: (result: PTTDerivedBPResult) => void;
  randomize: () => void;
  setFai: (val: number) => void;
  setCac: (val: number) => void;
  setLabInputs: (inputs: Partial<Omit<LabInputs, 'trigsManuallySet'>>, manualTrig?: boolean) => void;
  updatePipelineData: (
    snapshot: PhysiologicalSnapshot,
    risk: RiskResult,
    status: Record<SensorType, SensorStatus>,
    ecgWaveform: number[],
    ppgWaveform: number[],
    ppgTriglycerides?: number,
    diseaseSubScores?: DiseaseSubScores
  ) => void;
  setReportFields: (fields: ReportFields) => void;
  setUploadedReport: (report: UploadedReport | null) => void;
  setUploadedReports: (reports: UploadedReport[]) => void;
  setReportConflicts: (conflicts: ParameterConflict[]) => void;
  resolveReportConflict: (fieldKey: keyof ReportFields, selectedIndex: number) => void;
  clearReport: () => void;
}

// Physiologically plausible random values within a specific category or across all
function randomizeParamsForCategory(category: PresetCategory | null): {
  params: MockParams;
  profilePatch: Partial<PatientProfileData>;
  labPatch: Partial<LabInputs>;
  fai?: number;
  cac?: number;
} {
  if (category === 'healthy') {
    const hr = Math.round(60 + Math.random() * 20);        // 60–80 bpm
    const systolic = Math.round(108 + Math.random() * 10);  // 108–118 mmHg (optimal healthy <120)
    const diastolic = Math.round(68 + Math.random() * 10);  // 68–78 mmHg (optimal healthy <80)
    const hrv = Math.round(50 + Math.random() * 35);        // 50–85 ms
    const stress = Math.round(10 + Math.random() * 20);      // 10–30

    return {
      params: {
        heartRate: hr,
        systolic,
        diastolic,
        hrv,
        stressScore: stress,
        stSegment: 0.0,
        qtInterval: Math.round(380 + Math.random() * 30),
      },
      profilePatch: {
        smoking: 'never',
        activity: Math.random() > 0.3 ? 'active' : 'moderate',
        diabetes: false,
        hypertensionHistory: false,
        priorCVD: false,
        chestPain: 'none',
      },
      labPatch: {
        totalCholesterol: Math.round(155 + Math.random() * 30), // 155–185 mg/dL (Healthy optimal)
        hdl: Math.round(50 + Math.random() * 20),              // 50–70 mg/dL (Healthy optimal)
        triglycerides: Math.round(75 + Math.random() * 50),     // 75–125 mg/dL (Healthy)
        lpa: parseFloat((8 + Math.random() * 10).toFixed(1)),   // 8–18 mg/dL (Healthy median)
      },
      fai: -82,
      cac: 0,
    };
  }

  if (category === 'cad') {
    const hr = Math.round(75 + Math.random() * 35);    // 75–110 bpm
    const systolic = Math.round(135 + Math.random() * 35); // 135–170 mmHg
    const diastolic = Math.round(85 + Math.random() * 20); // 85–105 mmHg
    const hrv = Math.round(12 + Math.random() * 25);    // 12–37 ms
    const stress = Math.round(45 + Math.random() * 45);  // 45–90
    const isSmoker = Math.random() > 0.5;

    return {
      params: {
        heartRate: hr,
        systolic,
        diastolic,
        hrv,
        stressScore: stress,
        stSegment: parseFloat((0.04 + Math.random() * 0.18).toFixed(2)),
        qtInterval: Math.round(430 + Math.random() * 70),
      },
      profilePatch: {
        smoking: isSmoker ? 'current' : 'former',
        activity: Math.random() > 0.4 ? 'sedentary' : 'moderate',
        hypertensionHistory: true,
        familyHistoryCAD: true,
        diabetes: Math.random() > 0.5,
        chestPain: Math.random() > 0.5 ? 'atypical' : 'none',
      },
      labPatch: {
        totalCholesterol: Math.round(215 + Math.random() * 45), // 215–260 mg/dL (Elevated CAD)
        hdl: Math.round(30 + Math.random() * 12),              // 30–42 mg/dL (Low CAD HDL)
        triglycerides: Math.round(160 + Math.random() * 90),    // 160–250 mg/dL (High CAD Trig)
        lpa: Math.round(35 + Math.random() * 30),              // 35–65 mg/dL (Elevated Lp(a))
      },
      fai: Math.round(-74 + Math.random() * 16),
      cac: Math.round(20 + Math.random() * 350),
    };
  }

  if (category === 'cvd') {
    // CVD randomization: varied vitals typical of CVD conditions
    const hr = Math.round(78 + Math.random() * 40);    // 78–118 bpm
    const systolic = Math.round(104 + Math.random() * 88); // 104–192 mmHg
    const diastolic = Math.round(68 + Math.random() * 44); // 68–112 mmHg
    const hrv = Math.round(12 + Math.random() * 23);    // 12–35 ms
    const stress = Math.round(40 + Math.random() * 35);  // 40–75

    return {
      params: {
        heartRate: hr,
        systolic,
        diastolic,
        hrv,
        stressScore: stress,
        stSegment: parseFloat((0.03 + Math.random() * 0.05).toFixed(2)),
        qtInterval: Math.round(400 + Math.random() * 65),
      },
      profilePatch: {
        smoking: Math.random() > 0.6 ? 'former' : 'never',
        activity: 'sedentary',
        hypertensionHistory: true,
        diabetes: Math.random() > 0.5,
        priorCVD: Math.random() > 0.5,
      },
      labPatch: {
        totalCholesterol: Math.round(195 + Math.random() * 35), // 195–230 mg/dL
        hdl: Math.round(35 + Math.random() * 10),              // 35–45 mg/dL
        triglycerides: Math.round(150 + Math.random() * 50),    // 150–200 mg/dL
        lpa: Math.round(30 + Math.random() * 20),              // 30–50 mg/dL
      },
      fai: Math.round(-72 + Math.random() * 12),
      cac: Math.round(30 + Math.random() * 250),
    };
  }

  // Full random across all
  const hrv = 15 + Math.random() * 80;
  const hr = Math.round(55 + Math.random() * 60);
  const stress = Math.max(0, Math.min(100, Math.round(100 - hrv * 0.8 + (Math.random() - 0.5) * 20)));
  const systolic = Math.round(100 + Math.random() * 70);
  const diastolic = Math.round(systolic * 0.6 + (Math.random() - 0.5) * 10);
  return {
    params: {
      heartRate: hr,
      systolic: Math.min(200, systolic),
      diastolic: Math.min(130, Math.max(50, diastolic)),
      hrv: Math.round(hrv),
      stressScore: stress,
      stSegment: parseFloat(((Math.random() - 0.3) * 0.3).toFixed(3)),
      qtInterval: Math.round(360 + Math.random() * 180),
    },
    profilePatch: {},
    labPatch: {},
    fai: Math.round(-85 + Math.random() * 45),
    cac: Math.round(Math.random() * 400),
  };
}

const DEFAULT_PRESET = SCENARIO_PRESETS[0];

let waveformTicker = 0;

export const useSimStore = create<SimState>((set, get) => ({
  params: { ...DEFAULT_PRESET.params },
  activeProfile: DEFAULT_PRESET,
  lastActiveProfileId: DEFAULT_PRESET.id,
  patientProfile: { ...DEFAULT_PRESET.patientProfile },
  selectedCategory: 'healthy',
  bpMode: 'ptt', // PTT-derived is default data source
  pttDerivedBP: null,
  snapshot: null,
  riskResult: null,
  sensorStatus: { ecg: 'simulated', ppg: 'simulated', bp: 'simulated', stress: 'simulated' },
  ecgBuffer: [],
  ppgBuffer: [],
  riskTrend: loadStoredRiskTrend(),

  labInputs: { ...DEFAULT_LAB_INPUTS, trigsManuallySet: true },
  apoBPanel: calculateApoBPanel(DEFAULT_LAB_INPUTS),
  fai: DEFAULT_PRESET.labInputs?.fai ?? -82,
  cac: DEFAULT_PRESET.labInputs?.cac ?? 0,
  diseaseSubScores: computeValidatedDiseaseSubScores(
    DEFAULT_PRESET.params,
    DEFAULT_PRESET.patientProfile,
    { ...DEFAULT_LAB_INPUTS, trigsManuallySet: true },
    calculateApoBPanel(DEFAULT_LAB_INPUTS),
    DEFAULT_PRESET.labInputs?.fai ?? -82,
    DEFAULT_PRESET.labInputs?.cac ?? 0
  ),

  // CVD-specific state
  activeDiseaseParams: null,
  activeEcgRhythm: 'sinus',
  activeMechanismSteps: null,
  activeSeverity: null,

  // Report upload state
  hsCRP: 0,
  hba1c: 0,
  fastingGlucose: 0,
  postprandialGlucose: 0,
  vldl: 0,
  plaqueType: 'none',
  plaqueLocation: [],
  stenosisSeverity: 'none',
  uploadedReport: null,
  uploadedReports: [],
  reportConflicts: [],

  // EchoNext 1D ResNet-34 Deep Learning Slice
  echonextResult: runEchoNextInference(
    generate12LeadECG({
      heartRate: DEFAULT_PRESET.params.heartRate,
      stElevation: DEFAULT_PRESET.params.stSegment,
      rhythm: 'sinus',
      qtInterval: DEFAULT_PRESET.params.qtInterval,
      systolic: DEFAULT_PRESET.params.systolic,
    }),
    {
      stElevation: DEFAULT_PRESET.params.stSegment,
      rhythm: 'sinus',
      qtInterval: DEFAULT_PRESET.params.qtInterval,
      systolic: DEFAULT_PRESET.params.systolic,
    }
  ),

  runEchoNext: () => {
    const s = get();
    const waveforms = generate12LeadECG({
      heartRate: s.params.heartRate,
      stElevation: s.params.stSegment,
      rhythm: s.activeEcgRhythm,
      qtInterval: s.params.qtInterval,
      systolic: s.params.systolic,
    });
    const result = runEchoNextInference(waveforms, {
      stElevation: s.params.stSegment,
      rhythm: s.activeEcgRhythm,
      qtInterval: s.params.qtInterval,
      systolic: s.params.systolic,
    });
    set({ echonextResult: result });
  },

  setParams: (newParams) => {
    set((s) => {
      const isBPModified = newParams.systolic !== undefined || newParams.diastolic !== undefined;
      const updatedParams = { ...s.params, ...newParams };
      const currentProfile = s.activeProfile;
      const nextScores = computeValidatedDiseaseSubScores(
        updatedParams,
        s.patientProfile,
        s.labInputs,
        s.apoBPanel,
        s.fai,
        s.cac
      );
      return {
        params: updatedParams,
        diseaseSubScores: nextScores,
        activeProfile: {
          id: currentProfile?.id || 'custom-modified',
          name: currentProfile?.name || 'Custom Physiological State',
          shortName: currentProfile?.shortName || 'Custom',
          category: 'cad', // non-healthy category ensures landing page displays updated params
          categoryName: 'Custom Parameters',
          emoji: currentProfile?.emoji || '⚙️',
          description: currentProfile?.description || 'User-modified physiological parameters',
          params: updatedParams,
          patientProfile: { ...s.patientProfile },
        },
        bpMode: isBPModified ? 'manual' : s.bpMode,
        snapshot: s.snapshot
          ? {
              ...s.snapshot,
              ...(newParams.heartRate !== undefined ? { heartRate: newParams.heartRate } : {}),
              ...(newParams.systolic !== undefined ? { systolic: newParams.systolic } : {}),
              ...(newParams.diastolic !== undefined ? { diastolic: newParams.diastolic } : {}),
            }
          : null,
      };
    });
    get().runEchoNext();
  },

  applyProfile: (profileId) => {
    const profile = SCENARIO_PRESETS.find(p => p.id === profileId);
    if (!profile) return;

    const presetLab = profile.labInputs ?? {};
    const defaultLpa = profile.category === 'cad' || profile.category === 'cvd'
      ? LP_A_REFERENCE.CAD_MEAN_MG_DL
      : LP_A_REFERENCE.HEALTHY_MEDIAN_MG_DL;

    set((s) => {
      const newLabInputs: LabInputs = {
        ...s.labInputs,
        totalCholesterol: presetLab.totalCholesterol ?? (profile.category === 'healthy' ? 175 : 220),
        hdl: presetLab.hdl ?? (profile.category === 'healthy' ? 55 : 38),
        triglycerides: presetLab.triglycerides ?? (profile.category === 'healthy' ? 105 : 180),
        lpa: presetLab.lpa ?? defaultLpa,
        trigsManuallySet: true, // Preset defines the validated baseline lab profile
      };

      // Build params with ecgRhythm for CVD scenarios
      const newParams: MockParams = {
        ...profile.params,
        ecgRhythm: profile.ecgRhythm === 'afib' ? 'afib' : 'sinus',
      };

      const faiVal = presetLab.fai ?? (profile.category === 'healthy' ? -82 : -65);
      const cacVal = presetLab.cac ?? (profile.category === 'healthy' ? 0 : 150);
      const newApoBPanel = calculateApoBPanel(newLabInputs);

      const nextScores = computeValidatedDiseaseSubScores(
        newParams,
        profile.patientProfile,
        newLabInputs,
        newApoBPanel,
        faiVal,
        cacVal
      );

      return {
        params: newParams,
        patientProfile: { ...profile.patientProfile },
        activeProfile: profile,
        lastActiveProfileId: profile.id,
        selectedCategory: profile.category,
        labInputs: newLabInputs,
        apoBPanel: newApoBPanel,
        fai: faiVal,
        cac: cacVal,
        diseaseSubScores: nextScores,
        // CVD-specific state
        activeDiseaseParams: profile.diseaseParameters ?? null,
        activeEcgRhythm: profile.ecgRhythm ?? 'sinus',
        activeMechanismSteps: profile.mechanismSteps ?? null,
        activeSeverity: profile.severity ?? null,
      };
    });
    get().runEchoNext();
  },

  setPatientProfile: (data) => {
    set((s) => {
      const updatedProfile = { ...s.patientProfile, ...data };
      const nextScores = computeValidatedDiseaseSubScores(
        s.params,
        updatedProfile,
        s.labInputs,
        s.apoBPanel,
        s.fai,
        s.cac
      );
      return {
        patientProfile: updatedProfile,
        diseaseSubScores: nextScores,
      };
    });
  },

  setSelectedCategory: (category) => {
    set({ selectedCategory: category });
  },

  setBPMode: (mode) => {
    set({ bpMode: mode });
  },

  setPttDerivedBP: (result) => {
    set({ pttDerivedBP: result });
  },

  clearRiskTrend: () => {
    saveStoredRiskTrend([]);
    set({ riskTrend: [] });
  },

  randomize: () => {
    const { selectedCategory, patientProfile, labInputs, fai: currentFai, cac: currentCac } = get();
    const { params, profilePatch, labPatch, fai: randFai, cac: randCac } = randomizeParamsForCategory(selectedCategory);

    const newLabInputs: LabInputs = {
      ...labInputs,
      ...labPatch,
      trigsManuallySet: true,
    };
    const newApoB = calculateApoBPanel(newLabInputs);
    const updatedProfile = { ...patientProfile, ...profilePatch };
    const finalFai = randFai ?? currentFai;
    const finalCac = randCac ?? currentCac;

    const nextScores = computeValidatedDiseaseSubScores(
      params,
      updatedProfile,
      newLabInputs,
      newApoB,
      finalFai,
      finalCac
    );

    set({
      params,
      patientProfile: updatedProfile,
      labInputs: newLabInputs,
      apoBPanel: newApoB,
      fai: finalFai,
      cac: finalCac,
      diseaseSubScores: nextScores,
      activeProfile: null,
      // Clear CVD-specific state on randomize
      activeDiseaseParams: null,
      activeEcgRhythm: 'sinus',
      activeMechanismSteps: null,
      activeSeverity: null,
    });
  },

  setFai: (val: number) => {
    const clamped = Math.max(FAI_CLAMP.min, Math.min(FAI_CLAMP.max, val));
    set((s) => {
      const nextScores = computeValidatedDiseaseSubScores(
        s.params,
        s.patientProfile,
        s.labInputs,
        s.apoBPanel,
        clamped,
        s.cac
      );
      return {
        fai: clamped,
        diseaseSubScores: nextScores,
        ...(s.activeProfile && s.activeProfile.category === 'healthy' && clamped !== -82
          ? {
              activeProfile: {
                ...s.activeProfile,
                id: 'custom-fai',
                category: 'cad',
                categoryName: 'Custom Parameters',
                name: 'Custom Physiological State',
                shortName: 'Custom',
                emoji: '⚙️',
                description: 'User-configured custom parameters',
              },
            }
          : {}),
      };
    });
  },

  setCac: (val: number) => {
    const clamped = Math.max(CAC_CLAMP.min, val);
    set((s) => {
      const nextScores = computeValidatedDiseaseSubScores(
        s.params,
        s.patientProfile,
        s.labInputs,
        s.apoBPanel,
        s.fai,
        clamped
      );
      return {
        cac: clamped,
        diseaseSubScores: nextScores,
        ...(s.activeProfile && s.activeProfile.category === 'healthy' && clamped !== 0
          ? {
              activeProfile: {
                ...s.activeProfile,
                id: 'custom-cac',
                category: 'cad',
                categoryName: 'Custom Parameters',
                name: 'Custom Physiological State',
                shortName: 'Custom',
                emoji: '⚙️',
                description: 'User-configured custom parameters',
              },
            }
          : {}),
      };
    });
  },

  setLabInputs: (inputs, manualTrig = false) => {
    set((s) => {
      const clamped: Partial<LabInputs> = {};
      if (inputs.totalCholesterol !== undefined) {
        clamped.totalCholesterol = Math.max(
          LAB_CLAMPS.totalCholesterol.min,
          Math.min(LAB_CLAMPS.totalCholesterol.max, inputs.totalCholesterol)
        );
      }
      if (inputs.hdl !== undefined) {
        clamped.hdl = Math.max(
          LAB_CLAMPS.hdl.min,
          Math.min(LAB_CLAMPS.hdl.max, inputs.hdl)
        );
      }
      if (inputs.triglycerides !== undefined) {
        clamped.triglycerides = Math.max(
          LAB_CLAMPS.triglycerides.min,
          Math.min(LAB_CLAMPS.triglycerides.max, inputs.triglycerides)
        );
      }
      if (inputs.lpa !== undefined) {
        clamped.lpa = Math.max(
          LP_A_CLAMP.min,
          Math.min(LP_A_CLAMP.max, inputs.lpa)
        );
      }

      const newLabInputs: LabInputs = {
        ...s.labInputs,
        ...clamped,
        trigsManuallySet: manualTrig ? true : s.labInputs.trigsManuallySet,
      };
      const newApoBPanel = calculateApoBPanel(newLabInputs);

      const nextScores = computeValidatedDiseaseSubScores(
        s.params,
        s.patientProfile,
        newLabInputs,
        newApoBPanel,
        s.fai,
        s.cac
      );

      return {
        labInputs: newLabInputs,
        apoBPanel: newApoBPanel,
        diseaseSubScores: nextScores,
        snapshot: s.snapshot
          ? {
              ...s.snapshot,
              ...(clamped.totalCholesterol !== undefined ? { totalCholesterol: clamped.totalCholesterol } : {}),
              ...(clamped.triglycerides !== undefined ? { triglycerides: clamped.triglycerides } : {}),
            }
          : null,
        ...(s.activeProfile && s.activeProfile.category === 'healthy' && (manualTrig || inputs.totalCholesterol !== undefined || inputs.hdl !== undefined || inputs.lpa !== undefined)
          ? {
              activeProfile: {
                ...s.activeProfile,
                id: 'custom-lab',
                category: 'cad',
                categoryName: 'Custom Parameters',
                name: 'Custom Physiological State',
                shortName: 'Custom',
                emoji: '⚙️',
                description: 'User-configured custom parameters',
              },
            }
          : {}),
      };
    });
  },

  updatePipelineData: (snapshot, risk, status, ecgWaveform, ppgWaveform, ppgTriglycerides, _unusedDiseaseSubScores) => {
    const now = Date.now();
    const newECG: WaveformPoint[] = ecgWaveform.slice(0, 100).map((v, i) => ({
      t: waveformTicker * 100 + i,
      v: parseFloat(v.toFixed(3)),
    }));
    const newPPG: WaveformPoint[] = ppgWaveform.slice(0, 50).map((v, i) => ({
      t: waveformTicker * 50 + i,
      v: parseFloat(v.toFixed(3)),
    }));
    waveformTicker++;

    set((s) => {
      // Update risk history responsibly (no duplicate spamming, real scenario changes, waiting intervals)
      const currentScore = Math.round(risk.score);
      const currentScenarioId = s.activeProfile?.id ?? (s.activeProfile ? 'preset' : 'custom');
      const currentTrend = s.riskTrend;
      let nextTrend = currentTrend;

      if (currentTrend.length === 0) {
        nextTrend = [{
          t: now,
          score: currentScore,
          band: risk.band,
          scenarioId: currentScenarioId,
        }];
        saveStoredRiskTrend(nextTrend);
      } else {
        const lastPoint = currentTrend[currentTrend.length - 1];
        const scenarioChanged = lastPoint.scenarioId !== undefined && lastPoint.scenarioId !== currentScenarioId;
        const scoreDiff = Math.abs(currentScore - Math.round(lastPoint.score));
        const scoreChanged = scoreDiff >= 1;
        const timeSinceLastPoint = now - lastPoint.t;

        if (scenarioChanged) {
          nextTrend = [
            ...currentTrend,
            { t: now, score: currentScore, band: risk.band, scenarioId: currentScenarioId },
          ].slice(-MAX_TREND_HISTORY);
          saveStoredRiskTrend(nextTrend);
        } else if (scoreChanged) {
          if (timeSinceLastPoint < 2500) {
            nextTrend = [...currentTrend];
            nextTrend[nextTrend.length - 1] = {
              ...lastPoint,
              score: currentScore,
              band: risk.band,
              scenarioId: currentScenarioId,
              t: now,
            };
          } else {
            nextTrend = [
              ...currentTrend,
              { t: now, score: currentScore, band: risk.band, scenarioId: currentScenarioId },
            ].slice(-MAX_TREND_HISTORY);
          }
          saveStoredRiskTrend(nextTrend);
        } else if (timeSinceLastPoint >= 6000) {
          if (currentTrend.length < 7) {
            nextTrend = [
              ...currentTrend,
              { t: now, score: currentScore, band: risk.band, scenarioId: currentScenarioId },
            ].slice(-MAX_TREND_HISTORY);
            saveStoredRiskTrend(nextTrend);
          } else {
            let trailingIdenticalCount = 0;
            for (let i = currentTrend.length - 1; i >= 0; i--) {
              if (
                Math.round(currentTrend[i].score) === currentScore &&
                currentTrend[i].scenarioId === currentScenarioId
              ) {
                trailingIdenticalCount++;
              } else {
                break;
              }
            }
            if (trailingIdenticalCount < 2) {
              nextTrend = [
                ...currentTrend,
                { t: now, score: currentScore, band: risk.band, scenarioId: currentScenarioId },
              ].slice(-MAX_TREND_HISTORY);
              saveStoredRiskTrend(nextTrend);
            } else {
              nextTrend = [...currentTrend];
              nextTrend[nextTrend.length - 1] = {
                ...lastPoint,
                t: now,
              };
            }
          }
        }
      }

      return {
        snapshot,
        riskResult: risk,
        sensorStatus: status,
        ecgBuffer: [...s.ecgBuffer, ...newECG].slice(-300),
        ppgBuffer: [...s.ppgBuffer, ...newPPG].slice(-150),
        riskTrend: nextTrend,
        diseaseSubScores: s.diseaseSubScores,
      };
    });
  },

  setReportFields: (fields) => {
    const s = get();
    // Update lab inputs if any lipid fields provided
    const labPatch: Partial<Omit<LabInputs, 'trigsManuallySet'>> = {};
    if (fields.totalCholesterol !== undefined) labPatch.totalCholesterol = fields.totalCholesterol;
    if (fields.hdl !== undefined) labPatch.hdl = fields.hdl;
    if (fields.triglycerides !== undefined) labPatch.triglycerides = fields.triglycerides;
    if (fields.lpa !== undefined) labPatch.lpa = fields.lpa;
    if (Object.keys(labPatch).length > 0) {
      s.setLabInputs(labPatch, true);
    }

    // Direct ApoB / LDL override if present in report
    if (fields.ldl !== undefined || fields.apoB !== undefined) {
      set(state => ({
        apoBPanel: {
          ...state.apoBPanel,
          ...(fields.ldl !== undefined ? { ldl: fields.ldl } : {}),
          ...(fields.apoB !== undefined ? { apoB: fields.apoB } : {}),
        },
      }));
    }

    // Update FAI/CAC
    if (fields.fai !== undefined) s.setFai(fields.fai);
    if (fields.cac !== undefined) s.setCac(fields.cac);

    // Update vitals via params and enforce manual BP mode when report specifies BP
    const paramPatch: Partial<MockParams> = {};
    if (fields.systolic !== undefined) paramPatch.systolic = fields.systolic;
    if (fields.diastolic !== undefined) paramPatch.diastolic = fields.diastolic;
    if (fields.heartRate !== undefined) paramPatch.heartRate = fields.heartRate;
    if (Object.keys(paramPatch).length > 0) {
      s.setParams(paramPatch);
      if (fields.systolic !== undefined || fields.diastolic !== undefined) {
        s.setBPMode('manual');
      }
    }

    // Update patient profile demographics
    const profilePatch: Partial<PatientProfileData> = {};
    if (fields.patientName) profilePatch.name = fields.patientName;
    if (fields.age !== undefined) profilePatch.ageRange = ageToRange(fields.age);
    if (fields.sex) profilePatch.sex = fields.sex;
    if (fields.bmi !== undefined) {
      const heightM = (s.patientProfile.height || 170) / 100;
      profilePatch.weight = Math.round(fields.bmi * heightM * heightM);
    }
    if (Object.keys(profilePatch).length > 0) {
      s.setPatientProfile(profilePatch);
    }

    // Store patient identifier if available
    const ptId = fields.patientId || fields.patientName;
    const sessionStore = typeof sessionStorage !== 'undefined'
      ? sessionStorage
      : (typeof window !== 'undefined' && window.sessionStorage ? window.sessionStorage : null);
    if (ptId && sessionStore) {
      try {
        sessionStore.setItem('arohan_patient_id', ptId);
      } catch {
        // ignore
      }
    }

    // Synchronize validated diseaseSubScores from final updated store state
    const latestState = get();
    const finalScores = computeValidatedDiseaseSubScores(
      latestState.params,
      latestState.patientProfile,
      latestState.labInputs,
      latestState.apoBPanel,
      latestState.fai,
      latestState.cac
    );

    // Set scenario context to reflect uploaded clinical data so landing page displays actual values
    set(state => ({
      diseaseSubScores: finalScores,
      activeProfile: {
        id: 'clinical-report',
        name: 'Clinical Report Ingestion',
        shortName: 'Report',
        category: 'cad',
        categoryName: 'Coronary Artery Disease (CAD)',
        emoji: '📄',
        description: 'Parameters extracted from uploaded clinical report',
        params: { ...state.params },
        patientProfile: { ...state.patientProfile },
      },
      selectedCategory: 'cad',
      // Synchronize immediate snapshot values if snapshot is initialized
      snapshot: state.snapshot
        ? {
            ...state.snapshot,
            ...(fields.heartRate !== undefined ? { heartRate: fields.heartRate } : {}),
            ...(fields.systolic !== undefined ? { systolic: fields.systolic } : {}),
            ...(fields.diastolic !== undefined ? { diastolic: fields.diastolic } : {}),
            ...(fields.totalCholesterol !== undefined ? { totalCholesterol: fields.totalCholesterol } : {}),
            ...(fields.triglycerides !== undefined ? { triglycerides: fields.triglycerides } : {}),
          }
        : null,
      // Update report-specific biomarkers
      ...(fields.hsCRP !== undefined ? { hsCRP: fields.hsCRP } : {}),
      ...(fields.hba1c !== undefined ? { hba1c: fields.hba1c } : {}),
      ...(fields.fastingGlucose !== undefined ? { fastingGlucose: fields.fastingGlucose } : {}),
      ...(fields.postprandialGlucose !== undefined ? { postprandialGlucose: fields.postprandialGlucose } : {}),
      ...(fields.vldl !== undefined ? { vldl: fields.vldl } : {}),
      ...(fields.plaqueType !== undefined ? { plaqueType: fields.plaqueType } : {}),
      ...(fields.plaqueLocation !== undefined ? { plaqueLocation: fields.plaqueLocation } : {}),
      ...(fields.stenosisSeverity !== undefined ? { stenosisSeverity: fields.stenosisSeverity } : {}),
    }));
  },

  setUploadedReport: (report) => {
    set({ uploadedReport: report });
  },

  setUploadedReports: (reports) => {
    set({ uploadedReports: reports });
  },

  setReportConflicts: (conflicts) => {
    set({ reportConflicts: conflicts });
  },

  resolveReportConflict: (fieldKey, selectedIndex) => {
    const s = get();
    const updatedConflicts = s.reportConflicts.map(c => {
      if (c.fieldKey === fieldKey && c.sources[selectedIndex]) {
        return {
          ...c,
          resolvedValue: c.sources[selectedIndex].value,
          selectedSourceIndex: selectedIndex,
        };
      }
      return c;
    });

    const targetConflict = updatedConflicts.find(c => c.fieldKey === fieldKey);
    if (targetConflict && targetConflict.resolvedValue !== undefined) {
      s.setReportFields({ [fieldKey]: targetConflict.resolvedValue as any });
    }
    set({ reportConflicts: updatedConflicts });
  },

  clearReport: () => {
    const s = get();
    const targetProfileId = s.lastActiveProfileId || SCENARIO_PRESETS[0].id;

    const sessionStore = typeof sessionStorage !== 'undefined'
      ? sessionStorage
      : (typeof window !== 'undefined' && window.sessionStorage ? window.sessionStorage : null);
    if (sessionStore) {
      try {
        sessionStore.removeItem('arohan_patient_id');
      } catch {
        // ignore
      }
    }

    // Reset report state
    set({
      hsCRP: 0,
      hba1c: 0,
      fastingGlucose: 0,
      postprandialGlucose: 0,
      vldl: 0,
      plaqueType: 'none',
      plaqueLocation: [],
      stenosisSeverity: 'none',
      uploadedReport: null,
  uploadedReports: [],
  reportConflicts: [],
    });

    // Restore the scenario preset it was on
    get().applyProfile(targetProfileId);
  },
}));

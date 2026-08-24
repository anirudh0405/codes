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
import {
  PatientProfileData,
  DEFAULT_PATIENT_PROFILE_DATA,
} from '../components/Dashboard/PatientProfilePanel';

const TREND_HISTORY_LENGTH = 60; // keep 60 seconds of history

export interface WaveformPoint {
  t: number;
  v: number;
}

export type BPMode = 'ptt' | 'manual';

export interface SimState {
  // ── Control Parameters (set by user via sliders / presets / randomize) ──────
  params: MockParams;
  activeProfile: ScenarioPreset | null;
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

  // ── Trend History (last 60 samples) ───────────────────────────────────────
  riskTrend: { t: number; score: number; band: string }[];

  // ── Lab Report Values (manual entry) ─────────────────────────────────────
  labInputs: LabInputs;

  // ── Computed ApoB Panel (reactive, recomputed on every labInputs change) ──
  apoBPanel: ApoBPanel;

  // ── CVD Disease-Specific State ─────────────────────────────────────────────
  /** Disease-specific parameters for the currently active CVD scenario (null for Healthy/CAD) */
  activeDiseaseParams: Record<string, string | number | boolean> | null;
  /** Active ECG rhythm mode — drives the ECG generator */
  activeEcgRhythm: ECGRhythm;
  /** Mechanism pathway steps for the active CVD scenario */
  activeMechanismSteps: string[] | null;
  /** Severity label for the active scenario */
  activeSeverity: string | null;

  // ── Actions ───────────────────────────────────────────────────────────────
  setParams: (params: Partial<MockParams>) => void;
  applyProfile: (profileId: string) => void;
  setPatientProfile: (data: Partial<PatientProfileData>) => void;
  setSelectedCategory: (category: PresetCategory | null) => void;
  setBPMode: (mode: BPMode) => void;
  setPttDerivedBP: (result: PTTDerivedBPResult) => void;
  randomize: () => void;
  setLabInputs: (inputs: Partial<Omit<LabInputs, 'trigsManuallySet'>>, manualTrig?: boolean) => void;
  updatePipelineData: (
    snapshot: PhysiologicalSnapshot,
    risk: RiskResult,
    status: Record<SensorType, SensorStatus>,
    ecgWaveform: number[],
    ppgWaveform: number[],
    ppgTriglycerides?: number
  ) => void;
}

// Physiologically plausible random values within a specific category or across all
// Physiologically plausible random values within a specific category or across all
function randomizeParamsForCategory(category: PresetCategory | null): {
  params: MockParams;
  profilePatch: Partial<PatientProfileData>;
  labPatch: Partial<LabInputs>;
} {
  if (category === 'healthy') {
    const hr = Math.round(58 + Math.random() * 26);    // 58–84 bpm
    const systolic = Math.round(105 + Math.random() * 20); // 105–125 mmHg
    const diastolic = Math.round(65 + Math.random() * 15); // 65–80 mmHg
    const hrv = Math.round(45 + Math.random() * 45);    // 45–90 ms
    const stress = Math.round(10 + Math.random() * 25);  // 10–35

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
  };
}

const DEFAULT_PRESET = SCENARIO_PRESETS[0];

let waveformTicker = 0;

export const useSimStore = create<SimState>((set, get) => ({
  params: { ...DEFAULT_PRESET.params },
  activeProfile: DEFAULT_PRESET,
  patientProfile: { ...DEFAULT_PRESET.patientProfile },
  selectedCategory: 'healthy',
  bpMode: 'ptt', // PTT-derived is default data source
  pttDerivedBP: null,
  snapshot: null,
  riskResult: null,
  sensorStatus: { ecg: 'simulated', ppg: 'simulated', bp: 'simulated', stress: 'simulated' },
  ecgBuffer: [],
  ppgBuffer: [],
  riskTrend: [],

  labInputs: { ...DEFAULT_LAB_INPUTS },
  apoBPanel: calculateApoBPanel(DEFAULT_LAB_INPUTS),

  // CVD-specific state
  activeDiseaseParams: null,
  activeEcgRhythm: 'sinus',
  activeMechanismSteps: null,
  activeSeverity: null,

  setParams: (newParams) => {
    set((s) => {
      const isBPModified = newParams.systolic !== undefined || newParams.diastolic !== undefined;
      return {
        params: { ...s.params, ...newParams },
        activeProfile: null, // manual edit clears profile selection
        bpMode: isBPModified ? 'manual' : s.bpMode,
      };
    });
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
        trigsManuallySet: false, // reset manual flag on preset change
      };

      // Build params with ecgRhythm for CVD scenarios
      const newParams: MockParams = {
        ...profile.params,
        ecgRhythm: profile.ecgRhythm === 'afib' ? 'afib' : 'sinus',
      };

      return {
        params: newParams,
        patientProfile: { ...profile.patientProfile },
        activeProfile: profile,
        selectedCategory: profile.category,
        labInputs: newLabInputs,
        apoBPanel: calculateApoBPanel(newLabInputs),
        // CVD-specific state
        activeDiseaseParams: profile.diseaseParameters ?? null,
        activeEcgRhythm: profile.ecgRhythm ?? 'sinus',
        activeMechanismSteps: profile.mechanismSteps ?? null,
        activeSeverity: profile.severity ?? null,
      };
    });
  },

  setPatientProfile: (data) => {
    set((s) => ({
      patientProfile: { ...s.patientProfile, ...data },
    }));
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

  randomize: () => {
    const { selectedCategory, patientProfile, labInputs } = get();
    const { params, profilePatch, labPatch } = randomizeParamsForCategory(selectedCategory);

    const newLabInputs: LabInputs = {
      ...labInputs,
      ...labPatch,
      trigsManuallySet: false,
    };

    set({
      params,
      patientProfile: { ...patientProfile, ...profilePatch },
      labInputs: newLabInputs,
      apoBPanel: calculateApoBPanel(newLabInputs),
      activeProfile: null,
      // Clear CVD-specific state on randomize
      activeDiseaseParams: null,
      activeEcgRhythm: 'sinus',
      activeMechanismSteps: null,
      activeSeverity: null,
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

      return {
        labInputs: newLabInputs,
        apoBPanel: calculateApoBPanel(newLabInputs),
      };
    });
  },

  updatePipelineData: (snapshot, risk, status, ecgWaveform, ppgWaveform, ppgTriglycerides) => {
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
      let labInputs = s.labInputs;
      let apoBPanel = s.apoBPanel;
      if (!s.labInputs.trigsManuallySet && ppgTriglycerides !== undefined) {
        const clamped = Math.max(
          LAB_CLAMPS.triglycerides.min,
          Math.min(LAB_CLAMPS.triglycerides.max, Math.round(ppgTriglycerides))
        );
        labInputs = { ...s.labInputs, triglycerides: clamped };
        apoBPanel = calculateApoBPanel(labInputs);
      }

      return {
        snapshot,
        riskResult: risk,
        sensorStatus: status,
        ecgBuffer: [...s.ecgBuffer, ...newECG].slice(-300),
        ppgBuffer: [...s.ppgBuffer, ...newPPG].slice(-150),
        riskTrend: [
          ...s.riskTrend,
          { t: now, score: risk.score, band: risk.band },
        ].slice(-TREND_HISTORY_LENGTH),
        labInputs,
        apoBPanel,
      };
    });
  },
}));

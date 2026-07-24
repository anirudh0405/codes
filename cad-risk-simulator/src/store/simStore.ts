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
import { PATIENT_PROFILES, PatientProfile } from './profiles';
import {
  LabInputs,
  ApoBPanel,
  DEFAULT_LAB_INPUTS,
  calculateApoBPanel,
  LAB_CLAMPS,
} from '../features/apoBCalculation';

const TREND_HISTORY_LENGTH = 60; // keep 60 seconds of history

export interface WaveformPoint {
  t: number;
  v: number;
}

export interface SimState {
  // ── Control Parameters (set by user via sliders / presets / randomize) ──────
  params: MockParams;
  activeProfile: PatientProfile | null;

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
  // These are NOT produced by the sensor pipeline. The user enters values from
  // a real lab report. Triglycerides auto-syncs from the PPG estimate unless
  // the user has manually edited the field (trigsManuallySet flag).
  labInputs: LabInputs;

  // ── Computed ApoB Panel (reactive, recomputed on every labInputs change) ──
  apoBPanel: ApoBPanel;

  // ── Actions ───────────────────────────────────────────────────────────────
  setParams: (params: Partial<MockParams>) => void;
  applyProfile: (profileId: string) => void;
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

// Physiologically plausible random values (correlated)
function randomizeParams(): MockParams {
  const hrv = 20 + Math.random() * 80;       // 20–100ms
  const hr = Math.round(55 + Math.random() * 60);  // 55–115 bpm
  const stress = Math.max(0, Math.min(100, Math.round(100 - hrv * 0.8 + (Math.random() - 0.5) * 20)));
  const systolic = Math.round(100 + Math.random() * 80); // 100–180
  const diastolic = Math.round(systolic * 0.6 + (Math.random() - 0.5) * 10); // correlated
  return {
    heartRate: hr,
    systolic: Math.min(200, systolic),
    diastolic: Math.min(130, Math.max(50, diastolic)),
    hrv: Math.round(hrv),
    stressScore: stress,
    stSegment: parseFloat(((Math.random() - 0.3) * 0.3).toFixed(3)),
    qtInterval: Math.round(360 + Math.random() * 180), // 360–540ms
  };
}

const DEFAULT_PARAMS: MockParams = PATIENT_PROFILES[0].params;

let waveformTicker = 0;

export const useSimStore = create<SimState>((set, get) => ({
  params: { ...DEFAULT_PARAMS },
  activeProfile: PATIENT_PROFILES[0],
  snapshot: null,
  riskResult: null,
  sensorStatus: { ecg: 'simulated', ppg: 'simulated', bp: 'simulated', stress: 'simulated' },
  ecgBuffer: [],
  ppgBuffer: [],
  riskTrend: [],

  labInputs: { ...DEFAULT_LAB_INPUTS },
  apoBPanel: calculateApoBPanel(DEFAULT_LAB_INPUTS),

  setParams: (newParams) => {
    set((s) => ({
      params: { ...s.params, ...newParams },
      activeProfile: null, // manual edit clears profile selection
    }));
  },

  applyProfile: (profileId) => {
    const profile = PATIENT_PROFILES.find(p => p.id === profileId);
    if (!profile) return;
    set({ params: { ...profile.params }, activeProfile: profile });
  },

  randomize: () => {
    const params = randomizeParams();
    set({ params, activeProfile: null });
  },

  setLabInputs: (inputs, manualTrig = false) => {
    set((s) => {
      // Clamp each incoming field to physiological bounds
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

      const newLabInputs: LabInputs = {
        ...s.labInputs,
        ...clamped,
        // Mark trigs as manually set if the user explicitly changed the field
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
      // Auto-sync PPG-derived triglycerides into labInputs if the user
      // hasn't manually overridden the Triglycerides field.
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

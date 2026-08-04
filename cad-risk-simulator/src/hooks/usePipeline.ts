/**
 * Pipeline Orchestrator
 * =====================
 * Connects all 7 layers in the correct order:
 *   SensorManager → FeatureExtraction → Fusion → RiskEngine → Store → Dashboard
 *
 * This hook runs on mount, starts the SensorManager polling, and on each tick:
 * 1. Gets raw readings from SensorManager
 * 2. Extracts features (pure functions)
 * 3. Fuses features into a snapshot
 * 4. Derives Pulse Transit Time (PTT) and PTT-derived Blood Pressure (Moens-Korteweg)
 * 5. Applies PTT-derived BP as DEFAULT BP source (or manual override if selected)
 * 6. Scores the snapshot through the Risk Engine (with INTERHEART & WHO Chart lookup)
 * 7. Writes results to the Zustand store (Dashboard reads from there)
 */

import { useEffect, useRef } from 'react';
import { sensorManager } from '../sensorManager';
import { extractFeatures, calculatePTT, estimateBPFromPTT, DEFAULT_PTT_CALIBRATION } from '../features';
import { fuseFeatures } from '../fusion';
import { scoreFromSnapshot } from '../riskEngine';
import { useSimStore } from '../store/simStore';
import { LatestReadings } from '../sensorManager';

export function usePipeline() {
  const updatePipelineData = useSimStore(s => s.updatePipelineData);
  const setPttDerivedBP = useSimStore(s => s.setPttDerivedBP);

  // Use a ref to always have fresh params without re-running the effect
  const paramsRef = useRef(useSimStore.getState().params);
  useEffect(() => {
    return useSimStore.subscribe(state => {
      paramsRef.current = state.params;
      sensorManager.setParams(state.params);
    });
  }, []);

  // Initialize and start pipeline ONCE on mount
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let started = false;

    async function start() {
      if (started) return;
      started = true;

      await sensorManager.init();

      unsubscribe = sensorManager.subscribe((readings: LatestReadings) => {
        // Grab raw waveform arrays from readings
        const ecgWaveform = (readings.ecg?.data.waveform as number[] | undefined) ?? [];
        const ppgWaveform = (readings.ppg?.data.waveform as number[] | undefined) ?? [];

        // Layer 3: Feature Extraction
        const features = extractFeatures({
          ecg: readings.ecg,
          ppg: readings.ppg,
          bp: readings.bp,
          stress: readings.stress,
        });

        // Layer 4: Sensor Fusion
        const rawSnapshot = fuseFeatures(features);

        // Derive Pulse Transit Time (PTT) from ECG & PPG waveforms
        const ptt = calculatePTT(ecgWaveform, ppgWaveform);

        // Estimate Blood Pressure from PTT (Moens-Korteweg regression) with Motion-Awareness
        const pttBP = estimateBPFromPTT(
          ptt,
          DEFAULT_PTT_CALIBRATION,
          rawSnapshot.confidence,
          rawSnapshot.motionArtifactFlag
        );

        // Store current PTT-derived BP in Zustand store for UI access
        setPttDerivedBP(pttBP);

        const { bpMode, apoBPanel, labInputs, patientProfile } = useSimStore.getState();

        // Apply PTT-derived BP as DEFAULT data source if bpMode === 'ptt'
        let systolic = rawSnapshot.systolic;
        let diastolic = rawSnapshot.diastolic;

        if (bpMode === 'ptt') {
          systolic = pttBP.systolic;
          diastolic = pttBP.diastolic;
        }

        // Create annotated snapshot with active BP source, ApoB, and Lp(a) passthrough
        const snapshot = {
          ...rawSnapshot,
          systolic,
          diastolic,
          pulseTransitTime: ptt,
          apoB: apoBPanel.apoB,
          // Lp(a): manual lab input — not derived from sensor data.
          // Passed through to RiskResult for Phase 2 scoring readiness.
          lpa: labInputs.lpa,
        };

        // Layer 5: CAD Risk Engine (incorporates INTERHEART weights, PTT BP & WHO Risk Chart)
        const risk = scoreFromSnapshot(snapshot, patientProfile);

        // Write to store (Layer 7 reads from here).
        updatePipelineData(
          snapshot,
          risk,
          readings.sensorStatus,
          ecgWaveform,
          ppgWaveform,
          snapshot.triglycerides,
        );
      });

      sensorManager.start();
    }

    start().catch(console.error);

    return () => {
      sensorManager.stop();
      unsubscribe?.();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — intentionally run once
}

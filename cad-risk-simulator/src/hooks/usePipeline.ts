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
 * 4. Scores the snapshot through the Risk Engine
 * 5. Writes results to the Zustand store (Dashboard reads from there)
 */

import { useEffect, useRef } from 'react';
import { sensorManager } from '../sensorManager';
import { extractFeatures } from '../features';
import { fuseFeatures } from '../fusion';
import { scoreFromSnapshot } from '../riskEngine';
import { useSimStore } from '../store/simStore';
import { LatestReadings } from '../sensorManager';

export function usePipeline() {
  // Use individual primitive selectors to avoid creating new object refs
  const updatePipelineData = useSimStore(s => s.updatePipelineData);

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
        // Layer 3: Feature Extraction
        const features = extractFeatures({
          ecg: readings.ecg,
          ppg: readings.ppg,
          bp: readings.bp,
          stress: readings.stress,
        });

        // Layer 4: Sensor Fusion
        const snapshot = fuseFeatures(features);

        // Annotate snapshot with ApoB from the lab inputs (manual entry).
        // This makes apoB available to the Risk Engine input object for
        // Phase 4 (WHO risk chart integration) without touching the Fusion Engine.
        const { apoBPanel } = useSimStore.getState();
        const annotatedSnapshot = { ...snapshot, apoB: apoBPanel.apoB };

        // Layer 5: CAD Risk Engine
        const risk = scoreFromSnapshot(annotatedSnapshot);

        // Grab waveform arrays from raw readings
        const ecgWaveform = (readings.ecg?.data.waveform as number[] | undefined) ?? [];
        const ppgWaveform = (readings.ppg?.data.waveform as number[] | undefined) ?? [];

        // Write to store (Layer 7 reads from here).
        // Pass the PPG-derived triglycerides so the store can auto-sync the
        // Lab Report panel's Triglycerides field when not manually overridden.
        updatePipelineData(
          annotatedSnapshot,
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

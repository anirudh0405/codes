/**
 * Shared clinical tooltip copy.
 * Single source of truth so explanatory text is never duplicated across cards.
 */

export const TOOLTIPS: Record<string, string> = {
  heartRate: 'Number of heartbeats per minute, derived from the ECG or PPG waveform. Resting range 60–100 bpm.',
  systolic: 'Pressure in the arteries when the heart contracts and pumps blood — the higher of the two BP numbers.',
  diastolic: 'Pressure in the arteries when the heart rests between beats — the lower of the two BP numbers.',
  hrv: 'Variation in time between heartbeats. Higher HRV generally reflects better cardiovascular and autonomic health.',
  stress: 'Estimated physiological stress level, derived from HRV and skin-response proxies. Higher values indicate greater stress.',
  stSegment: 'Portion of the ECG waveform between heartbeats. Deviation from baseline can indicate reduced blood flow to the heart muscle.',
  qtInterval: 'Time the heart’s electrical system takes to activate and reset each beat. Abnormally long or short values can indicate rhythm risk.',
  motion: 'Simulated accelerometer signal. Detects whether a cardiac reading coincides with movement, helping distinguish real events from motion artifacts.',
  totalCholesterol: 'Estimated from PPG waveform shape (pulse wave morphology) — not a direct lab measurement. Confidence drops if motion affects signal quality.',
  triglycerides: 'Estimated from PPG waveform shape, similar to the cholesterol estimate — an experimental, non-clinical approximation.',
  cadRiskScore: 'A 0–100 composite score combining all sensor contributions below, weighted by how strongly each parameter is associated with coronary risk in this model.',
  contribution: 'How many points this parameter added to the total CAD Risk Score this cycle.',
  confidence: 'How reliable this reading is right now — lower when the signal may be affected by motion or noise.',
  bloodPressure: 'Systolic and diastolic arterial pressure. Sustained elevation is a major modifiable risk factor for coronary artery disease.',
  apoB: 'Apolipoprotein B — the protein carried by atherogenic lipoproteins (LDL, VLDL). Estimated here from Non-HDL via the Sniderman et al. (2012) regression, not a direct lab measurement.',
  nonHDL: 'Non-HDL cholesterol = Total Cholesterol − HDL. Captures all atherogenic particles without requiring fasting.',
  ldl: 'LDL cholesterol estimated via the Friedewald equation. Only valid when triglycerides are below 400 mg/dL.',
  hdl: 'HDL cholesterol — the “good” cholesterol. Higher values are cardioprotective; this parameter is inverted on reference bars.',
  lpA: 'Lipoprotein(a) — a genetically determined independent cardiovascular risk factor. Cannot be estimated from sensor data; entered manually from a lab report.',
  apoBApoA1Ratio: 'Ratio of atherogenic ApoB to protective ApoA1. Display uses an ApoA1 ≈ HDL × 2.0 proxy for context only; not used in risk scoring.',
  bmi: 'Body Mass Index — weight (kg) divided by height (m) squared. South Asian reference range is lower than Western norms.',
  whoRiskBand: 'WHO 10-year CVD risk band from the South Asia non-laboratory chart, using age, sex, SBP, smoking and BMI.',
  ptp: 'Pulse transit time — the delay between the ECG R-wave and the corresponding PPG pulse. Shorter PTT correlates with higher blood pressure.',
  spo2: 'Peripheral oxygen saturation estimated optically from the PPG waveform.',
  qtcBazett: 'Corrected QT interval using the Bazett formula. Prolongation (>450 ms) can indicate arrhythmia risk.',
  st: 'ST-segment deviation from isoelectric baseline. Elevation or depression can indicate myocardial ischemia.',
  map: 'Mean arterial pressure ≈ diastolic + ⅓(systolic − diastolic). Represents average arterial pressure over the cardiac cycle.',
  ldlFriedewald: 'LDL estimated via Friedewald: LDL = TC − HDL − (TG / 5). Not valid when triglycerides exceed 400 mg/dL.',
  regressionConfidence: 'How well the current lipid panel fits the Non-HDL regression model used to estimate ApoB.',
  predictionExplanation: 'ApoB is predicted from Non-HDL cholesterol (TC − HDL). This captures LDL and other atherogenic particles without a fasting sample.',
  riskContribution: 'Points this parameter adds to the composite CAD Risk Score, weighted per the INTERHEART model.',
  estimate: 'Derived value — not a direct laboratory measurement. Treat as an approximation.',
};

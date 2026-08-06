# CAD Risk Simulator — Comprehensive Functionality & Architecture Guide

> **Document Type:** Technical & Functional Specification
> **Project:** CAD (Coronary Artery Disease) Risk Monitor
> **Stack:** React 19 • TypeScript • Vite • Zustand • TailwindCSS v4 • HTML5 Canvas
> **Target Audience:** Developers, Medical Investigators, Product Evaluators, & Engineering Teams

---

## 1. Overview & System Purpose

The **CAD Risk Simulator** is a real-time, browser-native medical monitoring system designed to continuously calculate and visualize a patient's **Coronary Artery Disease (CAD) risk score** from multi-sensor physiological signals.

Operating entirely on the client side without backend dependencies, the system models a clinical-grade biometric telemetry pipeline: raw waveform synthesis $\rightarrow$ hardware abstraction $\rightarrow$ feature extraction $\rightarrow$ multi-sensor fusion $\rightarrow$ clinical risk scoring $\rightarrow$ reactive state management $\rightarrow$ real-time visualization.

### Primary Capabilities
* **Real-Time Biometric Pipeline**: Processes ECG, PPG, BP, and Stress signals in real time (up to 60 FPS sweep rendering with 1 Hz pipeline evaluation).
* **Clinically Grounded Scoring**: Combines **INTERHEART Study** odds ratios (*Lancet 2004*) with **WHO 2019 South Asia Non-Laboratory CVD Risk Charts**.
* **Cuffless Blood Pressure & PTT Engine**: Derives continuous Blood Pressure using Pulse Transit Time (PTT) between ECG R-waves and PPG pulse arrival using Moens-Korteweg vascular mechanics.
* **Non-Invasive Lipid & Biomarker Estimation**: Estimates Total Cholesterol and Triglycerides from PPG arterial stiffness indices (Augmentation, Reflection, Stiffness indices) and derives Apolipoprotein B (ApoB) via Sniderman regression.
* **Hardware Abstraction Layer (HAL)**: Pluggable sensor source architecture enabling seamless transition from mock math generators to physical BLE hardware (e.g., ESP32 / MAX30102).
* **Clinical Scenario Controls & Presets**: Pre-configured clinical profiles (Normal Baseline, Impending MI, Hypertension, Metabolic Syndrome, Severe Stress) and manual parameter manipulation.

---

## 2. System Architecture & Expanded 7-Row Dual Fusion Pipeline

The simulator implements a client-side data processing architecture orchestrated by the `usePipeline` React hook:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│  Row 1 — Patient Profile Input Layer (Sensor-Independent)                                   │
│  · Structured Clinical Profile: Demographics, Habits/Lifestyle, Medical History, Symptoms   │
│  · Lab Report Panel: Total Cholesterol, HDL, Triglycerides, ApoB, Lp(a), ApoA1 (planned)    │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │
┌──────────────────────────────────────────────▼──────────────────────────────────────────────┐
│  Row 2 — Hardware Abstraction Layer (HAL) (src/hal/)                                        │
│  ISensorSource contract; Mock classes bridge user sliders to math generators                │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │
┌──────────────────────────────────────────────▼──────────────────────────────────────────────┐
│  Row 3 — Sensor Manager (src/sensorManager/)                                                │
│  Sensor polling, frame buffering, waveform windowing, and multi-channel synchronization     │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │
┌──────────────────────────────────────────────▼──────────────────────────────────────────────┐
│  Row 4 — Feature Extraction Engine (src/features/)                                          │
│  · ECG Branch: Heart Rate (BPM), ST Segment Elevation/Depression (mV), QTc Bazett (ms)       │
│  · PPG Branch: HRV RMSSD, PTT Timing, Vascular Indices (RI, SI, AIx) → Est. TC & TG        │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │
┌──────────────────────────────────────────────▼──────────────────────────────────────────────┐
│  Row 5 — Multi-Sensor Dual Fusion Engine (src/fusion/)                                      │
│                                                                                             │
│  ┌──────────────────────────────────────────┐    ┌────────────────────────────────────────┐  │
│  │ Box A: Cardiac / Motion Fusion           │    │ Box B: Metabolic-Vascular Fusion       │  │
│  │ Logic: Correlation-Based                 │    │ Logic: Two-Tier Divergence-Based       │  │
│  │ Cross-correlates ECG/PPG vs Motion to    │    │ · Tier 1: BP + TC(PPG) + TG(PPG)       │  │
│  │ flag artifacts & dampen confidence.      │    │   → PPGVascularIndex                   │  │
│  │                                          │    │ · Tier 2: PPGVascularIndex + ApoB      │  │
│  │                                          │    │   (independent anchor) → divergence    │  │
│  │                                          │    │   check → compositeMetabolicScore      │  │
│  └──────────────────────────────────────────┘    └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │
┌──────────────────────────────────────────────▼──────────────────────────────────────────────┐
│  Row 6 — Clinical Risk Engine Layer (src/riskEngine/)                                       │
│  · Internal CAD Risk Score (0–100): INTERHEART weighted sum (HR, HRV, Stress, QTc, ST,     │
│    compositeMetabolicScore)                                                                 │
│  · Parallel Reference: WHO 2019 South-Asia 10-Year CVD Risk Band (Age, Sex, SBP, Smoking,   │
│    BMI)                                                                                     │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │
┌──────────────────────────────────────────────▼──────────────────────────────────────────────┐
│  Row 7 — Live Dashboard & Control UI (src/App.tsx & src/components/)                        │
│  Waveform Sweeps, Readout Cards with Reference Ranges, Risk Gauge, WHO Card, Contributions  │
│  Breakdown, Trend Sparkline, In-App Documentation Panel                                     │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Key Architectural Enhancements
* **Patient Profile Layer**: A sensor-independent input stream capturing structured clinical demographics, risk factors, and lab values.
* **Dual Fusion Engine**:
  * *Cardiac/Motion Fusion (Correlation-Based)*: Cross-correlates independent ECG/PPG waveforms with Accelerometer Motion data to detect movement artifacts.
  * *Metabolic-Vascular Fusion (Two-Tier Divergence-Based)*: Avoids false correlation on shared-PPG signals by combining BP and PPG lipid estimates into `PPGVascularIndex` (Tier 1), then using ApoB as an independent anchor for divergence checking (Tier 2).
* **WHO Risk Band**: Derived directly from Patient Profile inputs as a separate, cited population reference score shown alongside the real-time composite score.
* **Implementation Status**: ApoA1 is explicitly tagged as **planned**; all other modules correspond to live codebase features.


---

## 3. Detailed Functional Breakdown by Layer

### Layer 1: Waveform Generators (`src/hal/generators/`)
Pure, deterministic mathematical functions responsible for raw signal synthesis.
* **`ecgGenerator.ts`**: Synthesizes Lead-II P-QRS-T electrocardiogram complexes based on Target Heart Rate, ST-segment elevation/depression (-0.5 to +0.5 mV), and QT interval duration (300 to 500 ms).
* **`ppgGenerator.ts`**: Simulates optical absorption pulses featuring systolic peaks, dicrotic notches, and reflection waves derived from vascular stiffness, augmentation, and reflection indices.
* **`bpGenerator.ts`**: Generates continuous arterial pressure waveforms given systolic/diastolic baseline targets with realistic physiological respiration and beat-to-beat variability.
* **`stressGenerator.ts`**: Simulates autonomic nervous system proxies including galvanic skin response (EDA) and sympathetic tone indicators.

### Layer 2: Hardware Abstraction Layer (`src/hal/`)
Provides hardware agnosticism via the `ISensorSource` interface:
```typescript
interface ISensorSource {
  readonly type: SensorType; // 'ecg' | 'ppg' | 'bp' | 'stress'
  init(): Promise<void>;
  read(): Promise<SensorReading>;
  getStatus(): SensorStatus;
}
```
* **`MockSensorSources.ts`**: Instantiates `MockECGSource`, `MockPPGSource`, `MockBPSource`, and `MockStressSource`.
* **Hardware Swap Seam**: Transitioning to physical hardware (e.g., ESP32, MAX30102, ECG AD8232) requires creating a `BLESensorSource` implementing `ISensorSource` — zero changes are required for downstream extraction, fusion, risk engine, or UI components.

### Layer 3: Feature Extraction (`src/features/`)
Transforms raw time-series arrays into clinically relevant physiological metrics:
* **Heart Rate & HRV**: Calculates beats per minute (BPM) and Root Mean Square of Successive Differences (RMSSD) for HRV.
* **ECG Analysis**: Measures ST-segment deviation in millivolts (mV) and computes heart-rate corrected QT interval ($QT_c$) using **Bazett's Formula**:
  $$QT_c = \frac{QT}{\sqrt{RR}}$$
* **Pulse Transit Time (PTT) & Cuffless BP**: Measures time delay ($\Delta t$) between ECG R-wave peak and PPG pulse foot arrival. Estimates systolic and diastolic blood pressure via the **Moens-Korteweg vascular dynamics model**:
  $$BP_{est} = a \cdot \ln(PTT) + b$$
* **PPG Morphology & Lipid Estimation (`lipidEstimation.ts`)**: Evaluates arterial compliance parameters (Reflection Index $RI$, Stiffness Index $SI$, Augmentation Index $AIx$) to non-invasively estimate Total Cholesterol (TC) and Triglycerides (TG).
* **Apolipoprotein B & Friedewald LDL (`apoBCalculation.ts`)**: Computes ApoB concentration using Sniderman regression equations and LDL cholesterol via the Friedewald formula:
  $$LDL = \text{Total Cholesterol} - HDL - \frac{\text{Triglycerides}}{5}$$

### Layer 4: Sensor Fusion (`src/fusion/`)
Normalizes extracted features into calibrated 0–100 physiological risk indices:
* **Sub-Index Normalization**: Converts raw metrics into standardized indices:
  * *Cardiovascular Index*: Combines BP, HR, and QTc deviation.
  * *ST Deviation Index*: Quantifies ischemic ST elevation or depression.
  * *Autonomic Stress Index*: Combines stress score and HRV depression.
  * *Lipid/Biomarker Index*: Combines ApoB, Non-HDL, and TG readings.
* **Signal Quality & Artifact Detection**: Evaluates signal-to-noise ratio (SNR) across sensors and flags motion artifacts, dynamically adjusting overall fusion confidence (0–100%).

### Layer 5: CAD Risk Engine (`src/riskEngine/`)
Calculates composite risk using a dual clinical scoring methodology:

#### A. INTERHEART Study Multi-Factor Weighting
Based on the seminal INTERHEART study (*Lancet 2004*), clinical factors are assigned weighted Population Attributable Risk (PAR) impact factors:
1. **ApoB / ApoA1 Ratio** (or elevated ApoB / Non-HDL)
2. **Smoking Status** (Never, Former, Current)
3. **Hypertension History** & Live Systolic/Diastolic BP
4. **Diabetes Mellitus** (Presence/Absence)
5. **Psychosocial Stress Score** (Live autonomic stress & HRV)
6. **Physical Activity Level** (Sedentary vs Active)
7. **ECG Ischemic Markers** (ST Elevation/Depression)

#### B. WHO 2019 South Asia Non-Lab Risk Chart Integration (`whoRiskChart.ts`)
Implements the WHO 10-year Cardiovascular Disease risk matrix tailored to South Asian populations:
* **Inputs**: Age, Sex, Systolic BP, Smoking status, Diabetes status.
* **Risk Stratification Bands**:
  * **Low Risk**: $< 10\%$
  * **Moderate Risk**: $10\% - <20\%$
  * **High Risk**: $20\% - <30\%$
  * **Very High Risk**: $\ge 30\%$

### Layer 6: Global State Store (`src/store/simStore.ts`)
Built with **Zustand** for high-performance state management without react-tree re-render overhead.
* **State Managed**:
  * Control parameters (`params`: HR, BP, HRV, Stress, ST segment, QT interval)
  * Active scenario preset & patient profile context
  * BP mode selection (`ptt` derived vs `manual` slider)
  * Live physiological snapshot & risk engine results
  * Rolling 60-second historical trend buffer
  * Synchronized ECG and PPG waveform sweep buffers
  * Manual lab inputs & computed ApoB panel

### Layer 7: UI Dashboard & Controls (`src/components/`)
A responsive, high-aesthetic dark-mode interface featuring glassmorphic cards and micro-animations.

---

## 4. Key UI Components & Functionality

| Component Name | File Path | Functional Description |
|---|---|---|
| **ControlPanel** | `src/components/ControlPanel/ControlPanel.tsx` | Slide-out drawer containing simulation controls, scenario preset selectors, parameter sliders, BP mode toggles, and parameter randomization. |
| **SweepWaveform** | `src/components/Dashboard/SweepWaveform.tsx` | HTML5 Canvas component providing smooth 60 FPS oscilloscope-style sweep visualizations of raw ECG and PPG signals with live vertical sweep bar. |
| **ArcGauge** | `src/components/Dashboard/ArcGauge.tsx` | Animated radial gauge displaying the master composite CAD Risk Score (0–100) with color-coded risk bands (Green, Yellow, Orange, Red). |
| **RiskGauge** | `src/components/Dashboard/RiskGauge.tsx` | Secondary gauge display showing risk score, status label, and WHO 10-year CVD risk percentage band. |
| **VitalSigns** | `src/components/Dashboard/VitalSigns.tsx` | Metric grid highlighting real-time numerical readings for Heart Rate, Blood Pressure (with PTT indicator), HRV, QTc, ST Segment, and Stress. |
| **ContributionBreakdown** | `src/components/Dashboard/ContributionBreakdown.tsx` | Horizontal bar chart breaking down relative percentage contributions of individual clinical risk drivers to the master score. |
| **RiskTrend** | `src/components/Dashboard/RiskTrend.tsx` | Rolling line chart rendering the past 60 seconds of CAD risk score trajectory. |
| **PatientProfilePanel** | `src/components/Dashboard/PatientProfilePanel.tsx` | Modal/Panel enabling customization of non-sensor clinical context (Age, Sex, Smoking history, Physical activity, Diabetes, Prior CVD, Chest pain status). |
| **LabReportSummary** | `src/components/Dashboard/LabReportSummary.tsx` | Full lab panel for lipid entry (Total Cholesterol, HDL, Triglycerides) and display of derived lipid metrics. |
| **ApoBCard** | `src/components/Dashboard/ApoBCard.tsx` | Card dedicated to Apolipoprotein B metric visualization, risk tiering, and comparison to guidelines. |
| **LpaCard** | `src/components/Dashboard/LpaCard.tsx` | Dedicated card for Lipoprotein(a) manual entry, nmol/L conversion, and threshold alerting ($> 50 \text{ mg/dL}$). |
| **SensorStatus** | `src/components/Dashboard/SensorStatus.tsx` | Connectivity indicator showing status (`simulated`, `connected`, `error`) for ECG, PPG, BP, and Stress sensors. |

---

## 5. Clinical Scenario Presets

The simulator includes pre-configured clinical presets located in `src/presets/index.ts`:

1. **Normal Healthy Baseline**:
   * HR: 68 BPM | BP: 118/76 mmHg | HRV: 65 ms | ST Segment: 0.0 mV | Stress: 18
   * Profile: Non-smoker, Active, No Diabetes, No prior CVD
   * Expected Result: Low CAD Risk ($< 15\%$)
2. **High Risk / Impending MI**:
   * HR: 105 BPM | BP: 158/98 mmHg | HRV: 15 ms | ST Segment: +0.22 mV (ST Elevation) | Stress: 82
   * Profile: Current smoker, Sedentary, Diabetes, Prior CVD
   * Expected Result: Critical CAD Risk ($> 75\%$, High ST Ischemic Contribution)
3. **Stage 2 Hypertension**:
   * HR: 82 BPM | BP: 165/102 mmHg | HRV: 28 ms | ST Segment: 0.0 mV | Stress: 55
   * Profile: Former smoker, Moderate activity, Hypertension history
   * Expected Result: Moderate-to-High CAD Risk driven by BP
4. **Metabolic Syndrome**:
   * HR: 78 BPM | BP: 138/88 mmHg | HRV: 32 ms | ST Segment: 0.0 mV | Stress: 45
   * Lab Profile: TC 245 mg/dL, HDL 34 mg/dL, Triglycerides 220 mg/dL
   * Expected Result: Elevated ApoB & Atherogenic Risk
5. **Severe Autonomic Stress**:
   * HR: 95 BPM | BP: 134/86 mmHg | HRV: 18 ms | ST Segment: 0.0 mV | Stress: 88
   * Expected Result: High Autonomic Stress Contribution

---

## 6. Execution Loop & User Workflow

1. **Initialization (`App.tsx` & `usePipeline.ts`)**:
   * `usePipeline` hook mounts and initializes `sensorManager`.
   * `sensorManager` creates instances of `MockECGSource`, `MockPPGSource`, `MockBPSource`, `MockStressSource`.
2. **Sampling Tick (Every 1000 ms)**:
   * `sensorManager` fetches latest synthesized readings from all 4 sensors.
   * `extractFeatures` computes HR, HRV, ST, QTc, PPG morphology, and PPG-derived lipids.
   * `fuseFeatures` produces normalized 0–100 risk indices and confidence flags.
   * `calculatePTT` determines time lag between ECG R-wave and PPG pulse foot.
   * `estimateBPFromPTT` estimates continuous BP from PTT.
   * `scoreFromSnapshot` calculates master CAD risk score and WHO 10-year CVD risk band.
   * Data is dispatched to Zustand `simStore`.
3. **Reactive UI Rendering**:
   * `SweepWaveform` renders raw ECG/PPG buffers at 60 FPS on HTML5 Canvas.
   * `ArcGauge`, `VitalSigns`, `RiskTrend`, and `ContributionBreakdown` subscribe to `simStore` slices and re-render seamlessly.
4. **User Interactivity**:
   * User selects presets or adjusts sliders in `ControlPanel`.
   * Slider adjustments update `params` in `simStore`, instantly propagating to sensor sources.
   * User edits Patient Profile or Lab Inputs, immediately updating risk engine calculations on the next tick.

---

## 7. Technology Stack Summary

* **Frontend Framework**: React 19 (TypeScript)
* **Build Tooling**: Vite
* **State Management**: Zustand v5
* **Styling**: TailwindCSS v4 + Glassmorphic Custom Utilities (`src/style.css`)
* **Visualizations**: HTML5 Canvas API (Real-time waveforms) + Recharts / Custom SVG (Gauges & Trends)
* **Iconography**: Lucide React

# CAD Risk Simulator — Real-Time Biometric Monitoring & Risk Engine

A real-time, browser-native medical telemetry simulator and clinical risk monitoring system built with **React 19**, **TypeScript**, **Vite**, **Zustand**, and **TailwindCSS v4**.

The system continuously models raw sensor signals (ECG, PPG, BP, Stress, Accelerometer Motion) and patient clinical profiles, processing them through a multi-tier feature extraction and dual-fusion engine to compute real-time Coronary Artery Disease (CAD) risk metrics alongside population screening benchmarks.

---

## 1. Overview & Core Features

* **Real-Time Biometric Pipeline**: 60 FPS Canvas sweep rendering for ECG and PPG Lead II waveforms with continuous 1 Hz pipeline evaluation.
* **Clinically Grounded Scoring**: Combines **INTERHEART Study** weighted risk factors (*Lancet 2004*) with **WHO 2019 South Asia Non-Laboratory CVD Risk Charts** (*Lancet Glob Health 2019*).
* **Sensor-Independent Patient Profile**: Captures structured demographics (Age, Sex, Ethnicity, BMI), habits (Smoking, Activity, Diet), medical history (Diabetes, Family CAD, CVD), and symptoms alongside lab parameters.
* **Cuffless Blood Pressure & PTT Engine**: Derives continuous arterial pressure via Pulse Transit Time ($\Delta t$) between ECG R-waves and PPG pulse arrival using Moens-Korteweg vascular mechanics.
* **Non-Invasive PPG Lipid Estimation & ApoB Panel**: Estimates Total Cholesterol and Triglycerides from optical arterial stiffness indices (Augmentation, Reflection, Stiffness indices) and calculates Apolipoprotein B (ApoB) via Sniderman regression.
* **Hardware Abstraction Layer (HAL)**: Pluggable `ISensorSource` seam allowing seamless transition from simulated mathematical generators to physical BLE hardware (e.g. ESP32 / MAX30102).

---

## 2. System Architecture & 7-Row Dual Fusion Engine

The processing pipeline is orchestrated client-side without backend dependencies, transforming raw input signals and patient parameters through 7 distinct processing rows:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│  Row 1 — Patient Profile Input Layer (Sensor-Independent)                                   │
│  · Structured Clinical Profile: Demographics, Habits/Lifestyle, Medical History, Symptoms   │
│  · Lab Report Panel: Total Cholesterol, HDL, Triglycerides, ApoB, Lp(a), ApoA1 (planned)    │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │
┌──────────────────────────────────────────────▼──────────────────────────────────────────────┐
│  Row 2 — Hardware Abstraction Layer (HAL)                                                   │
│  ISensorSource contract; Mock instances for ECG, PPG, Blood Pressure, Stress, Motion        │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │
┌──────────────────────────────────────────────▼──────────────────────────────────────────────┐
│  Row 3 — Sensor Manager                                                                     │
│  Frame buffering, waveform windowing, signal sync, and sampling rates (100 Hz PPG / ECG)   │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │
┌──────────────────────────────────────────────▼──────────────────────────────────────────────┐
│  Row 4 — Feature Extraction Engine                                                          │
│  · ECG Branch: Heart Rate (BPM), ST Segment Elevation/Depression (mV), QTc Bazett (ms)       │
│  · PPG Branch: HRV RMSSD, PTT Timing, Vascular Indices (RI, SI, AIx) → Est. TC & TG        │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │
┌──────────────────────────────────────────────▼──────────────────────────────────────────────┐
│  Row 5 — Multi-Sensor Dual Fusion Engine (Parallel Independent Logic)                        │
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
│  Row 6 — Clinical Risk Engine Layer                                                         │
│  · Internal CAD Risk Score (0–100): INTERHEART weighted sum (HR, HRV, Stress, QTc, ST,     │
│    compositeMetabolicScore)                                                                 │
│  · Parallel Reference: WHO 2019 South-Asia 10-Year CVD Risk Band (Age, Sex, SBP, Smoking,   │
│    BMI)                                                                                     │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │
┌──────────────────────────────────────────────▼──────────────────────────────────────────────┐
│  Row 7 — Live Dashboard & Control UI                                                        │
│  Canvas Waveforms, Readout Cards with Reference Ranges, Radial Risk Gauge, WHO Card,        │
│  Contributions Breakdown, Trend Sparkline, In-App Documentation Panel                       │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Architectural Rationale & Key Concepts

1. **Sensor-Independent Patient Profile Layer**: Patient demographics, lifestyle habits, medical history, active symptoms, and lab baseline entries operate independently of raw continuous sensor telemetry. These provide stable clinical context for screening benchmarks and biomarker regression calculations.
2. **Dual Fusion Mechanisms (Correlation vs Divergence)**:
   * **Cardiac / Motion Fusion (Correlation-Based)**: ECG/PPG cardiac signals and Accelerometer Motion signals arise from physically distinct physical channels. High cross-correlation between movement spikes and optical noise triggers motion artifact flags and dampens reading confidence.
   * **Metabolic-Vascular Fusion (Two-Tier Divergence-Based)**: Cuffless BP, PPG Total Cholesterol, and PPG Triglycerides all share a common root optical pulse waveform. Applying correlation between them would risk amplifying systemic optical artifacts. Instead, Tier 1 combines optical features into a `PPGVascularIndex`, while Tier 2 uses ApoB — a non-sensor, lab-measured independent anchor — to perform a divergence check and generate the `compositeMetabolicScore`.
3. **WHO 10-Year CVD Risk Band**: The WHO 2019 South-Asia Non-Laboratory Risk Band is derived directly from Patient Profile variables (age, sex, systolic BP, smoking, BMI). It is displayed alongside (not merged into) the internal composite CAD Risk Score to maintain clear separation between population screening benchmarks and continuous biometric risk scoring.
4. **Honesty & Implementation Status**: All components shown in the diagram correspond to live code within `src/`, except the **ApoA1** lab report input field, which is explicitly designated as **planned** for a future update pass.

---

## 3. Hardware Abstraction Layer & Pluggable Sensors

Hardware agnosticism is maintained through the `ISensorSource` interface (`src/hal/ISensorSource.ts`):

```typescript
export interface ISensorSource {
  readonly type: SensorType; // 'ecg' | 'ppg' | 'bp' | 'stress'
  init(): Promise<void>;
  read(): Promise<SensorReading>;
  getStatus(): SensorStatus;
}
```

* **Mock Sensor Implementations**: `MockECGSource`, `MockPPGSource`, `MockBPSource`, and `MockStressSource` delegate to pure mathematical waveform generators in `src/hal/generators/`.
* **Hardware Transition Seam**: Replacing mock sources with physical BLE hardware (e.g. ESP32, MAX30102 optical sensor, AD8232 ECG) requires writing a `BLESensorSource` implementing `ISensorSource` — zero changes are required in feature extraction, fusion, risk scoring, state management, or UI components.

---

## 4. Getting Started

### Prerequisites
* **Node.js**: v18.0.0 or higher
* **npm**: v9.0.0 or higher

### Installation & Local Run

```bash
# Navigate to application directory
cd cad-risk-simulator

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

Open your browser at `http://localhost:5173` to view the live dashboard.

---

## 5. System Roadmap

- [x] Real-time ECG, PPG, BP, and Stress waveform generators
- [x] Hardware Abstraction Layer (HAL) seam
- [x] Cuffless BP estimation via Pulse Transit Time (PTT)
- [x] Non-invasive PPG lipid estimation (Total Cholesterol & Triglycerides)
- [x] ApoB calculation via Sniderman non-HDL regression
- [x] Patient Profile input panel (Demographics, Habits, History, Symptoms)
- [x] WHO 2019 South-Asia non-laboratory CVD risk chart integration
- [x] Two-tier Metabolic-Vascular Fusion engine (PPGVascularIndex + ApoB divergence)
- [x] In-app rendered 7-row architecture diagram & documentation panel
- [ ] ApoA1 lab report entry field & ApoB/ApoA1 risk ratio scoring *(Planned)*
- [ ] Physical BLE sensor integration (ESP32 / MAX30102 / AD8232) *(Phase 2)*

---

## 6. Disclaimer

> **Educational & Research Simulation Only**: The CAD Risk Simulator is a technical demonstration of real-time multi-sensor telemetry processing, non-invasive biomarker estimation models, and clinical risk algorithms. It is **not** a clinical diagnostic tool and must **not** be used for clinical decision-making or patient diagnosis.

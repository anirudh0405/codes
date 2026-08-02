# CAD Risk Simulator — Complete Technical & Demo Document

> **For:** Senior Demo Presentation
> **Project:** CAD (Coronary Artery Disease) Risk Monitor
> **Stack:** React 19 + TypeScript + Vite + Zustand + TailwindCSS v4
> **Status:** Phase 1 — Fully Simulated (Phase 2 seam: real BLE hardware)

---

## 1. What Is This Project?

The **CAD Risk Simulator** is a real-time, browser-based medical monitoring dashboard that continuously estimates a patient's **Coronary Artery Disease risk** from multi-sensor physiological signals. It runs 100% in the browser — no backend, no server — and simulates a full clinical-grade sensor pipeline from raw waveform generation all the way through to a composite risk score on a live dashboard.

### Core Goals

| Goal | What was built |
|---|---|
| End-to-end sensor-to-risk pipeline | 7-layer architecture: Generator → HAL → Feature Extraction → Fusion → Risk Engine → Store → Dashboard |
| Clinically grounded risk scoring | INTERHEART study weights (Lancet 2004) + WHO 2019 South Asia non-lab CVD risk chart |
| Live browser visualization | Live waveforms, animated gauges, real-time score every ~1 second |
| Hardware swap-in ready | Every sensor source is behind ISensorSource interface — swap mock for real BLE with zero other code changes |

---

## 2. High-Level Architecture (7 Layers)

```
+------------------------------------------------------------------------------+
|  Layer 1 - Waveform Generators  (src/hal/generators/)                        |
|  Pure math: ECG P-QRS-T, PPG morphology, BP noise, Stress/EDA proxy         |
+------------------------------------------------------------------------------+
|  Layer 2 - Hardware Abstraction Layer  (src/hal/)                            |
|  ISensorSource interface + Mock classes (ECG, PPG, BP, Stress)               |
|  Phase 2 swap: replace Mock* with BLESensorSource - no other code changes    |
+------------------------------------------------------------------------------+
|  Layer 3 - Feature Extraction  (src/features/)                               |
|  HR, HRV, QTc Bazett, ST segment, PTT, lipid estimates from PPG morphology  |
+------------------------------------------------------------------------------+
|  Layer 4 - Sensor Fusion  (src/fusion/)                                      |
|  Normalizes features to 0-100 risk indices; cross-sensor artifact detection  |
+------------------------------------------------------------------------------+
|  Layer 5 - CAD Risk Engine  (src/riskEngine/)                                |
|  INTERHEART weighted composite score 0-100 + WHO 10-year CVD risk band       |
+------------------------------------------------------------------------------+
|  Layer 6 - Global State Store  (src/store/simStore.ts - Zustand)             |
|  Single source of truth; pipeline WRITES, Dashboard READS                    |
+------------------------------------------------------------------------------+
|  Layer 7 - Dashboard UI  (src/App.tsx + src/components/)                     |
|  React: waveforms, vitals cards, arc gauge, Patient Profile panel            |
+------------------------------------------------------------------------------+
```

Orchestrated by `usePipeline.ts` — a single React hook that chains all 7 layers each tick and writes results to Zustand for the dashboard to read.

---

## 3. Layer-by-Layer Deep Dive

### Layer 1 — Waveform Generators (src/hal/generators/)

Pure mathematical functions. No React, no state, no I/O.

| Generator | Output |
|---|---|
| ecgGenerator.ts | Synthetic P-QRS-T at given HR, ST elevation, QT interval |
| ppgGenerator.ts | PPG pulse with reflection index, stiffness index, augmentation index |
| bpGenerator.ts | Systolic/diastolic with physiological noise and pulse pressure |
| stressGenerator.ts | Stress score, HRV proxy, EDA galvanic skin response proxy |

**Design rule:** Generators are the only place where numbers are invented. Everything above them is deterministic transformation.

---

### Layer 2 — Hardware Abstraction Layer (src/hal/)

`ISensorSource.ts` defines the contract:
```typescript
interface ISensorSource {
  readonly type: SensorType;     // 'ecg' | 'ppg' | 'bp' | 'stress'
  init(): Promise<void>;
  read(): Promise<SensorReading>;
  getStatus(): SensorStatus;     // 'simulated' | 'connected' | 'error'
}
```

`MockSensorSources.ts` implements four classes that delegate to generators. Each has `setParams(MockParams)` so slider values flow directly into waveform math.

> **Phase 2:** Replace `Mock*` classes with `BLESensorSource` for ESP32/MAX30102 hardware. Zero other code changes needed.

---

### Layer 3 — Feature Extraction (src/features/)

| File | Features |
|---|---|
| index.ts | HR, QTc Bazett, ST segment (mV), RR interval, HRV RMSSD, PTT, pulse morphology |
| lipidEstimation.ts | TC + TG from PPG morphology (reflection/stiffness/augmentation indices) |
| apoBCalculation.ts | ApoB via Sniderman regression; LDL via Friedewald equation |
| pulseTransitTime.ts | PTT from ECG R-wave to PPG pulse foot timing |
| bpFromPTT.ts | Cuffless BP from PTT via Moens-Korteweg vascular model |

---

### Layer 4 — Sensor Fusion (src/fusion/index.ts)

1. **Priority merging** — ECG HR preferred over PPG HR; fallback defaults if sensor absent
2. **Min-max normalization** to 0-100 risk indices per parameter:

| Parameter | Low risk (index 0-20) | High risk (index 80-100) |
|---|---|---|
| Heart Rate | 60-100 bpm | >150 tachycardia / <40 bradycardia |
| Blood Pressure | <120 mmHg SBP | >=180 hypertensive crisis |
| HRV RMSSD | >80 ms | <20 ms |
| QTc Bazett | <440 ms | >500 ms |
| ST Segment | <0.05 mV | >0.2 mV |

3. **Motion artifact detection:** if stress > 60 AND HRV < 25 ms → `motionArtifactFlag = true` → lipid confidence dampened
4. **Confidence:** `presentSensors / 4`

---

### Layer 5 — CAD Risk Engine (src/riskEngine/)

#### INTERHEART Composite Score (0-100)

Weighted sum of 10 parameter sub-scores. Weights from INTERHEART study (Yusuf et al., Lancet 2004):

| Factor | Weight | INTERHEART PAR% | Odds Ratio |
|---|---|---|---|
| ApoB | **0.22** | 49.2% | 3.25 |
| Blood Pressure | **0.22** | 17.9% | 2.48 |
| Smoking | **0.16** | 35.7% | 2.87 |
| Psychosocial Stress | **0.12** | 28.8% | 2.67 |
| Heart Rate | 0.08 | — | — |
| HRV | 0.06 | — | — |
| QT Interval | 0.05 | — | — |
| ST Segment | 0.05 | — | — |
| Total Cholesterol (PPG est.) | 0.02 | — | — |
| Triglycerides (PPG est.) | 0.02 | — | — |

**Risk bands:** 0-34 = Low (blue) | 35-64 = Moderate (amber) | 65-100 = High (red)

**Patient profile modifiers:**
- hypertensionHistory = true → BP sub-score +15 points
- smoking = 'current' → Smoking sub-score = 90
- smoking = 'former' → Smoking sub-score = 40

#### WHO 10-Year CVD Risk Band (src/riskEngine/whoRiskChart.ts)

WHO 2019 non-laboratory South Asia chart (Lancet Glob Health 2019; 7:e1332-45). Points-based lookup:

| Factor | Points |
|---|---|
| Age 40-44 / 45-49 / 50-54 / 55-59 / 60-64 / 65-69 / 70+ | 1 / 2 / 3 / 4 / 5 / 6 / 7 |
| Male sex | +1 |
| Current smoker | +3 |
| SBP 120-139 / 140-159 / 160-179 / >=180 | +1 / +2 / +4 / +6 |
| BMI 25-29.9 / >=30 | +1 / +2 |

Output bands: <4pts = <10% Low | 4-6 = 10-<20% Low-Moderate | 7-9 = 20-<30% Moderate-High | >=10 = >=30% High

---

### Layer 6 — Global State Store (src/store/simStore.ts)

Zustand v5 — only subscribed slices re-render (unlike React Context).

Key state: `params`, `patientProfile`, `snapshot`, `riskResult`, `ecgBuffer` (300pts), `ppgBuffer` (150pts), `riskTrend` (60 samples), `labInputs`, `apoBPanel`, `bpMode`, `activeProfile`, `selectedCategory`.

`updatePipelineData()` writes all pipeline results atomically in one `set()` call.

---

### Layer 7 — Dashboard UI

#### Layout
```
+----------------+----------------------+-----------------+
| LEFT COLUMN    |   CENTER COLUMN      |  RIGHT COLUMN   |
|                |                      |                 |
| Patient        |  ECG Waveform        |  CAD Risk Gauge |
| Profile        |  (live canvas)       |  (270-deg arc)  |
| Panel          +----------------------+                 |
|                |  PPG Waveform        |  WHO Risk Band  |
| Parameters     |  (live canvas)       |  Card           |
| Sliders        +----------------------+                 |
|                |  BP | Stress | HRV   |  Contributions  |
|                +----------------------+  (10 bars)      |
|                |  TC | TG | ApoB     |                 |
|                |  Lipid Estimates     |  Vitals Panel   |
+----------------+----------------------+-----------------+
              Risk Trend Sparkline (full width)
```

#### Top Bar
- Live pulsing dot + "CAD (Coronary Artery Disease) Monitor"
- Grouped preset selector: Healthy / CAD category tabs + scenario buttons
- Live risk score (color-coded) + clock

#### Patient Profile Panel — 4 accordion sections
1. **Demographics:** Age range, Sex (M/F toggle), Ethnicity, Height/Weight, computed BMI
2. **Habits & Lifestyle:** Smoking, Activity, Diet risk
3. **Medical History:** Diabetes, Family CAD history, Prior CVD, HTN, Statin — all toggles
4. **Symptoms:** Chest pain type, Dyspnea, Fatigue, Palpitations

#### Lipid Cards
- Total Cholesterol (est.) + Triglycerides (est.) from PPG morphology
- ApoB (est.) = 0.65 × Non-HDL-C + 6.3; also shows LDL (Friedewald) and Non-HDL-C
- Motion artifact → confidence indicator turns amber

#### PTT-derived BP Toggle
Click "PTT-derived" label on BP card to switch between optical PTT estimation and manual slider.

---

## 4. Scenario Presets

Two categories, 7 presets. Each sets BOTH sensor params AND Patient Profile simultaneously.

### Healthy
| Preset | Key params |
|---|---|
| Healthy — Baseline | HR 68, SBP 115, HRV 70, Stress 20, ST 0.0, QT 395 — Non-smoker, active |
| Active / Post-Exercise | HR 110, SBP 148, HRV 25, Stress 40 — Transient physiological elevation |

### CAD
| Preset | Risk drivers |
|---|---|
| Borderline Hypertensive | SBP 142, HRV 38, Stress 45; family CAD + diagnosed HTN |
| High Stress / Low HRV | HR 96, HRV 18, Stress 82; former smoker, sedentary |
| Cardiac Concern | SBP 158, HRV 14, ST 0.22, QT 510; diabetes + current smoker |
| Smoker + Sedentary | SBP 146, Stress 70; current smoker, dyspnea |
| Diabetic + Hypertensive | SBP 154, Female 60-69; diabetes + statin + HTN |
| Post-MI Recovery | SBP 124, HRV 45; prior CVD, statin, former smoker — near-normal vitals |

---

## 5. ApoB Calculation

ApoB = #1 INTERHEART factor (PAR 49.2%, OR 3.25).

```
Non-HDL-C = Total Cholesterol - HDL
ApoB (mg/dL) = 0.65 x Non-HDL-C + 6.3        [Sniderman et al., JAMA 2012]
LDL = TC - HDL - (TG / 5)                       [Friedewald 1972, invalid if TG > 400]
```

Thresholds: ApoB <80 = Near-Optimal | 80-99 = Borderline (amber) | >=100 = Elevated (red)

Triglycerides pre-fills from PPG estimate; manual edit locks it (shows pencil icon), reset button available.

---

## 6. Cuffless BP from PTT

PTT = ECG R-wave to PPG pulse foot time delay. Shorter PTT = stiffer arteries = higher BP.

```
Systolic BP = calibration_intercept - k x PTT   [Moens-Korteweg model]
```

Motion-aware: if motionArtifactFlag, blends with previous stable PTT estimate.

---

## 7. Technical Stack

| Technology | Role | Version |
|---|---|---|
| React | UI framework | 19.2 |
| TypeScript | Language | ~6.0 |
| Vite | Build + dev server | 8.1 |
| Zustand | Global state | 5.0 |
| TailwindCSS v4 | Layout utilities | 4.3 |
| Framer Motion | Number/score animations | 12.42 |
| Canvas 2D API | Live waveform rendering | Browser native |
| SVG | Arc gauge + sparkline | Inline SVG |

100% browser. No backend, no database, no network calls at runtime.

---

## 8. Design System

Black minimalist professional monitoring aesthetic — inspired by Philips IntelliVue / GE CARESCAPE.

### Color Tokens
```
--bg:              #0A0A0B   (page background)
--surface:         #141416   (card/panel)
--border:          #26272A   (borders, dividers)
--accent:          #4A9DFF   (interactive + Low risk)
--alert-amber:     #D8A13B   (Moderate risk)
--alert-red:       #D9534F   (High risk / critical)
--text-primary:    #EDEDEF   (readable text)
--text-secondary:  #8A8B90   (labels)
--text-tertiary:   #55565B   (de-emphasized)
```

Rules: No gradients, no shadows, no glow, no pure white, no new colors, Inter font only, 8px border-radius uniformly.

---

## 9. One Tick — Full Data Flow

```
1. SensorManager polls ECG + PPG + BP + Stress in parallel (~1Hz)
2. Feature Extraction (pure functions) → HR, QTc, ST, HRV, PTT, lipid estimates
3. Sensor Fusion → motionArtifactFlag check → normalize to 0-100 indices → PhysiologicalSnapshot
4. PTT Pipeline → calculatePTT() → estimateBPFromPTT() → apply if bpMode === 'ptt'
5. Risk Engine → 10 sub-scores → patient profile modifiers → weighted sum → WHO chart lookup
6. Store write (atomic) → snapshot + riskResult + buffers + trend updated together
7. Dashboard renders → only subscribed slices re-render → canvas redraws → gauge animates
```

---

## 10. Phase 2 Hardware Plan

| Signal | Hardware | Protocol |
|---|---|---|
| ECG | ADS1292 + ESP32 | BLE GATT custom characteristic |
| PPG / SpO2 | MAX30102 on ESP32 | BLE GATT custom characteristic |
| BP (cuffless) | ECG+PPG PTT — already in pipeline | Same code path |
| Stress / EDA | Empatica E4 or Grove GSR | BLE GATT |

Steps: (1) Create BLESensorSource implementing ISensorSource. (2) SensorManager detects BLE + swaps at runtime. (3) Zero changes elsewhere.

---

## 11. Demo Talking Points

**Risk engine demo:**
- Start on Healthy Baseline → score ~20, Low, blue gauge
- Switch to Cardiac Concern → score jumps to ~75, High, red
- Watch Contributions: ST and QT bars go red, BP amber
- WHO band: 60-69 male smoker elevated SBP → >=30% High

**ApoB panel:**
- Set TC=240, HDL=35 → ApoB jumps to Elevated (red)
- Edit Triglycerides manually → see pencil lock indicator
- Click reset → resumes PPG auto-sync

**Motion artifact:**
- Set Stress=85, HRV=15 simultaneously
- Lipid cards turn amber: "Low confidence — motion detected"
- Contributions panel shows dampened lipid bars

**PTT-derived BP:**
- Click "PTT-derived" label → toggles to Manual override
- Compare PTT optical estimate vs. slider ground truth
- PTT ms readout visible in right Vitals panel

**Patient Profile:**
- Change Age to 70+, toggle Diabetes ON, set Smoking to Current
- Risk score climbs across ticks
- WHO band updates: +7 (age) +1 (male) +3 (smoker) = >=10pts → >=30% High

---

## 12. File Structure Reference

```
src/
+-- App.tsx                          Main layout + inline dashboard components
+-- style.css                        Design token definitions + global resets
|
+-- hal/                             Layer 2: Hardware Abstraction
|   +-- ISensorSource.ts             Interface contract (Phase 2 swap point)
|   +-- MockSensorSources.ts         4 mock sensors delegating to generators
|   +-- generators/                  Layer 1: Waveform generators
|       +-- ecgGenerator.ts
|       +-- ppgGenerator.ts
|       +-- bpGenerator.ts
|       +-- stressGenerator.ts
|
+-- features/                        Layer 3: Feature Extraction
|   +-- index.ts                     extractFeatures(), calculatePTT(), estimateBPFromPTT()
|   +-- lipidEstimation.ts           PPG morphology -> TC + TG estimates
|   +-- apoBCalculation.ts           ApoB (Sniderman), LDL (Friedewald), Non-HDL
|   +-- pulseTransitTime.ts          ECG+PPG timing -> PTT ms
|   +-- bpFromPTT.ts                 PTT -> BP (Moens-Korteweg)
|
+-- fusion/
|   +-- index.ts                     Layer 4: fuseFeatures() -> PhysiologicalSnapshot
|
+-- riskEngine/
|   +-- index.ts                     Layer 5: scoreFromSnapshot() + INTERHEART weights
|   +-- whoRiskChart.ts              WHO 2019 South Asia non-lab CVD chart lookup
|
+-- store/
|   +-- simStore.ts                  Layer 6: Zustand global state
|
+-- sensorManager/                   Polling loop + subscriber pattern
+-- hooks/
|   +-- usePipeline.ts               Orchestrator: wires all 7 layers each tick
|
+-- presets/
|   +-- index.ts                     7 scenario presets (Healthy + CAD categories)
|
+-- components/
    +-- Dashboard/
    |   +-- PatientProfilePanel.tsx  4-section collapsible accordion form
    |   +-- ApoBCard.tsx             ApoB / LDL / Non-HDL display card
    |   +-- RiskGauge.tsx            270-deg arc gauge
    |   +-- VitalSigns.tsx           HR, BP, HRV, Stress, QTc, ST cards
    |   +-- SensorStatus.tsx         Per-sensor status grid
    |   +-- ContributionBreakdown.tsx 10-bar contribution chart
    +-- ui/
        +-- AnimatedButton.tsx       Framer Motion press-scale button
        +-- AnimatedNumber.tsx       Smooth counting number transition
```

---

## 13. References

| Reference | Used for |
|---|---|
| Yusuf et al., Lancet 2004 — INTERHEART Study | Scoring weights (PAR%, OR per factor) |
| WHO CVD Risk Chart Working Group, Lancet Glob Health 2019;7:e1332-45 | WHO 10-year CVD non-lab South Asia chart |
| Sniderman et al., JAMA Intern Med 2012;172(10):761-763 | ApoB = 0.65 x Non-HDL-C + 6.3 |
| Friedewald et al., Clin Chem 1972;18(6):499-502 | LDL = TC - HDL - TG/5 |
| AHA/ACC 2018 Cholesterol Guidelines | TC / LDL risk thresholds |
| ATP III / NCEP Guidelines | TG classification (<150, 150-199, 200-499, >=500) |
| Moens-Korteweg equation | Cuffless BP from PTT (arterial stiffness model) |

---

> **Disclaimer:** Research and educational simulation only. Not a medical device. Does not produce clinical diagnoses. All sensor data is simulated; risk scores illustrate the computational model only.

---

## 14. Glossary & Full Forms (Complete Abbreviation Reference)

Below is the complete reference of all abbreviations, acronyms, and technical medical/software terms used across the codebase, UI, and documentation.

### A. Medical & Clinical Terms
- **CAD**: Coronary Artery Disease
- **CVD**: Cardiovascular Disease
- **MI**: Myocardial Infarction ("Heart Attack")
- **ECG / EKG**: Electrocardiogram / Electrocardiography
- **PPG**: Photoplethysmogram / Photoplethysmography
- **BP**: Blood Pressure
- **SBP**: Systolic Blood Pressure
- **DBP**: Diastolic Blood Pressure
- **MAP**: Mean Arterial Pressure
- **HR**: Heart Rate
- **BPM**: Beats Per Minute
- **HRV**: Heart Rate Variability
- **RMSSD**: Root Mean Square of Successive Differences (standard temporal metric for HRV)
- **PTT**: Pulse Transit Time
- **ApoB**: Apolipoprotein B
- **ApoA1**: Apolipoprotein A1
- **TC**: Total Cholesterol
- **TG / Trigs**: Triglycerides
- **HDL / HDL-C**: High-Density Lipoprotein (Cholesterol) — "Good Cholesterol"
- **LDL / LDL-C**: Low-Density Lipoprotein (Cholesterol) — "Bad Cholesterol"
- **VLDL / VLDL-C**: Very Low-Density Lipoprotein (Cholesterol)
- **Non-HDL-C**: Non-High-Density Lipoprotein Cholesterol (Total Cholesterol − HDL)
- **QT / QTc**: QT Interval / Corrected QT Interval (calculated via Bazett's Formula)
- **ST Segment**: Segment between S wave and T wave on ECG (ST Elevation / Depression)
- **QRS**: QRS Complex (electrocardiographic representation of ventricular depolarization)
- **RR Interval**: Time interval between consecutive R waves on an ECG
- **EDA**: Electrodermal Activity
- **GSR**: Galvanic Skin Response
- **BMI**: Body Mass Index ($\text{weight in kg} / \text{height in m}^2$)
- **HTN**: Hypertension
- **WHO**: World Health Organization
- **AHA**: American Heart Association
- **ACC**: American College of Cardiology
- **INTERHEART**: A Study of Risk Factors for First Myocardial Infarction (Lancet 2004)
- **NCEP**: National Cholesterol Education Program
- **ATP III**: Adult Treatment Panel III
- **PAR / PAR%**: Population Attributable Risk (Percentage)
- **OR**: Odds Ratio

### B. Hardware & Embedded Systems Terms
- **BLE**: Bluetooth Low Energy
- **HAL**: Hardware Abstraction Layer
- **GATT**: Generic Attribute Profile (BLE data protocol)
- **I²C / I2C**: Inter-Integrated Circuit (serial communication bus)
- **ESP32**: Espressif 32-bit Wi-Fi & Bluetooth Microcontroller
- **ADS1292**: Analog Devices / TI 2-Channel 24-Bit ECG Analog Front-End
- **MAX30102**: Maxim Integrated High-Sensitivity Pulse Oximeter & Heart-Rate Sensor Module

### C. Software, Web & Design System Terms
- **UI**: User Interface
- **API**: Application Programming Interface
- **DOM**: Document Object Model
- **SVG**: Scalable Vector Graphics
- **JSON**: JavaScript Object Notation
- **CSS**: Cascading Style Sheets
- **HTML**: HyperText Markup Language
- **TS**: TypeScript
- **TSX**: TypeScript XML (React component file format)
- **Vite**: Next-Generation Frontend Tooling / Dev Server
- **Zustand**: German for "State" (Lightweight React state management library)

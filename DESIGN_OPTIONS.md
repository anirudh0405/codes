# CAD/CVD Cardiovascular Risk Simulator
## Design & UI Specification Reference Document

> **DOCUMENT TYPE:** Design / UI Reference Specification Only  
> **TARGET AUDIENCE:** Frontend Developers / UI Designers customizing a purchased dashboard template  
> **SCOPE & CONSTRAINTS:** This document is strictly a visual and structural UI reference. It contains NO code implementation, state modifications, or formula changes. All formulas, sensor generators, fusion pipelines, routing, Zustand stores, and CNN logic in the existing codebase remain untouched and preserved.

---

## 1. Product Overview

- **Product Name:** `CAD/CVD Cardiovascular Risk Simulator`
- **Subtitle / Tagline:** `Cardiovascular Risk Simulation Platform`
- **Product Purpose:** A browser-based research and educational cardiovascular simulation platform that displays simulated physiological signals, laboratory values, imaging findings, patient profiles, cardiovascular risk indicators, and scenario-specific multi-layer analysis.
- **Mandatory Product Badge / Label:**
  ```text
  [ Research / Educational Simulator ]
  ```
- **Regulatory & Clinical Notice:**  
  > ⚠️ **IMPORTANT NOTICE:** This platform is strictly a **Research / Educational Simulator**. It is **NOT** a clinical diagnostic system, medical device, or clinical decision support software. It does not provide medical diagnoses, treatment advice, or clinical prescriptions.

---

## 2. Global Design System & Aesthetics

### 2.1 Aesthetic Archetype
- **Look & Feel:** Modern medical technology research workstation / clinical informatics cockpit.
- **Tone:** Professional, analytical, clean, high-density yet readable, uncluttered.
- **Design Philosophy:** **Data → Interpretation → Visualization → Action**. Data remains the central visual priority at all times.
- **Decorative Restraint:** Avoid excessive decorative gradients, skeuomorphism, floating ambient blurs, or distracting consumer-app gamification.

### 2.2 Color Palette & Semantic Tokens

| Role | Color Name | Hex Code (Light / Dark) | Usage / Meaning |
| :--- | :--- | :--- | :--- |
| **Primary Base** | Navy / Slate Blue | `#1E293B` / `#0F172A` | Backgrounds, sidebar base, main navigation |
| **Primary Accent** | Clinical Blue | `#2563EB` / `#3B82F6` | Primary buttons, active tabs, highlights, links |
| **Surface / Card** | Pure / Slate Surface | `#FFFFFF` / `#1E293B` | Rounded cards, panels, modal sheets |
| **Border / Divider** | Subtle Slate | `#E2E8F0` / `#334155` | Card borders, table grid lines, separators |
| **Critical / High Risk** | Medical Red | `#DC2626` / `#EF4444` | High risk scores, abnormal lab values, severe stenosis |
| **Warning / Moderate** | Amber / Orange | `#D97706` / `#F59E0B` | Moderate risk, borderline parameters, cautions |
| **Normal / Optimal** | Clinical Green | `#16A34A` / `#22C55E` | Normal reference ranges, low risk, optimal vitals |
| **Neutral / Inactive** | Muted Slate Gray | `#64748B` / `#94A3B8` | Inactive controls, secondary text, reference limits |

### 2.3 Typography & Surface Styles
- **Font Stack:** Modern sans-serif (Inter, Roboto, or system UI font stack). Monospace font (JetBrains Mono / Roboto Mono) for lab numbers, coordinates, timestamps, and waveform readouts.
- **Card Geometry:** Rounded corners (`border-radius: 8px` to `12px`), subtle borders (`1px solid var(--border)`), soft elevation shadows.
- **Data Tables:** Compact row padding, distinct header rows with muted text, right-aligned numbers with explicit units, inline status badges.

---

## 3. Global Header

The persistent top header spans across all pages.

```
+-------------------------------------------------------------------------------------------------------+
| [Logo] CAD/CVD Risk Simulator       |  [Scenario: High CAD Risk ▼]   |  14:30:25  [Theme] [Upload Report] |
|        Cardiovascular Simulation    |  [Research/Educational Badge]  |           [Export Report] [Profile]|
+-------------------------------------------------------------------------------------------------------+
```

### 3.1 Header Layout & Elements

- **Left Section:**
  - Application Icon / Logo (Cardiovascular pulse / ECG hybrid glyph)
  - Title: `CAD/CVD Risk Simulator` (bold, 16px–18px)
  - Subtitle: `Cardiovascular Risk Simulation Platform` (11px–12px, muted)
- **Center Section:**
  - Currently Active Scenario indicator badge
  - Static Badge: `Research / Educational Simulator` (pill badge with subtle outline)
- **Right Section (Controls & Actions):**
  - Live Real-time Clock display (`HH:mm:ss`)
  - Theme Toggle Button (`[☀️ Light / 🌙 Dark]`)
  - `[Upload Report]` Primary Action Button (supports drag-and-drop / file picker for PDF, JPG, JPEG, PNG)
  - `[Export Report]` Secondary Action Button (triggers export menu)
  - User / Profile Avatar Icon

---

## 4. Left Sidebar Navigation

Collapsible vertical sidebar providing instant access to all 12 simulator views.

### 4.1 Navigation Items

| # | Item Label | Suggested Icon | Description |
| :- | :--- | :--- | :--- |
| 1 | **Dashboard** | `LayoutDashboard` | High-level risk cards, vitals, summary telemetry |
| 2 | **Live Waveforms** | `Activity` | Real-time multi-sensor streams (ECG, PPG, BP, EDA, Motion) |
| 3 | **Patient Profile** | `User` | Demographic data, clinical history, lifestyle parameters |
| 4 | **Lab Report** | `FileText` | Blood biomarker panels, lipid profiles, glycemic & inflammatory data |
| 5 | **Scenarios** | `Layers` | Scenario switcher across Healthy, CAD, and CVD categories |
| 6 | **EchoNext CNN** | `Cpu` / `Brain` | Neural network classification of 12-lead ECG signals |
| 7 | **Risk Engine** | `Sliders` | Multi-factor risk engine calculations & weight breakdown |
| 8 | **Fusion Layers** | `GitMerge` | Multi-modal signal processing & fusion pipeline status |
| 9 | **Healthy Tip** | `Sparkles` | Contextual lifestyle & cardiovascular wellness insights |
| 10 | **Sim Logs** | `Terminal` | Event stream, state transitions, runtime simulation telemetry |
| 11 | **History** | `History` | Previous run logs, scenario snapshots, comparative sessions |
| 12 | **Info** | `Info` | Platform documentation, educational guides, citations |

### 4.2 Sidebar States
- **Item States:** Default, Hover (`rgba(255,255,255,0.05)`), Active (solid primary accent background with left accent bar), Disabled (dimmed opacity 0.4).
- **Responsive Modes:**
  - **Desktop (≥1200px):** Expanded (Icon + Text label).
  - **Tablet (768px–1199px):** Collapsed to icon rail with tooltips on hover.
  - **Mobile (<768px):** Off-canvas slide-out drawer toggled by header hamburger menu.

---

## 5. Dashboard View

The primary cockpit displaying real-time cardiovascular telemetry and composite risk scores.

### 5.1 Top-Level KPI Summary Cards

```
+------------------+------------------+------------------+------------------+------------------+
| CURRENT RISK     | HEART RATE       | BLOOD PRESSURE   | HRV RMSSD        | CAD RISK SCORE   |
| 78               | 82 bpm           | 152 / 96 mmHg    | 24 ms            | 78%              |
| [ High Risk ]    | Normal Sinus     | Stage 2 HTN      | Reduced HRV      | High Burden      |
+------------------+------------------+------------------+------------------+------------------+
```

> *Note: Numerical values above are illustrative design mock data.*

### 5.2 Dashboard Layout Grid (3-Column Desktop)
- **Column 1 (Left - 35%):** Patient Snapshot Card, Vitals Panel, Key Findings Bullet Card.
- **Column 2 (Center - 40%):** Primary Risk Gauge (Circular visualization), INTERHEART Risk Contribution Bars, Risk Trend History Chart.
- **Column 3 (Right - 25%):** Mini Waveform Previews (ECG Lead II & PPG), EchoNext CNN Status Card, Recommended Actions Checklist.

---

## 6. Patient Profile View

Comprehensive demographic, biometric, and clinical background panel.

### 6.1 Data Fields & Form Inputs

| Field Group | Field Name | Input Type | Example Values / Options |
| :--- | :--- | :--- | :--- |
| **Demographics** | Patient Name | Text Input | `Mr. Rohan Kumar` |
| | Age | Number Input | `58` yrs |
| | Gender | Dropdown | `Male` \| `Female` \| `Other` |
| | Patient ID | Text (Readonly/Input)| `SIM-PAT-2026-089` |
| | Date of Birth | Date Picker | `1968-04-12` |
| | Phone Number | Text Input | `+1 (555) 019-2834` |
| **Biometrics** | Height | Number Input | `175` cm |
| | Weight | Number Input | `87.5` kg |
| | BMI | Calculated/Input | `28.6` kg/m² (Overweight badge) |
| **Clinical History** | Smoking Status | Dropdown | `Never` \| `Former` \| `Current` |
| | Diabetes Mellitus | Dropdown / Toggle | `No` \| `Yes` |
| | Family History | Dropdown / Toggle | `No` \| `Yes` |
| | Physical Activity | Dropdown | `Low` \| `Moderate` \| `High` |

### 6.2 Patient Profile Action Bar
- Buttons: `[ Edit Profile ]`, `[ Save Changes ]`, `[ Cancel ]`
- Embedded Upload Section: Dashed drag-and-drop zone for attaching medical records.

---

## 7. Scenario Selector

The scenario engine drives all simulated waveforms, biomarker anomalies, and risk shifts.

### 7.1 Category Tabs & Scenario Dropdowns

```
[  Healthy (3)  ]  [  CAD Scenarios (5)  ]  [  CVD Scenarios (5)  ]

Current Selection: [ Select Scenario: High CAD Risk                 ▼ ]
[ Apply Scenario ]  [ Reset to Baseline ]
```

### 7.2 Scenario Catalog Reference

| Category | Example Scenarios Supported by Simulator UI |
| :--- | :--- |
| **Healthy** | • Healthy Young Adult<br>• Healthy Adult<br>• Active / Athletic Adult |
| **CAD (Coronary Artery Disease)** | • Low CAD Risk<br>• Moderate CAD Risk<br>• High CAD Risk<br>• Obstructive CAD<br>• Severe / Multivessel CAD |
| **CVD (Cardiovascular Disease)** | • Ischemic Stroke<br>• Hemorrhagic Stroke<br>• Peripheral Artery Disease (PAD)<br>• Heart Failure (HFrEF/HFpEF)<br>• Atrial Fibrillation |

*Requirement: Existing application scenarios and state handlers must be strictly preserved.*

---

## 8. Report Upload Workflow

Provides three intuitive entry points for feeding external lab and imaging documents into the simulator.

### 8.1 Entry Points
1. **Global Header:** Persistent `[ Upload Report ]` button in the top navigation bar.
2. **Lab Report Page:** Full-width dashed drag-and-drop dropzone above the data table.
3. **Patient Profile Page:** Embedded dropzone within the document attachments card.

### 8.2 Supported File Formats & Drag-and-Drop Card
- **Allowed Formats:** `PDF (.pdf)`, `JPG / JPEG (.jpg, .jpeg)`, `PNG (.png)`
- **Dropzone Copy:**
  - Header: `"Upload Lab / Imaging Report"`
  - Subtext: `"Drag and drop your report here, or browse files (PDF, JPG, PNG up to 25MB)"`
- **Post-Upload Success State Card:**
  ```text
  [ PDF Icon ]  patient_rohan_lab_report.pdf
                Uploaded: 20 Sep 2026, 14:30 | 2.4 MB | Status: ✓ Parsed
  [ Clear ]  [ Replace File ]  [ Apply Report Values ]
  ```

---

## 9. Report Upload Slide-In Drawer / Panel

A dedicated right-side sliding drawer (`width: 380px` on desktop, full-width on mobile) allowing granular inspection and manual override of extracted report values before applying them to the simulator.

```
+----------------------------------------------+
| Uploaded Report Inspector                [X] |
+----------------------------------------------+
| REPORT PREVIEW                               |
| [ Thumbnail ]  lab_report_sept2026.pdf       |
| Status: [ ● Report Ready ]                   |
+----------------------------------------------+
| EXTRACTED BLOOD BIOMARKERS                   |
| Total Cholesterol: [ 268      ] mg/dL        |
| HDL Cholesterol:   [ 32       ] mg/dL        |
| LDL Cholesterol:   [ 188      ] mg/dL        |
| Triglycerides:     [ 220      ] mg/dL        |
| ApoB:              [ 156      ] mg/dL        |
| ApoB/ApoA1 Ratio:  [ 1.20     ]              |
| Lp(a):             [ 112      ] mg/dL        |
| hs-CRP:            [ 5.6      ] mg/L         |
| HbA1c:             [ 6.4      ] %            |
| Fasting Glucose:   [ 132      ] mg/dL        |
+----------------------------------------------+
| Behavior: Blank inputs keep existing values. |
| [ Apply Report Values ]      [ Clear All ]   |
+----------------------------------------------+
```

### 9.1 Behavioral Rules
- Empty input fields default to the current active simulation values (no data loss).
- Inputs display placeholders indicating current simulator values.
- UI explicitly clarifies: *"Extracted values are for simulation parameterization only."*

---

## 10. Imaging & CT Parameters

Visual UI inputs for Coronary Computed Tomography Angiography (CCTA) and calcium scoring.

### 10.1 Parameters & Dropdown Specifications

| Parameter | Unit / Input Type | Dropdown Options / Range | Example Value |
| :--- | :--- | :--- | :--- |
| **CAC Score** (Agatston) | Number Input | `0` to `5000+` Agatston Units | `620` (Severe) |
| **FAI** (Fat Attenuation Index)| Number Input | `-120` to `0` HU | `-92` HU |
| **Plaque Type** | Dropdown | `None` \| `Non-calcified` \| `Calcified` \| `Mixed` | `Mixed` |
| **Plaque Location** | Multi-Select Chips | `LAD` \| `RCA` \| `LCX` \| `Left Main` \| `Other` | `LAD`, `RCA`, `LCX` |
| **Stenosis Severity** | Dropdown | `None (0%)` \| `Mild (<50%)` \| `Moderate (50–70%)` \| `Severe (>70%)` | `>70%` |

- **Action Buttons:** `[ Apply Imaging Values ]`, `[ Reset to Scenario Default ]`

---

## 11. Vital Signs Telemetry

Standardized physiological telemetry tiles with unit labels and reference tags.

```
+-------------------+-------------------+-------------------+-------------------+-------------------+
| SYSTOLIC BP       | DIASTOLIC BP      | HEART RATE        | SpO2 OXYGEN       | BODY MASS INDEX   |
| 152 mmHg          | 96 mmHg           | 82 bpm            | 97 %              | 28.6 kg/m²        |
| [ High / Stage 2] | [ High / Stage 2] | [ Normal Resting] | [ Optimal ]       | [ Overweight ]    |
+-------------------+-------------------+-------------------+-------------------+-------------------+
```

---

## 12. Lab Report Page

A dedicated, comprehensive biomarker analysis table with reference ranges and status tags.

### 12.1 Blood Biomarker Table Specification

| Parameter | Current Value | Unit | Reference Range | Status Badge | Visual Flag |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Total Cholesterol** | `268` | mg/dL | `< 200` | `High` | 🔴 Red |
| **HDL Cholesterol** | `32` | mg/dL | `≥ 40` (M) / `≥ 50` (F) | `Low` | 🔴 Red |
| **LDL Cholesterol** | `188` | mg/dL | `< 100` (Optimal `< 70`) | `High` | 🔴 Red |
| **Triglycerides** | `220` | mg/dL | `< 150` | `High` | 🔴 Red |
| **Apolipoprotein B (ApoB)** | `156` | mg/dL | `< 90` | `High` | 🔴 Red |
| **ApoB / ApoA1 Ratio** | `1.20` | — | `< 0.60` | `High` | 🔴 Red |
| **Lipoprotein(a) [Lp(a)]** | `112` | mg/dL | `< 30` | `High` | 🔴 Red |
| **hs-CRP (High-sens. CRP)**| `5.6` | mg/L | `< 1.0` (Optimal) | `High` | 🔴 Red |
| **HbA1c** | `6.4` | % | `4.0 – 5.6` | `High` | 🟡 Amber |
| **Fasting Blood Glucose** | `132` | mg/dL | `70 – 99` | `High` | 🟡 Amber |

### 12.2 Page Controls
- Top Bar: `[ Edit Values ]`, `[ Upload Lab Report ]`, `[ Clear / Reset ]`, `[ Apply to Simulator ]`

---

## 13. Imaging View

A structured visual breakdown of cardiac computed tomography and plaque burden metrics.

### 13.1 Visual Components
- **CAC Agatston Gauge:** Visual scale segmented into `0 (None)`, `1–99 (Mild)`, `100–399 (Moderate)`, `400+ (Severe)`. Active pointer at `620`.
- **Coronary Tree Involvement Diagram / Vessel Chips:** Visual indicators highlighting affected vessels (`LAD`, `RCA`, `LCX`, `LMCA`).
- **Plaque Characterization Card:** Displays plaque morphology (`Mixed - Calcified & Soft Fibrofatty Component`) and FAI (`-92 HU`).
- **Lumen Stenosis Card:** Progress meter indicating luminal narrowing percentage (`>70% Significant Stenosis`).
- **Action Buttons:** `[ Edit Imaging Data ]`, `[ Reset Defaults ]`, `[ View Detailed Segment Analysis ]`

---

## 14. Live Waveforms View

Real-time simulated multi-lead physiological signal monitors rendered with canvas or SVG charts.

### 14.1 Waveform Channels & Specs

```
+-------------------------------------------------------------------------------------------------------+
| ECG LEAD II  |  HR: 82 bpm  |  Gain: 10mm/mV  |  Speed: 25mm/s                               [ Expand ]|
| ~~~/\_/\~~~~/\_/\~~~~/\_/\~~~~/\_/\~~~~/\_/\~~~~/\_/\~~~~/\_/\~~~~/\_/\~~~~/\_/\~~~~/\_/\~~~~~~~~~~~~~|
+-------------------------------------------------------------------------------------------------------+
| PPG (Plethysmogram)  |  SpO2: 97%  |  Pulse Rate: 82 bpm                             [ Expand ]|
| ~/\_~/\_~/\_~/\_~/\_~/\_~/\_~/\_~/\_~/\_~/\_~/\_~/\_~/\_~/\_~/\_~/\_~/\_~/\_~/\_~/\_~/\_~/\_~/\_~/\_~|
+-------------------------------------------------------------------------------------------------------+
| ARTERIAL BLOOD PRESSURE (Continuous Waveform)  |  152 / 96 mmHg                      [ Expand ]|
| ~/\~~/\~~/\~~/\~~/\~~/\~~/\~~/\~~/\~~/\~~/\~~/\~~/\~~/\~~/\~~/\~~/\~~/\~~/\~~/\~~/\~~/\~~/\~~/\~~~~~~~|
+-------------------------------------------------------------------------------------------------------+
| EDA (Electrodermal Activity)  |  4.2 µS                                              [ Expand ]|
| ----------------------------------------------------------------------------------------------------- |
+-------------------------------------------------------------------------------------------------------+
| ACCELEROMETER / MOTION  |  0.08 g (Resting State)                                    [ Expand ]|
| ----------------------------------------------------------------------------------------------------- |
```

### 14.2 Playback Control Toolbar
- Persistent bottom/top bar: `[ ⏸ Pause Stream ]`, `[ ▶ Resume Stream ]`, `[ 🔄 Reset Stream ]`, `[ ⛶ Fullscreen / Expand ]`, `[ Time Scale: 5s / 10s / 30s ]`

---

## 15. EchoNext CNN Model Analysis View

Visualization of simulated deep learning classification of 12-lead ECG signals.

### 15.1 UI Elements & AI Card Specs
- **Model Status Indicator:** `[ ● Model Loaded & Active ]` (Green status dot)
- **Input Spec:** `Simulated 12-Lead ECG Voltage Array (500 Hz, 10s)`
- **Model Classification Result:** `Abnormal ECG Detected` (Confidence: `0.92`)
- **Supported Output Classes & Probabilities:**
  - `NORM` (Normal Sinus Rhythm): `0.08`
  - `MI` (Myocardial Infarction / Ischemia): `0.64`
  - `STTC` (ST-T Wave Changes): `0.18`
  - `CD` (Conduction Disturbance): `0.06`
  - `HYP` (Left Ventricular Hypertrophy): `0.04`
- **Action Buttons:** `[ View AI Confidence Heatmap ]`, `[ Inspect Raw Lead Waveforms ]`, `[ Expand Diagnostics ]`
- **Mandatory AI Disclaimer Label:**
  ```text
  "EchoNext CNN Research Model — Output for simulation & educational demonstration only."
  ```

---

## 16. Comprehensive Risk Analysis

The core cardiovascular risk evaluation screen combining multi-factor scoring.

### 16.1 Primary Composite Risk Gauge
- **Central Visual:** Circular arc gauge (0–100 scale) with dynamic color gradient.
- **Display Score:** `78`
- **Risk Category Badge:** `High Cardiovascular Risk` (Red badge)
- **CAD-Specific 10-Year Probability:** `78%`

### 16.2 Disease-Specific Risk Breakdown Cards

```
+-------------------------------------------------------------------------------------------------------+
| DISEASE-SPECIFIC RISK PROBABILITIES                                                                   |
|                                                                                                       |
| Atherosclerosis Burden         [████████████████████████████████░░░░░░]  85%  (High)                  |
| Myocardial Ischemia Risk       [███████████████████████████░░░░░░░░░░░]  72%  (High)                  |
| Hypertensive Heart Disease     [████████████████████████░░░░░░░░░░░░░░]  64%  (Moderate)              |
| Arrhythmia / AFib Risk         [██████████████░░░░░░░░░░░░░░░░░░░░░░░░]  38%  (Mild)                  |
| Heart Failure Risk (HFpEF)     [███████████░░░░░░░░░░░░░░░░░░░░░░░░░░░]  28%  (Low-Moderate)          |
+-------------------------------------------------------------------------------------------------------+
```

---

## 17. CAD Risk Factor Contributions (INTERHEART Model)

Horizontal contribution bars illustrating the weighted impact of individual modifiable and clinical risk factors on total CAD risk.

```
+-------------------------------------------------------------------------------------------------------+
| INTERHEART RISK FACTOR CONTRIBUTION WEIGHTS                                          [ View Details ] |
|                                                                                                       |
| ApoB / ApoA1 Ratio (Elevated Atherogenic Lipoproteins)      [████████████████████]  22%               |
| Hypertension (Stage 2 SBP/DBP Elevation)                    [██████████████████  ]  20%               |
| Tobacco / Smoking Status                                    [█████████████       ]  15%               |
| Diabetes Mellitus / Impaired Fasting Glucose                [███████████         ]  12%               |
| Abdominal Obesity / Elevated BMI (28.6)                     [█████████           ]  10%               |
| Psychosocial / Stress Biomarkers                            [███████             ]   8%               |
| Diet / Low Fruit & Vegetable Intake Factor                  [██████              ]   7%               |
| Sedentary Lifestyle / Physical Inactivity                   [█████               ]   6%               |
+-------------------------------------------------------------------------------------------------------+
```

---

## 18. CAD Parameter Profile

A dedicated side-by-side reconciliation table separating reference limits, clinical CAD relevance, and simulator engine weighting.

| Parameter | Current Patient Value | Standard Reference Status | Cardiovascular / CAD Relevance | Simulator Engine Contribution |
| :--- | :--- | :--- | :--- | :--- |
| **Blood Pressure** | `152 / 96 mmHg` | Stage 2 Hypertension | Accelerates endothelial shear injury | High Weight (`+20%`) |
| **LDL-C** | `188 mg/dL` | Markedly Elevated | Direct atherogenic particle substrate | High Weight (`+18%`) |
| **HDL-C** | `32 mg/dL` | Sub-optimal / Low | Impaired reverse cholesterol transport | Moderate Weight (`+8%`) |
| **CAC Score** | `620 Agatston` | Severe Calcium Burden | Direct anatomical plaque marker | Dominant Weight (`+25%`) |
| **Plaque Type** | `Mixed` | High-risk plaque phenotype | Heightened vulnerability to rupture | High Weight (`+15%`) |
| **Stenosis** | `>70% Luminal` | Hemodynamically Significant | Reduces coronary perfusion reserve | Critical Weight (`+22%`) |

---

## 19. Longitudinal Risk Trend View

A temporal line graph tracking historical and simulated risk score fluctuations across sessions and scenario transitions.

### 19.1 Chart Specifications
- **Y-Axis:** Composite Risk Score (`0 – 100`) with colored threshold zones:
  - `0–30`: Green (Low Risk)
  - `31–65`: Amber (Moderate Risk)
  - `66–100`: Red (High Risk)
- **X-Axis:** Timeline (`Hours / Days / Scenarios`).
- **Interactive Controls:** Time filter buttons `[ 12H ]`, `[ 24H ]`, `[ 7D ]`, `[ Full Session ]`
- **Hover Tooltip:** Shows Exact Timestamp, Risk Score, Primary Driver at that point in time.

---

## 20. Key Clinical Findings Card

A high-visibility bullet card aggregating all detected anomalies for rapid review.

```
+-------------------------------------------------------------------------------------------------------+
| ⚠️ KEY SIMULATED FINDINGS                                                                             |
|                                                                                                       |
| • 🔴 Markedly Elevated LDL-C (188 mg/dL) and Atherogenic ApoB (156 mg/dL)                             |
| • 🔴 Sub-optimal HDL Cholesterol (32 mg/dL) with elevated ApoB/ApoA1 ratio (1.20)                     |
| • 🔴 Elevated Triglycerides (220 mg/dL) and High Lipoprotein(a) [112 mg/dL]                          |
| • 🔴 Stage 2 Systolic & Diastolic Hypertension (152 / 96 mmHg)                                        |
| • 🔴 Severe Coronary Artery Calcium Burden (CAC Score: 620 Agatston Units)                            |
| • 🔴 Multi-Vessel Mixed Plaque Involvement (LAD, RCA, LCX Coronary Arteries)                          |
| • 🔴 Hemodynamically Significant Coronary Luminal Stenosis (> 70%)                                    |
| • 🟡 Systemic Low-Grade Vascular Inflammation (hs-CRP: 5.6 mg/L)                                      |
| • 🟡 Impaired Glycemic Control (HbA1c: 6.4%, Fasting Glucose: 132 mg/dL)                              |
+-------------------------------------------------------------------------------------------------------+
```

---

## 21. Recommended Simulation Review Actions

An interactive research/educational checklist to guide the investigator through comprehensive analysis.

```
+-------------------------------------------------------------------------------------------------------+
| 📋 RECOMMENDED SIMULATION WORKFLOW ACTIONS (Research / Educational Checklist)                         |
|                                                                                                       |
| [ ] 1. Review multi-organ cardiovascular findings and composite risk indices                          |
| [ ] 2. Inspect Coronary CT / CAC score and multi-vessel plaque anatomical distribution               |
| [ ] 3. Analyze lipid fraction abnormalities, ApoB/ApoA1 ratios, and inflammatory biomarkers          |
| [ ] 4. Switch scenario to "Obstructive CAD" to evaluate delta in sensor waveforms and risk scores    |
| [ ] 5. Examine live 12-lead ECG streams and EchoNext CNN anomaly classification confidence            |
| [ ] 6. Review INTERHEART risk contribution breakdown to identify primary modifiable levers            |
| [ ] 7. Generate and export the comprehensive simulation session summary report (PDF/PNG)              |
+-------------------------------------------------------------------------------------------------------+
```
*(Disclaimer: This checklist is for educational workflow navigation only and does not constitute clinical orders).*

---

## 22. Healthy Tip & Lifestyle Insights

Context-aware educational card providing cardiovascular prevention concepts tailored to the active scenario.

### 22.1 Card Structure
- **Title:** `Atherogenic Lipoproteins & ApoB Clearance`
- **Category:** `Lipidology & Preventive Cardiology Education`
- **Explanation:** *"While LDL-C measures the cholesterol mass inside low-density particles, ApoB counts the exact number of atherogenic particles. In patients with metabolic syndrome or elevated triglycerides, ApoB provides a more accurate assessment of particle burden."*
- **Scenario Relevance:** `High CAD Risk / Dyslipidemia Scenarios`
- **Navigation Controls:** `[ ◀ Previous Insight ]`, `[ Next Insight ▶ ]`

---

## 23. Simulation History View

Structured table documenting prior simulation sessions and scenario runs for longitudinal comparison.

### 23.1 History Table Columns

| Session ID | Scenario Name | Timestamp | Patient Profile | Final Risk Score | CAD Risk % | Actions |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| `SES-9401` | High CAD Risk | `20 Sep 2026, 14:30` | Rohan Kumar (58M) | `78` (High) | `78%` | `[ View ]` `[ Compare ]` `[ Delete ]` |
| `SES-9388` | Obstructive CAD | `20 Sep 2026, 12:15` | Rohan Kumar (58M) | `84` (Critical)| `85%` | `[ View ]` `[ Compare ]` `[ Delete ]` |
| `SES-9350` | Healthy Adult | `19 Sep 2026, 09:40` | Baseline Model (35M)| `14` (Low) | `12%` | `[ View ]` `[ Compare ]` `[ Delete ]` |

---

## 24. Simulation Telemetry Logs View

A granular, searchable console recording runtime sensor updates, risk recalculations, and system events.

### 24.1 Log Grid Specification
- **Columns:** `Timestamp (ISO/Time)`, `Scenario Event`, `Sensor Feed State`, `Calculated Risk Score`, `System Message / Log Level`
- **Controls & Filters:**
  - Search input: `[ 🔍 Search logs... ]`
  - Filter by Level: `[ All ]` `[ Info ]` `[ Warning ]` `[ Anomaly ]`
  - Action buttons: `[ 📥 Export Log (CSV/JSON) ]`, `[ 🗑️ Clear Console ]`

---

## 25. Sensor Fusion Pipeline View

An interactive flowchart and status card illustrating the multi-modal sensor fusion architecture.

```
+-------------------------------------------------------------------------------------------------------+
| MULTI-MODAL SENSOR FUSION PIPELINE                                                                    |
|                                                                                                       |
|  [ Raw Sensors ]          [ Preprocessing ]          [ Feature Extraction ]      [ Risk Fusion ]      |
|  +--------------+         +-----------------+        +---------------------+     +-----------------+  |
|  | ECG (500Hz)  | ------> | Bandpass Filter | -----> | QRS, ST, HRV RMSSD  | --> |                 |  |
|  | PPG (100Hz)  | ------> | Peak Detection  | -----> | Pulse Amplitude     | --> | Multi-Layer     |  |
|  | BP Continuous| ------> | Calibration     | -----> | SBP / DBP / MAP     | --> | Fusion Matrix   |  |
|  | EDA (40Hz)   | ------> | Smoothing       | -----> | Tonic / Phasic EDA  | --> |                 |  |
|  | Motion (50Hz)| ------> | Vector Magnitude| -----> | Activity Index      | --> |                 |  |
|  +--------------+         +-----------------+        +---------------------+     +--------+--------+  |
|                                                                                           |           |
|                                                                                           v           |
|                                                                                 [ Final Risk Engine ] |
+-------------------------------------------------------------------------------------------------------+
```

---

## 26. Risk Engine Architecture View

Visual inspection panel displaying parameter weights and intermediate mathematical components.

### 26.1 Sections
1. **Input Parameters:** Vitals, Lab Panel, Imaging Markers, Patient Demographics.
2. **Intermediate Factor Aggregation:** Framingham Risk Equation components, INTERHEART odds multipliers, CAC score weighting factors.
3. **Weight Matrix Display:** Bar charts showing relative weight allocations.
4. **Controls:** `[ View Mathematical Formula Guide ]`, `[ View Normalized Weights ]`, `[ Reset Calculation Cache ]`

---

## 27. Report Upload Status Machine & UI States

The file upload component and sliding inspector support six distinct states:

```
[ NO_REPORT ] --------> [ UPLOADING ] --------> [ ANALYZING ] --------> [ READY ]
      ^                                                                     |
      |                                                                     v
   [ CLEAR ] <------------------------------------------------------- [ APPLIED ]
      ^
      |
   [ ERROR ]
```

### 27.1 State Details

| State Code | Status Label | Visual Icon / Spinner | Display Message | Available Actions |
| :--- | :--- | :---: | :--- | :--- |
| `NO_REPORT` | Idle | 📄 Dashed Box | *"Upload a report to populate values."* | `[ Upload File ]` |
| `UPLOADING` | Uploading... | ⏳ Blue Spinner | *"Uploading document to simulation parser..."* | `[ Cancel ]` |
| `ANALYZING` | Processing | ⚙️ Animated Pulse | *"Extracting biomarkers and imaging metrics..."*| None |
| `READY` | Report Ready | 🟢 Green Check | *"Report ready for review. 10 biomarkers parsed."*| `[ Apply Values ]`, `[ Clear ]` |
| `APPLIED` | Active / Applied| 🏆 Solid Check | *"✓ Report values active in simulation engine."* | `[ Edit ]`, `[ Clear ]` |
| `ERROR` | Parsing Failed | 🔴 Red Alert | *"Unable to read report. Please verify file format."*| `[ Retry ]`, `[ Clear ]` |
| `CLEAR` | Cleared | ℹ️ Gray Info | *"Report cleared. Restored baseline scenario values."*| `[ Upload New ]` |

---

## 28. Standardized Button States

All UI action buttons must consistently implement standard interactive feedback states:

| Button Name | Default | Hover | Pressed / Active | Disabled | Loading | Success | Error |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `[ Upload Report ]` | Blue solid | Darker blue | Deep navy | 40% Opacity | Spinner icon | Green badge | Red border |
| `[ Apply Report Values ]` | Green solid | Darker green | Deep emerald | Gray disabled | Spinner icon | `"Applied ✓"` | `"Failed ✕"` |
| `[ Export Report ]` | Slate outline| Slate filled | Inverted slate | Muted gray | Spinner icon | `"Exported"` | `"Error"` |
| `[ Edit / Save ]` | Ghost outline| Subtle fill | Accent border | Muted | Spinner | `"Saved"` | `"Error"` |
| `[ Stream Pause / Play ]` | Amber/Green | Contrast shift| Inset shadow | Gray | Disabled | Normal | Normal |

---

## 29. Empty States & Zero-Data Fallbacks

When records, models, or scenarios are not initialized, display clean, descriptive empty states:

| Context | Empty State Headline | Descriptive Guidance Message | Suggested Action |
| :--- | :--- | :--- | :--- |
| **No Patient Selected** | *"No Patient Loaded"* | *"Select a patient profile or load a preset simulation scenario to begin."* | `[ Load Preset Patient ]` |
| **No Report Uploaded** | *"No External Report Attached"* | *"Upload a PDF or image lab report to auto-populate biomarker fields."* | `[ Upload Lab Report ]` |
| **Missing Lab Values** | *"Biomarker Panel Uninitialized"* | *"No laboratory blood tests currently recorded for this session."* | `[ Enter Lab Values ]` |
| **Missing Imaging Data** | *"No CCTA / CAC Imaging"* | *"Coronary calcium and stenosis parameters are currently blank."* | `[ Configure Imaging ]` |
| **Waveform Disconnected** | *"Signal Stream Inactive"* | *"Physiological sensor stream is currently paused or uninitialized."* | `[ ▶ Start Stream ]` |
| **CNN Model Offline** | *"Neural Network Initializing"* | *"EchoNext CNN model weights are loading into memory..."* | `[ Retry Loading ]` |
| **No Scenario Active** | *"Default Scenario Inactive"* | *"Please select a scenario from the top navigation dropdown."* | `[ Select Scenario ]` |

---

## 30. Reference Mock Dataset: High-Risk Patient

Use this standardized data model exclusively for UI layout validation, template testing, and visual design verification.

```json
{
  "patient": {
    "name": "Mr. Rohan Kumar",
    "age": 58,
    "gender": "Male",
    "patientId": "SIM-PAT-2026-089",
    "bmi": 28.6,
    "smokingStatus": "Current",
    "diabetes": "Yes",
    "familyHistory": "Yes",
    "physicalActivity": "Low"
  },
  "vitals": {
    "systolicBp": 152,
    "diastolicBp": 96,
    "heartRate": 82,
    "spo2": 97
  },
  "labValues": {
    "totalCholesterol": 268,
    "hdl": 32,
    "ldl": 188,
    "triglycerides": 220,
    "apoB": 156,
    "apoB_apoA1_ratio": 1.20,
    "lp_a": 112,
    "hs_crp": 5.6,
    "hba1c": 6.4,
    "fastingGlucose": 132
  },
  "imaging": {
    "cacScore": 620,
    "fai": -92,
    "plaqueType": "Mixed",
    "plaqueLocations": ["LAD", "RCA", "LCX"],
    "stenosisSeverity": ">70%"
  },
  "riskScores": {
    "compositeRiskScore": 78,
    "riskLevel": "High Risk",
    "cadRiskScorePercent": 78
  }
}
```
*(Notice: Fictitious dataset for UI design reference only).*

---

## 31. Export Simulation Report Modal & Structure

The `[ Export Report ]` action triggers a modal allowing full session dossier generation.

### 31.1 Export Actions Supported
- `[ 📄 Export Full PDF Dossier ]`
- `[ 🖼️ Export High-Res Dashboard PNG ]`
- `[ 🖨️ Direct Print Layout ]`

### 31.2 Exported Report Document Sections
1. **Header Banner:** Application title, generation timestamp, Session ID.
2. **Patient Information & Clinical Demographics.**
3. **Active Simulation Scenario & Parameters.**
4. **Vitals & Laboratory Biomarker Panel (with reference flags).**
5. **CCTA Imaging, Plaque Burden & Stenosis Summary.**
6. **Waveform Snapshot (Lead II ECG & PPG 5-second strip).**
7. **Composite Risk Score, CAD 10-Year Index & Disease Probabilities.**
8. **INTERHEART Risk Factor Contribution Bar Chart.**
9. **EchoNext CNN 12-Lead ECG Classification Readout.**
10. **Key Findings & Educational Review Checklist.**
11. **Mandatory Research / Educational Disclaimer Footer.**

---

## 32. Responsive Layout & Breakpoint Specifications

| Screen Width | Target Device | Layout Strategy | Sidebar Behavior | Upload Drawer |
| :--- | :--- | :--- | :--- | :--- |
| **≥ 1280px** | Desktop / Large Workstations | 3-Column multi-panel dashboard | Fully expanded (240px) | 380px slide-in right drawer |
| **992px – 1279px** | Small Desktop / Laptop | 2-Column responsive grid | Collapsed to icon rail (70px)| 360px right drawer |
| **768px – 991px** | Tablet (Landscape / Portrait) | 2-Column stacked cards | Collapsed / Slide-over | Full-width slide-over drawer |
| **< 768px** | Mobile Devices | 1-Column vertically stacked cards | Hidden in off-canvas drawer | Full-screen modal / bottom sheet |

---

## 33. Core Design Principles Summary

```
+-------------------------------------------------------------------------------------------------------+
| 🔬 DESIGN ARCHETYPE: "Professional Cardiovascular Research & Simulation Workstation"                  |
|                                                                                                       |
|  DO:                                                DO NOT:                                           |
|  ✔ High data density with clean typography          ✖ Generic colorful SaaS template look             |
|  ✔ Instant color-coded clinical risk hierarchy      ✖ Fitness tracker / consumer gamification         |
|  ✔ Strict visual separation of lab vs imaging       ✖ Confusing billing / EHR administrative screens  |
|  ✔ Prominent educational & research disclaimers     ✖ Unsubstantiated diagnostic certainty labels     |
+-------------------------------------------------------------------------------------------------------+
```

---

## 34. Template Customization Mapping Checklist

Use this checklist when editing your purchased dashboard template components:

- [ ] **1. Header & Navigation:** Map template top bar to Section 3 (Logo, Subtitle, Scenario pill, Theme toggle, Upload/Export buttons).
- [ ] **2. Sidebar Menu:** Populate exactly the 12 routes listed in Section 4 with correct icons and active state highlights.
- [ ] **3. Top KPI Cards:** Map template stat cards to the 5 key metrics in Section 5 (Current Risk, HR, BP, HRV, CAD Risk).
- [ ] **4. Patient Demographics:** Map form components to Section 6 with dropdowns for smoking, diabetes, and activity.
- [ ] **5. Scenario Switcher:** Map tab and select components to Section 7 preserving Healthy, CAD, and CVD groupings.
- [ ] **6. Drag & Drop Upload Zone:** Place file upload dropzones in Header, Lab Page, and Patient Profile (Section 8).
- [ ] **7. Slide-in Drawer:** Implement 380px right drawer for Biomarker & Imaging overrides (Sections 9 & 10).
- [ ] **8. Lab Table:** Build compact table matching Section 12 with Status color badges (High/Low/Normal).
- [ ] **9. Imaging Section:** Build CAC Agatston gauge, stenosis meter, and vessel chips (Section 13).
- [ ] **10. Live Waveform Monitors:** Style waveform canvas cards with pause/resume controls (Section 14).
- [ ] **11. EchoNext CNN Card:** Setup neural network prediction panel with 5-class distribution (Section 15).
- [ ] **12. Risk Analysis Gauges & INTERHEART Bars:** Wire up composite risk gauge and horizontal contribution bars (Sections 16 & 17).
- [ ] **13. Longitudinal Trend:** Map template line chart to CAD Risk Trend with 12H/24H/7D filters (Section 19).
- [ ] **14. Key Findings & Checklist:** Place bullet summary card and educational checklist (Sections 20 & 21).
- [ ] **15. Telemetry & History:** Configure Sim Logs console and Session History table (Sections 23 & 24).
- [ ] **16. Disclaimers:** Ensure `"Research / Educational Simulator"` badge and footer disclaimers are present on all views.

---
*End of Design Specification Document (`DESIGN_OPTIONS.md`).*

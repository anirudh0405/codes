const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9385;

function toBase64(filePath) {
  const buf = fs.readFileSync(filePath);
  return `data:image/png;base64,${buf.toString('base64')}`;
}

async function buildPdf() {
  console.log('Encoding screenshots for CVD Ischemic Stroke Scenario Report...');
  const upperImg = toBase64('public/cvd_stroke_report_assets/01_cvd_stroke_upper_overview.png');
  const trendImg = toBase64('public/cvd_stroke_report_assets/02_cvd_stroke_trend_readouts.png');
  const echoImg = toBase64('public/cvd_stroke_report_assets/03_cvd_stroke_echonext_contributions.png');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CVD — Ischemic Stroke Scenario Report</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600;700&display=swap');

    @page {
      size: 210mm 297mm;
      margin: 0;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #ffffff;
      color: #1e293b;
      -webkit-font-smoothing: antialiased;
      line-height: 1.45;
    }

    .pdf-page {
      width: 210mm;
      height: 297mm;
      max-height: 297mm;
      page-break-after: always;
      position: relative;
      background: #ffffff;
      padding: 9mm 14mm 8mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
    }

    /* Page Header */
    .doc-header {
      border-bottom: 2px solid #0284c7;
      padding-bottom: 2.2mm;
      margin-bottom: 3mm;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }

    .header-left h1 {
      font-size: 13.5pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
      line-height: 1.2;
    }

    .header-left h2 {
      font-size: 9.5pt;
      font-weight: 700;
      color: #0284c7;
      margin-top: 1mm;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .header-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 1.2mm;
    }

    .pill-badge {
      font-size: 7pt;
      font-weight: 700;
      padding: 1mm 2.8mm;
      border-radius: 4px;
      font-family: 'JetBrains Mono', monospace;
      letter-spacing: 0.02em;
    }

    .pill-amber {
      background: #fffbeb;
      color: #b45309;
      border: 1px solid #fde68a;
    }

    .pill-subtle {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #cbd5e1;
    }

    /* Section Styling */
    .section-title {
      font-size: 9pt;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 1.8mm;
      display: flex;
      align-items: center;
      gap: 6px;
      border-left: 3px solid #0284c7;
      padding-left: 2mm;
    }

    .section-desc {
      font-size: 7.8pt;
      color: #334155;
      line-height: 1.45;
      margin-bottom: 2.5mm;
    }

    /* Content Cards */
    .content-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 5px;
      padding: 2.5mm 3.5mm;
      margin-bottom: 2.8mm;
    }

    /* Figures / Screenshots */
    .figure-frame {
      border: 1px solid #cbd5e1;
      border-radius: 5px;
      overflow: hidden;
      background: #0f172a;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
      margin-bottom: 2mm;
    }

    .figure-caption-bar {
      background: #f1f5f9;
      border-top: 1px solid #e2e8f0;
      padding: 1.5mm 3mm;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 6.8pt;
      color: #475569;
      font-weight: 600;
    }

    .figure-caption-bar span strong {
      color: #0f172a;
    }

    .figure-img {
      width: 100%;
      height: auto;
      max-height: 86mm;
      object-fit: cover;
      display: block;
    }

    /* Clean Light Tables */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.2pt;
      margin-bottom: 2.5mm;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      overflow: hidden;
    }

    .data-table th {
      background: #f1f5f9;
      color: #1e293b;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 1.6mm 2.5mm;
      text-align: left;
      border-bottom: 1px solid #cbd5e1;
      font-size: 6.8pt;
    }

    .data-table td {
      padding: 1.5mm 2.5mm;
      border-bottom: 1px solid #e2e8f0;
      color: #334155;
    }

    .data-table tr:last-child td {
      border-bottom: none;
    }

    .data-table tr:nth-child(even) td {
      background: #f8fafc;
    }

    .val-cell {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      color: #0f172a;
    }

    .status-pill-table {
      display: inline-block;
      padding: 0.3mm 1.6mm;
      border-radius: 3px;
      font-size: 6.2pt;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
    }

    .status-elevated {
      background: #fef2f2;
      color: #b91c1c;
      border: 1px solid #fecaca;
    }

    .status-warning {
      background: #fffbeb;
      color: #b45309;
      border: 1px solid #fde68a;
    }

    .status-normal {
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
    }

    /* Metric Key-Value Grid */
    .metric-grid-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 2mm;
      margin-bottom: 2.5mm;
    }

    .metric-card-light {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-top: 2.5px solid #f59e0b;
      border-radius: 4px;
      padding: 1.8mm 2.2mm;
    }

    .metric-card-title {
      font-size: 6.2pt;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .metric-card-value {
      font-size: 9pt;
      font-weight: 800;
      color: #0f172a;
      font-family: 'JetBrains Mono', monospace;
      margin-top: 0.5mm;
    }

    .metric-card-sub {
      font-size: 6.2pt;
      color: #b45309;
      font-weight: 600;
      margin-top: 0.4mm;
    }

    /* Comparison Table */
    .comparison-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2.5mm;
      margin-bottom: 2.5mm;
    }

    .comp-box {
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 1.8mm 2.5mm;
      background: #f8fafc;
    }

    .comp-title {
      font-size: 6.8pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      margin-bottom: 1mm;
    }

    /* Flow diagram box */
    .flow-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 5px;
      padding: 2.5mm 3.5mm;
      margin-bottom: 2.5mm;
    }

    .flow-steps {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.2mm;
      margin-top: 1.5mm;
    }

    .flow-node {
      background: #ffffff;
      border: 1px solid #0284c7;
      border-radius: 4px;
      padding: 1.2mm 1.6mm;
      font-size: 6.2pt;
      font-weight: 700;
      color: #0f172a;
      text-align: center;
      flex: 1;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }

    .flow-arrow {
      color: #0284c7;
      font-weight: 800;
      font-size: 7.5pt;
    }

    /* Disclaimer Box */
    .disclaimer-card {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-left: 3.5px solid #f59e0b;
      border-radius: 4px;
      padding: 2mm 3mm;
      margin-top: 1.5mm;
    }

    .disclaimer-text {
      font-size: 6.8pt;
      color: #92400e;
      line-height: 1.4;
    }

    /* Footer */
    .doc-footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 1.8mm;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 6.8pt;
      color: #64748b;
    }

    .footer-right {
      font-family: 'JetBrains Mono', monospace;
      color: #0f172a;
      font-weight: 600;
    }
  </style>
</head>
<body>

  <!-- =====================================================================
       PAGE 1: SCENARIO OVERVIEW & OVERALL DASHBOARD RESULT
       ===================================================================== -->
  <section class="pdf-page">
    <div>
      <header class="doc-header">
        <div class="header-left">
          <h1>Precision Cardiovascular Risk Intelligence Platform</h1>
          <h2>CVD — Ischemic Stroke Scenario Report</h2>
          <div style="font-size: 7.5pt; color: #64748b; margin-top: 0.8mm;">
            Dashboard Output and Scenario Interpretation
          </div>
        </div>
        <div class="header-right">
          <div class="pill-badge pill-amber">Scenario: CVD — Ischemic Stroke</div>
          <div class="pill-badge pill-subtle">Research / Simulation Prototype</div>
        </div>
      </header>

      <!-- Section 1 -->
      <div style="margin-bottom: 2.8mm;">
        <div class="section-title">Section 1 — Scenario Overview (CVD Stroke Simulation Role)</div>
        <p class="section-desc">
          The <strong>CVD — Ischemic Stroke</strong> scenario expands the simulator's evaluation spectrum beyond focal coronary disease into systemic cerebrovascular pathology. It models an acute cerebral ischemic event where regional cerebral arterial blood flow is severely reduced (75% arterial obstruction) by an embolic or thrombotic occlusion, producing acute neurological deficits (facial weakness, arm/leg hemiparesis, and speech difficulty) in an individual with pre-existing vascular risk factors (Stage 2 hypertension, Type 2 diabetes, former smoking history, and sedentary lifestyle).
        </p>
        <p class="section-desc" style="margin-bottom: 0;">
          <em>Simulation Purpose:</em> This scenario demonstrates how the risk platform captures systemic macrovascular disease, where acute cerebral perfusion impairment coincides with severe systemic arterial hypertension and vascular inflammation. It functions as a computational research demonstration rather than an autonomous medical diagnosis.
        </p>
      </div>

      <!-- Section 2 -->
      <div>
        <div class="section-title">Section 2 — Overall Dashboard (Active Telemetry & Assessment)</div>
        <p class="section-desc">
          When the CVD — Ischemic Stroke scenario is activated, the dashboard transitions into a <strong>Moderate Risk</strong> advisory status. The primary risk banner advises: <em>"Some risk factors are elevated. Close monitoring and lifestyle adjustments are recommended."</em>
        </p>

        <!-- Upper Screenshot -->
        <div class="figure-frame">
          <img src="${upperImg}" alt="Upper Dashboard Viewport (CVD Ischemic Stroke)" class="figure-img" />
          <div class="figure-caption-bar">
            <span><strong>Figure 1:</strong> Upper Dashboard Viewport (CVD — Ischemic Stroke Scenario)</span>
            <span>Risk Score: 59/100 · Moderate Risk · HR: 88 BPM · BP: 172/109 mmHg · HRV: 30 ms · FAI: -68.0 HU · CAC: 120 AU</span>
          </div>
        </div>

        <!-- Comparative Baseline Delta -->
        <div class="comparison-grid">
          <div class="comp-box" style="border-left: 3px solid #059669;">
            <div class="comp-title" style="color: #059669;">Healthy — Baseline Reference</div>
            <div style="font-size: 7.2pt; color: #475569; line-height: 1.4;">
              • Risk Score: <strong>14 / 100 (Low Risk)</strong><br />
              • Blood Pressure: <strong>122/81 mmHg (Normal)</strong><br />
              • HRV (RMSSD): <strong>70 ms (High Vagal Recovery)</strong><br />
              • FAI: <strong>-82.0 HU (Normal)</strong> · CAC: <strong>0 AU</strong>
            </div>
          </div>
          <div class="comp-box" style="border-left: 3px solid #f59e0b;">
            <div class="comp-title" style="color: #b45309;">CVD — Ischemic Stroke State</div>
            <div style="font-size: 7.2pt; color: #475569; line-height: 1.4;">
              • Risk Score: <strong>59 / 100 (Moderate Risk · +45 pts delta)</strong><br />
              • Blood Pressure: <strong>172/109 mmHg (Stage 2 Hypertensive Tension)</strong><br />
              • HRV (RMSSD): <strong>30 ms (Blunted Autonomic Flexibility)</strong><br />
              • FAI: <strong>-68.0 HU (Active Vascular Inflammation)</strong> · CAC: <strong>120 AU</strong>
            </div>
          </div>
        </div>
      </div>
    </div>

    <footer class="doc-footer">
      <div>Arohan Health · Precision Cardiovascular Risk Intelligence Platform · Technical Scenario Report</div>
      <div class="footer-right">Page 1 of 4</div>
    </footer>
  </section>


  <!-- =====================================================================
       PAGE 2: PRIMARY RISK OUTPUT & PHYSIOLOGICAL PARAMETERS
       ===================================================================== -->
  <section class="pdf-page">
    <div>
      <header class="doc-header">
        <div class="header-left">
          <h1>Precision Cardiovascular Risk Intelligence Platform</h1>
          <h2>CVD — Ischemic Stroke Scenario Report</h2>
          <div style="font-size: 7.5pt; color: #64748b; margin-top: 0.8mm;">
            Section 3 & 4: Primary Composite Score, Longitudinal Trajectory & Core Telemetry
          </div>
        </div>
        <div class="header-right">
          <div class="pill-badge pill-amber">Primary Metrics</div>
          <div class="pill-badge pill-subtle">Cerebrovascular Stress</div>
        </div>
      </header>

      <!-- Section 3 -->
      <div style="margin-bottom: 3.2mm;">
        <div class="section-title">Section 3 — Primary Risk Output (Score & 7-Day Trend)</div>
        <div class="metric-grid-4">
          <div class="metric-card-light">
            <div class="metric-card-title">Composite Risk Score</div>
            <div class="metric-card-value">59 <span style="font-size: 7pt; font-weight: 500; color: #64748b;">/ 100</span></div>
            <div class="metric-card-sub">Tier: Moderate (41–60)</div>
          </div>
          <div class="metric-card-light">
            <div class="metric-card-title">Risk Band</div>
            <div class="metric-card-value" style="color: #b45309; font-size: 8.5pt;">MODERATE</div>
            <div class="metric-card-sub">Close Monitoring Tier</div>
          </div>
          <div class="metric-card-light">
            <div class="metric-card-title">Confidence Metric</div>
            <div class="metric-card-value" style="color: #0284c7;">100%</div>
            <div class="metric-card-sub">Full Sensor Fusion</div>
          </div>
          <div class="metric-card-light">
            <div class="metric-card-title">7-Day Trajectory</div>
            <div class="metric-card-value" style="color: #b45309; font-size: 8.5pt;">20 → 59 ↑</div>
            <div class="metric-card-sub">Escalating Trend</div>
          </div>
        </div>

        <p class="section-desc">
          <strong>Current Risk Score (59/100):</strong> The composite score of 59 sits at the upper threshold of the <strong>Moderate Risk band (41–60)</strong>. In this simulator, this value reflects a heavy vascular contribution from severe systolic/diastolic hypertension (172/109 mmHg) paired with intermediate atherogenic lipids and active vascular inflammation, while absence of transmural ST elevation prevents immediate escalation into the severe ischemic tier (&gt;60).
        </p>
        <p class="section-desc">
          <strong>7-Day Longitudinal Trend:</strong> The 7-day risk trend records an acute surge from <strong>20 → 59 (↑ Increasing)</strong> across observation intervals (Day 1 at 20, Day 2 at 59). In cerebrovascular medicine, a sudden upward trajectory indicates acute vascular compromise, differentiating chronic baseline hypertension from an acute stroke-induced hemodynamic surge.
        </p>
      </div>

      <!-- Section 4 -->
      <div>
        <div class="section-title">Section 4 — Physiological Parameters & Cardiac Readouts</div>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 20%;">Parameter</th>
              <th style="width: 15%;">Current Value</th>
              <th style="width: 17%;">Dashboard Status</th>
              <th style="width: 25%;">Physiological Explanation</th>
              <th style="width: 23%;">Simulator Role</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Blood Pressure (BP)</strong></td>
              <td class="val-cell">172/109 mmHg</td>
              <td><span class="status-pill-table status-elevated">Stage 2 Hypertensive</span></td>
              <td>Marked systolic and diastolic arterial hypertension.</td>
              <td>Primary contributor to cerebrovascular shear stress and rupture risk.</td>
            </tr>
            <tr>
              <td><strong>Heart Rate (HR)</strong></td>
              <td class="val-cell">88 BPM</td>
              <td><span class="status-pill-table status-warning">Normal Sinus Rhythm</span></td>
              <td>Resting sinus rate exhibiting sympathetic bias.</td>
              <td>Reflects systemic neurohormonal stress response to cerebral ischemia.</td>
            </tr>
            <tr>
              <td><strong>HRV (RMSSD)</strong></td>
              <td class="val-cell">30 ms</td>
              <td><span class="status-pill-table status-warning">Moderate / Blunted</span></td>
              <td>Beat-to-beat variability (below 42 ms reference).</td>
              <td>Indicates dampened vagal buffering capacity during vascular stress.</td>
            </tr>
            <tr>
              <td><strong>Corrected QT (QTc)</strong></td>
              <td class="val-cell">509 ms</td>
              <td><span class="status-pill-table status-elevated">Prolonged</span></td>
              <td>Ventricular repolarization duration (&gt;450 ms).</td>
              <td>Cerebrogenic QTc prolongation secondary to neuro-autonomic storm.</td>
            </tr>
            <tr>
              <td><strong>ST Segment</strong></td>
              <td class="val-cell">0.04 mV</td>
              <td><span class="status-pill-table status-normal">Isoelectric (Normal)</span></td>
              <td>Baseline voltage following QRS complex.</td>
              <td>Confirms absence of acute focal transmural coronary occlusion.</td>
            </tr>
            <tr>
              <td><strong>Pulse Transit Time (PTT)</strong></td>
              <td class="val-cell">106 ms</td>
              <td><span class="status-pill-table status-warning">Shortened PTT</span></td>
              <td>ECG R-wave peak to distal PPG foot arrival time.</td>
              <td>Inverse marker of vascular stiffness; indicates stiff, non-compliant arteries.</td>
            </tr>
            <tr>
              <td><strong>Oxygen Saturation (SpO₂)</strong></td>
              <td class="val-cell">96%</td>
              <td><span class="status-pill-table status-normal">Adequate Oxygenation</span></td>
              <td>Fraction of oxygen-saturated arterial hemoglobin.</td>
              <td>Monitors systemic respiratory and tissue oxygen delivery.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <footer class="doc-footer">
      <div>Arohan Health · Precision Cardiovascular Risk Intelligence Platform · Technical Scenario Report</div>
      <div class="footer-right">Page 2 of 4</div>
    </footer>
  </section>


  <!-- =====================================================================
       PAGE 3: IMAGING, LAB SUMMARY & DISEASE-SPECIFIC RISK
       ===================================================================== -->
  <section class="pdf-page">
    <div>
      <header class="doc-header">
        <div class="header-left">
          <h1>Precision Cardiovascular Risk Intelligence Platform</h1>
          <h2>CVD — Ischemic Stroke Scenario Report</h2>
          <div style="font-size: 7.5pt; color: #64748b; margin-top: 0.8mm;">
            Section 5, 6 & 7: Vascular Imaging, Laboratory Profile & Sub-Scores
          </div>
        </div>
        <div class="header-right">
          <div class="pill-badge pill-amber">Vascular & Lab Markers</div>
          <div class="pill-badge pill-subtle">Sub-Scores</div>
        </div>
      </header>

      <!-- Section 5 -->
      <div style="margin-bottom: 3.2mm;">
        <div class="section-title">Section 5 — FAI and CAC (Vascular & Imaging Markers)</div>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 25%;">Biomarker / Metric</th>
              <th style="width: 16%;">Current Value</th>
              <th style="width: 18%;">Classification</th>
              <th style="width: 23%;">Measurement Nature</th>
              <th style="width: 18%;">Integration Purpose</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Fat Attenuation Index (FAI)</strong></td>
              <td class="val-cell">-68.0 HU</td>
              <td><span class="status-pill-table status-elevated">Elevated Inflammation</span></td>
              <td>Pericoronary adipose CT attenuation gradient.</td>
              <td>Exceeds -70.1 HU threshold; reveals active vascular inflammation.</td>
            </tr>
            <tr>
              <td><strong>Coronary Artery Calcium (CAC)</strong></td>
              <td class="val-cell">120 AU</td>
              <td><span class="status-pill-table status-warning">Moderate Plaque Burden</span></td>
              <td>Agatston score of calcified atherosclerotic plaque.</td>
              <td>Quantifies cumulative calcified plaque in the 100–399 AU category.</td>
            </tr>
          </tbody>
        </table>
        <p class="section-desc">
          <em>Diagnostic Clarification:</em> FAI (-68.0 HU) flags active pan-vascular cytokine release, while CAC (120 AU) confirms moderate underlying arterial calcification. While stroke primarily impacts cerebral vasculature, coronary FAI and CAC are displayed as systemic vascular health surrogates. They do not independently diagnose stroke or acute cerebral thrombosis.
        </p>
      </div>

      <!-- Scrolled Middle Screenshot -->
      <div class="figure-frame">
        <img src="${trendImg}" alt="Trend, Readouts and Labs (Stroke)" class="figure-img" style="max-height: 52mm;" />
        <div class="figure-caption-bar">
          <span><strong>Figure 2:</strong> Trend, Cardiac Readouts & Stroke Disease Parameters Viewport</span>
          <span>PTT: 106 ms · SpO₂: 96% · Cerebral Obstruction: 75% · Total Chol: 300 mg/dL · HDL: 38 mg/dL · TG: 500 mg/dL</span>
        </div>
      </div>

      <!-- Section 6 & 7 -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 3.5mm; margin-top: 2.5mm;">
        <!-- Section 6 -->
        <div>
          <div class="section-title">Section 6 — Laboratory Summary</div>
          <p class="section-desc">
            The lipid and metabolic panel reveals significant atherogenic strain:
          </p>
          <ul style="font-size: 7.2pt; color: #334155; margin-left: 4mm; line-height: 1.45;">
            <li><strong>Total Cholesterol:</strong> 300 mg/dL (Borderline / Elevated)</li>
            <li><strong>LDL Cholesterol:</strong> 87 mg/dL (Normal Range)</li>
            <li><strong>HDL Cholesterol:</strong> 38 mg/dL (Low / Depressed Protection)</li>
            <li><strong>Triglycerides:</strong> 500 mg/dL (Elevated / Hypertriglyceridemia)</li>
            <li><strong>Lipoprotein(a):</strong> 42.0 mg/dL (Moderate Genetic Risk)</li>
          </ul>
          <p class="section-desc" style="margin-top: 1mm; margin-bottom: 0;">
            This dyslipidemic state accelerates large-artery atherosclerosis, predisposing to carotid plaque instability.
          </p>
        </div>

        <!-- Section 7 -->
        <div>
          <div class="section-title">Section 7 — Disease-Specific Risk Panel</div>
          <p class="section-desc">
            The platform provides five simulator-derived sub-scores alongside specific neurological stroke parameters:
          </p>
          <ul style="font-size: 7.2pt; color: #334155; margin-left: 4mm; line-height: 1.45;">
            <li><strong>Hypertensive Heart Disease:</strong> 74/100 (172/109 mmHg strain)</li>
            <li><strong>Atherosclerosis:</strong> 66/100 (CAC 120 AU + FAI -68.0 HU)</li>
            <li><strong>Myocardial Ischemia:</strong> 53/100 (Elevated afterload demand)</li>
            <li><strong>Arrhythmia:</strong> 52/100 (509 ms QTc prolongation)</li>
            <li><strong>Heart Failure:</strong> 45/100 (Watch status)</li>
          </ul>
          <p class="section-desc" style="margin-top: 1mm; margin-bottom: 0;">
            <em>Stroke Manifestations:</em> Cerebral Artery Obstruction: <strong>75%</strong>, Facial/Arm/Speech Deficits: <strong>Present</strong>.
          </p>
        </div>
      </div>
    </div>

    <footer class="doc-footer">
      <div>Arohan Health · Precision Cardiovascular Risk Intelligence Platform · Technical Scenario Report</div>
      <div class="footer-right">Page 3 of 4</div>
    </footer>
  </section>


  <!-- =====================================================================
       PAGE 4: CONTRIBUTIONS, ECHONEXT, FLOW & SUMMARY
       ===================================================================== -->
  <section class="pdf-page">
    <div>
      <header class="doc-header">
        <div class="header-left">
          <h1>Precision Cardiovascular Risk Intelligence Platform</h1>
          <h2>CVD — Ischemic Stroke Scenario Report</h2>
          <div style="font-size: 7.5pt; color: #64748b; margin-top: 0.8mm;">
            Section 8–11: Contributions, Deep Learning, Architecture & Summary
          </div>
        </div>
        <div class="header-right">
          <div class="pill-badge pill-amber">Model Synthesis</div>
          <div class="pill-badge pill-subtle">Summary & Disclaimer</div>
        </div>
      </header>

      <!-- Section 8 & 9 Grid -->
      <div style="display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 3.5mm; margin-bottom: 2.8mm;">
        <!-- Section 8 -->
        <div>
          <div class="section-title">Section 8 — Risk Contributions Breakdown</div>
          <p class="section-desc">
            The <em>Contributions</em> breakdown explains which factors build the composite 59-point risk score:
          </p>
          <ul style="font-size: 7.2pt; color: #334155; margin-left: 4mm; line-height: 1.45;">
            <li><strong>Blood Pressure (BP):</strong> 22 pts (Dominant factor due to 172/109 mmHg)</li>
            <li><strong>Metabolic-Vascular (ApoB):</strong> 16 pts (Atherogenic dyslipidemia)</li>
            <li><strong>Lifestyle / Former Smoker:</strong> 6 pts (Past tobacco use load)</li>
            <li><strong>Physiological Stress:</strong> 6 pts (Neuro-autonomic activation)</li>
            <li><strong>Autonomic & Electrophysiology:</strong> HRV (3 pts), HR (3 pts), QTc (3 pts)</li>
          </ul>
          <p class="section-desc" style="margin-top: 1mm; margin-bottom: 0;">
            <em>Note:</em> Values represent internal model contribution points, not validated clinical causality.
          </p>
        </div>

        <!-- Section 9 -->
        <div>
          <div class="section-title">Section 9 — EchoNext Neural Model</div>
          <div class="content-box" style="padding: 2mm 2.5mm; margin-bottom: 1.5mm; border-left: 3px solid #f59e0b;">
            <div style="font-size: 7pt; font-weight: 700; color: #0f172a; margin-bottom: 1mm;">
              ECHONEXT 1D RESNET-34 CLASSIFIER (IN-APP)
            </div>
            <div style="font-size: 6.8pt; color: #b45309; font-weight: 700; margin-bottom: 0.8mm;">
              Classified: NORM · HYP
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 7pt;">
              <span style="color: #64748b;">SHD Index:</span>
              <span class="val-cell" style="color: #0284c7;">29% (Moderate Structural Burden)</span>
            </div>
          </div>
          <p class="section-desc" style="font-size: 7pt; margin-bottom: 0;">
            The in-app ResNet-34 neural model evaluates physiological waveforms, detecting hypertensive structural remodeling (<code>HYP</code>) with an SHD Index of 29%. This provides deep learning corroboration of chronic hypertensive heart disease in the background of acute cerebrovascular ischemia.
          </p>
        </div>
      </div>

      <!-- Section 10 -->
      <div style="margin-bottom: 2.8mm;">
        <div class="section-title">Section 10 — How the CVD Scenario Functions</div>
        <div class="flow-box">
          <div style="font-size: 6.8pt; font-weight: 700; color: #475569; text-transform: uppercase;">
            Information Processing Pipeline:
          </div>
          <div class="flow-steps">
            <div class="flow-node">CVD Stroke Scenario</div>
            <span class="flow-arrow">→</span>
            <div class="flow-node">Simulated Inputs</div>
            <span class="flow-arrow">→</span>
            <div class="flow-node">Physio Measurements</div>
            <span class="flow-arrow">→</span>
            <div class="flow-node">Risk Assessment</div>
            <span class="flow-arrow">→</span>
            <div class="flow-node">Score: 59 / Mod</div>
            <span class="flow-arrow">→</span>
            <div class="flow-node">Supporting Indicators</div>
            <span class="flow-arrow">→</span>
            <div class="flow-node">Risk Trend</div>
            <span class="flow-arrow">→</span>
            <div class="flow-node">Patient Report</div>
          </div>
        </div>
        <p class="section-desc" style="margin-bottom: 0;">
          The simulation begins by loading scenario parameters representing an ischemic stroke event (75% cerebral arterial occlusion, 172/109 mmHg BP, QTc 509 ms). Continuous sensors compute hemodynamic indices (shortened PTT of 106 ms, blunted HRV of 30 ms). The risk engine synthesizes these with lab and CT inputs, yielding a composite score of 59 (Moderate Risk) and a sharp 7-day trend escalation (20 → 59), which feeds into the supervisory dashboard and comprehensive patient report.
        </p>
      </div>

      <!-- Section 11 -->
      <div>
        <div class="section-title">Section 11 — Scenario Summary & Concluding Interpretation</div>
        <p class="section-desc">
          The CVD — Ischemic Stroke scenario demonstrates the platform's multi-layered response to systemic vascular emergencies. The dashboard highlights severe Stage 2 hypertension (172/109 mmHg), vascular stiffness (PTT 106 ms), active pericoronary inflammation (FAI -68.0 HU), and cerebrogenic repolarization prolongation (QTc 509 ms). The resulting composite score of 59 and steep 7-day trend (20 → 59) communicate heightened vascular risk dominated by blood pressure (22 pts) and atherogenic dyslipidemia (16 pts), without false alarms of acute transmural myocardial infarction.
        </p>

        <!-- Disclaimer -->
        <div class="disclaimer-card">
          <div class="disclaimer-text">
            <strong>Research / Simulation Prototype Disclaimer:</strong><br />
            Research / simulation output — not a clinical diagnosis. This report describes the current simulator implementation and its displayed outputs. It is intended solely for engineering validation, technical review, and academic research purposes.
          </div>
        </div>
      </div>
    </div>

    <footer class="doc-footer">
      <div>Arohan Health · Precision Cardiovascular Risk Intelligence Platform · Technical Scenario Report</div>
      <div class="footer-right">Page 4 of 4</div>
    </footer>
  </section>

</body>
</html>`;

  fs.writeFileSync('public/cvd_ischemic_stroke_report_document.html', html);
  console.log('Wrote public/cvd_ischemic_stroke_report_document.html');

  console.log('Launching headless Chrome for PDF compilation...');
  const chrome = spawn(chromePath, [
    `--remote-debugging-port=${port}`,
    '--headless=new',
    '--disable-gpu',
    '--window-size=1536,1200',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 1500));
  const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const page = list.find(p => p.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  let id = 1;
  const send = (method, params = {}) => new Promise((resolve) => {
    const msgId = id++;
    const timer = setTimeout(() => resolve({ error: 'Timeout ' + method }), 30000);
    const handler = (evt) => {
      const data = JSON.parse(evt.data);
      if (data.id === msgId) {
        clearTimeout(timer);
        ws.removeEventListener('message', handler);
        resolve(data.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });

  await send('Page.enable');
  const fileUrl = 'file:///' + path.resolve('public/cvd_ischemic_stroke_report_document.html').replace(/\\/g, '/');
  await send('Page.navigate', { url: fileUrl });
  await new Promise(r => setTimeout(r, 2000));

  // Check page overflow
  const pageMetrics = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const pages = document.querySelectorAll('.pdf-page');
        return Array.from(pages).map((p, i) => ({
          page: i + 1,
          scrollHeight: p.scrollHeight,
          clientHeight: p.clientHeight,
          overflow: p.scrollHeight > p.clientHeight
        }));
      })()
    `,
    returnByValue: true
  });

  console.log('Page overflow report:', pageMetrics.result.value);

  console.log('Generating PDF via Page.printToPDF...');
  const pdfResult = await send('Page.printToPDF', {
    printBackground: true,
    paperWidth: 8.27, // A4 width in inches (210mm)
    paperHeight: 11.69, // A4 height in inches (297mm)
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    preferCSSPageSize: true
  });

  const pdfBuf = Buffer.from(pdfResult.data, 'base64');
  const outPath = path.resolve('CVD_Ischemic_Stroke_Scenario_Report.pdf');
  fs.writeFileSync(outPath, pdfBuf);
  console.log(`SUCCESS! Generated PDF: ${outPath} (${pdfBuf.length} bytes)`);

  ws.close();
  chrome.kill();
  process.exit(0);
}

buildPdf().catch(err => {
  console.error('Fatal PDF compilation error:', err);
  process.exit(1);
});

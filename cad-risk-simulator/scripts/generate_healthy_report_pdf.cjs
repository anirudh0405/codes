const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9368;

function toBase64(filePath) {
  const buf = fs.readFileSync(filePath);
  return `data:image/png;base64,${buf.toString('base64')}`;
}

async function buildPdf() {
  console.log('Encoding screenshots for Healthy Baseline Scenario Report...');
  const upperImg = toBase64('public/healthy_report_assets/01_healthy_upper_overview.png');
  const trendImg = toBase64('public/healthy_report_assets/02_healthy_trend_readouts.png');
  const echoImg = toBase64('public/healthy_report_assets/03_healthy_echonext_contributions.png');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Healthy — Baseline Scenario Report</title>
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

    .pill-green {
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
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

    .status-normal {
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
    }

    .status-stage1 {
      background: #fef3c7;
      color: #b45309;
      border: 1px solid #fde68a;
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
      border-top: 2.5px solid #0284c7;
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
      color: #059669;
      font-weight: 600;
      margin-top: 0.4mm;
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
      gap: 1.5mm;
      margin-top: 1.5mm;
    }

    .flow-node {
      background: #ffffff;
      border: 1px solid #0284c7;
      border-radius: 4px;
      padding: 1.2mm 2mm;
      font-size: 6.5pt;
      font-weight: 700;
      color: #0f172a;
      text-align: center;
      flex: 1;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }

    .flow-arrow {
      color: #0284c7;
      font-weight: 800;
      font-size: 8pt;
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
       PAGE 1: OVERVIEW & OVERALL DASHBOARD RESULT
       ===================================================================== -->
  <section class="pdf-page">
    <div>
      <header class="doc-header">
        <div class="header-left">
          <h1>Precision Cardiovascular Risk Intelligence Platform</h1>
          <h2>Healthy — Baseline Scenario Report</h2>
          <div style="font-size: 7.5pt; color: #64748b; margin-top: 0.8mm;">
            Dashboard Output and Scenario Interpretation
          </div>
        </div>
        <div class="header-right">
          <div class="pill-badge pill-green">Scenario: Healthy — Baseline</div>
          <div class="pill-badge pill-subtle">Research / Simulation Prototype</div>
        </div>
      </header>

      <!-- Section 1 -->
      <div style="margin-bottom: 2.8mm;">
        <div class="section-title">Section 1 — Scenario Overview</div>
        <p class="section-desc">
          The <strong>Healthy — Baseline</strong> scenario provides the foundational reference state in the Precision Cardiovascular Risk Intelligence Platform simulator. It establishes resting physiological, hemodynamic, and biochemical parameters within clinically established optimal boundaries for a 45-year-old male with no known history of cardiovascular disease, diabetes, or hypertension. In the context of engineering evaluation and educational simulation, this scenario provides a normal reference baseline against which pathological deviations (such as coronary artery disease, hypertensive crises, or arrhythmias) can be objectively benchmarked.
        </p>
        <p class="section-desc" style="margin-bottom: 0;">
          <em>Note:</em> This scenario represents an idealized reference state configured in the simulator rather than a medically confirmed clinical patient. It serves to demonstrate expected baseline behavior across the platform's multi-parameter risk architecture.
        </p>
      </div>

      <!-- Section 2 -->
      <div>
        <div class="section-title">Section 2 — Overall Dashboard Result</div>
        <p class="section-desc">
          When the Healthy — Baseline scenario is selected, the live dashboard synthesizes continuous vital signs, cardiovascular imaging parameters, and laboratory inputs into a unified supervisory interface. The interface presents an overall <strong>Low Risk</strong> classification supported by harmonious resting hemodynamic indicators.
        </p>

        <!-- Upper Screenshot -->
        <div class="figure-frame">
          <img src="${upperImg}" alt="Upper Dashboard Viewport" class="figure-img" />
          <div class="figure-caption-bar">
            <span><strong>Figure 1:</strong> Primary Dashboard Viewport (Healthy — Baseline Scenario)</span>
            <span>Composite Risk: 14/100 · Low Risk · HR: 68 BPM · BP: 122/81 mmHg · HRV: 70 ms · FAI: -82.0 HU · CAC: 0 AU</span>
          </div>
        </div>

        <p class="section-desc">
          The overall simulator assessment functions through multi-vector concordance: resting heart rate (68 BPM) and high heart rate variability (70 ms) signal autonomic equilibrium with dominant parasympathetic vagal tone; resting blood pressure (122/81 mmHg) remains stable; and non-invasive imaging surrogates (FAI -82.0 HU and CAC 0 AU) confirm the absence of measurable coronary vascular inflammation or calcification.
        </p>
      </div>
    </div>

    <footer class="doc-footer">
      <div>Arohan Health · Precision Cardiovascular Risk Intelligence Platform · Technical Scenario Report</div>
      <div class="footer-right">Page 1 of 4</div>
    </footer>
  </section>


  <!-- =====================================================================
       PAGE 2: PRIMARY OUTPUT & PHYSIOLOGICAL PARAMETERS
       ===================================================================== -->
  <section class="pdf-page">
    <div>
      <header class="doc-header">
        <div class="header-left">
          <h1>Precision Cardiovascular Risk Intelligence Platform</h1>
          <h2>Healthy — Baseline Scenario Report</h2>
          <div style="font-size: 7.5pt; color: #64748b; margin-top: 0.8mm;">
            Section 3 & 4: Primary Output & Physiological Parameters
          </div>
        </div>
        <div class="header-right">
          <div class="pill-badge pill-green">Baseline Telemetry</div>
          <div class="pill-badge pill-subtle">Primary Metrics</div>
        </div>
      </header>

      <!-- Section 3 -->
      <div style="margin-bottom: 3.5mm;">
        <div class="section-title">Section 3 — Primary Output</div>
        <div class="metric-grid-4">
          <div class="metric-card-light">
            <div class="metric-card-title">Composite Risk Score</div>
            <div class="metric-card-value">14 <span style="font-size: 7pt; font-weight: 500; color: #64748b;">/ 100</span></div>
            <div class="metric-card-sub">Tier: Optimal (0–20)</div>
          </div>
          <div class="metric-card-light">
            <div class="metric-card-title">Risk Band</div>
            <div class="metric-card-value" style="color: #059669; font-size: 8.5pt;">LOW RISK</div>
            <div class="metric-card-sub">Color Code: Green</div>
          </div>
          <div class="metric-card-light">
            <div class="metric-card-title">7-Day Risk Trend</div>
            <div class="metric-card-value">19 <span style="font-size: 7pt; font-weight: 500; color: #64748b;">(Stable)</span></div>
            <div class="metric-card-sub">Flat Trajectory</div>
          </div>
          <div class="metric-card-light">
            <div class="metric-card-title">Trajectory State</div>
            <div class="metric-card-value" style="color: #0284c7; font-size: 8.5pt;">HOMEOSTATIC</div>
            <div class="metric-card-sub">Zero Pathologic Drift</div>
          </div>
        </div>

        <p class="section-desc">
          <strong>Current Risk Score (14/100):</strong> The composite score integrates multiple physiological streams into a unified 0–100 scale. A score of 14 falls squarely in the <strong>Low Risk band (0–20)</strong>. In this simulator, this value indicates that cardiovascular stress, lipid burden, autonomic strain, and vascular calcification are all within physiological limits. Users should interpret this score as an index of cardiovascular resilience under resting conditions.
        </p>
        <p class="section-desc">
          <strong>7-Day Risk Trend:</strong> The 7-day trend displays a steady, flat trajectory around the baseline level (~19). Longitudinal tracking is crucial because transient hemodynamic spikes (e.g., from momentary stress or exertion) can temporarily elevate isolated vitals. A flat 7-day trend confirms that the low score is an enduring physiological baseline rather than a transient anomaly.
        </p>
      </div>

      <!-- Section 4 -->
      <div>
        <div class="section-title">Section 4 — Physiological Parameters</div>
        <p class="section-desc">
          The top telemetry tier continuously tracks three primary hemodynamic and autonomic indicators:
        </p>

        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 22%;">Parameter</th>
              <th style="width: 16%;">Current Value</th>
              <th style="width: 18%;">Dashboard Status</th>
              <th style="width: 24%;">Physiological Meaning</th>
              <th style="width: 20%;">Simulation Role</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Heart Rate (HR)</strong></td>
              <td class="val-cell">68 BPM</td>
              <td><span class="status-pill-table status-normal">Normal Sinus Rhythm</span></td>
              <td>Resting sinoatrial node intrinsic pacing frequency.</td>
              <td>Establishes myocardial oxygen demand and chronotropic efficiency.</td>
            </tr>
            <tr>
              <td><strong>Blood Pressure (BP)</strong></td>
              <td class="val-cell">122/81 mmHg</td>
              <td><span class="status-pill-table status-stage1">Stage 1 Borderline</span></td>
              <td>Systolic/diastolic arterial pressure during cardiac cycle.</td>
              <td>Reflects systemic vascular resistance and left ventricular afterload.</td>
            </tr>
            <tr>
              <td><strong>Heart Rate Variability</strong></td>
              <td class="val-cell">70 ms (RMSSD)</td>
              <td><span class="status-pill-table status-normal">Healthy Vagal Tone</span></td>
              <td>Root mean square of successive beat-to-beat difference.</td>
              <td>Primary marker of autonomic regulation and parasympathetic resilience.</td>
            </tr>
          </tbody>
        </table>

        <div class="content-box">
          <p class="section-desc" style="margin-bottom: 0;">
            <strong>Interpretation of Interacting Vitals:</strong> The combination of HR 68 BPM and RMSSD 70 ms indicates excellent parasympathetic vagal recovery. While systolic BP registers 122 mmHg (slightly above the strict 120 mmHg threshold, flagging as Stage 1 borderline), the absence of elevated heart rate or depressed HRV prevents the risk engine from triggering an inflammatory or hypertensive alert, illustrating the engine's holistic weighting.
          </p>
        </div>
      </div>
    </div>

    <footer class="doc-footer">
      <div>Arohan Health · Precision Cardiovascular Risk Intelligence Platform · Technical Scenario Report</div>
      <div class="footer-right">Page 2 of 4</div>
    </footer>
  </section>


  <!-- =====================================================================
       PAGE 3: IMAGING, LABS, AND SUB-SCORES
       ===================================================================== -->
  <section class="pdf-page">
    <div>
      <header class="doc-header">
        <div class="header-left">
          <h1>Precision Cardiovascular Risk Intelligence Platform</h1>
          <h2>Healthy — Baseline Scenario Report</h2>
          <div style="font-size: 7.5pt; color: #64748b; margin-top: 0.8mm;">
            Section 5, 6 & 7: Imaging, Laboratory & Disease-Specific Sub-Scores
          </div>
        </div>
        <div class="header-right">
          <div class="pill-badge pill-green">Vascular & Lab Concordance</div>
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
              <td class="val-cell">-82.0 HU</td>
              <td><span class="status-pill-table status-normal">Normal · Low Inflam.</span></td>
              <td>Pericoronary adipose CT attenuation gradient.</td>
              <td>Detects early vascular inflammation before structural stenosis.</td>
            </tr>
            <tr>
              <td><strong>Coronary Artery Calcium (CAC)</strong></td>
              <td class="val-cell">0 AU</td>
              <td><span class="status-pill-table status-normal">None · Very Low (&lt;5%)</span></td>
              <td>Agatston score of calcified coronary atheroma.</td>
              <td>Quantifies cumulative chronic plaque burden and structural calcification.</td>
            </tr>
          </tbody>
        </table>
        <p class="section-desc">
          <em>Diagnostic Context:</em> FAI (-82.0 HU) is well below the established risk threshold (-70.1 HU), and CAC (0 AU) confirms the complete absence of calcified coronary plaques. These metrics enter the platform via manual CT entry (not sensor-estimated). They are included to anchor vital sign dynamics to structural anatomical reality without claiming independent automated diagnosis.
        </p>
      </div>

      <!-- Scrolled Middle Screenshot -->
      <div class="figure-frame">
        <img src="${trendImg}" alt="Trend and Lab Readouts" class="figure-img" style="max-height: 52mm;" />
        <div class="figure-caption-bar">
          <span><strong>Figure 2:</strong> Longitudinal Trend & Cardiac Readouts Panel</span>
          <span>QTc: 421 ms (Normal) · ST: 0.00 mV (Isoelectric) · Total Cholesterol: 175 mg/dL · HDL: 55 mg/dL · Triglycerides: 105 mg/dL</span>
        </div>
      </div>

      <!-- Section 6 & 7 -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 3.5mm; margin-top: 2.5mm;">
        <!-- Section 6 -->
        <div>
          <div class="section-title">Section 6 — Lab & Cardiac Readouts</div>
          <p class="section-desc">
            <strong>Cardiac Readouts:</strong> Corrected QT interval (QTc) is <strong>421 ms</strong> (within normal male limit &lt;450 ms), and the ST segment is <strong>0.00 mV</strong> (isoelectric, indicating no acute ischemia or repolarization abnormality).
          </p>
          <p class="section-desc" style="margin-bottom: 0;">
            <strong>Lab Summary:</strong> Total cholesterol is <strong>175 mg/dL</strong>, HDL is <strong>55 mg/dL</strong>, triglycerides are <strong>105 mg/dL</strong>, and Lp(a) is <strong>12.9 mg/dL</strong>. These laboratory inputs confirm an atheroprotective lipid profile supporting the low baseline score.
          </p>
        </div>

        <!-- Section 7 -->
        <div>
          <div class="section-title">Section 7 — Disease-Specific Risk</div>
          <p class="section-desc">
            The platform provides five simulator-derived disease sub-scores to help users dissect multidimensional risk:
          </p>
          <ul style="font-size: 7.2pt; color: #334155; margin-left: 4mm; line-height: 1.45;">
            <li><strong>Hypertension (HTN):</strong> 28/100 (Borderline systolic influence)</li>
            <li><strong>Atherosclerosis:</strong> 14/100 (Favorable lipids + CAC 0)</li>
            <li><strong>Arrhythmia:</strong> 18/100 (Normal rhythm and QTc)</li>
            <li><strong>Ischemia:</strong> 12/100 (Isoelectric ST + normal FAI)</li>
            <li><strong>Heart Failure:</strong> 15/100 (Normal rate and afterload)</li>
          </ul>
        </div>
      </div>
    </div>

    <footer class="doc-footer">
      <div>Arohan Health · Precision Cardiovascular Risk Intelligence Platform · Technical Scenario Report</div>
      <div class="footer-right">Page 3 of 4</div>
    </footer>
  </section>


  <!-- =====================================================================
       PAGE 4: CONTRIBUTIONS, ECHONEXT, EXECUTION FLOW & SUMMARY
       ===================================================================== -->
  <section class="pdf-page">
    <div>
      <header class="doc-header">
        <div class="header-left">
          <h1>Precision Cardiovascular Risk Intelligence Platform</h1>
          <h2>Healthy — Baseline Scenario Report</h2>
          <div style="font-size: 7.5pt; color: #64748b; margin-top: 0.8mm;">
            Section 8–11: Contributions, Deep Learning, Architecture & Summary
          </div>
        </div>
        <div class="header-right">
          <div class="pill-badge pill-green">Model Synthesis</div>
          <div class="pill-badge pill-subtle">Summary & Disclaimer</div>
        </div>
      </header>

      <!-- Section 8 & 9 Grid -->
      <div style="display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 3.5mm; margin-bottom: 2.8mm;">
        <!-- Section 8 -->
        <div>
          <div class="section-title">Section 8 — Risk Contributions</div>
          <p class="section-desc">
            The <em>Major Risk Contributions</em> visualization decomposes the composite score into its constituent drivers. In the Healthy — Baseline scenario, total risk points are minimal and distributed across nominal baseline factors:
          </p>
          <ul style="font-size: 7.2pt; color: #334155; margin-left: 4mm; line-height: 1.45;">
            <li><strong>Blood Pressure:</strong> Minor baseline contribution (~6–8 pts) due to 122 mmHg systolic.</li>
            <li><strong>Lipids & Metabolic:</strong> Nominal load (~3–4 pts) reflecting optimal lipid balance.</li>
            <li><strong>Autonomic / Stress:</strong> Minimal (~2 pts) with stress index at 20 and HRV at 70 ms.</li>
          </ul>
          <p class="section-desc" style="margin-top: 1mm; margin-bottom: 0;">
            <em>Note:</em> These weights represent internal simulator contribution points, not clinically validated epidemiological causal percentages.
          </p>
        </div>

        <!-- Section 9 -->
        <div>
          <div class="section-title">Section 9 — EchoNext Neural Model</div>
          <div class="content-box" style="padding: 2mm 2.5mm; margin-bottom: 1.5mm;">
            <div style="font-size: 7pt; font-weight: 700; color: #0f172a; margin-bottom: 1mm;">
              ECHONEXT 1D RESNET-34 CLASSIFIER
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 7pt; margin-bottom: 0.8mm;">
              <span style="color: #64748b;">Classified State:</span>
              <span class="val-cell" style="color: #047857;">NORM (Normal)</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 7pt;">
              <span style="color: #64748b;">SHD Index:</span>
              <span class="val-cell" style="color: #0284c7;">4% (Minimal Structural Burden)</span>
            </div>
          </div>
          <p class="section-desc" style="font-size: 7pt; margin-bottom: 0;">
            EchoNext performs real-time in-app neural classification directly from physiological waveforms. In this scenario, it independently validates the absence of structural heart disease (SHD 4%), corroborating classical biometric scoring with deep learning feature extraction.
          </p>
        </div>
      </div>

      <!-- Section 10 -->
      <div style="margin-bottom: 2.8mm;">
        <div class="section-title">Section 10 — How This Scenario Functions</div>
        <div class="flow-box">
          <div style="font-size: 6.8pt; font-weight: 700; color: #475569; text-transform: uppercase;">
            Information Processing Pipeline:
          </div>
          <div class="flow-steps">
            <div class="flow-node">Healthy Scenario</div>
            <span class="flow-arrow">→</span>
            <div class="flow-node">Simulated Vitals</div>
            <span class="flow-arrow">→</span>
            <div class="flow-node">Risk Engine</div>
            <span class="flow-arrow">→</span>
            <div class="flow-node">Score: 14 / Low</div>
            <span class="flow-arrow">→</span>
            <div class="flow-node">Supporting Indicators</div>
            <span class="flow-arrow">→</span>
            <div class="flow-node">7-Day Trend</div>
            <span class="flow-arrow">→</span>
            <div class="flow-node">Supervisory UI</div>
          </div>
        </div>
        <p class="section-desc" style="margin-bottom: 0;">
          The pipeline begins with preset physiological vitals (HR 68, BP 122/81, HRV 70 ms) and baseline lab parameters (CAC 0, FAI -82). The multi-vector risk engine processes these inputs through rule-based and weighted regression algorithms, generating a primary composite score (14) and 5 sub-scores. In parallel, the EchoNext ResNet-34 neural model evaluates waveform features. Finally, outputs are aggregated into the reactive UI state, presenting a coherent clinical snapshot with longitudinal trend tracking.
        </p>
      </div>

      <!-- Section 11 -->
      <div>
        <div class="section-title">Section 11 — Summary & Concluding Synthesis</div>
        <p class="section-desc">
          The Healthy — Baseline scenario provides an essential reference state for the simulator. The dashboard combines resting physiological measurements with supporting cardiovascular indicators and presents them as an overall risk assessment and historical trend. By demonstrating concordant low-risk values across hemodynamic, autonomic, vascular, and deep learning modules, this scenario proves the platform's ability to maintain a stable, non-pathological baseline without generating false positive alerts.
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

  fs.writeFileSync('public/healthy_baseline_report_document.html', html);
  console.log('Wrote public/healthy_baseline_report_document.html');

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
  const fileUrl = 'file:///' + path.resolve('public/healthy_baseline_report_document.html').replace(/\\/g, '/');
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
  const outPath = path.resolve('Healthy_Baseline_Scenario_Report.pdf');
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

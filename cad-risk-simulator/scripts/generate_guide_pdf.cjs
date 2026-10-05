const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const screensDir = path.resolve('public/guide_screens');
const logoPath = path.resolve('public/arohan-logo.png');

function toBase64(filePath) {
  if (!fs.existsSync(filePath)) return '';
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).slice(1);
  return `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${buf.toString('base64')}`;
}

const logoBase64 = toBase64(logoPath);
const screens = {
  main: toBase64(path.join(screensDir, '01_main_dashboard.png')),
  scenario: toBase64(path.join(screensDir, '02_scenario_selector.png')),
  riskScore: toBase64(path.join(screensDir, '03_risk_score_section.png')),
  diseaseRisk: toBase64(path.join(screensDir, '04_disease_risk_contributions.png')),
  riskTrend: toBase64(path.join(screensDir, '05_risk_trend_bar.png')),
  physio: toBase64(path.join(screensDir, '06_physiological_parameters.png')),
  faiCac: toBase64(path.join(screensDir, '07_fai_cac_cards.png')),
  readoutsLabs: toBase64(path.join(screensDir, '08_readouts_and_labs.png')),
  uploadPanel: toBase64(path.join(screensDir, '09_report_upload_panel.png')),
  reportTop: toBase64(path.join(screensDir, '10_patient_report_top.png')),
  reportBottom: toBase64(path.join(screensDir, '11_patient_report_bottom.png')),
  logoModal: toBase64(path.join(screensDir, '12_enlarged_logo_modal.png')),
};

function pageHeader(sectionTitle) {
  return `
    <header class="doc-header">
      <div class="header-left">
        <img src="${logoBase64}" alt="Arohan" class="header-logo" />
        <span class="header-platform">Precision Cardiovascular Risk Intelligence Platform</span>
      </div>
      <div class="header-section">${sectionTitle}</div>
    </header>
  `;
}

function pageFooter(pageNum) {
  return `
    <footer class="doc-footer">
      <span class="footer-left">Dashboard Overview &amp; Feature Guide</span>
      <span class="footer-center">Research &amp; Educational Prototype · Not Clinically Validated</span>
      <span class="footer-right">Page ${pageNum} of 16</span>
    </footer>
  `;
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Precision Cardiovascular Risk Dashboard Guide</title>
  <style>
    @page {
      size: 210mm 297mm;
      margin: 0;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      background: #f1f5f9;
      color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      line-height: 1.5;
    }
    .pdf-page {
      width: 210mm;
      height: 297mm;
      max-height: 297mm;
      padding: 16mm 18mm 14mm 18mm;
      page-break-after: always;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
    }
    /* Headers & Footers */
    .doc-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 3mm;
      border-bottom: 1px solid #cbd5e1;
      font-size: 8.5pt;
      color: #64748b;
      margin-bottom: 4mm;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .header-logo {
      height: 16px;
      width: auto;
      object-fit: contain;
    }
    .header-platform {
      font-weight: 600;
      color: #1e293b;
      letter-spacing: -0.01em;
    }
    .header-section {
      text-transform: uppercase;
      font-size: 7.5pt;
      font-weight: 600;
      letter-spacing: 0.05em;
      color: #0284c7;
    }
    .doc-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 3mm;
      border-top: 1px solid #e2e8f0;
      font-size: 7.5pt;
      color: #94a3b8;
      margin-top: 4mm;
    }
    .footer-left { font-weight: 500; }
    .footer-center { font-style: italic; }
    .footer-right { font-weight: 600; color: #475569; }

    /* Page Content Structure */
    .page-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    h1.page-title {
      font-size: 19pt;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 1.5mm 0;
      letter-spacing: -0.02em;
      line-height: 1.2;
    }
    h2.page-subtitle {
      font-size: 11pt;
      font-weight: 500;
      color: #475569;
      margin: 0 0 4mm 0;
    }
    p {
      font-size: 9.5pt;
      color: #334155;
      margin: 0 0 3mm 0;
      line-height: 1.55;
    }
    .lead-text {
      font-size: 10pt;
      color: #1e293b;
      line-height: 1.55;
      margin-bottom: 3.5mm;
    }

    /* Cards & Containers */
    .doc-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 3.5mm 4mm;
      margin-bottom: 3.5mm;
    }
    .doc-card-title {
      font-size: 9.5pt;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 1.5mm;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .doc-card-badge {
      font-size: 7pt;
      font-weight: 700;
      background: #e0f2fe;
      color: #0369a1;
      padding: 1px 5px;
      border-radius: 3px;
    }

    /* Screenshots */
    .screenshot-frame {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
      box-shadow: 0 2px 6px rgba(0,0,0,0.06);
      background: #0a0f1d;
      margin: 2mm 0 3mm 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .screenshot-img {
      width: 100%;
      height: auto;
      display: block;
    }
    .screenshot-caption {
      font-size: 8pt;
      color: #64748b;
      text-align: center;
      margin-top: 1mm;
      margin-bottom: 3mm;
      font-style: italic;
    }

    /* Note Box */
    .prototype-note {
      background: #fffbeb;
      border-left: 3px solid #f59e0b;
      padding: 2.5mm 3.5mm;
      font-size: 8.5pt;
      color: #92400e;
      border-radius: 0 4px 4px 0;
      margin-top: auto;
    }
    .prototype-note strong { color: #78350f; }

    /* Numbered Callout Grid */
    .callout-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2mm 4mm;
      margin-top: 2mm;
    }
    .callout-item {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      font-size: 8pt;
      color: #334155;
      line-height: 1.35;
    }
    .callout-num {
      background: #0284c7;
      color: #ffffff;
      font-weight: 700;
      font-size: 7pt;
      width: 15px;
      height: 15px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }

    /* Key-Value Tables */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5pt;
      margin: 2mm 0 3mm 0;
    }
    .data-table th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 600;
      text-align: left;
      padding: 2mm 2.5mm;
      border: 1px solid #e2e8f0;
    }
    .data-table td {
      padding: 2mm 2.5mm;
      border: 1px solid #e2e8f0;
      color: #475569;
    }
    .data-table tr:nth-child(even) td {
      background: #f8fafc;
    }

    /* Cover Page Specific */
    .cover-body {
      display: flex;
      flex-direction: column;
      height: 100%;
      justify-content: space-between;
      padding: 10mm 4mm;
    }
    .cover-branding {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 8mm;
    }
    .cover-logo {
      height: 48px;
      width: auto;
      object-fit: contain;
    }
    .cover-titles {
      margin-bottom: 6mm;
    }
    .cover-h1 {
      font-size: 26pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.025em;
      line-height: 1.15;
      margin: 0 0 3mm 0;
    }
    .cover-h2 {
      font-size: 14pt;
      font-weight: 500;
      color: #0284c7;
      margin: 0 0 6mm 0;
      letter-spacing: -0.01em;
    }
    .cover-meta {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 4mm;
      padding: 4mm;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      font-size: 8.5pt;
      margin-top: 6mm;
    }
    .cover-meta-item strong {
      display: block;
      color: #64748b;
      font-size: 7.5pt;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 1px;
    }

    /* Flowchart on Page 2 */
    .flow-steps {
      display: flex;
      flex-direction: column;
      gap: 2mm;
      margin: 3mm 0;
    }
    .flow-step {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 2.5mm 3.5mm;
    }
    .flow-step-num {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #0284c7;
      color: #ffffff;
      font-size: 8.5pt;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .flow-step-content strong {
      display: block;
      font-size: 9pt;
      color: #0f172a;
    }
    .flow-step-content span {
      font-size: 8pt;
      color: #64748b;
    }
  </style>
</head>
<body>

  <!-- =====================================================================
       PAGE 1: COVER
       ===================================================================== -->
  <section class="pdf-page">
    <div class="cover-body">
      <div>
        <div class="cover-branding">
          <img src="${logoBase64}" alt="Arohan" class="cover-logo" />
          <div>
            <div style="font-size: 11pt; font-weight: 700; color: #0c1c38; letter-spacing: -0.01em;">Arohan Healthcare Solutions</div>
            <div style="font-size: 8pt; color: #64748b;">Precision Digital Cardiology &amp; Clinical Decision Support</div>
          </div>
        </div>

        <div class="cover-titles">
          <h1 class="cover-h1">Precision Cardiovascular Risk Intelligence Platform</h1>
          <h2 class="cover-h2">Dashboard Overview &amp; Feature Guide</h2>
          <p class="lead-text" style="max-width: 160mm;">
            A comprehensive architectural and functional walkthrough of the multi-modal cardiovascular risk simulation workstation, designed for cardiologists, academic supervisors, and technical reviewers.
          </p>
        </div>

        <div class="screenshot-frame" style="max-height: 125mm;">
          <img src="${screens.main}" alt="Dashboard Workstation" class="screenshot-img" />
        </div>
        <div class="screenshot-caption">Figure 1.0: Real-time clinical workstation interface displaying multi-parameter telemetry, risk scoring, and longitudinal trends.</div>
      </div>

      <div>
        <div class="prototype-note">
          <strong>Research and Educational Prototype Notice:</strong> This software is a simulation, modeling, and clinical decision-support workstation created for exploratory research and educational evaluation. It is not an FDA/CE cleared medical device and does not substitute for independent clinical judgment.
        </div>

        <div class="cover-meta">
          <div class="cover-meta-item">
            <strong>Target Audience</strong>
            Supervisors, Reviewers &amp; Clinicians
          </div>
          <div class="cover-meta-item">
            <strong>Implementation</strong>
            Web-Based Telemetry Workstation
          </div>
          <div class="cover-meta-item">
            <strong>Version &amp; Date</strong>
            v1.0.0 · October 2026
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- =====================================================================
       PAGE 2: WHAT THE PLATFORM DOES
       ===================================================================== -->
  <section class="pdf-page">
    ${pageHeader('Platform Architecture')}
    <div class="page-body">
      <h1 class="page-title">What the Platform Does</h1>
      <h2 class="page-subtitle">Purpose, Context, and End-to-End Processing Pipeline</h2>

      <p class="lead-text">
        The Precision Cardiovascular Risk Intelligence Platform was built to address a fundamental challenge in preventive cardiology: how to synthesize diverse, asynchronous patient data into a coherent, actionable risk assessment.
      </p>

      <div class="doc-card">
        <div class="doc-card-title">
          <span>Core Objective &amp; Clinical Context</span>
        </div>
        <p style="margin: 0;">
          Modern cardiovascular care relies on fragmented data sources—wearable vitals, laboratory blood tests, electrocardiography, and advanced coronary computed tomography. This platform acts as a unified clinical intelligence hub, enabling clinicians and researchers to test physiological scenarios, observe simulated biomarker interactions, and inspect how individual variables drive composite coronary disease risk.
        </p>
      </div>

      <div class="doc-card-title" style="margin-top: 2mm;">
        <span>End-to-End Data Pipeline Flow</span>
      </div>

      <div class="flow-steps">
        <div class="flow-step">
          <div class="flow-step-num">1</div>
          <div class="flow-step-content">
            <strong>Patient &amp; Scenario Inputs</strong>
            <span>Active demographic profile, pathological presets, or ingested clinical laboratory documents.</span>
          </div>
        </div>
        <div class="flow-step">
          <div class="flow-step-num">2</div>
          <div class="flow-step-content">
            <strong>Physiological Parameter Synthesis</strong>
            <span>Generates synchronized hemodynamic and electrophysiological values (HR, BP, HRV, ECG timing).</span>
          </div>
        </div>
        <div class="flow-step">
          <div class="flow-step-num">3</div>
          <div class="flow-step-content">
            <strong>Signal &amp; Sensor Processing</strong>
            <span>EchoNext 1D ResNet-34 deep learning inference analyzes raw rhythm morphology and structural indices.</span>
          </div>
        </div>
        <div class="flow-step">
          <div class="flow-step-num">4</div>
          <div class="flow-step-content">
            <strong>Multi-Factor Risk Assessment</strong>
            <span>Weighted clinical risk engine integrates Framingham, Reynolds, SCORE2, and biomarker heuristics.</span>
          </div>
        </div>
        <div class="flow-step">
          <div class="flow-step-num">5</div>
          <div class="flow-step-content">
            <strong>Interactive Dashboard &amp; Patient Report</strong>
            <span>Live visual workstation updates synchronously and generates exportable clinical PDF reports.</span>
          </div>
        </div>
      </div>

      <div class="prototype-note">
        <strong>Summary:</strong> By simulating the full continuum from raw pulse-wave telemetry to high-level clinical reports, the platform provides a transparent sandbox for exploring coronary artery disease trajectories.
      </div>
    </div>
    ${pageFooter(2)}
  </section>

  <!-- =====================================================================
       PAGE 3: DASHBOARD AT A GLANCE
       ===================================================================== -->
  <section class="pdf-page">
    ${pageHeader('Workstation Overview')}
    <div class="page-body">
      <h1 class="page-title">Dashboard at a Glance</h1>
      <h2 class="page-subtitle">Layout Structure and Primary Workstation Zones</h2>

      <div class="screenshot-frame" style="max-height: 98mm;">
        <img src="${screens.main}" alt="Annotated Dashboard" class="screenshot-img" />
      </div>
      <div class="screenshot-caption">Figure 3.1: Primary workstation interface divided into persistent navigation, active telemetry, and risk assessment panels.</div>

      <div class="callout-grid">
        <div class="callout-item">
          <div class="callout-num">1</div>
          <div><strong>Application Header:</strong> Uncontained Arohan branding, platform title, active breadcrumb, status badge, and live UTC clock.</div>
        </div>
        <div class="callout-item">
          <div class="callout-num">2</div>
          <div><strong>Scenario Selector:</strong> Dropdown to toggle simulated physiological profiles (Healthy, CAD, CVD states).</div>
        </div>
        <div class="callout-item">
          <div class="callout-num">3</div>
          <div><strong>Current Risk Score:</strong> 0–100 composite coronary artery disease risk gauge with color-coded risk band.</div>
        </div>
        <div class="callout-item">
          <div class="callout-num">4</div>
          <div><strong>Heart Rate (HR):</strong> Beats per minute with sinus rhythm classification and physiological reference range.</div>
        </div>
        <div class="callout-item">
          <div class="callout-num">5</div>
          <div><strong>Blood Pressure (BP):</strong> Systolic/diastolic arterial pressures classified by JNC 8 / AHA guidelines.</div>
        </div>
        <div class="callout-item">
          <div class="callout-num">6</div>
          <div><strong>Heart Rate Variability (RMSSD):</strong> Beat-to-beat root mean square variance indicating autonomic balance.</div>
        </div>
        <div class="callout-item">
          <div class="callout-num">7</div>
          <div><strong>ECG Model Status:</strong> In-app EchoNext 1D ResNet-34 classifier detecting rhythm abnormalities and structural heart index.</div>
        </div>
        <div class="callout-item">
          <div class="callout-num">8</div>
          <div><strong>Fat Attenuation Index (FAI):</strong> Perivascular adipose tissue radiodensity measuring coronary inflammation.</div>
        </div>
        <div class="callout-item">
          <div class="callout-num">9</div>
          <div><strong>Coronary Calcium Score (CAC):</strong> Agatston calcification burden indicating anatomical plaque presence.</div>
        </div>
        <div class="callout-item">
          <div class="callout-num">10</div>
          <div><strong>Cardiac Readouts:</strong> Electrophysiological timing parameters including QTc interval, ST deviation, PTT, and SpO2.</div>
        </div>
        <div class="callout-item">
          <div class="callout-num">11</div>
          <div><strong>Lab Summary:</strong> Lipid panel indicators (Total Cholesterol, LDL, HDL, Triglycerides) with clinical threshold flags.</div>
        </div>
        <div class="callout-item">
          <div class="callout-num">12</div>
          <div><strong>Disease-Specific Risk:</strong> Sub-risk bar indicators for Atherosclerosis, Ischemia, Arrhythmia, and Heart Failure.</div>
        </div>
        <div class="callout-item">
          <div class="callout-num">13</div>
          <div><strong>Contributions Ranking:</strong> Ranked feature influence quantifying parameter weight on the current score.</div>
        </div>
        <div class="callout-item">
          <div class="callout-num">14</div>
          <div><strong>7-Day Risk Trend:</strong> Recorded longitudinal chart tracing historical risk score stability and trajectory.</div>
        </div>
      </div>
    </div>
    ${pageFooter(3)}
  </section>

  <!-- =====================================================================
       PAGE 4: SCENARIOS
       ===================================================================== -->
  <section class="pdf-page">
    ${pageHeader('Physiological Modeling')}
    <div class="page-body">
      <h1 class="page-title">Scenario System</h1>
      <h2 class="page-subtitle">Controlled Pathological States for Research and Demonstration</h2>

      <p class="lead-text">
        The platform includes a dedicated scenario engine that dynamically reconfigures simulated inputs to reflect distinct cardiovascular conditions. This allows reviewers to observe how the risk engine responds to acute and chronic disease phenotypes.
      </p>

      <div class="screenshot-frame" style="max-height: 70mm;">
        <img src="${screens.scenario}" alt="Scenario Selector" class="screenshot-img" />
      </div>
      <div class="screenshot-caption">Figure 4.1: Scenario selection dropdown showing pre-configured physiological archetypes across three core categories.</div>

      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 22%;">Category</th>
            <th style="width: 38%;">Preset Archetypes</th>
            <th style="width: 40%;">Physiological Effect on Simulator</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Healthy</strong></td>
            <td>Baseline, Post-Exercise, Athletic Profile</td>
            <td>Maintains normal sinus rhythm, optimal BP (&lt;120/80 mmHg), healthy HRV (&gt;50 ms), and negative inflammatory markers.</td>
          </tr>
          <tr>
            <td><strong>Coronary Artery Disease (CAD)</strong></td>
            <td>Early Plaque, Significant Stenosis, Unstable Plaque</td>
            <td>Elevates FAI (-65 HU), increases CAC score (&gt;200 AU), elevates LDL, and induces subtle ST-segment depressions during stress.</td>
          </tr>
          <tr>
            <td><strong>Cardiovascular Disease (CVD)</strong></td>
            <td>Stage 1 &amp; 2 Hypertension, Arrhythmia / AFib, Diabetic Dyslipidemia, Heart Failure</td>
            <td>Induces sustained arterial hypertension (&gt;140/90 mmHg), depresses HRV (&lt;20 ms), triggers QTc prolongation, and elevates myocardial ischemia sub-scores.</td>
          </tr>
        </tbody>
      </table>

      <div class="prototype-note">
        <strong>Important Simulation Distinction:</strong> Scenarios are reproducible mathematical models designed to test risk algorithms and UI responsiveness. They do not represent real-time telemetry from living patients.
      </div>
    </div>
    ${pageFooter(4)}
  </section>

  <!-- =====================================================================
       PAGE 5: PRIMARY OUTPUT: RISK SCORE
       ===================================================================== -->
  <section class="pdf-page">
    ${pageHeader('Risk Engine Outputs')}
    <div class="page-body">
      <h1 class="page-title">Primary Output: Risk Score</h1>
      <h2 class="page-subtitle">Composite Multi-Modal Cardiovascular Risk Assessment</h2>

      <p class="lead-text">
        The primary output of the platform is the Coronary Artery Disease (CAD) Risk Score, displayed prominently in the right-hand inspection panel as a normalized radial gauge ranging from 0 to 100.
      </p>

      <div style="display: flex; gap: 5mm; align-items: flex-start; margin-bottom: 3mm;">
        <div class="screenshot-frame" style="width: 48%; max-height: 80mm; margin: 0;">
          <img src="${screens.riskScore}" alt="Risk Score Gauge" class="screenshot-img" />
        </div>
        <div style="flex: 1;">
          <div class="doc-card" style="margin-bottom: 2mm;">
            <div class="doc-card-title">What the Score Represents</div>
            <p style="font-size: 8.5pt; margin: 0;">
              Unlike single-variable calculators (e.g. lipid-only charts), this score synthesizes autonomic function (HRV), hemodynamic load (BP), electrophysiology (ECG), CT biomarkers (FAI/CAC), and circulating lipids into one holistic metric.
            </p>
          </div>
          <div class="doc-card" style="margin: 0;">
            <div class="doc-card-title">Confidence Metric</div>
            <p style="font-size: 8.5pt; margin: 0;">
              The gauge displays an explicit confidence score (0–100%) that dynamically degrades if simulated sensor motion artifacts or missing lab values compromise input signal integrity.
            </p>
          </div>
        </div>
      </div>

      <div class="doc-card-title">Risk Band Stratification &amp; Clinical Meaning</div>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 18%;">Range</th>
            <th style="width: 18%;">Band</th>
            <th style="width: 64%;">Clinical Interpretation in Simulator</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>0 – 20</strong></td>
            <td><span style="color: #10b981; font-weight: 700;">Very Low</span></td>
            <td>All biomarkers, hemodynamics, and lipid levels reside strictly within normative baselines.</td>
          </tr>
          <tr>
            <td><strong>21 – 40</strong></td>
            <td><span style="color: #10b981; font-weight: 700;">Low Risk</span></td>
            <td>Mild isolated elevation (e.g. pre-hypertension) with normal vascular imaging and lipid targets.</td>
          </tr>
          <tr>
            <td><strong>41 – 60</strong></td>
            <td><span style="color: #f59e0b; font-weight: 700;">Moderate</span></td>
            <td>Borderline dyslipidemia combined with Stage 1 hypertension or mild calcification burden (CAC 1–99).</td>
          </tr>
          <tr>
            <td><strong>61 – 80</strong></td>
            <td><span style="color: #ef4444; font-weight: 700;">High Risk</span></td>
            <td>Multiple significant risk drivers present: Stage 2 hypertension, active perivascular inflammation (FAI &gt; -70 HU).</td>
          </tr>
          <tr>
            <td><strong>81 – 100</strong></td>
            <td><span style="color: #b91c1c; font-weight: 700;">Critical</span></td>
            <td>Severe multi-system risk: heavy coronary calcification (CAC &gt; 400), ischemic ECG changes, severe dyslipidemia.</td>
          </tr>
        </tbody>
      </table>

      <div class="prototype-note">
        <strong>Research Disclaimer:</strong> The displayed score is generated by the simulator's internal assessment logic and should be interpreted as a research and educational output rather than a validated clinical diagnostic score.
      </div>
    </div>
    ${pageFooter(5)}
  </section>

  <!-- =====================================================================
       PAGE 6: RISK TREND
       ===================================================================== -->
  <section class="pdf-page">
    ${pageHeader('Longitudinal Analytics')}
    <div class="page-body">
      <h1 class="page-title">7-Day Risk Trend</h1>
      <h2 class="page-subtitle">Tracking Historical Trajectories and Treatment Responses</h2>

      <p class="lead-text">
        Cardiovascular risk is not static; single-point snapshots often conceal emerging destabilization or positive treatment response. The platform features a persistent 7-day risk trend bar anchored at the bottom of the central monitor.
      </p>

      <div class="screenshot-frame" style="max-height: 52mm;">
        <img src="${screens.riskTrend}" alt="7-Day Risk Trend Bar" class="screenshot-img" />
      </div>
      <div class="screenshot-caption">Figure 6.1: Longitudinal risk trend showing 7 recorded daily points (D1 through D7), current score (19 Low), and a stable trajectory indicator.</div>

      <div class="doc-card" style="margin-top: 3mm;">
        <div class="doc-card-title">
          <span>Why Historical Movement Matters</span>
        </div>
        <p style="margin: 0; font-size: 8.8pt;">
          In clinical cardiology, a patient whose risk score is 35 and steadily declining represents a very different prognosis from a patient whose score was 15 three days ago and has climbed sharply to 35. Longitudinal tracking allows clinicians to evaluate whether therapeutic interventions (e.g. statin initiation or antihypertensive titration) are successfully stabilizing vascular health.
        </p>
      </div>

      <table class="data-table" style="margin-top: 2mm;">
        <thead>
          <tr>
            <th style="width: 25%;">Trajectory Pattern</th>
            <th style="width: 35%;">Visual Representation</th>
            <th style="width: 40%;">Clinical Significance in Simulator</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Stable (<span style="color: #10b981;">→ Stable</span>)</strong></td>
            <td>Horizontal green curve (±2 points variance)</td>
            <td>Indicates steady physiological homeostasis without acute progressive plaque activity or hemodynamic volatility.</td>
          </tr>
          <tr>
            <td><strong>Increasing (<span style="color: #ef4444;">↗ Rising</span>)</strong></td>
            <td>Upward slope transitioning into amber/red</td>
            <td>Reflects progressive worsening in one or more drivers (e.g., escalating blood pressure, missed medication, or rising FAI).</td>
          </tr>
          <tr>
            <td><strong>Decreasing (<span style="color: #10b981;">↘ Improving</span>)</strong></td>
            <td>Downward curve trending toward low-risk band</td>
            <td>Simulates positive therapeutic response to lifestyle optimization, lipid-lowering therapy, or blood pressure control.</td>
          </tr>
        </tbody>
      </table>

      <div class="prototype-note">
        <strong>History Data Integrity:</strong> The chart reflects actual logged simulation history. If a new session has fewer than 7 days recorded, the system displays an "Insufficient historical data" indicator rather than fabricating artificial historical points.
      </div>
    </div>
    ${pageFooter(6)}
  </section>

  <!-- =====================================================================
       PAGE 7: PHYSIOLOGICAL PARAMETERS
       ===================================================================== -->
  <section class="pdf-page">
    ${pageHeader('Hemodynamic Telemetry')}
    <div class="page-body">
      <h1 class="page-title">Physiological Parameters</h1>
      <h2 class="page-subtitle">Real-Time Autonomic and Hemodynamic Telemetry Readouts</h2>

      <p class="lead-text">
        The upper telemetry grid displays four real-time parameter cards that update continuously based on the active sensor simulation pipeline.
      </p>

      <div class="screenshot-frame" style="max-height: 60mm;">
        <img src="${screens.physio}" alt="Physiological Parameter Cards" class="screenshot-img" />
      </div>
      <div class="screenshot-caption">Figure 7.1: Continuous physiological readouts: Risk Summary, Heart Rate, Blood Pressure, and Heart Rate Variability.</div>

      <div class="doc-card" style="margin-bottom: 2mm;">
        <div class="doc-card-title">
          <span>1. Heart Rate (HR)</span>
          <span class="doc-card-badge">Target: 60 – 100 BPM</span>
        </div>
        <p style="margin: 0; font-size: 8.5pt;">
          Represents the frequency of ventricular contractions per minute, extracted from simulated ECG and photoplethysmography (PPG) waveforms. The card indicates baseline sinus rhythm and alerts on resting bradycardia (&lt;50 bpm) or resting tachycardia (&gt;100 bpm).
        </p>
      </div>

      <div class="doc-card" style="margin-bottom: 2mm;">
        <div class="doc-card-title">
          <span>2. Blood Pressure (BP)</span>
          <span class="doc-card-badge">AHA / JNC 8 Standard</span>
        </div>
        <p style="margin: 0; font-size: 8.5pt;">
          Measures peak systolic arterial pressure during contraction and minimum diastolic pressure during filling (mmHg). The system provides dual range-indicator bars and classifies readings into Normal (&lt;120/80), Elevated (120–129/&lt;80), Stage 1 Hypertension (130–139/80–89), or Stage 2 Hypertension (≥140/≥90 mmHg).
        </p>
      </div>

      <div class="doc-card" style="margin-bottom: 2mm;">
        <div class="doc-card-title">
          <span>3. Heart Rate Variability (RMSSD)</span>
          <span class="doc-card-badge">Normal: 42 ± 15 ms</span>
        </div>
        <p style="margin: 0; font-size: 8.5pt;">
          Root Mean Square of Successive RR interval Differences (RMSSD) quantifies beat-to-beat variability in milliseconds. Higher values reflect robust parasympathetic vagal tone, while depressed HRV (&lt;20 ms) indicates sympathetic overdrive and heightened cardiovascular vulnerability.
        </p>
      </div>

      <div class="doc-card" style="margin-bottom: 2mm;">
        <div class="doc-card-title">
          <span>4. Cardiac Electrophysiological Readouts</span>
          <span class="doc-card-badge">QTc, ST, PTT, SpO2</span>
        </div>
        <p style="margin: 0; font-size: 8.5pt;">
          Secondary readouts include Bazett-corrected QT interval (QTc, normal &lt;440 ms in men, &lt;460 ms in women), ST-segment deviation (-0.05 to +0.05 mV), Pulse Transit Time (PTT), and peripheral blood oxygen saturation (SpO2 &gt;95%).
        </p>
      </div>
    </div>
    ${pageFooter(7)}
  </section>

  <!-- =====================================================================
       PAGE 8: FAI AND CAC
       ===================================================================== -->
  <section class="pdf-page">
    ${pageHeader('Imaging Biomarkers')}
    <div class="page-body">
      <h1 class="page-title">Fat Attenuation Index (FAI) &amp; CAC</h1>
      <h2 class="page-subtitle">CT-Derived Molecular Inflammation and Plaque Burden Markers</h2>

      <p class="lead-text">
        Conventional risk tools rely heavily on systemic biomarkers. The platform integrates two advanced imaging parameters that reflect coronary biological activity and anatomical disease.
      </p>

      <div class="screenshot-frame" style="max-height: 55mm;">
        <img src="${screens.faiCac}" alt="FAI and CAC Cards" class="screenshot-img" />
      </div>
      <div class="screenshot-caption">Figure 8.1: Specialized biomarker cards for perivascular Fat Attenuation Index (left) and Coronary Artery Calcium Score (right).</div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; margin-top: 2mm;">
        <div class="doc-card" style="margin: 0;">
          <div class="doc-card-title">
            <span>Fat Attenuation Index (FAI)</span>
          </div>
          <p style="font-size: 8.5pt; color: #1e293b; font-weight: 600; margin-bottom: 1.5mm;">
            Perivascular Adipose Tissue (PVAT) Radiodensity
          </p>
          <p style="font-size: 8.2pt; margin-bottom: 2mm;">
            <strong>What it measures:</strong> Derived from coronary computed tomography angiography (CCTA). When coronary arteries become inflamed, cytokines diffuse into surrounding fat, preventing adipocyte lipid accumulation and shifting CT density toward water.
          </p>
          <p style="font-size: 8.2pt; margin-bottom: 2mm;">
            <strong>Threshold:</strong> Measured in Hounsfield Units (HU). Values more negative than <strong>-70.1 HU</strong> are normal. Values between -70.0 and -60.0 HU indicate elevated perivascular inflammation.
          </p>
          <p style="font-size: 8.2pt; margin: 0;">
            <strong>Significance:</strong> Identifies vulnerable, actively inflamed plaques <em>before</em> luminal narrowing or structural rupture occurs.
          </p>
        </div>

        <div class="doc-card" style="margin: 0;">
          <div class="doc-card-title">
            <span>Coronary Calcium Score (CAC)</span>
          </div>
          <p style="font-size: 8.5pt; color: #1e293b; font-weight: 600; margin-bottom: 1.5mm;">
            Agatston Plaque Burden Quantification
          </p>
          <p style="font-size: 8.2pt; margin-bottom: 2mm;">
            <strong>What it measures:</strong> Quantifies calcium deposits within the coronary arterial intima on non-contrast chest CT.
          </p>
          <p style="font-size: 8.2pt; margin-bottom: 2mm;">
            <strong>Agatston Categories:</strong><br>
            • <strong>0 AU:</strong> None (Very low 5-year event risk &lt;1%)<br>
            • <strong>1 – 99 AU:</strong> Mild plaque burden<br>
            • <strong>100 – 399 AU:</strong> Moderate plaque burden<br>
            • <strong>≥ 400 AU:</strong> Extensive calcification (High risk)
          </p>
          <p style="font-size: 8.2pt; margin: 0;">
            <strong>Significance:</strong> A definitive physical marker of established atherosclerosis that reclassifies borderline clinical risk categories.
          </p>
        </div>
      </div>

      <div class="prototype-note" style="margin-top: 4mm;">
        <strong>Clinical Note:</strong> In this simulator, FAI and CAC are manually entered or ingested from imaging report uploads, as they cannot be estimated directly from non-invasive skin/pulse sensors.
      </div>
    </div>
    ${pageFooter(8)}
  </section>

  <!-- =====================================================================
       PAGE 9: LAB VALUES
       ===================================================================== -->
  <section class="pdf-page">
    ${pageHeader('Lipid Profiling')}
    <div class="page-body">
      <h1 class="page-title">Laboratory Lipid Summary</h1>
      <h2 class="page-subtitle">Circulating Metabolic Biomarkers and Atherogenic Lipoproteins</h2>

      <p class="lead-text">
        Lipid management is central to atherosclerotic prevention. The platform displays a consolidated Lab Summary card that tracks primary circulating lipoprotein fractions against standard clinical cutoffs.
      </p>

      <div class="screenshot-frame" style="max-height: 60mm;">
        <img src="${screens.readoutsLabs}" alt="Lab Summary Card" class="screenshot-img" />
      </div>
      <div class="screenshot-caption">Figure 9.1: Lower dashboard card displaying cardiac telemetry readouts alongside the active serum lipid profile.</div>

      <table class="data-table" style="margin-top: 2mm;">
        <thead>
          <tr>
            <th style="width: 22%;">Lipid Fraction</th>
            <th style="width: 20%;">Clinical Target</th>
            <th style="width: 58%;">Relevance to Cardiovascular Risk in Model</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Total Cholesterol (TC)</strong></td>
            <td>&lt; 200 mg/dL</td>
            <td>Overall sum of circulating cholesterol particles. Values &gt;240 mg/dL contribute substantial baseline points to the composite risk engine.</td>
          </tr>
          <tr>
            <td><strong>LDL Cholesterol</strong></td>
            <td>&lt; 100 mg/dL<br><span style="font-size: 7.5pt; color: #64748b;">(&lt;70 in high-risk)</span></td>
            <td>Low-Density Lipoprotein is the principal atherogenic particle responsible for subendothelial cholesterol retention and fatty streak formation.</td>
          </tr>
          <tr>
            <td><strong>HDL Cholesterol</strong></td>
            <td>&gt; 40 mg/dL (M)<br>&gt; 50 mg/dL (F)</td>
            <td>High-Density Lipoprotein mediates reverse cholesterol transport back to the liver. In the simulator, high HDL acts as a protective negative weight.</td>
          </tr>
          <tr>
            <td><strong>Triglycerides (TG)</strong></td>
            <td>&lt; 150 mg/dL</td>
            <td>Circulating neutral fats. Values &gt;200 mg/dL signify atherogenic remnant lipoproteins and insulin resistance, elevating metabolic sub-scores.</td>
          </tr>
          <tr>
            <td><strong>Apolipoprotein B (ApoB)</strong></td>
            <td>&lt; 80 mg/dL</td>
            <td>Direct count of all atherogenic particles (LDL, VLDL, IDL). Often provides superior predictive value compared to calculated LDL in dyslipidemia.</td>
          </tr>
        </tbody>
      </table>

      <div class="prototype-note">
        <strong>Data Ingestion:</strong> Lipid parameters can be populated via manual profile inputs, automated scenario presets, or parsed directly from uploaded lab PDF reports using the integrated OCR engine.
      </div>
    </div>
    ${pageFooter(9)}
  </section>

  <!-- =====================================================================
       PAGE 10: DISEASE-SPECIFIC RISK
       ===================================================================== -->
  <section class="pdf-page">
    ${pageHeader('Differential Phenotyping')}
    <div class="page-body">
      <h1 class="page-title">Disease-Specific Risk Sub-Scores</h1>
      <h2 class="page-subtitle">Differential Risk Decomposition Across Cardiovascular Pathologies</h2>

      <p class="lead-text">
        Coronary disease rarely exists in isolation. To provide nuanced decision support, the platform breaks down the patient's global risk into five disease-specific sub-scores displayed in the right inspection panel.
      </p>

      <div style="display: flex; gap: 5mm; align-items: flex-start; margin-bottom: 2mm;">
        <div class="screenshot-frame" style="width: 44%; max-height: 82mm; margin: 0;">
          <img src="${screens.diseaseRisk}" alt="Disease Specific Risk" class="screenshot-img" />
        </div>
        <div style="flex: 1;">
          <p style="font-size: 8.8pt; line-height: 1.5; margin-bottom: 2mm;">
            Each sub-score is an independently calculated 0–100 index with status tags (<strong>Healthy</strong>, <strong>Watch</strong>, or <strong>Elevated</strong>), allowing clinicians to pinpoint whether a patient's primary vulnerability is ischemic, electrical, or vascular.
          </p>
          <div class="doc-card" style="margin-bottom: 2mm;">
            <div class="doc-card-title">1. Atherosclerosis (0–100)</div>
            <p style="font-size: 8pt; margin: 0;">
              Driven predominantly by anatomical calcification (CAC), active perivascular fat inflammation (FAI), and circulating LDL/ApoB particles.
            </p>
          </div>
          <div class="doc-card" style="margin-bottom: 2mm;">
            <div class="doc-card-title">2. Myocardial Ischemia (0–100)</div>
            <p style="font-size: 8pt; margin: 0;">
              Calculated from ST-segment depression magnitude, Rate-Pressure Product (RPP = HR × SBP), and coronary stenosis estimates.
            </p>
          </div>
          <div class="doc-card" style="margin: 0;">
            <div class="doc-card-title">3. Arrhythmia &amp; Conduction (0–100)</div>
            <p style="font-size: 8pt; margin: 0;">
              Driven by QTc interval prolongation, autonomic HRV depression, and rhythm irregularity flags from the EchoNext deep learning model.
            </p>
          </div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; margin-top: 2mm;">
        <div class="doc-card" style="margin: 0;">
          <div class="doc-card-title">4. Hypertensive Heart Disease</div>
          <p style="font-size: 8.2pt; margin: 0;">
            Reflects chronic afterload strain derived from sustained systolic elevation (&gt;140 mmHg), diastolic pressure, and wide pulse pressure.
          </p>
        </div>
        <div class="doc-card" style="margin: 0;">
          <div class="doc-card-title">5. Heart Failure Trajectory</div>
          <p style="font-size: 8.2pt; margin: 0;">
            Early risk signal driven by depressed HRV, resting tachycardia, elevated blood pressure, and EchoNext structural heart disease (SHD) index.
          </p>
        </div>
      </div>

      <div class="prototype-note" style="margin-top: 3mm;">
        <strong>Statistical Notice:</strong> These sub-scores represent simulator-derived relative indices rather than epidemiologically validated actuarial event probabilities.
      </div>
    </div>
    ${pageFooter(10)}
  </section>

  <!-- =====================================================================
       PAGE 11: CONTRIBUTIONS (EXPLAINABLE AI)
       ===================================================================== -->
  <section class="pdf-page">
    ${pageHeader('Explainable AI (XAI)')}
    <div class="page-body">
      <h1 class="page-title">Risk Contributions &amp; Attribution</h1>
      <h2 class="page-subtitle">Transparent Factor Weighting and Feature Attribution</h2>

      <p class="lead-text">
        A recognized barrier to adopting clinical decision-support algorithms is the "black-box" problem. The platform incorporates transparent Explainable AI (XAI) feature attribution, allowing users to see exactly what parameters drive the overall score.
      </p>

      <div class="doc-card" style="margin-bottom: 3.5mm;">
        <div class="doc-card-title">What is Driving the Current Assessment?</div>
        <p style="font-size: 9pt; margin: 0;">
          The Contributions module deconstructs the composite risk score into proportional weighted points. Rather than delivering an unexplained number (e.g. 58), the system isolates whether the score is being pushed upward by Blood Pressure, Calcium Score, or LDL levels.
        </p>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 25%;">Risk Driver Parameter</th>
            <th style="width: 22%;">Typical Influence Weight</th>
            <th style="width: 53%;">Simulator Attribution Logic</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Coronary Calcium (CAC)</strong></td>
            <td>20 – 30% Weight</td>
            <td>Highest single weight in established disease; scales logarithmically with Agatston AU score.</td>
          </tr>
          <tr>
            <td><strong>Blood Pressure (Systolic)</strong></td>
            <td>18 – 25% Weight</td>
            <td>Calculates excess pressure above 120 mmHg; non-linear acceleration when SBP exceeds 140 mmHg.</td>
          </tr>
          <tr>
            <td><strong>LDL Cholesterol / ApoB</strong></td>
            <td>15 – 22% Weight</td>
            <td>Direct atherogenic particle penalty proportional to circulating concentration above 100 mg/dL.</td>
          </tr>
          <tr>
            <td><strong>Fat Attenuation Index</strong></td>
            <td>12 – 18% Weight</td>
            <td>Perivascular inflammation multiplier that amplifies plaque vulnerability scores.</td>
          </tr>
          <tr>
            <td><strong>Autonomic State (HRV)</strong></td>
            <td>8 – 14% Weight</td>
            <td>Inverse penalty: low RMSSD (&lt;25 ms) adds risk points; high RMSSD (&gt;50 ms) applies a protective credit.</td>
          </tr>
          <tr>
            <td><strong>ECG Morphology / EchoNext</strong></td>
            <td>6 – 12% Weight</td>
            <td>Penalties triggered by ST depression, prolonged QTc intervals, or structural heart disease flags.</td>
          </tr>
        </tbody>
      </table>

      <div class="doc-card" style="margin-top: 3mm;">
        <div class="doc-card-title">Clinical Utility of Attribution</div>
        <p style="font-size: 8.5pt; margin: 0;">
          By identifying the dominant contributor for a given patient profile, the decision-support system suggests personalized therapeutic targets—for instance, indicating that lowering SBP by 15 mmHg would yield a greater risk reduction than further intensifying statin therapy.
        </p>
      </div>

      <div class="prototype-note">
        <strong>Attribution Caveat:</strong> Factor contributions reflect the simulator's internal mathematical weighting rules and should not be construed as independently proven causal relationships in individual patients.
      </div>
    </div>
    ${pageFooter(11)}
  </section>

  <!-- =====================================================================
       PAGE 12: PATIENT REPORT
       ===================================================================== -->
  <section class="pdf-page">
    ${pageHeader('Clinical Reporting')}
    <div class="page-body">
      <h1 class="page-title">Patient Report Page</h1>
      <h2 class="page-subtitle">Consolidated Clinical Summary and Export Documentation</h2>

      <p class="lead-text">
        The Patient Report module transforms live simulator telemetry and algorithmic inferences into a structured, audit-ready clinical document suitable for multidisciplinary cardiology reviews.
      </p>

      <div style="display: flex; gap: 4mm; margin-bottom: 2mm;">
        <div class="screenshot-frame" style="width: 50%; max-height: 70mm; margin: 0;">
          <img src="${screens.reportTop}" alt="Patient Report Top" class="screenshot-img" />
        </div>
        <div class="screenshot-frame" style="width: 50%; max-height: 70mm; margin: 0;">
          <img src="${screens.reportBottom}" alt="Patient Report Bottom" class="screenshot-img" />
        </div>
      </div>
      <div class="screenshot-caption">Figure 12.1: Patient Report layout showing executive summary, demographics, risk stratification, and XAI recommendations.</div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 3.5mm; margin-top: 2mm;">
        <div class="doc-card" style="margin: 0;">
          <div class="doc-card-title">1. Patient Profile &amp; Demographics</div>
          <p style="font-size: 8.2pt; margin: 0;">
            Documents age, sex, smoking history, diabetic status, BMI, and baseline cardiovascular medical history.
          </p>
        </div>
        <div class="doc-card" style="margin: 0;">
          <div class="doc-card-title">2. Stratified Risk &amp; Trajectory</div>
          <p style="font-size: 8.2pt; margin: 0;">
            Consolidates the composite risk score, risk band, confidence rating, and longitudinal 7-day trend summary.
          </p>
        </div>
        <div class="doc-card" style="margin: 0;">
          <div class="doc-card-title">3. Multi-System Biomarker Summary</div>
          <p style="font-size: 8.2pt; margin: 0;">
            Tabulates hemodynamic vitals, full serum lipid panel, CT imaging indices (FAI/CAC), and ECG metrics.
          </p>
        </div>
        <div class="doc-card" style="margin: 0;">
          <div class="doc-card-title">4. Evidence-Based Recommendations</div>
          <p style="font-size: 8.2pt; margin: 0;">
            Generates prioritized pharmacological and lifestyle recommendations targeted directly to the patient's dominant risk factors.
          </p>
        </div>
      </div>

      <div class="prototype-note" style="margin-top: 3.5mm;">
        <strong>Export Functionality:</strong> The Patient Report includes an automated PDF export engine (jsPDF) that compiles the entire report into a downloadable clinical summary document.
      </div>
    </div>
    ${pageFooter(12)}
  </section>

  <!-- =====================================================================
       PAGE 13: REPORT UPLOAD
       ===================================================================== -->
  <section class="pdf-page">
    ${pageHeader('Data Ingestion')}
    <div class="page-body">
      <h1 class="page-title">Report Upload &amp; Document OCR</h1>
      <h2 class="page-subtitle">Client-Side Clinical Document Parsing and Ingestion Pipeline</h2>

      <p class="lead-text">
        Entering laboratory and imaging values manually can be tedious and prone to transcription errors. The platform features an integrated Report Upload slide-in panel that ingests external clinical documents.
      </p>

      <div class="screenshot-frame" style="max-height: 72mm;">
        <img src="${screens.uploadPanel}" alt="Report Upload Panel" class="screenshot-img" />
      </div>
      <div class="screenshot-caption">Figure 13.1: Slide-in Report Upload panel showing drag-and-drop zone, supported document formats, and extracted parameter review.</div>

      <div class="doc-card" style="margin-top: 2mm;">
        <div class="doc-card-title">Document Ingestion Pipeline</div>
        <div class="callout-grid" style="grid-template-columns: 1fr 1fr; margin-top: 1mm;">
          <div class="callout-item">
            <div class="callout-num">A</div>
            <div><strong>Supported File Types:</strong> Accepts standard laboratory reports in PDF, PNG, or JPEG formats up to 10 MB.</div>
          </div>
          <div class="callout-item">
            <div class="callout-num">B</div>
            <div><strong>Client-Side OCR Processing:</strong> Uses in-browser Tesseract.js optical character recognition to extract numeric values without sending PHI to external servers.</div>
          </div>
          <div class="callout-item">
            <div class="callout-num">C</div>
            <div><strong>Extracted Target Fields:</strong> Automatically identifies Total Cholesterol, LDL, HDL, Triglycerides, Blood Pressure, and CAC scores.</div>
          </div>
          <div class="callout-item">
            <div class="callout-num">D</div>
            <div><strong>Human-in-the-Loop Review:</strong> Displays extracted values in an editable preview grid, requiring clinician confirmation before applying them to the active simulator state.</div>
          </div>
        </div>
      </div>

      <table class="data-table" style="margin-top: 2mm;">
        <thead>
          <tr>
            <th style="width: 25%;">Data Source Category</th>
            <th style="width: 35%;">Origin in Platform</th>
            <th style="width: 40%;">Update Frequency &amp; Mutability</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Uploaded Data</strong></td>
            <td>Parsed clinical lab documents</td>
            <td>Static until new document is uploaded; overrides baseline simulator inputs upon user confirmation.</td>
          </tr>
          <tr>
            <td><strong>Simulated Data</strong></td>
            <td>Internal telemetry generators</td>
            <td>Continuously streaming; updates HR, BP fluctuations, and waveform traces in real time.</td>
          </tr>
          <tr>
            <td><strong>Manual Data</strong></td>
            <td>User profile &amp; modal entry</td>
            <td>Direct clinician override via patient profile modal or dedicated biomarker inputs.</td>
          </tr>
        </tbody>
      </table>
    </div>
    ${pageFooter(13)}
  </section>

  <!-- =====================================================================
       PAGE 14: TECHNICAL OVERVIEW
       ===================================================================== -->
  <section class="pdf-page">
    ${pageHeader('System Architecture')}
    <div class="page-body">
      <h1 class="page-title">Technical Architecture &amp; Stack</h1>
      <h2 class="page-subtitle">Engineering Framework, Component Hierarchy, and Dependencies</h2>

      <p class="lead-text">
        The application is engineered as a modern, high-performance web workstation using React 19, TypeScript, and Vite. The codebase enforces strict separation between mathematical modeling, state management, and visual rendering.
      </p>

      <div class="doc-card" style="margin-bottom: 3.5mm;">
        <div class="doc-card-title">Architectural Block Diagram</div>
        <div style="font-family: monospace; font-size: 8pt; background: #0a0f1d; color: #38bdf8; padding: 3mm; border-radius: 4px; line-height: 1.4; text-align: center;">
          [ Scenario Engine &amp; Presets ] ───► [ Sensor HAL: MockSensorSources ]<br>
                                                       │<br>
                                                       ▼<br>
          [ Document OCR: Tesseract.js ] ──► [ Multi-Modal Sensor Fusion Layer ]<br>
                                                       │<br>
                                                       ▼<br>
          [ Deep Learning: EchoNext CNN ] ──► [ Weighted Cardiovascular Risk Engine ]<br>
                                                       │<br>
                                                       ▼<br>
          [ State Store: Zustand ] ─────────► [ AppShell &amp; 3-Zone Dashboard UI ]<br>
                                                       │<br>
                                                       ▼<br>
          [ jsPDF / HTML2Canvas ] ──────────► [ Exportable Patient Audit Report ]
        </div>
      </div>

      <div class="doc-card-title">Verified Technologies Utilized in the Project</div>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 25%;">Subsystem</th>
            <th style="width: 25%;">Technology Used</th>
            <th style="width: 50%;">Specific Functional Role</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Frontend Core</strong></td>
            <td>React 19 · TypeScript · Vite 8</td>
            <td>Type-safe component architecture, sub-second HMR, and modular 3-zone persistent layout shell.</td>
          </tr>
          <tr>
            <td><strong>State Management</strong></td>
            <td>Zustand (shallow slices)</td>
            <td>Decoupled reactive telemetry store (simStore) managing live snapshots, profiles, and history.</td>
          </tr>
          <tr>
            <td><strong>Visualizations</strong></td>
            <td>Recharts · HTML5 Canvas</td>
            <td>60 FPS waveform rendering, multi-point 7-day risk trend curves, and SVG radial gauges.</td>
          </tr>
          <tr>
            <td><strong>Deep Learning</strong></td>
            <td>EchoNext 1D ResNet-34</td>
            <td>In-app convolutional neural network inference classifying simulated ECG rhythm and structural indices.</td>
          </tr>
          <tr>
            <td><strong>Document OCR</strong></td>
            <td>Tesseract.js (WASM)</td>
            <td>In-browser optical character recognition extracting clinical lab values without backend dependency.</td>
          </tr>
          <tr>
            <td><strong>PDF Generation</strong></td>
            <td>jsPDF · HTML2Canvas</td>
            <td>Client-side rendering and vector PDF compilation for downloadable clinical patient summaries.</td>
          </tr>
        </tbody>
      </table>

      <div class="prototype-note">
        <strong>Software Modularity:</strong> All calculations, risk weighting algorithms, and sensor mock pipelines reside in dedicated pure TypeScript modules (riskEngine.ts, hal/), allowing straightforward replacement with live hardware drivers.
      </div>
    </div>
    ${pageFooter(14)}
  </section>

  <!-- =====================================================================
       PAGE 15: CURRENT STATUS AND LIMITATIONS
       ===================================================================== -->
  <section class="pdf-page">
    ${pageHeader('Evaluation & Transparency')}
    <div class="page-body">
      <h1 class="page-title">Current Status and Limitations</h1>
      <h2 class="page-subtitle">Honest Engineering Assessment of Capabilities and Boundaries</h2>

      <p class="lead-text">
        In evaluating any clinical software system, clear boundaries between what is fully implemented and what is simulated or experimental are essential. Below is an honest breakdown of the platform's current maturity.
      </p>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; margin-bottom: 3.5mm;">
        <div class="doc-card" style="margin: 0; border-top: 3px solid #10b981;">
          <div class="doc-card-title">What is Currently Implemented</div>
          <ul style="font-size: 8pt; color: #334155; margin: 0; padding-left: 4mm; line-height: 1.45;">
            <li>Full 3-zone persistent clinical workstation interface.</li>
            <li>Synthetic physiological parameter generators for HR, BP, and HRV.</li>
            <li>Multi-algorithm composite risk scoring engine.</li>
            <li>EchoNext 1D ResNet-34 deep learning inference model.</li>
            <li>7-Day longitudinal recorded risk history tracking.</li>
            <li>Client-side document OCR ingestion for PDF/image lab reports.</li>
            <li>Consolidated Patient Report generator with client-side PDF export.</li>
          </ul>
        </div>

        <div class="doc-card" style="margin: 0; border-top: 3px solid #f59e0b;">
          <div class="doc-card-title">Current Limitations &amp; Boundaries</div>
          <ul style="font-size: 8pt; color: #334155; margin: 0; padding-left: 4mm; line-height: 1.45;">
            <li><strong>Hardware Disconnection:</strong> Physical BLE/Bluetooth ECG/PPG sensor hardware drivers are currently mocked.</li>
            <li><strong>Simulation Heuristics:</strong> Risk weighting heuristics have not undergone multi-center prospective clinical trials.</li>
            <li><strong>Regulatory Clearance:</strong> Platform has not been reviewed or cleared by FDA, CE, or CDSCO.</li>
            <li><strong>Document Parsing Variability:</strong> OCR accuracy depends on scan quality and varying commercial lab formats.</li>
            <li><strong>Model Scope:</strong> Deep learning model is trained on simulated rhythm archetypes, not clinical 12-lead databases.</li>
          </ul>
        </div>
      </div>

      <div class="doc-card">
        <div class="doc-card-title">Hardware Dependency Roadmap</div>
        <p style="font-size: 8.5pt; margin: 0;">
          The hardware abstraction layer (ISensorSource) is designed with standardized interfaces. Transitioning from simulation to physical deployment requires replacing MockSensorSources.ts with real-time Bluetooth Low Energy (BLE) or serial GATT services streaming from certified patient monitors.
        </p>
      </div>

      <div class="prototype-note" style="margin-top: 4mm;">
        <strong>Prototype Standing:</strong> This software is strictly an academic, research, and engineering prototype designed to demonstrate multi-modal cardiovascular data integration. It is not approved for direct clinical diagnostic or therapeutic decision-making.
      </div>
    </div>
    ${pageFooter(15)}
  </section>

  <!-- =====================================================================
       PAGE 16: END-TO-END DEMO FLOW
       ===================================================================== -->
  <section class="pdf-page">
    ${pageHeader('Evaluation Workflow')}
    <div class="page-body">
      <h1 class="page-title">End-to-End Demo Workflow</h1>
      <h2 class="page-subtitle">Recommended Walkthrough Guide for Supervisors and Reviewers</h2>

      <p class="lead-text">
        To experience the platform's complete feature set during an evaluation or demonstration, follow this step-by-step clinical walkthrough:
      </p>

      <div class="flow-steps">
        <div class="flow-step">
          <div class="flow-step-num">1</div>
          <div class="flow-step-content">
            <strong>Inspect Baseline State</strong>
            <span>Observe the default "Healthy — Baseline" state: Risk Score in the green band (approx. 19 Low), normal sinus rhythm, optimal BP (120/80 mmHg), and stable trend.</span>
          </div>
        </div>
        <div class="flow-step">
          <div class="flow-step-num">2</div>
          <div class="flow-step-content">
            <strong>Click Arohan Logo to Preview Asset</strong>
            <span>Click the uncontained Arohan passport-size logo in the sidebar header to trigger the centered high-resolution modal preview; close via ESC or backdrop click.</span>
          </div>
        </div>
        <div class="flow-step">
          <div class="flow-step-num">3</div>
          <div class="flow-step-content">
            <strong>Select Pathological Scenario</strong>
            <span>Open the header scenario dropdown and select "CAD — Significant Stenosis". Notice immediate updates across hemodynamics, elevated FAI (-65 HU), and rising CAC score.</span>
          </div>
        </div>
        <div class="flow-step">
          <div class="flow-step-num">4</div>
          <div class="flow-step-content">
            <strong>Evaluate Composite Risk Shift</strong>
            <span>Observe the primary CAD Risk Score transition into the High-Risk range (65–75). Inspect the disease-specific risk bars (Atherosclerosis and Ischemia elevate).</span>
          </div>
        </div>
        <div class="flow-step">
          <div class="flow-step-num">5</div>
          <div class="flow-step-content">
            <strong>Ingest External Clinical Data</strong>
            <span>Click "Upload Report" in the top-right header. Ingest a sample lab PDF/image, review extracted lipid parameters in the preview modal, and apply to the simulation.</span>
          </div>
        </div>
        <div class="flow-step">
          <div class="flow-step-num">6</div>
          <div class="flow-step-content">
            <strong>Inspect Deep Learning Classifier</strong>
            <span>Examine the EchoNext ResNet-34 diagnostic card. Click "Re-Infer" to trigger a neural network pass and observe structural heart disease index updates.</span>
          </div>
        </div>
        <div class="flow-step">
          <div class="flow-step-num">7</div>
          <div class="flow-step-content">
            <strong>Generate &amp; Export Patient Report</strong>
            <span>Click "Patient Report" in the left sidebar. Review the synthesized clinical summary, XAI factor contributions, and click "Export PDF" to generate a clinical handover report.</span>
          </div>
        </div>
      </div>

      <div class="prototype-note" style="margin-top: 3mm;">
        <strong>Reviewer Conclusion:</strong> This 7-step sequence illustrates the complete data lifecycle—from scenario simulation and raw sensor processing to transparent risk stratification and downloadable clinical reporting.
      </div>
    </div>
    ${pageFooter(16)}
  </section>

</body>
</html>`;

fs.writeFileSync('public/guide_document.html', html, 'utf8');
console.log('HTML guide document written to public/guide_document.html');

async function compilePdf() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const port = 9338;
  const pdfOutput = path.resolve('Precision_Cardiovascular_Risk_Dashboard_Guide.pdf');

  console.log('Starting headless Chrome for PDF compilation...');
  const chrome = spawn(chromePath, [
    `--remote-debugging-port=${port}`,
    '--headless=new',
    '--disable-gpu',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 1500));
  const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const page = list.find(p => p.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  let id = 1;
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const msgId = id++;
    const timer = setTimeout(() => reject(new Error('Timeout ' + method)), 30000);
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
  const targetUrl = 'http://localhost:5173/guide_document.html';
  console.log('Navigating to', targetUrl);
  await send('Page.navigate', { url: targetUrl });
  await new Promise(r => setTimeout(r, 2500));

  console.log('Generating PDF via Page.printToPDF...');
  const pdfRes = await send('Page.printToPDF', {
    printBackground: true,
    paperWidth: 8.27,   // A4 inches
    paperHeight: 11.69, // A4 inches
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    preferCSSPageSize: true
  });

  const pdfBuf = Buffer.from(pdfRes.data, 'base64');
  fs.writeFileSync(pdfOutput, pdfBuf);
  console.log(`SUCCESS! PDF compiled to: ${pdfOutput} (${pdfBuf.length} bytes)`);

  ws.close();
  chrome.kill();
  process.exit(0);
}

compilePdf().catch(err => {
  console.error('PDF compilation failed:', err);
  process.exit(1);
});

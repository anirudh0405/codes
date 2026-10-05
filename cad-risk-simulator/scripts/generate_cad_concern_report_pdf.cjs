const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9375;

function toBase64(filePath) {
  const buf = fs.readFileSync(filePath);
  return `data:image/png;base64,${buf.toString('base64')}`;
}

async function buildPdf() {
  console.log('Encoding screenshots for CAD Cardiac Concern Scenario Report...');
  const upperImg = toBase64('public/cad_concern_report_assets/01_cad_concern_upper_overview.png');
  const trendImg = toBase64('public/cad_concern_report_assets/02_cad_concern_trend_readouts.png');
  const echoImg = toBase64('public/cad_concern_report_assets/03_cad_concern_echonext_contributions.png');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CAD — Cardiac Concern Scenario Report</title>
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

    .pill-red {
      background: #fef2f2;
      color: #b91c1c;
      border: 1px solid #fecaca;
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
      border-top: 2.5px solid #ef4444;
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
      color: #b91c1c;
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
      border: 1px solid #ef4444;
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
      color: #ef4444;
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
       PAGE 1: SCENARIO OVERVIEW & OVERALL CAD RESULT
       ===================================================================== -->
  <section class="pdf-page">
    <div>
      <header class="doc-header">
        <div class="header-left">
          <h1>Precision Cardiovascular Risk Intelligence Platform</h1>
          <h2>CAD — Cardiac Concern Scenario Report</h2>
          <div style="font-size: 7.5pt; color: #64748b; margin-top: 0.8mm;">
            Dashboard Output and Scenario Interpretation
          </div>
        </div>
        <div class="header-right">
          <div class="pill-badge pill-red">Scenario: CAD — Cardiac Concern</div>
          <div class="pill-badge pill-subtle">Research / Simulation Prototype</div>
        </div>
      </header>

      <!-- Section 1 -->
      <div style="margin-bottom: 2.8mm;">
        <div class="section-title">Section 1 — CAD Scenario (Scenario Purpose & Simulation Role)</div>
        <p class="section-desc">
          The <strong>CAD — Cardiac Concern</strong> scenario is an advanced simulation profile designed to evaluate how the platform synthesizes concurrent multi-organ cardiovascular stress. It models an individual in the 60–69 age tier with established metabolic risk (Type 2 diabetes, atherogenic dyslipidemia), active tobacco use, a family history of coronary artery disease, and symptomatic presentations (atypical chest pain, dyspnea, and palpitations).
        </p>
        <p class="section-desc" style="margin-bottom: 0;">
          <em>Simulation Purpose:</em> This scenario modifies the underlying physiological state to demonstrate how the risk assessment engine, neural classification models, and longitudinal trend modules respond to multi-vector pathology. It provides researchers with a rigorous stress-test scenario. It is an algorithmic demonstration profile and does not constitute a real patient clinical diagnosis.
        </p>
      </div>

      <!-- Section 2 -->
      <div>
        <div class="section-title">Section 2 — Overall Result (Active Dashboard State)</div>
        <p class="section-desc">
          Upon selecting the CAD — Cardiac Concern scenario, the supervisory interface shifts from the homeostatic green baseline to an explicit <strong>High Risk</strong> alert status. The top banner displays: <em>"Multiple risk factors are significantly elevated. Urgent clinical review is recommended."</em>
        </p>

        <!-- Upper Screenshot -->
        <div class="figure-frame">
          <img src="${upperImg}" alt="Upper Dashboard Viewport (CAD Concern)" class="figure-img" />
          <div class="figure-caption-bar">
            <span><strong>Figure 1:</strong> Upper Dashboard Viewport (CAD — Cardiac Concern Scenario)</span>
            <span>CAD Risk Score: 79/100 · High Risk · HR: 88 BPM · BP: 175/110 mmHg · HRV: 14 ms · FAI: -62.0 HU · CAC: 320 AU</span>
          </div>
        </div>

        <!-- Comparative Baseline Delta -->
        <div class="comparison-grid">
          <div class="comp-box" style="border-left: 3px solid #059669;">
            <div class="comp-title" style="color: #059669;">Healthy — Baseline Reference</div>
            <div style="font-size: 7.2pt; color: #475569; line-height: 1.4;">
              • Risk Score: <strong>14 / 100 (Low Risk)</strong><br />
              • Blood Pressure: <strong>122/81 mmHg (Normal/Borderline)</strong><br />
              • HRV (RMSSD): <strong>70 ms (Robust Vagal Tone)</strong><br />
              • FAI: <strong>-82.0 HU (No Inflammation)</strong> · CAC: <strong>0 AU</strong>
            </div>
          </div>
          <div class="comp-box" style="border-left: 3px solid #ef4444;">
            <div class="comp-title" style="color: #b91c1c;">CAD — Cardiac Concern State</div>
            <div style="font-size: 7.2pt; color: #475569; line-height: 1.4;">
              • Risk Score: <strong>79 / 100 (High Risk · +65 pts delta)</strong><br />
              • Blood Pressure: <strong>175/110 mmHg (Stage 2 Hypertensive Crisis)</strong><br />
              • HRV (RMSSD): <strong>14 ms (Severe Autonomic Withdrawal)</strong><br />
              • FAI: <strong>-62.0 HU (Elevated Inflammation)</strong> · CAC: <strong>320 AU</strong>
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
       PAGE 2: CAD RISK SCORE, 7-DAY TREND & PHYSIOLOGICAL PARAMETERS
       ===================================================================== -->
  <section class="pdf-page">
    <div>
      <header class="doc-header">
        <div class="header-left">
          <h1>Precision Cardiovascular Risk Intelligence Platform</h1>
          <h2>CAD — Cardiac Concern Scenario Report</h2>
          <div style="font-size: 7.5pt; color: #64748b; margin-top: 0.8mm;">
            Section 3, 4 & 5: Primary Risk Score, Longitudinal Trend & Core Hemodynamics
          </div>
        </div>
        <div class="header-right">
          <div class="pill-badge pill-red">Primary Metrics</div>
          <div class="pill-badge pill-subtle">Hemodynamic Strain</div>
        </div>
      </header>

      <!-- Section 3 -->
      <div style="margin-bottom: 3.2mm;">
        <div class="section-title">Section 3 — CAD Risk Score (Central Platform Metric)</div>
        <div class="metric-grid-4">
          <div class="metric-card-light">
            <div class="metric-card-title">CAD Risk Score</div>
            <div class="metric-card-value">79 <span style="font-size: 7pt; font-weight: 500; color: #64748b;">/ 100</span></div>
            <div class="metric-card-sub">Tier: High Risk (61–80)</div>
          </div>
          <div class="metric-card-light">
            <div class="metric-card-title">Risk Band</div>
            <div class="metric-card-value" style="color: #b91c1c; font-size: 8.5pt;">HIGH RISK</div>
            <div class="metric-card-sub">Urgent Review Tier</div>
          </div>
          <div class="metric-card-light">
            <div class="metric-card-title">Engine Confidence</div>
            <div class="metric-card-value">60%</div>
            <div class="metric-card-sub">Multi-Stream Fusion</div>
          </div>
          <div class="metric-card-light">
            <div class="metric-card-title">Severity Delta</div>
            <div class="metric-card-value" style="color: #b91c1c; font-size: 8.5pt;">+65 PTS</div>
            <div class="metric-card-sub">Over Baseline (14)</div>
          </div>
        </div>

        <p class="section-desc">
          <strong>Score Meaning & Interpretation:</strong> The CAD Risk Score of <strong>79</strong> places the simulated patient directly into the <strong>High Risk tier (61–80)</strong>. Within the platform's INTERHEART-calibrated weighting architecture, this score reflects concurrent severe penalties across primary modifiable and non-modifiable cardiovascular axes: Stage 2 hypertension, atherogenic dyslipidemia (ApoB), active smoking, severe vagal withdrawal, and delayed myocardial repolarization. The score communicates an acute accumulation of cardiovascular vulnerability warranting prompt clinical investigation.
        </p>
      </div>

      <!-- Section 4 -->
      <div style="margin-bottom: 3.2mm;">
        <div class="section-title">Section 4 — 7-Day Cardiovascular Risk Trend</div>
        <p class="section-desc">
          <strong>Recorded Progression:</strong> The 7-day trend reflects a sharp escalation from <strong>20 → 79 (↑ Increasing)</strong>, recording Day 1 at 20 and Day 2 at 79.
        </p>
        <div class="content-box">
          <p class="section-desc" style="margin-bottom: 0;">
            <strong>Longitudinal Significance:</strong> Rather than viewing risk as a static snapshot, the 7-day trajectory illustrates rapid decompensation. In clinical monitoring, a jump of +59 points across consecutive observation intervals differentiates stable chronic CAD from rapid hemodynamic destabilization or an emerging acute coronary syndrome.
          </p>
        </div>
      </div>

      <!-- Section 5 -->
      <div>
        <div class="section-title">Section 5 — Physiological Parameters & Cardiac Readouts</div>
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
              <td><strong>Blood Pressure (BP)</strong></td>
              <td class="val-cell">175/110 mmHg</td>
              <td><span class="status-pill-table status-elevated">Stage 2 Hypertensive</span></td>
              <td>Severely elevated systolic & diastolic arterial tension.</td>
              <td>Primary driver of afterload stress, endothelial injury, and plaque rupture risk.</td>
            </tr>
            <tr>
              <td><strong>Heart Rate (HR)</strong></td>
              <td class="val-cell">88 BPM</td>
              <td><span class="status-pill-table status-warning">Elevated NSR</span></td>
              <td>Resting sinus rate approaching tachycardia (&gt;85 bpm).</td>
              <td>Increases myocardial oxygen consumption and shortens diastolic perfusion time.</td>
            </tr>
            <tr>
              <td><strong>HRV (RMSSD)</strong></td>
              <td class="val-cell">14 ms</td>
              <td><span class="status-pill-table status-elevated">Depressed / Low</span></td>
              <td>Root mean square of successive beat-to-beat differences.</td>
              <td>Indicates severe parasympathetic withdrawal and unbuffered sympathetic dominance.</td>
            </tr>
            <tr>
              <td><strong>Corrected QT (QTc)</strong></td>
              <td class="val-cell">618 ms</td>
              <td><span class="status-pill-table status-elevated">Severely Prolonged</span></td>
              <td>Ventricular repolarization duration (&gt;450 ms threshold).</td>
              <td>Flags severe repolarization dispersion and elevated vulnerability to ventricular arrhythmias.</td>
            </tr>
            <tr>
              <td><strong>ST Segment</strong></td>
              <td class="val-cell">0.22 mV</td>
              <td><span class="status-pill-table status-elevated">Deviated (Elevated)</span></td>
              <td>ST elevation above isoelectric voltage baseline.</td>
              <td>Primary electrophysiological hallmark of acute transmural myocardial ischemia.</td>
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
          <h2>CAD — Cardiac Concern Scenario Report</h2>
          <div style="font-size: 7.5pt; color: #64748b; margin-top: 0.8mm;">
            Section 6, 7 & 8: Vascular Imaging, Laboratory Profile & Sub-Scores
          </div>
        </div>
        <div class="header-right">
          <div class="pill-badge pill-red">Anatomical & Lab Risk</div>
          <div class="pill-badge pill-subtle">Sub-Scores</div>
        </div>
      </header>

      <!-- Section 6 -->
      <div style="margin-bottom: 3.2mm;">
        <div class="section-title">Section 6 — FAI and CAC (Vascular & Imaging Markers)</div>
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
              <td class="val-cell">-62.0 HU</td>
              <td><span class="status-pill-table status-elevated">Elevated Inflammation</span></td>
              <td>CT pericoronary adipose tissue attenuation.</td>
              <td>Exceeds -70.1 HU cutoff; flags active pan-coronary vascular inflammation.</td>
            </tr>
            <tr>
              <td><strong>Coronary Artery Calcium (CAC)</strong></td>
              <td class="val-cell">320 AU</td>
              <td><span class="status-pill-table status-elevated">Moderate-to-High Plaque</span></td>
              <td>Agatston score of calcified atherosclerotic plaque.</td>
              <td>Confirms advanced structural coronary atherosclerosis (approaching &gt;400 AU).</td>
            </tr>
          </tbody>
        </table>
        <p class="section-desc">
          <em>Diagnostic Context:</em> FAI (-62.0 HU) indicates intense pericoronary cytokine-driven vascular inflammation, while CAC (320 AU) confirms substantial anatomical plaque remodeling. These markers enter through verified CT imaging inputs and anchor biometric waveforms to verified structural disease without implying autonomous automated clinical diagnosis.
        </p>
      </div>

      <!-- Scrolled Screenshot -->
      <div class="figure-frame">
        <img src="${trendImg}" alt="Trend, Readouts and Labs" class="figure-img" style="max-height: 52mm;" />
        <div class="figure-caption-bar">
          <span><strong>Figure 2:</strong> Trend, Cardiac Readouts & Laboratory Profile Viewport</span>
          <span>QTc: 618 ms Prolonged · ST: 0.22 mV Deviated · Total Chol: 300 mg/dL · HDL: 32 mg/dL · Triglycerides: 500 mg/dL</span>
        </div>
      </div>

      <!-- Section 7 & 8 -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 3.5mm; margin-top: 2.5mm;">
        <!-- Section 7 -->
        <div>
          <div class="section-title">Section 7 — Laboratory Summary</div>
          <p class="section-desc">
            The laboratory panel models severe atherogenic dyslipidemia:
          </p>
          <ul style="font-size: 7.2pt; color: #334155; margin-left: 4mm; line-height: 1.45;">
            <li><strong>Total Cholesterol:</strong> 300 mg/dL (Severely Elevated)</li>
            <li><strong>LDL Cholesterol:</strong> 123 mg/dL (Borderline Elevated)</li>
            <li><strong>HDL Cholesterol:</strong> 32 mg/dL (Critically Depressed)</li>
            <li><strong>Triglycerides:</strong> 500 mg/dL (Severe Hypertriglyceridemia)</li>
            <li><strong>Lipoprotein(a):</strong> 58.0 mg/dL (Elevated &gt;50 mg/dL genetic risk)</li>
          </ul>
          <p class="section-desc" style="margin-top: 1mm; margin-bottom: 0;">
            This lipid profile drives the high Metabolic-Vascular contribution weight and amplifies atherosclerosis sub-scoring.
          </p>
        </div>

        <!-- Section 8 -->
        <div>
          <div class="section-title">Section 8 — Disease-Specific Risk Panel</div>
          <p class="section-desc">
            The platform computes five simulator-derived disease sub-scores:
          </p>
          <ul style="font-size: 7.2pt; color: #334155; margin-left: 4mm; line-height: 1.45;">
            <li><strong>Myocardial Ischemia:</strong> 88/100 (Driven by 0.22 mV ST elevation)</li>
            <li><strong>Arrhythmia:</strong> 80/100 (Driven by 618 ms QTc prolongation)</li>
            <li><strong>Hypertensive Heart Disease:</strong> 76/100 (175/110 mmHg BP)</li>
            <li><strong>Atherosclerosis:</strong> 73/100 (CAC 320 AU + FAI -62.0 HU)</li>
            <li><strong>Heart Failure:</strong> 65/100 (Elevated afterload and chronotropic stress)</li>
          </ul>
          <p class="section-desc" style="margin-top: 1mm; margin-bottom: 0;">
            <em>Note:</em> These are simulator-derived weighted heuristic indices designed to indicate relative disease vectors, not validated clinical probabilities.
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
          <h2>CAD — Cardiac Concern Scenario Report</h2>
          <div style="font-size: 7.5pt; color: #64748b; margin-top: 0.8mm;">
            Section 9–12: Contributions, Deep Learning, Architecture & Summary
          </div>
        </div>
        <div class="header-right">
          <div class="pill-badge pill-red">Model Synthesis</div>
          <div class="pill-badge pill-subtle">Summary & Disclaimer</div>
        </div>
      </header>

      <!-- Section 9 & 10 Grid -->
      <div style="display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 3.5mm; margin-bottom: 2.8mm;">
        <!-- Section 9 -->
        <div>
          <div class="section-title">Section 9 — Risk Contributions Breakdown</div>
          <p class="section-desc">
            The <em>Contributions</em> breakdown illustrates how the 79 total risk points are apportioned across physiological parameters:
          </p>
          <ul style="font-size: 7.2pt; color: #334155; margin-left: 4mm; line-height: 1.45;">
            <li><strong>Blood Pressure (BP):</strong> 22 pts (Maximum weight due to 175/110 mmHg)</li>
            <li><strong>Metabolic-Vascular (ApoB):</strong> 20 pts (Driven by dyslipidemia)</li>
            <li><strong>Smoking:</strong> 14 pts (Active smoker multiplier)</li>
            <li><strong>Physiological Stress:</strong> 8 pts (Elevated stress score 65)</li>
            <li><strong>Autonomic & Electrophysiology:</strong> HRV (5 pts), HR (5 pts), QTc (4 pts), ST Segment (4 pts), Lipids (4 pts)</li>
          </ul>
          <p class="section-desc" style="margin-top: 1mm; margin-bottom: 0;">
            <em>Note:</em> Values represent internal simulator model contribution points toward the 0–100 score, not independent clinical causality.
          </p>
        </div>

        <!-- Section 10 -->
        <div>
          <div class="section-title">Section 10 — EchoNext Neural Model</div>
          <div class="content-box" style="padding: 2mm 2.5mm; margin-bottom: 1.5mm; border-left: 3px solid #ef4444;">
            <div style="font-size: 7pt; font-weight: 700; color: #0f172a; margin-bottom: 1mm;">
              ECHONEXT 1D RESNET-34 CLASSIFIER (IN-APP)
            </div>
            <div style="font-size: 6.8pt; color: #b91c1c; font-weight: 700; margin-bottom: 0.8mm;">
              Classified: MI · STTC · CD · HYP · SHD
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 7pt;">
              <span style="color: #64748b;">SHD Index:</span>
              <span class="val-cell" style="color: #b91c1c;">58% (High Structural Burden)</span>
            </div>
          </div>
          <p class="section-desc" style="font-size: 7pt; margin-bottom: 0;">
            The in-app ResNet-34 neural model evaluates physiological waveforms and classifies multiple structural abnormalities: Myocardial Infarction (<code>MI</code>), ST/T-changes (<code>STTC</code>), Conduction Defect (<code>CD</code>), Hypertrophy (<code>HYP</code>), and Structural Heart Disease (<code>SHD</code>) with a 58% index, independently corroborating the biometric risk score.
          </p>
        </div>
      </div>

      <!-- Section 11 -->
      <div style="margin-bottom: 2.8mm;">
        <div class="section-title">Section 11 — How the CAD Scenario Functions</div>
        <div class="flow-box">
          <div style="font-size: 6.8pt; font-weight: 700; color: #475569; text-transform: uppercase;">
            Information Processing Pipeline:
          </div>
          <div class="flow-steps">
            <div class="flow-node">CAD Scenario</div>
            <span class="flow-arrow">→</span>
            <div class="flow-node">Scenario Inputs</div>
            <span class="flow-arrow">→</span>
            <div class="flow-node">Physio Indicators</div>
            <span class="flow-arrow">→</span>
            <div class="flow-node">Risk Assessment</div>
            <span class="flow-arrow">→</span>
            <div class="flow-node">CAD Score: 79</div>
            <span class="flow-arrow">→</span>
            <div class="flow-node">Disease Outputs</div>
            <span class="flow-arrow">→</span>
            <div class="flow-node">Risk Trend</div>
            <span class="flow-arrow">→</span>
            <div class="flow-node">Patient Report</div>
          </div>
        </div>
        <p class="section-desc" style="margin-bottom: 0;">
          The pipeline begins with scenario-specific inputs (Stage 2 BP, ST elevation, high CAC/FAI). These trigger intermediate physiological indicators, feeding into the multi-factor risk assessment algorithm. The engine outputs a primary CAD Risk Score (79/100, High Risk), which propagates into disease-specific sub-scores, updates the 7-day longitudinal trend, and populates the clinical summary report.
        </p>
      </div>

      <!-- Section 12 -->
      <div>
        <div class="section-title">Section 12 — Summary & Concluding Interpretation</div>
        <p class="section-desc">
          The CAD — Cardiac Concern scenario demonstrates the platform's multi-layered response to advanced cardiovascular disease. Key changes from baseline include severe Stage 2 hypertension (175/110 mmHg), marked vagal depression (HRV 14 ms), electrophysiological abnormalities (QTc 618 ms, ST 0.22 mV), and anatomical vascular disease (FAI -62.0 HU, CAC 320 AU). The resulting CAD Risk Score of 79 clearly communicates high cardiovascular vulnerability, backed by concordant deep learning classification and transparent risk attribution.
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

  fs.writeFileSync('public/cad_cardiac_concern_report_document.html', html);
  console.log('Wrote public/cad_cardiac_concern_report_document.html');

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
  const fileUrl = 'file:///' + path.resolve('public/cad_cardiac_concern_report_document.html').replace(/\\/g, '/');
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
  const outPath = path.resolve('CAD_Cardiac_Concern_Scenario_Report.pdf');
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

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9362;

function toBase64(filePath) {
  const buf = fs.readFileSync(filePath);
  return `data:image/png;base64,${buf.toString('base64')}`;
}

async function buildPdf() {
  console.log('Encoding screenshots for CAD Summary PDF...');
  const upperImg = toBase64('public/cad_pdf_assets/01_cad_upper_dashboard.png');
  const lowerImg = toBase64('public/cad_pdf_assets/02_cad_lower_dashboard.png');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CAD Scenario Dashboard Summary</title>
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
      background: #090d16;
      color: #e2e8f0;
      -webkit-font-smoothing: antialiased;
    }

    .pdf-page {
      width: 210mm;
      height: 297mm;
      max-height: 297mm;
      page-break-after: always;
      position: relative;
      background: #090d16;
      padding: 8mm 14mm 7mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
    }

    /* Header styling */
    .doc-header {
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 2.2mm;
      margin-bottom: 2.2mm;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .title-group h1 {
      font-size: 14pt;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.02em;
      line-height: 1.2;
    }

    .title-group h2 {
      font-size: 10pt;
      font-weight: 600;
      color: #f59e0b;
      margin-top: 1.5mm;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .meta-pills {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 1.5mm;
    }

    .scenario-pill {
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.4);
      color: #fbbf24;
      font-size: 8pt;
      font-weight: 700;
      padding: 1.5mm 3.5mm;
      border-radius: 4px;
      font-family: 'JetBrains Mono', monospace;
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .scenario-pill .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #f59e0b;
      box-shadow: 0 0 6px #f59e0b;
    }

    .prototype-badge {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #94a3b8;
      font-size: 7pt;
      font-weight: 600;
      padding: 1mm 2.5mm;
      border-radius: 3px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    /* Screenshots on Page 1 */
    .screenshot-block {
      display: flex;
      flex-direction: column;
      gap: 1.8mm;
    }

    .screenshot-frame {
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 5px;
      overflow: hidden;
      background: #0f172a;
      box-shadow: 0 3px 12px rgba(0, 0, 0, 0.4);
    }

    .frame-bar {
      background: #1e293b;
      padding: 1.2mm 2.5mm;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      font-size: 7pt;
      color: #94a3b8;
      font-family: 'JetBrains Mono', monospace;
    }

    .screenshot-img {
      width: 100%;
      height: auto;
      display: block;
    }

    /* Captions */
    .caption-card {
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-left: 3px solid #f59e0b;
      border-radius: 4px;
      padding: 1.8mm 3.5mm;
      margin-top: 1.8mm;
    }

    .caption-title {
      font-size: 8pt;
      font-weight: 700;
      color: #e2e8f0;
      margin-bottom: 0.8mm;
    }

    .caption-text {
      font-size: 7.5pt;
      color: #94a3b8;
      line-height: 1.4;
    }

    /* Summary Grid on Page 2 */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 2.5mm;
      margin-bottom: 3.5mm;
    }

    .summary-card {
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 4px;
      padding: 2mm 2.5mm;
    }

    .summary-card-label {
      font-size: 6.5pt;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .summary-card-val {
      font-size: 9.5pt;
      font-weight: 700;
      color: #f8fafc;
      font-family: 'JetBrains Mono', monospace;
      margin-top: 1mm;
    }

    .summary-card-sub {
      font-size: 6.5pt;
      color: #fbbf24;
      font-weight: 600;
      margin-top: 0.5mm;
    }

    /* Structured parameter table */
    .metric-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.5pt;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 4mm;
    }

    .metric-table th {
      background: #1e293b;
      padding: 2mm 3mm;
      text-align: left;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .metric-table td {
      padding: 1.8mm 3mm;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      color: #cbd5e1;
    }

    .metric-table tr:last-child td {
      border-bottom: none;
    }

    .status-badge {
      display: inline-block;
      padding: 0.5mm 2mm;
      border-radius: 2px;
      font-size: 6.5pt;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
    }

    .badge-amber {
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.35);
    }

    .badge-red {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.35);
    }

    .badge-blue {
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.3);
    }

    /* Interpretation block */
    .interpretation-card {
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-left: 3px solid #f59e0b;
      border-radius: 4px;
      padding: 3.5mm 4mm;
      margin-bottom: 3.5mm;
    }

    .interpretation-title {
      font-size: 8.5pt;
      font-weight: 700;
      color: #f8fafc;
      margin-bottom: 1.5mm;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .interpretation-text {
      font-size: 8pt;
      color: #cbd5e1;
      line-height: 1.5;
    }

    /* Disclaimer box */
    .disclaimer-card {
      background: rgba(245, 158, 11, 0.06);
      border: 1px solid rgba(245, 158, 11, 0.25);
      border-radius: 4px;
      padding: 2.5mm 3.5mm;
      display: flex;
      align-items: flex-start;
      gap: 6px;
    }

    .disclaimer-text {
      font-size: 7pt;
      color: #fbbf24;
      line-height: 1.45;
    }

    .disclaimer-text strong {
      color: #fde68a;
    }

    /* Footer */
    .doc-footer {
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 2.5mm;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 7pt;
      color: #64748b;
    }

    .footer-right {
      font-family: 'JetBrains Mono', monospace;
      color: #94a3b8;
    }
  </style>
</head>
<body>

  <!-- =====================================================================
       PAGE 1: VISUAL OVERVIEW — FULL DASHBOARD CAD SCREENSHOTS
       ===================================================================== -->
  <section class="pdf-page">
    <div>
      <header class="doc-header">
        <div class="title-group">
          <h1>Precision Cardiovascular Risk Intelligence Platform</h1>
          <h2>CAD Scenario — Dashboard Snapshot</h2>
        </div>
        <div class="meta-pills">
          <div class="scenario-pill">
            <span class="dot"></span>
            Scenario: CAD (CAD — Borderline Hypertensive)
          </div>
          <div class="prototype-badge">Research / Simulation Output · Non-Clinical Prototype</div>
        </div>
      </header>

      <div class="screenshot-block">
        <!-- Upper Dashboard Frame -->
        <div class="screenshot-frame">
          <div class="frame-bar">
            <span>Upper Dashboard Viewport · Actual Application Render (CAD Scenario)</span>
            <span>Header · Moderate Risk · Stage 2 BP (156/100) · FAI -72 · CAC 45 · CAD Risk Score 54</span>
          </div>
          <img src="${upperImg}" alt="CAD Scenario Upper Dashboard" class="screenshot-img" />
        </div>

        <!-- Lower Dashboard Frame -->
        <div class="screenshot-frame">
          <div class="frame-bar">
            <span>Lower Dashboard Viewport · Scrolled Application View</span>
            <span>7-Day Trend (19 → 54 ↑) · QTc 503ms Prolonged · EchoNext (HYP) · Donut Contributions (BP 20 pts)</span>
          </div>
          <img src="${lowerImg}" alt="CAD Scenario Lower Dashboard" class="screenshot-img" />
        </div>
      </div>

      <div class="caption-card">
        <div class="caption-title">Visual Capture Summary — Coronary Artery Disease State</div>
        <div class="caption-text">
          Direct captures from the running application under the active <strong>CAD — Borderline Hypertensive</strong> profile. The upper panel displays Stage 2 hypertension (156/100 mmHg), reduced autonomic variability (38 ms), early coronary calcium (CAC 45 AU), and active pericoronary inflammation (FAI -72.0 HU). The circular gauge calculates <strong>54 (Moderate Risk)</strong>. The lower panel shows the 7-day risk trend climbing from 19 to 54, prolonged ventricular repolarization (QTc 503 ms), in-app EchoNext neural classification detecting hypertensive morphology (<code>HYP</code>), and blood pressure (20 pts) dominating the risk contribution breakdown.
        </div>
      </div>
    </div>

    <footer class="doc-footer">
      <div>
        <span>Arohan Health · Precision Cardiovascular Risk Intelligence Platform · Educational & Engineering Prototype</span>
      </div>
      <div class="footer-right">
        <span>Page 1 of 2</span>
      </div>
    </footer>
  </section>

  <!-- =====================================================================
       PAGE 2: KEY DASHBOARD SUMMARY & CLINICAL INTERPRETATION
       ===================================================================== -->
  <section class="pdf-page">
    <div>
      <header class="doc-header">
        <div class="title-group">
          <h1>Precision Cardiovascular Risk Intelligence Platform</h1>
          <h2>CAD Scenario — Key Dashboard Summary & Interpretation</h2>
        </div>
        <div class="meta-pills">
          <div class="scenario-pill">
            <span class="dot"></span>
            Scenario: CAD (CAD — Borderline Hypertensive)
          </div>
          <div class="prototype-badge">Research / Simulation Output · Non-Clinical Prototype</div>
        </div>
      </header>

      <!-- Key Stat Highlights -->
      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-card-label">Current CAD Risk Score</div>
          <div class="summary-card-val" style="color: #fbbf24;">54 / 100</div>
          <div class="summary-card-sub">Moderate Risk Tier (41–60)</div>
        </div>
        <div class="summary-card">
          <div class="summary-card-label">Blood Pressure</div>
          <div class="summary-card-val" style="color: #f87171;">156 / 100 <span style="font-size: 7pt; color: #64748b;">mmHg</span></div>
          <div class="summary-card-sub" style="color: #f87171;">Stage 2 Hypertensive</div>
        </div>
        <div class="summary-card">
          <div class="summary-card-label">Heart Rate & HRV</div>
          <div class="summary-card-val">82 <span style="font-size: 7pt; color: #64748b;">BPM</span> · 38 <span style="font-size: 7pt; color: #64748b;">ms</span></div>
          <div class="summary-card-sub">Depressed Vagal Control</div>
        </div>
        <div class="summary-card">
          <div class="summary-card-label">CT Biomarkers</div>
          <div class="summary-card-val" style="font-size: 8.5pt;">FAI -72 HU · CAC 45</div>
          <div class="summary-card-sub">Active Inflammation & Plaque</div>
        </div>
      </div>

      <!-- Structured Parameter Table -->
      <table class="metric-table">
        <thead>
          <tr>
            <th style="width: 28%;">Dashboard Parameter</th>
            <th style="width: 24%;">Recorded CAD Value</th>
            <th style="width: 22%;">Status / Classification</th>
            <th style="width: 26%;">Clinical / Simulator Context</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Current CAD Risk Score</strong></td>
            <td><strong>54 / 100</strong></td>
            <td><span class="status-badge badge-amber">Moderate Risk</span></td>
            <td>Elevated multi-modal risk engine assessment</td>
          </tr>
          <tr>
            <td><strong>Risk Band & Confidence</strong></td>
            <td>Moderate Risk Tier</td>
            <td><span class="status-badge badge-blue">100% Confidence</span></td>
            <td>Score falls in the 41–60 moderate clinical concern band</td>
          </tr>
          <tr>
            <td><strong>7-Day Risk Trend</strong></td>
            <td>19 → 54 (↑ Increasing)</td>
            <td><span class="status-badge badge-amber">Upward Trajectory</span></td>
            <td>Historical tracker records sharp elevation from baseline</td>
          </tr>
          <tr>
            <td><strong>Heart Rate (HR)</strong></td>
            <td>82 BPM</td>
            <td><span class="status-badge badge-blue">Mild Tachycardia</span></td>
            <td>Compensatory resting cardiac acceleration</td>
          </tr>
          <tr>
            <td><strong>Blood Pressure (BP)</strong></td>
            <td>156 / 100 mmHg</td>
            <td><span class="status-badge badge-red">Stage 2 Risk</span></td>
            <td>Significant systolic and diastolic vascular afterload</td>
          </tr>
          <tr>
            <td><strong>Heart Rate Variability</strong></td>
            <td>38 ms (RMSSD)</td>
            <td><span class="status-badge badge-amber">Reduced HRV</span></td>
            <td>Sympathetic dominance with reduced parasympathetic recovery</td>
          </tr>
          <tr>
            <td><strong>Fat Attenuation Index (FAI)</strong></td>
            <td>-72.0 HU</td>
            <td><span class="status-badge badge-amber">Borderline Cutoff</span></td>
            <td>Perivascular fat density approaching -70.1 HU inflammation mark</td>
          </tr>
          <tr>
            <td><strong>Coronary Calcium (CAC)</strong></td>
            <td>45 AU</td>
            <td><span class="status-badge badge-amber">Mild Plaque (1–100)</span></td>
            <td>Confirmed early coronary arterial calcification</td>
          </tr>
          <tr>
            <td><strong>Disease-Specific Sub-Scores</strong></td>
            <td>HTN: 63 · Athero: 59 · Arrhy: 52</td>
            <td><span class="status-badge badge-amber">Moderate Concern</span></td>
            <td>Myocardial Ischemia: 46 (Watch) · Heart Failure: 35</td>
          </tr>
          <tr>
            <td><strong>Major Risk Contributions</strong></td>
            <td>Total: 54 points</td>
            <td><span class="status-badge badge-red">BP Dominant</span></td>
            <td>Blood Pressure (20 pts), ApoB (13 pts), Stress (6 pts), HRV (4 pts)</td>
          </tr>
          <tr>
            <td><strong>EchoNext Deep Learning</strong></td>
            <td>Classified: NORM, HYP</td>
            <td><span class="status-badge badge-amber">SHD Index: 16%</span></td>
            <td>1D ResNet-34 detects hypertensive ECG morphology</td>
          </tr>
        </tbody>
      </table>

      <!-- Short Interpretation -->
      <div class="interpretation-card">
        <div class="interpretation-title">
          <span>Short Clinical & Simulation Interpretation</span>
        </div>
        <div class="interpretation-text">
          Transitioning to the CAD scenario (CAD — Borderline Hypertensive) exposes marked multi-modal cardiovascular strain across hemodynamic, autonomic, imaging, and electrophysiological indicators. Resting blood pressure is elevated to Stage 2 hypertensive severity (156/100 mmHg), while heart rate variability drops to 38 ms, reflecting autonomic dysregulation. In contrast to the healthy baseline, CT biomarkers reveal active vascular disease: the Fat Attenuation Index rises to -72.0 HU (nearing the -70.1 HU inflammatory cutoff) and coronary calcium reaches 45 AU, confirming established coronary plaque. The composite CAD risk score increases substantially to 54 (Moderate Risk), an escalation prominently tracked by the 7-day trend curve. Deep learning inference via EchoNext identifies hypertensive rhythm alterations (HYP) with a tripled Structural Heart Disease Index of 16%, driven primarily by blood pressure (20 points) and metabolic-vascular atherogenic load (13 points).
        </div>
      </div>

      <!-- Small Disclaimer -->
      <div class="disclaimer-card">
        <div class="disclaimer-text">
          <strong>Research / simulation output — not a clinical diagnosis.</strong> This document is generated from simulated physiological profiles for educational, technical evaluation, and algorithm verification purposes only. It should not be used as an independent clinical diagnosis or for patient treatment planning.
        </div>
      </div>
    </div>

    <footer class="doc-footer">
      <div>
        <span>Arohan Health · Precision Cardiovascular Risk Intelligence Platform · Educational & Engineering Prototype</span>
      </div>
      <div class="footer-right">
        <span>Page 2 of 2</span>
      </div>
    </footer>
  </section>

</body>
</html>`;

  const htmlPath = 'public/cad_summary_document.html';
  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log(`Wrote ${htmlPath}`);

  console.log('Launching headless Chrome for PDF compilation...');
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
  await send('Page.navigate', { url: 'http://localhost:5173/cad_summary_document.html' });
  await new Promise(r => setTimeout(r, 2000));

  // Check page overflow
  const evalRes = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const pages = Array.from(document.querySelectorAll('.pdf-page'));
        return pages.map((p, i) => ({
          page: i + 1,
          scrollHeight: p.scrollHeight,
          clientHeight: p.clientHeight,
          overflow: p.scrollHeight > (p.clientHeight + 4)
        }));
      })()
    `,
    returnByValue: true
  });
  console.log('Page overflow report:', evalRes.result.value);

  console.log('Generating PDF via Page.printToPDF...');
  const pdfRes = await send('Page.printToPDF', {
    paperWidth: 8.27,
    paperHeight: 11.69,
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    printBackground: true,
    preferCSSPageSize: true
  });

  const pdfBuf = Buffer.from(pdfRes.data, 'base64');
  const pdfOutput = path.resolve('CAD_Scenario_Dashboard_Summary.pdf');
  fs.writeFileSync(pdfOutput, pdfBuf);
  console.log(`SUCCESS! Generated PDF: ${pdfOutput} (${pdfBuf.length} bytes)`);

  chrome.kill();
  process.exit(0);
}

buildPdf().catch(e => { console.error(e); process.exit(1); });

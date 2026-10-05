const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const outDir = path.resolve('public/guide_assets');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const port = 9333;
  const userDataDir = path.resolve('public/guide_assets/chrome_profile');

  console.log('Launching Chrome on port', port);
  const chrome = spawn(chromePath, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--headless=new',
    '--window-size=1536,920',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    'http://localhost:5173/'
  ]);

  await sleep(2500);

  // Get WebSocket debugger URL
  const listRes = await fetch(`http://127.0.0.1:${port}/json`);
  const pages = await listRes.json();
  const page = pages.find(p => p.type === 'page');
  if (!page || !page.webSocketDebuggerUrl) {
    throw new Error('No page found: ' + JSON.stringify(pages));
  }

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 1;
  const pending = new Map();

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  };

  await new Promise(resolve => ws.onopen = resolve);

  function send(method, params = {}) {
    return new Promise((resolve) => {
      const msgId = id++;
      pending.set(msgId, resolve);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  await send('Page.enable');
  await send('Runtime.enable');
  await send('DOM.enable');

  async function evaluate(expr) {
    const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    return res.result?.result?.value;
  }

  async function capture(filename, clip = null) {
    const params = { format: 'png' };
    if (clip) params.clip = clip;
    const res = await send('Page.captureScreenshot', params);
    const buf = Buffer.from(res.result.data, 'base64');
    const targetPath = path.join(outDir, filename);
    fs.writeFileSync(targetPath, buf);
    console.log(`Saved: ${filename} (${buf.length} bytes)`);
  }

  console.log('Waiting for initial render...');
  await sleep(2000);

  // 1. Main Dashboard
  await capture('01_main_dashboard.png');

  // 2. Scenario selector open
  await evaluate(`
    const btn = document.querySelector('.topbar-scenario-dropdown-btn') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('SCENARIO'));
    if (btn) btn.click();
  `);
  await sleep(400);
  await capture('02_scenario_selector.png');

  // Close scenario dropdown
  await evaluate(`
    const btn = document.querySelector('.topbar-scenario-dropdown-btn') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('SCENARIO'));
    if (btn) btn.click();
  `);
  await sleep(300);

  // 3. Right panel (Risk score & disease specific risk)
  await capture('03_risk_score_panel.png', { x: 1220, y: 52, width: 316, height: 780, scale: 1 });

  // 4. Risk Trend
  await capture('04_risk_trend_bar.png', { x: 220, y: 720, width: 1000, height: 180, scale: 1 });

  // 5. Physiological parameter cards
  await capture('05_physiological_cards.png', { x: 220, y: 52, width: 1000, height: 260, scale: 1 });

  // 6. FAI & CAC
  await capture('06_fai_cac_cards.png', { x: 220, y: 470, width: 1000, height: 260, scale: 1 });

  // 7. Open Lab Report Modal
  await evaluate(`
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Lab Summary') || b.textContent.includes('View Details'));
    if (btn) btn.click();
  `);
  await sleep(400);
  await capture('07_lab_report_modal.png');
  // Close modal
  await evaluate(`
    const closeBtn = document.querySelector('.lr-modal-close') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Close') || b.textContent === '✕');
    if (closeBtn) closeBtn.click();
  `);
  await sleep(400);

  // 8. Open Report Upload Panel
  await evaluate(`
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Upload Report'));
    if (btn) btn.click();
  `);
  await sleep(500);
  await capture('08_report_upload_panel.png');
  // Close upload panel
  await evaluate(`
    const closeBtn = document.querySelector('.report-panel-close') || Array.from(document.querySelectorAll('button')).find(b => b.textContent === '✕' || b.getAttribute('aria-label') === 'Close');
    if (closeBtn) closeBtn.click();
  `);
  await sleep(400);

  // 9. Navigate to Patient Report Page
  await evaluate(`
    const navBtn = Array.from(document.querySelectorAll('button.sidebar-nav-item')).find(b => b.textContent.includes('Patient Report'));
    if (navBtn) navBtn.click();
  `);
  await sleep(1000);
  await capture('09_patient_report_overview.png');

  // Scroll down Patient Report
  await evaluate(`
    const scrollEl = document.querySelector('.app-center-scroll') || window;
    if (scrollEl.scrollTo) scrollEl.scrollTo({ top: 600, behavior: 'instant' });
    else scrollEl.scrollTop = 600;
  `);
  await sleep(500);
  await capture('10_patient_report_details.png');

  // Return to Dashboard
  await evaluate(`
    const navBtn = Array.from(document.querySelectorAll('button.sidebar-nav-item')).find(b => b.textContent.includes('Dashboard'));
    if (navBtn) navBtn.click();
  `);
  await sleep(500);

  ws.close();
  chrome.kill();
  console.log('All screenshots captured successfully!');
  process.exit(0);
}

run().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});

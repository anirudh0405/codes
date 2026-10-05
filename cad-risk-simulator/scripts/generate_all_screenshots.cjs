const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const outDir = path.resolve('public/guide_screens');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const port = 9335;

  const chrome = spawn(chromePath, [
    `--remote-debugging-port=${port}`,
    '--headless=new',
    '--window-size=1536,920',
    '--disable-gpu',
    'about:blank'
  ]);

  await sleep(1500);

  const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const page = list.find(p => p.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  let id = 1;
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const msgId = id++;
    const timer = setTimeout(() => reject(new Error('Timeout ' + method)), 10000);
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
  await send('Runtime.enable');
  await send('DOM.enable');

  const evaluate = async (expr) => {
    const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    return res.result?.value;
  };

  const capture = async (name, clip = null) => {
    const params = { format: 'png' };
    if (clip) params.clip = clip;
    const snap = await send('Page.captureScreenshot', params);
    const buf = Buffer.from(snap.data, 'base64');
    fs.writeFileSync(path.join(outDir, name), buf);
    console.log(`Captured ${name} (${buf.length} bytes)`);
  };

  console.log('Navigating to app...');
  await send('Page.navigate', { url: 'http://localhost:5173/' });
  await sleep(3500);

  // 1. Full Dashboard
  await capture('01_main_dashboard.png');

  // 2. Scenario selector open
  await evaluate(`
    const btn = document.querySelector('.topbar-scenario-dropdown-btn') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('SCENARIO'));
    if (btn) btn.click();
  `);
  await sleep(500);
  await capture('02_scenario_selector.png');

  // Close scenario
  await evaluate(`
    const btn = document.querySelector('.topbar-scenario-dropdown-btn') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('SCENARIO'));
    if (btn) btn.click();
  `);
  await sleep(400);

  // 3. Risk Score Card (Right Panel)
  await capture('03_risk_score_section.png', { x: 1230, y: 52, width: 306, height: 420, scale: 1 });

  // 4. Disease-Specific Risk & Contributions
  await capture('04_disease_risk_contributions.png', { x: 1230, y: 470, width: 306, height: 430, scale: 1 });

  // 5. 7-Day Risk Trend
  await capture('05_risk_trend_bar.png', { x: 220, y: 710, width: 1010, height: 190, scale: 1 });

  // 6. Physiological Parameter Cards (HR, BP, HRV)
  await capture('06_physiological_parameters.png', { x: 220, y: 52, width: 1010, height: 260, scale: 1 });

  // 7. FAI & CAC Cards
  await capture('07_fai_cac_cards.png', { x: 220, y: 380, width: 1010, height: 210, scale: 1 });

  // 8. Cardiac Readouts & Lab Summary Row
  await capture('08_readouts_and_labs.png', { x: 220, y: 560, width: 1010, height: 240, scale: 1 });

  // 9. Open Report Upload Panel
  await evaluate(`
    const uploadBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Upload Report'));
    if (uploadBtn) uploadBtn.click();
  `);
  await sleep(600);
  await capture('09_report_upload_panel.png');

  // Close Report Upload Panel
  await evaluate(`
    const closeBtn = document.querySelector('.report-panel-close') || Array.from(document.querySelectorAll('button')).find(b => b.textContent === '✕' || b.getAttribute('aria-label') === 'Close');
    if (closeBtn) closeBtn.click();
  `);
  await sleep(400);

  // 10. Open Patient Report page
  await evaluate(`
    const navBtn = Array.from(document.querySelectorAll('button.sidebar-nav-item')).find(b => b.textContent.includes('Patient Report'));
    if (navBtn) navBtn.click();
  `);
  await sleep(1200);
  await capture('10_patient_report_top.png');

  // Scroll down Patient Report
  await evaluate(`
    const scrollEl = document.querySelector('.app-center-scroll');
    if (scrollEl) scrollEl.scrollTop = 550;
  `);
  await sleep(600);
  await capture('11_patient_report_bottom.png');

  // 11. Click Arohan Logo to open enlarged preview modal
  await evaluate(`
    const navBtn = Array.from(document.querySelectorAll('button.sidebar-nav-item')).find(b => b.textContent.includes('Dashboard'));
    if (navBtn) navBtn.click();
  `);
  await sleep(500);

  await evaluate(`
    const logoBtn = document.querySelector('.sidebar-logo-trigger');
    if (logoBtn) logoBtn.click();
  `);
  await sleep(400);
  await capture('12_enlarged_logo_modal.png');

  // Close modal
  await evaluate(`
    const closeBtn = document.querySelector('.logo-modal-close');
    if (closeBtn) closeBtn.click();
  `);
  await sleep(300);

  ws.close();
  chrome.kill();
  console.log('Finished capturing all guide screenshots!');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

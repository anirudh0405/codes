const { spawn } = require('child_process');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9360;

async function captureCAD() {
  const chrome = spawn(chromePath, [
    `--remote-debugging-port=${port}`,
    '--headless=new',
    '--disable-gpu',
    '--window-size=1536,920',
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
  await send('Page.navigate', { url: 'http://localhost:5173/' });
  await new Promise(r => setTimeout(r, 2000));

  // 1. Open scenario dropdown
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = document.querySelector('#scenario-dropdown-trigger');
        if (btn) btn.click();
      })()
    `
  });
  await new Promise(r => setTimeout(r, 400));

  // 2. Click CAD category
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const catBtn = document.querySelector('#scenario-category-cad');
        if (catBtn) catBtn.click();
      })()
    `
  });
  await new Promise(r => setTimeout(r, 400));

  // 3. Click first CAD scenario preset
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const presetBtn = document.querySelector('#preset-option-cad-borderline-hypertensive') || 
                          document.querySelector('.scenario-dropdown-list button');
        if (presetBtn) presetBtn.click();
      })()
    `
  });
  await new Promise(r => setTimeout(r, 600));

  // 4. Press Escape to close dropdown
  await send('Runtime.evaluate', {
    expression: "window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))"
  });
  await new Promise(r => setTimeout(r, 1500));

  if (!fs.existsSync('public/cad_pdf_assets')) {
    fs.mkdirSync('public/cad_pdf_assets', { recursive: true });
  }

  // Ensure scroll is at top
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const c = document.querySelector('.app-center-scroll');
        if (c) c.scrollTop = 0;
        const rp = document.querySelector('.app-right-panel');
        if (rp) rp.scrollTop = 0;
      })()
    `
  });
  await new Promise(r => setTimeout(r, 400));

  // 5. Capture Upper Viewport
  const upper = await send('Page.captureScreenshot');
  fs.writeFileSync('public/cad_pdf_assets/01_cad_upper_dashboard.png', Buffer.from(upper.data, 'base64'));
  console.log('Saved 01_cad_upper_dashboard.png');

  // 6. Scroll center and right panel down
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const c = document.querySelector('.app-center-scroll');
        if (c) c.scrollTop = c.scrollHeight;
        const rp = document.querySelector('.app-right-panel');
        if (rp) rp.scrollTop = rp.scrollHeight;
      })()
    `
  });
  await new Promise(r => setTimeout(r, 600));

  // 7. Capture Lower Viewport
  const lower = await send('Page.captureScreenshot');
  fs.writeFileSync('public/cad_pdf_assets/02_cad_lower_dashboard.png', Buffer.from(lower.data, 'base64'));
  console.log('Saved 02_cad_lower_dashboard.png');

  // 8. Extract all live data values
  const data = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const activeScenario = document.querySelector('.active-scenario-pill span:nth-child(2)')?.innerText || 'CAD';
        const score = document.querySelector('.gauge-score-value')?.innerText || '';
        const band = document.querySelector('.gauge-band-badge')?.innerText || '';
        const hr = document.querySelector('.dash-stat-grid > div:nth-child(2) .dash-stat-value')?.innerText || '';
        const bp = document.querySelector('.dash-stat-grid > div:nth-child(3) .dash-stat-value')?.innerText || '';
        const hrv = document.querySelector('.dash-stat-grid > div:nth-child(4) .dash-stat-value')?.innerText || '';
        const fai = document.querySelector('#readout-fai .ct-value')?.innerText || '';
        const cac = document.querySelector('#readout-cac .ct-value')?.innerText || '';
        const trendScore = document.querySelector('.cad-risk-trend-score')?.innerText || '';
        const trendBand = document.querySelector('.cad-risk-trend-band')?.innerText || '';
        const echoClasses = Array.from(document.querySelectorAll('.dashboard-home span')).filter(s => 
          ['NORM', 'MI', 'STTC', 'CD', 'HYP', 'SHD'].includes(s.innerText.trim())
        ).map(s => s.innerText.trim());
        const shdIndex = document.querySelector('.dashboard-home')?.innerText.match(/Structural Heart Disease \\(SHD\\) Index:\\s*(\\d+%)/)?.[1] || '';
        
        // Disease-specific risk items
        const diseaseItems = Array.from(document.querySelectorAll('.app-right-panel .rp-readout-row, .app-right-panel [class*="disease"], .app-right-panel [style*="display: flex"]')).filter(el =>
          el.innerText && (el.innerText.includes('Atherosclero') || el.innerText.includes('Ischemia') || el.innerText.includes('Arrhythmia') || el.innerText.includes('Hypertens') || el.innerText.includes('Heart Failure'))
        ).map(el => el.innerText.replace(/\\n/g, ' '));

        return {
          activeScenario,
          score,
          band,
          hr,
          bp,
          hrv,
          fai,
          cac,
          trendScore,
          trendBand,
          echoClasses: [...new Set(echoClasses)],
          shdIndex,
          diseaseItems
        };
      })()
    `,
    returnByValue: true
  });

  console.log('Live CAD Data:', JSON.stringify(data.result.value, null, 2));
  fs.writeFileSync('public/cad_pdf_assets/cad_data.json', JSON.stringify(data.result.value, null, 2));

  chrome.kill();
  process.exit(0);
}

captureCAD().catch(e => { console.error(e); process.exit(1); });

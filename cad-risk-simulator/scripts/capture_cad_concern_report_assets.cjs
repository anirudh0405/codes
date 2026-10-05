const { spawn } = require('child_process');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9370;

async function captureCADConcernReport() {
  console.log('Launching headless Chrome on port', port);
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

  // 3. Click cad-cardiac-concern preset
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const presetBtn = document.querySelector('#preset-option-cad-cardiac-concern');
        if (presetBtn) {
          presetBtn.click();
        } else {
          const allBtns = Array.from(document.querySelectorAll('button'));
          const target = allBtns.find(b => b.innerText.includes('Cardiac Concern'));
          if (target) target.click();
        }
      })()
    `
  });
  await new Promise(r => setTimeout(r, 800));

  // 4. Press Escape to close dropdown
  await send('Runtime.evaluate', {
    expression: "window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))"
  });
  await new Promise(r => setTimeout(r, 1500));

  if (!fs.existsSync('public/cad_concern_report_assets')) {
    fs.mkdirSync('public/cad_concern_report_assets', { recursive: true });
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
  fs.writeFileSync('public/cad_concern_report_assets/01_cad_concern_upper_overview.png', Buffer.from(upper.data, 'base64'));
  console.log('Saved 01_cad_concern_upper_overview.png');

  // 6. Scroll center column down to reveal 7-day trend, cardiac readouts, labs
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const c = document.querySelector('.app-center-scroll');
        if (c) c.scrollTop = 420;
        const rp = document.querySelector('.app-right-panel');
        if (rp) rp.scrollTop = 380;
      })()
    `
  });
  await new Promise(r => setTimeout(r, 500));

  const lower = await send('Page.captureScreenshot');
  fs.writeFileSync('public/cad_concern_report_assets/02_cad_concern_trend_readouts.png', Buffer.from(lower.data, 'base64'));
  console.log('Saved 02_cad_concern_trend_readouts.png');

  // 7. Scroll further down to clearly capture EchoNext, Labs, and Contributions
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const c = document.querySelector('.app-center-scroll');
        if (c) c.scrollTop = 720;
        const rp = document.querySelector('.app-right-panel');
        if (rp) rp.scrollTop = 520;
      })()
    `
  });
  await new Promise(r => setTimeout(r, 500));

  const bottom = await send('Page.captureScreenshot');
  fs.writeFileSync('public/cad_concern_report_assets/03_cad_concern_echonext_contributions.png', Buffer.from(bottom.data, 'base64'));
  console.log('Saved 03_cad_concern_echonext_contributions.png');

  // Extract live dashboard values
  const telemetry = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const getText = (selector) => {
          const el = document.querySelector(selector);
          return el ? el.innerText.trim() : null;
        };

        const activeScenario = getText('#scenario-dropdown-trigger') || getText('.scenario-active-title');
        const allText = document.body.innerText;
        return {
          activeScenario,
          bodyText: allText
        };
      })()
    `,
    returnByValue: true
  });

  fs.writeFileSync('scripts/cad_concern_full_text.txt', telemetry.result.value.bodyText);
  console.log('Saved scripts/cad_concern_full_text.txt, length:', telemetry.result.value.bodyText.length);

  ws.close();
  chrome.kill();
  process.exit(0);
}

captureCADConcernReport().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

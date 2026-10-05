const { spawn } = require('child_process');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9390;

async function check() {
  const chrome = spawn(chromePath, ['--remote-debugging-port=' + port, '--headless=new', '--disable-gpu', 'about:blank']);
  await new Promise(r => setTimeout(r, 1500));
  const list = await (await fetch('http://127.0.0.1:' + port + '/json')).json();
  const target = list.find(p => p.type === 'page' && !p.url.startsWith('chrome-extension')) || list[0];
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  let id = 1;
  const send = (m, p = {}) => new Promise(res => {
    const msgId = id++;
    const h = (e) => {
      const d = JSON.parse(e.data);
      if (d.id === msgId) { ws.removeEventListener('message', h); res(d.result); }
    };
    ws.addEventListener('message', h);
    ws.send(JSON.stringify({ id: msgId, method: m, params: p }));
  });

  await send('Page.enable');
  await send('Page.navigate', { url: 'http://localhost:5173/' });
  await new Promise(r => setTimeout(r, 2000));

  const info = await send('Runtime.evaluate', {
    expression: `
      (() => {
        return {
          href: window.location.href,
          hasTrigger: !!document.querySelector('#scenario-dropdown-trigger'),
          buttons: Array.from(document.querySelectorAll('button')).map(b => b.id || b.innerText).slice(0, 10)
        };
      })()
    `,
    returnByValue: true
  });
  console.log('Page info:', info.result.value);

  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = document.querySelector('#scenario-dropdown-trigger');
        if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      })()
    `
  });
  await new Promise(r => setTimeout(r, 600));

  const text = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const items = Array.from(document.querySelectorAll('.scenario-dropdown-item'));
        return items.map(el => ({
          name: el.querySelector('.scenario-dropdown-item-name')?.innerText,
          desc: el.querySelector('.scenario-dropdown-item-desc')?.innerText
        }));
      })()
    `,
    returnByValue: true
  });

  console.log('Category names in dropdown:', text.result.value);
  ws.close();
  chrome.kill();
}
check();

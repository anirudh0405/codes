const { spawn } = require('child_process');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9367;

async function dump() {
  const chrome = spawn(chromePath, ['--remote-debugging-port=' + port, '--headless=new', '--disable-gpu', 'about:blank']);
  await new Promise(r => setTimeout(r, 1500));
  const list = await (await fetch('http://127.0.0.1:' + port + '/json')).json();
  const ws = new WebSocket(list[0].webSocketDebuggerUrl);
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

  await send('Runtime.evaluate', { expression: 'document.querySelector("#scenario-dropdown-trigger")?.click()' });
  await new Promise(r => setTimeout(r, 300));
  await send('Runtime.evaluate', { expression: 'document.querySelector("#scenario-category-healthy")?.click()' });
  await new Promise(r => setTimeout(r, 300));
  await send('Runtime.evaluate', { expression: 'document.querySelector("#preset-option-healthy-baseline")?.click()' });
  await new Promise(r => setTimeout(r, 600));
  await send('Runtime.evaluate', { expression: 'window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))' });
  await new Promise(r => setTimeout(r, 1200));

  const data = await send('Runtime.evaluate', {
    expression: 'document.body.innerText',
    returnByValue: true
  });
  
  const fs = require('fs');
  fs.writeFileSync('scripts/healthy_full_text.txt', data.result.value);
  console.log('Saved scripts/healthy_full_text.txt, length:', data.result.value.length);
  ws.close();
  chrome.kill();
}
dump();

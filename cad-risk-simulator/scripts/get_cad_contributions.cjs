const { spawn } = require('child_process');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9373;

async function check() {
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
  await send('Runtime.evaluate', { expression: 'document.querySelector("#scenario-category-cad")?.click()' });
  await new Promise(r => setTimeout(r, 300));
  await send('Runtime.evaluate', { expression: 'document.querySelector("#preset-option-cad-cardiac-concern")?.click()' });
  await new Promise(r => setTimeout(r, 600));
  await send('Runtime.evaluate', { expression: 'window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))' });
  await new Promise(r => setTimeout(r, 2000));

  const result = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const root = document.querySelector('#root');
        // Let's find any fiber node
        const key = Object.keys(root).find(k => k.startsWith('__reactFiber'));
        let fiber = root[key];
        
        // Traverse fiber tree to find riskResult or contributions
        let found = null;
        function traverse(node, depth = 0) {
          if (!node || depth > 100 || found) return;
          if (node.memoizedProps?.value && typeof node.memoizedProps.value === 'object' && node.memoizedProps.value.contributions) {
            found = node.memoizedProps.value.contributions;
            return;
          }
          if (node.memoizedState) {
            let s = node.memoizedState;
            while (s) {
              if (s.memoizedState && typeof s.memoizedState === 'object' && s.memoizedState.contributions) {
                found = s.memoizedState.contributions;
                return;
              }
              if (s.memoizedState && typeof s.memoizedState === 'object' && s.memoizedState.score) {
                found = s.memoizedState;
                return;
              }
              s = s.next;
            }
          }
          traverse(node.child, depth + 1);
          traverse(node.sibling, depth + 1);
        }
        traverse(fiber);

        // Also inspect animated numbers
        const animatedNums = Array.from(document.querySelectorAll('.rp-contrib-value-inner')).map(el => {
          const fKey = Object.keys(el).find(k => k.startsWith('__reactFiber'));
          return el[fKey]?.memoizedProps?.value;
        });

        return { found, animatedNums };
      })()
    `,
    returnByValue: true
  });

  console.log('Result:', JSON.stringify(result.result.value, null, 2));
  ws.close();
  chrome.kill();
}
check();

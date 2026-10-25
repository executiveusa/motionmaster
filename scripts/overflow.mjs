const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const ws = new WebSocket(list[0].webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const send = (m, p = {}) =>
  new Promise((res, rej) => {
    const i = ++id;
    const t = setTimeout(() => rej(new Error('timeout ' + m)), 15000);
    pending.set(i, (v) => {
      clearTimeout(t);
      res(v);
    });
    ws.send(JSON.stringify({ id: i, method: m, params: p }));
  });
await new Promise((r) => (ws.onopen = r));
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m.result);
    pending.delete(m.id);
  }
};

const width = Number(process.argv[2] ?? 320);
await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: true });
await send('Page.navigate', { url: process.argv[3] ?? 'http://127.0.0.1:4173/' });
await new Promise((r) => setTimeout(r, 1800));

// Only elements that are NOT inside a scroll container can widen the page.
const expression = `JSON.stringify({
  clientWidth: document.documentElement.clientWidth,
  scrollWidth: document.documentElement.scrollWidth,
  culprits: [...document.querySelectorAll('body *')].map(e => {
    const b = e.getBoundingClientRect();
    if (b.width === 0 || b.right <= ${width} + 1) return null;
    let clipped = false;
    for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) {
      const s = getComputedStyle(a);
      // clip clips too — it just does not create a scroll container.
      if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) { clipped = true; break; }
    }
    if (clipped) return null;
    return {
      sel: e.tagName + '.' + (typeof e.className === 'string' ? e.className.split(' ').slice(0,3).join('.') : ''),
      right: Math.round(b.right), w: Math.round(b.width),
      parent: e.parentElement ? e.parentElement.tagName + '.' + (typeof e.parentElement.className === 'string' ? e.parentElement.className.split(' ').slice(0,2).join('.') : '') : ''
    };
  }).filter(Boolean).sort((a,b) => b.right - a.right).slice(0, 12)
})`;

const r = await send('Runtime.evaluate', { expression, returnByValue: true });
console.log(JSON.stringify(JSON.parse(r.result.value), null, 1));

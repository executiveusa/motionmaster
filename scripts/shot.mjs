// Capture a section of the live page by selector, at a given width.
const [, , selector, out, widthArg] = process.argv;
const width = Number(widthArg ?? 1440);
const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const ws = new WebSocket(list[0].webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const send = (m, p = {}) =>
  new Promise((res, rej) => {
    const i = ++id;
    const t = setTimeout(() => rej(new Error('timeout ' + m)), 25000);
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

await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 });
await send('Page.navigate', { url: process.argv[6] ?? 'http://127.0.0.1:4173/' });
await new Promise((r) => setTimeout(r, 2000));

const r = await send('Runtime.evaluate', {
  expression: `(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return null; const b = e.getBoundingClientRect(); return JSON.stringify({ x: b.x + window.scrollX, y: b.y + window.scrollY, w: b.width, h: b.height }); })()`,
  returnByValue: true,
});
if (!r.result.value) {
  console.log('selector not found: ' + selector);
  process.exit(1);
}
const box = JSON.parse(r.result.value);
const shot = await send('Page.captureScreenshot', {
  format: 'jpeg',
  quality: 88,
  captureBeyondViewport: true,
  clip: { x: box.x, y: box.y, width: box.w, height: Math.min(box.h, 4000), scale: 1 },
});
const { writeFileSync } = await import('node:fs');
writeFileSync(out, Buffer.from(shot.data, 'base64'));
console.log(`${out} — ${Math.round(box.w)}x${Math.round(Math.min(box.h, 4000))} from ${selector}`);

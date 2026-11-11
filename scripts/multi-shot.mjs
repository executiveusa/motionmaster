// Capture several sections of the page in one browser session, the way a
// person would see them: navigate, scroll to the section, let the entrance
// animation run, then take the viewport.
//
//   node multi-shot.mjs width out-dir selector [selector ...]
const [, , widthArg, outDir, ...selectors] = process.argv;
const width = Number(widthArg ?? 1440);
const height = width <= 430 ? 844 : 900;

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

await send('Emulation.setDeviceMetricsOverride', {
  width,
  height,
  deviceScaleFactor: 1,
  mobile: width <= 767,
});
await send('Page.navigate', { url: 'http://127.0.0.1:4173/' });
await new Promise((r) => setTimeout(r, 3000));

for (const selector of selectors) {
  const found = await send('Runtime.evaluate', {
    expression: `(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return false; e.scrollIntoView({behavior:'instant', block:'start'}); return true; })()`,
    returnByValue: true,
  });
  if (!found.result.value) {
    console.log(`MISSING ${selector}`);
    continue;
  }
  await new Promise((r) => setTimeout(r, 1400));
  const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
  const name = `${outDir}/${selector.replace(/[^a-z0-9]+/gi, '-')}-${width}.jpg`;
  const { writeFileSync } = await import('node:fs');
  writeFileSync(name, Buffer.from(shot.data, 'base64'));
  console.log(name);
}
process.exit(0);

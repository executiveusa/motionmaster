// Scroll to a section the way a person would, let the reveal animations run,
// then capture the viewport. This is the honest test of the scroll behaviour.
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
// The URL may be given as argv[6] (when argv[6] is not a step count) or
// argv[7], so both call styles work.
const argUrl = (a) => (a && !/^\d+$/.test(a) ? a : undefined);
const target =
  argUrl(process.argv[7]) ?? argUrl(process.argv[6]) ?? process.env.SHOT_URL ?? 'http://127.0.0.1:4173/';
await send('Page.navigate', { url: target });
await new Promise((r) => setTimeout(r, 1800));

// Walk down the page in viewport-sized steps, like a reader scrolling.
const steps = Number(
  (/^\d+$/.test(process.argv[6] ?? '') ? process.argv[6] : process.argv[7]) ?? 12,
);
for (let i = 0; i < steps; i++) {
  await send('Runtime.evaluate', { expression: `window.scrollBy(0, ${Math.round(900 * 0.8)})` });
  await new Promise((r) => setTimeout(r, 320));
}
await new Promise((r) => setTimeout(r, 900));

const pos = await send('Runtime.evaluate', {
  expression: `(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return null; e.scrollIntoView({block:'start'}); return 'ok'; })()`,
  returnByValue: true,
});
if (!pos.result.value) {
  console.log('selector not found: ' + selector);
  process.exit(1);
}
await new Promise((r) => setTimeout(r, 1400));

// Report anything still invisible in the section we care about.
const hidden = await send('Runtime.evaluate', {
  expression: `JSON.stringify([...document.querySelectorAll(${JSON.stringify(selector)} .tier, ${JSON.stringify(selector)} .tier *')].filter(e=>{const s=getComputedStyle(e);return s.opacity==='0'||s.visibility==='hidden'||(s.display==='none'&&e.offsetHeight===0)}).slice(0,6).map(e=>e.tagName+'.'+e.className+' op='+getComputedStyle(e).opacity))`,
  returnByValue: true,
});
console.log('still hidden:', hidden.result.value);

const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 88 });
const { writeFileSync } = await import('node:fs');
writeFileSync(out, Buffer.from(shot.data, 'base64'));
console.log('wrote ' + out);

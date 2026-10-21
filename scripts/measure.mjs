import { setTimeout as sleep } from 'node:timers/promises';

const base = process.argv[2] ?? 'http://127.0.0.1:4173/';
const widths = [320, 375, 390, 430, 768, 1024, 1280, 1440];

const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const ws = new WebSocket(list[0].webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const i = ++id;
    const timer = setTimeout(() => {
      pending.delete(i);
      rej(new Error('CDP timeout: ' + method));
    }, 15000);
    pending.set(i, (v) => { clearTimeout(timer); res(v); });
    ws.send(JSON.stringify({ id: i, method, params }));
  });
console.log('connecting…');
await new Promise((r) => (ws.onopen = r));
console.log('connected, targets:', list.length);
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m.result);
    pending.delete(m.id);
  }
};

const problems = [];
for (const w of widths) {
  await send('Emulation.setDeviceMetricsOverride', {
    width: w,
    height: w < 768 ? 844 : 900,
    deviceScaleFactor: 1,
    mobile: w < 768,
  });
  await send('Page.navigate', { url: base });
  await sleep(1600);
  const r = await send('Runtime.evaluate', {
    expression: `JSON.stringify((() => {
      const de = document.documentElement;
      const over = [...document.querySelectorAll('body *')]
        .filter(e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.right > window.innerWidth + 1; })
        .slice(0, 5)
        .map(e => e.tagName + '.' + (typeof e.className === 'string' ? e.className.split(' ').slice(0,2).join('.') : '') + '@' + Math.round(e.getBoundingClientRect().right));
      const small = [...document.querySelectorAll('a,button,[role=button]')]
        .filter(e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && b.height < 44 && !e.closest('nav,ul,ol'); })
        .slice(0, 5)
        .map(e => e.tagName + '.' + (typeof e.className === 'string' ? e.className.split(' ').slice(0,2).join('.') : '') + '@' + Math.round(e.getBoundingClientRect().height));
      const vids = [...document.querySelectorAll('video')].map(v => ({ src: v.getAttribute('src'), poster: v.getAttribute('poster') }));
      return { sw: de.scrollWidth, iw: window.innerWidth, over, small, vids, imgs: document.images.length };
    })())`,
    returnByValue: true,
  });
  const v = JSON.parse(r.result.value);
  const ok = v.sw <= v.iw;
  const line = `${String(w).padStart(4)}px scroll=${String(v.sw).padStart(4)} inner=${String(v.iw).padStart(4)} ${ok ? 'OK ' : 'OVERFLOW'}`;
  console.log(line);
  if (!ok) {
    console.log('      overflowing:', v.over);
    problems.push(`${w}px horizontal overflow: ${JSON.stringify(v.over)}`);
  }
  if (v.small.length) {
    console.log('      small targets:', v.small);
    problems.push(`${w}px touch target under 44px: ${JSON.stringify(v.small)}`);
  }
  const missingVideo = v.vids.filter((x) => !x.src).length;
  if (missingVideo) problems.push(`${w}px: ${missingVideo} video elements without a src`);
}

console.log('\n' + (problems.length ? 'PROBLEMS:\n' + problems.map((p) => ' - ' + p).join('\n') : 'no layout problems'));

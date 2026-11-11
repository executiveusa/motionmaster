#!/usr/bin/env node
/**
 * A blind A/B capture of two pages.
 *
 *   node scripts/blind-capture.mjs --ours <url> --bar <url> --out <dir>
 *
 * Both pages are captured at the same viewports with the brand hidden, and
 * the file names are assigned at random. A critic with fresh context cannot
 * tell which is which from the image, so its answer is an answer about the
 * design rather than about the name on it.
 *
 * The brand is hidden rather than cropped: the header is part of the design,
 * and cutting it off would change the thing being compared.
 */
import { spawn } from 'node:child_process';
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const argv = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};
const OURS = opt('ours', 'http://127.0.0.1:4173/');
const BAR = opt('bar', 'https://motionvideo.xyz/en');
const OUT = resolve(opt('out', '.completion-proof/blind'));
const PORT = Number(opt('port', 9333));

const CHROME = process.env.CHROME_BIN ||
  '/workspace/.home/chrome/chrome-headless-shell-linux64/chrome-headless-shell';

mkdirSync(OUT, { recursive: true });

/*
 * Hide the brand. Ours is a link with a class; the bar's is a link whose text
 * is the name. Both are found by what they are, not by a selector that would
 * only work on one of them.
 */
const HIDE_BRAND = `(() => {
  const hide = (el) => { if (el) el.style.visibility = 'hidden'; };
  const ours = document.querySelector('.brand');
  if (ours) hide(ours);
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const text = (node.nodeValue || '').trim();
    if (/^motion\\s*master$/i.test(text) || /^motion\\s*video$/i.test(text)) {
      const el = node.parentElement;
      if (el) hide(el.closest('a') || el);
    }
  }
  return true;
})()`;

const chrome = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`,
  '--remote-allow-origins=*',
  '--ignore-certificate-errors',
  '--disable-features=LocalNetworkAccessChecks',
  '--disable-gpu',
  '--no-sandbox',
  '--user-data-dir=/tmp/chrome-blind',
  'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(2500);

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const ws = new WebSocket(list[0].webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const send = (method, params = {}) => new Promise((res, rej) => {
  const i = ++id;
  const t = setTimeout(() => rej(new Error('timeout ' + method)), 40000);
  pending.set(i, (v) => { clearTimeout(t); res(v); });
  ws.send(JSON.stringify({ id: i, method, params }));
});
await new Promise((r) => (ws.onopen = r));
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
};

const VIEWPORTS = [{ width: 1440, height: 900 }, { width: 390, height: 844 }];

async function capture(url, label) {
  const shots = [];
  for (const viewport of VIEWPORTS) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.width < 768,
    });
    await send('Page.navigate', { url });
    await sleep(6000);
    await send('Runtime.evaluate', { expression: HIDE_BRAND });
    await sleep(900);
    const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 88 });
    const name = `${label}-${viewport.width}.jpg`;
    writeFileSync(join(OUT, name), Buffer.from(shot.data, 'base64'));
    shots.push(name);
  }
  return shots;
}

const oursShots = await capture(OURS, 'raw-ours');
const barShots = await capture(BAR, 'raw-bar');

/* Which one is the candidate is decided at random, so the file names carry
   no information at all. */
const flipped = Math.random() < 0.5;
const map = flipped ? { ours: 'B', bar: 'A' } : { ours: 'A', bar: 'B' };
for (const viewport of VIEWPORTS) {
  const width = viewport.width;
  copyFileSync(join(OUT, `raw-ours-${width}.jpg`), join(OUT, `${map.ours}-${width}.jpg`));
  copyFileSync(join(OUT, `raw-bar-${width}.jpg`), join(OUT, `${map.bar}-${width}.jpg`));
}
console.log(JSON.stringify({ map, flipped, oursShots, barShots, out: OUT }, null, 2));
writeFileSync(join(OUT, 'blind-key.json'), `${JSON.stringify({ map, flipped, ours: OURS, bar: BAR }, null, 2)}\n`);

ws.close();
chrome.kill("SIGTERM");
process.exit(0);

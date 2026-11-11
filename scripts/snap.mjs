#!/usr/bin/env node
/**
 * Snap the top of a page at a given width.
 *
 *   node scripts/snap.mjs <url> <out.jpg> [width] [height] [--full]
 *
 * One browser, one page, one shot. Used to look at a change rather than to
 * measure one.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const [url, out, widthArg, heightArg] = process.argv.slice(2);
const width = Number(widthArg ?? 1440);
const height = Number(heightArg ?? 900);
const full = process.argv.includes('--full');
const PORT = 9400 + Math.floor(Math.random() * 400);

const CHROME =
  process.env.CHROME_BIN ||
  '/workspace/.home/chrome/chrome-headless-shell-linux64/chrome-headless-shell';

const chrome = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`,
  '--remote-allow-origins=*',
  '--ignore-certificate-errors',
  '--disable-features=LocalNetworkAccessChecks',
  '--disable-gpu',
  '--no-sandbox',
  '--hide-scrollbars',
  `--user-data-dir=/tmp/chrome-snap-${PORT}`,
  'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(2500);

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const ws = new WebSocket(list[0].webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const send = (method, params = {}) =>
  new Promise((res, rej) => {
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

await send('Emulation.setDeviceMetricsOverride', {
  width, height, deviceScaleFactor: 1, mobile: width < 768,
});
await send('Page.navigate', { url });
await sleep(4500);
if (full) {
  const m = await send('Page.getLayoutMetrics');
  const h = Math.min(Math.ceil(m.cssContentSize.height), 8000);
  await send('Emulation.setDeviceMetricsOverride', {
    width, height: h, deviceScaleFactor: 1, mobile: width < 768,
  });
  await sleep(1200);
}
const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, Buffer.from(shot.data, 'base64'));
console.log(`wrote ${out}`);

ws.close();
chrome.kill('SIGTERM');
process.exit(0);

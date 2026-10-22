#!/usr/bin/env node
/**
 * Render still frames from the hero film at chosen moments, so the design can
 * be judged before spending minutes on a full render.
 *
 *   node hero/stills.mjs 0 4 8 12 22 30 44 50 56 62 70 80 86 92 98 102
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const times = process.argv.slice(2).map(Number).filter((n) => !Number.isNaN(n));
if (!times.length) times.push(0, 6, 12, 22, 30, 44, 50, 58, 64, 72, 80, 88, 94, 99, 102);
const OUTDIR = join(here, 'stills');
mkdirSync(OUTDIR, { recursive: true });

const W = 1920;
const H = 1080;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2' };

const server = createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  const rel = normalize(url === '/' ? '/index.html' : url).replace(/^(\.\.[/\\])+/, '');
  const file = join(here, rel);
  if (!file.startsWith(here) || !existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404);
    res.end('nope');
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
  createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;

const CHROME =
  process.env.CHROME_BIN ||
  [
    '/opt/chrome-headless-shell-linux64/chrome-headless-shell',
    '/usr/local/bin/chrome-headless-shell',
    `${process.env.HOME ?? '/workspace/.home'}/chrome/chrome-headless-shell-linux64/chrome-headless-shell`,
    '/workspace/.home/chrome/chrome-headless-shell-linux64/chrome-headless-shell',
  ].find((p) => existsSync(p));
if (!CHROME) {
  console.error('No Chrome found');
  process.exit(1);
}

const profile = join(here, '.chrome-profile');
mkdirSync(profile, { recursive: true });
const PORT_CDP = 9600 + Math.floor(Math.random() * 300);
const chrome = spawn(
  CHROME,
  ['--headless', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--ignore-certificate-errors',
   '--force-device-scale-factor=1', `--remote-debugging-port=${PORT_CDP}`, `--user-data-dir=${profile}`,
   '--window-size=' + W + ',' + H, 'about:blank'],
  { stdio: 'ignore' },
);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let target;
for (let i = 0; i < 90; i++) {
  try {
    const res = await fetch(`http://127.0.0.1:${PORT_CDP}/json/list`);
    if (res.ok) {
      const list = await res.json();
      target = list.find((t) => t.type === 'page') || list[0];
      if (target) break;
    }
  } catch { /* waiting */ }
  await sleep(500);
}

const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const i = ++id;
    const timer = setTimeout(() => rej(new Error('timeout ' + method)), 90000);
    pending.set(i, (v) => { clearTimeout(timer); res(v); });
    ws.send(JSON.stringify({ id: i, method, params }));
  });
await new Promise((r) => (ws.onopen = r));
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
};

try {
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html` });
  for (let i = 0; i < 120; i++) {
    const r = await send('Runtime.evaluate', { expression: 'Boolean(window.READY) && document.fonts.status === "loaded"', returnByValue: true });
    if (r.result && r.result.value) break;
    await sleep(500);
  }
  for (const t of times) {
    const r = await send('Runtime.evaluate', { expression: `window.render(${t})`, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) {
      console.error(`t=${t} threw:`, JSON.stringify(r.exceptionDetails).slice(0, 500));
      continue;
    }
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const out = join(OUTDIR, `t${String(t).padStart(3, '0').replace('.', '_')}.png`);
    writeFileSync(out, Buffer.from(shot.data, 'base64'));
    console.log('wrote ' + out);
  }
} finally {
  try { ws.close(); } catch { /* ignore */ }
  chrome.kill('SIGKILL');
  server.close();
}

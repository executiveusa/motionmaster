#!/usr/bin/env node
/**
 * Render the hero film to an MP4.
 *
 * Picture is a function of time: the page exposes `window.render(t)`, and this
 * drives it frame by frame through headless Chrome, piping each frame straight
 * into ffmpeg. No intermediate PNGs on disk, no screen recording, no dropped
 * frames — every frame is the frame the film asks for.
 *
 *   node hero/render.mjs [--out hero/motion-master-hero.mp4] [--fps 30]
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};
const OUT = argOf('--out', join(here, 'motion-master-hero.mp4'));
const FPS = Number(argOf('--fps', 30));

const W = 1920;
const H = 1080;
const DUR = 104;

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
};

// ── a static server for the film directory ───────────────────────────────────
const server = createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  const rel = normalize(url === '/' ? '/index.html' : url).replace(/^(\.\.[/\\])+/, '');
  const file = join(here, rel);
  if (!file.startsWith(here) || !existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404);
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
  createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;

// ── chrome ───────────────────────────────────────────────────────────────────
const { existsSync: exists } = await import('node:fs');
const CHROME =
  process.env.CHROME_BIN ||
  [
    '/opt/chrome-headless-shell-linux64/chrome-headless-shell',
    '/usr/local/bin/chrome-headless-shell',
    `${process.env.HOME ?? '/workspace/.home'}/chrome/chrome-headless-shell-linux64/chrome-headless-shell`,
    '/workspace/.home/chrome/chrome-headless-shell-linux64/chrome-headless-shell',
  ].find((p) => exists(p));
if (!CHROME) {
  console.error('No Chrome Headless Shell found. Set CHROME_BIN.');
  server.close();
  process.exit(1);
}

const profile = join(here, '.chrome-profile');
mkdirSync(profile, { recursive: true });
const PORT_CDP = 9222 + Math.floor(Math.random() * 600);

const chrome = spawn(
  CHROME,
  [
    '--headless',
    '--no-sandbox',
    '--disable-gpu',
    '--hide-scrollbars',
    '--ignore-certificate-errors',
    '--force-device-scale-factor=1',
    '--disable-lcd-text',
    `--remote-debugging-port=${PORT_CDP}`,
    `--user-data-dir=${profile}`,
    '--window-size=' + W + ',' + H,
    'about:blank',
  ],
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
  } catch {
    /* not up yet */
  }
  await sleep(500);
}
if (!target) {
  console.error('Chrome did not start');
  chrome.kill('SIGKILL');
  server.close();
  process.exit(1);
}

const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const i = ++id;
    const timer = setTimeout(() => {
      pending.delete(i);
      rej(new Error('CDP timeout: ' + method));
    }, 120000);
    pending.set(i, (v) => {
      clearTimeout(timer);
      res(v);
    });
    ws.send(JSON.stringify({ id: i, method, params }));
  });
await new Promise((r) => (ws.onopen = r));
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m.result);
    pending.delete(m.id);
  }
};

// ── ffmpeg ───────────────────────────────────────────────────────────────────
const ff = spawn(
  'ffmpeg',
  [
    '-y',
    '-f', 'image2pipe',
    '-framerate', String(FPS),
    '-i', '-',
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '16',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    OUT,
  ],
  { stdio: ['pipe', 'ignore', 'pipe'] },
);
let ffErr = '';
ff.stderr.on('data', (d) => {
  ffErr += d.toString();
});

const writeFrame = (buf) =>
  new Promise((res) => {
    if (ff.stdin.write(buf)) res();
    else ff.stdin.once('drain', res);
  });

// ── the render ───────────────────────────────────────────────────────────────
try {
  await send('Emulation.setDeviceMetricsOverride', {
    width: W,
    height: H,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html` });

  // wait for the page and the fonts
  for (let i = 0; i < 120; i++) {
    const r = await send('Runtime.evaluate', {
      expression: 'Boolean(window.READY) && document.fonts.status === "loaded"',
      returnByValue: true,
    });
    if (r.result && r.result.value) break;
    await sleep(500);
  }
  // prime the frame cache so the first frames are not slow
  await send('Runtime.evaluate', {
    expression: 'window.render(0)',
    awaitPromise: true,
    returnByValue: true,
  });

  const total = Math.round(DUR * FPS);
  const started = Date.now();
  for (let f = 0; f < total; f++) {
    const t = f / FPS;
    const r = await send('Runtime.evaluate', {
      expression: `window.render(${t})`,
      awaitPromise: true,
      returnByValue: true,
    });
    if (r.exceptionDetails) {
      console.error(`\nframe ${f} (t=${t.toFixed(2)}) threw:`, JSON.stringify(r.exceptionDetails).slice(0, 400));
      break;
    }
    const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 94 });
    await writeFrame(Buffer.from(shot.data, 'base64'));

    if (f % 60 === 0) {
      const done = f + 1;
      const rate = done / ((Date.now() - started) / 1000);
      const left = (total - done) / rate;
      process.stdout.write(
        `\r  ${done}/${total} frames  ${rate.toFixed(1)} fps  ${Math.round(left)}s left   `,
      );
    }
  }
  process.stdout.write('\n');

  ff.stdin.end();
  await new Promise((res) => ff.on('close', res));
  if (ffErr.includes('Error') && !existsSync(OUT)) {
    console.error('ffmpeg failed:\n' + ffErr.slice(-2000));
  }
  const size = existsSync(OUT) ? statSync(OUT).size : 0;
  console.log(`wrote ${OUT} (${(size / 1024 / 1024).toFixed(2)} MB) in ${((Date.now() - started) / 1000 / 60).toFixed(1)} min`);
} finally {
  try {
    ws.close();
  } catch {
    /* ignore */
  }
  chrome.kill('SIGKILL');
  server.close();
}

#!/usr/bin/env node
/**
 * Screenshot a URL at a given viewport, the way a visitor would see it:
 * launch Chrome, set the device metrics, navigate, let the page settle, walk
 * it so scroll reveals fire, then capture the viewport.
 *
 *   node scripts/shot-live.mjs <url> <out.png> [width] [height] [scrollTo]
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const url = process.argv[2];
const out = process.argv[3];
const width = Number(process.argv[4] ?? 1440);
const height = Number(process.argv[5] ?? 900);
const scrollTo = process.argv[6] ?? '';
if (!url || !out) {
  console.error('usage: node scripts/shot-live.mjs <url> <out.png> [width] [height] [scrollTo]');
  process.exit(1);
}

const profile = mkdtempSync(join(tmpdir(), 'shot-'));
const port = 9800 + Math.floor(Math.random() * 400);
const CHROME =
  process.env.CHROME_BIN ||
  [
    '/opt/chrome-headless-shell-linux64/chrome-headless-shell',
    '/usr/local/bin/chrome-headless-shell',
    `${process.env.HOME ?? '/workspace/.home'}/chrome/chrome-headless-shell-linux64/chrome-headless-shell`,
    '/workspace/.home/chrome/chrome-headless-shell-linux64/chrome-headless-shell',
  ].find((p) => existsSync(p));
if (!CHROME) {
  console.error('No Chrome Headless Shell found. Set CHROME_BIN.');
  process.exit(1);
}

const chrome = spawn(
  CHROME,
  [
    '--headless',
    '--no-sandbox',
    '--disable-gpu',
    '--hide-scrollbars',
    // The sandbox proxy's CA is not in Chrome's trust store, so any https
    // origin fails to load without this. Localhost does not need it.
    '--ignore-certificate-errors',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  let target;
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (res.ok) {
        target = (await res.json())[0];
        break;
      }
    } catch {
      /* not up yet */
    }
    await sleep(500);
  }
  if (!target) throw new Error('chrome did not start');

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const send = (method, params = {}) =>
    new Promise((res, rej) => {
      const i = ++id;
      const timer = setTimeout(() => rej(new Error('CDP timeout: ' + method)), 30000);
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

  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 768,
  });
  await send('Page.navigate', { url });
  await sleep(4000);

  // Walk the page so the scroll reveals fire, then go where we were asked to.
  for (let i = 0; i < 10; i++) {
    await send('Runtime.evaluate', { expression: `window.scrollBy(0, ${Math.round(height * 0.8)})` });
    await sleep(260);
  }
  if (scrollTo) {
    await send('Runtime.evaluate', {
      expression: `document.querySelector(${JSON.stringify(scrollTo)})?.scrollIntoView({block:'start'})`,
    });
  } else {
    await send('Runtime.evaluate', { expression: 'window.scrollTo(0,0)' });
  }
  await sleep(2000);

  const info = await send('Runtime.evaluate', {
    expression: `JSON.stringify({iw:window.innerWidth, cw:document.documentElement.clientWidth, sw:document.documentElement.scrollWidth, vw:window.visualViewport?.width, meta:document.querySelector('meta[name=viewport]')?.content||null, sheets:document.styleSheets.length})`,
    returnByValue: true,
  });
  console.log(info.result.value);

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(out, Buffer.from(shot.data, 'base64'));
  console.log('wrote ' + out);
} finally {
  try {
    ws?.close();
  } catch {
    /* ignore */
  }
  chrome.kill('SIGKILL');
  rmSync(profile, { recursive: true, force: true });
}

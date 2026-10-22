#!/usr/bin/env node
/**
 * Measure a URL: horizontal overflow, touch targets and media wiring, at seven
 * viewport widths. Launches its own Chrome Headless Shell, drives it over the
 * DevTools protocol, and exits. Self-contained so it can be pointed at a
 * deployed URL as easily as at a local preview.
 *
 *   node scripts/measure.mjs https://example.com/
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const url = process.argv[2] ?? 'http://127.0.0.1:4173/';
const port = 9222 + Math.floor(Math.random() * 500);
const profile = mkdtempSync(join(tmpdir(), 'cdp-'));

const CHROME =
  process.env.CHROME_BIN ||
  [
    '/opt/chrome-headless-shell-linux64/chrome-headless-shell',
    '/usr/local/bin/chrome-headless-shell',
    // The workspace copy is the durable one: the sandbox can be recycled and
    // take /opt and /usr/local with it.
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

async function waitForChrome() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (res.ok) return (await res.json())[0];
    } catch {
      /* not up yet */
    }
    await sleep(500);
  }
  throw new Error('Chrome did not expose a debugging port');
}

let ws;
try {
  const target = await waitForChrome();
  ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const send = (method, params = {}) =>
    new Promise((res, rej) => {
      const i = ++id;
      const timer = setTimeout(() => {
        pending.delete(i);
        rej(new Error('CDP timeout: ' + method));
      }, 25000);
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

  const widths = [320, 375, 390, 430, 768, 1024, 1440];
  const problems = [];
  console.log('url: ' + url);
  for (const w of widths) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: w,
      height: w < 768 ? 844 : 900,
      deviceScaleFactor: 1,
      mobile: w < 768,
    });
    await send('Page.navigate', { url });
    await sleep(2200);
    const r = await send('Runtime.evaluate', {
      expression: `JSON.stringify((() => {
        const de = document.documentElement;
        const device = ${w};
        const over = [...document.querySelectorAll('body *')]
          .filter(e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.right > device + 1; })
          .filter(e => { for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { if (/(auto|scroll|hidden)/.test(getComputedStyle(a).overflowX)) return false; } return true; })
          .slice(0, 4)
          .map(e => e.tagName + '.' + (typeof e.className === 'string' ? e.className.split(' ').slice(0,2).join('.') : '') + '@' + Math.round(e.getBoundingClientRect().right));
        const small = [...document.querySelectorAll('a,button,[role=button]')]
          .filter(e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && b.height < 44 && !e.closest('nav,ul,ol'); })
          .slice(0, 4)
          .map(e => e.tagName + '.' + (typeof e.className === 'string' ? e.className.split(' ').slice(0,2).join('.') : '') + '@' + Math.round(e.getBoundingClientRect().height));
        const vids = [...document.querySelectorAll('video')].map(v => ({ src: v.getAttribute('src'), poster: v.getAttribute('poster') }));
        return { sw: de.scrollWidth, iw: window.innerWidth, over, small, vids };
      })())`,
      returnByValue: true,
    });
    const v = JSON.parse(r.result.value);
    const ok = v.sw <= w + 1;
    console.log(`${String(w).padStart(4)}px scroll=${String(v.sw).padStart(4)} ${ok ? 'OK ' : 'OVERFLOW'}`);
    if (!ok) {
      console.log('      overflowing:', v.over);
      problems.push(`${w}px overflow: ${JSON.stringify(v.over)}`);
    }
    if (v.small.length) {
      console.log('      small targets:', v.small);
      problems.push(`${w}px touch target under 44px: ${JSON.stringify(v.small)}`);
    }
    const noSrc = v.vids.filter((x) => !x.src).length;
    if (noSrc) problems.push(`${w}px: ${noSrc} video elements without a src`);
  }
  console.log('\n' + (problems.length ? 'PROBLEMS:\n' + problems.map((p) => ' - ' + p).join('\n') : 'no layout problems'));
} finally {
  try {
    ws?.close();
  } catch {
    /* ignore */
  }
  chrome.kill('SIGKILL');
  rmSync(profile, { recursive: true, force: true });
}

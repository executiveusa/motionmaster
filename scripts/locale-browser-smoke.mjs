#!/usr/bin/env node
/**
 * MM-10: real Chromium interaction smoke, not a screenshot-only locale claim.
 * Uses the built site served by the real local MCP host, with a fresh browser
 * profile and the browser's DevTools protocol (no third-party browser service).
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const chrome = [process.env.CHROME_BIN, 'google-chrome', 'chromium', 'chromium-browser']
  .filter(Boolean).find((name) => spawnSync('which', [name], { encoding: 'utf8' }).status === 0);
if (!chrome) throw new Error('Chromium is required for the locale click smoke.');

const port = 4174;
const base = `http://127.0.0.1:${port}/`;
const profile = mkdtempSync(join(tmpdir(), 'mm-locale-chrome-'));
const server = spawn(process.execPath, [resolve(root, 'mcp/dist/index.js')], {
  cwd: root, stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, MOTION_MASTER_SERVE_SITE: '1',
    MOTION_MASTER_MCP_HOST: '127.0.0.1', MOTION_MASTER_MCP_PORT: String(port) },
});
const browser = spawn(chrome, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  '--remote-debugging-port=0', '--remote-allow-origins=*',
  `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
let ws;
try {
  let ready = false;
  for (let i = 0; i < 80; i++) {
    try { ready = (await fetch(base)).ok; if (ready) break; } catch {}
    await sleep(150);
  }
  if (!ready) throw new Error('The built site did not start on loopback.');

  let cdpPort = 0;
  for (let i = 0; i < 80; i++) {
    try {
      cdpPort = Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]);
      if (cdpPort) break;
    } catch {}
    await sleep(100);
  }
  if (!cdpPort) throw new Error('Chromium did not open a debugging port.');
  const tab = await (await fetch(`http://127.0.0.1:${cdpPort}/json/new?about:blank`, { method: 'PUT' })).json();
  ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((done, fail) => { ws.onopen = done; ws.onerror = fail; });
  let sequence = 1;
  const pending = new Map();
  const exceptions = [];
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Runtime.exceptionThrown') exceptions.push(msg.params?.exceptionDetails?.text ?? 'Browser exception');
    if (msg.id) { pending.get(msg.id)?.(msg); pending.delete(msg.id); }
  };
  const command = (method, params = {}) => new Promise((done) => {
    const id = sequence++;
    pending.set(id, done);
    ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const response = await command('Runtime.evaluate', { expression, returnByValue: true });
    if (response.error || response.result?.exceptionDetails) {
      throw new Error('Browser evaluate failed: ' + JSON.stringify(response.error ?? response.result.exceptionDetails).slice(0, 500));
    }
    return response.result?.result?.value;
  };
  const until = async (expression, message) => {
    for (let i = 0; i < 80; i++) {
      if (await evaluate(expression)) return;
      await sleep(100);
    }
    throw new Error('Browser timeout: ' + message);
  };
  const state = () => evaluate(`({
    lang: document.documentElement.lang,
    selector: document.querySelector('[data-locale]')?.value,
    hero: document.querySelector('[data-i18n="hero"]')?.textContent,
    cta: document.querySelector('.topbar__cta')?.textContent,
    storage: localStorage.getItem('motion-master:locale'),
    injected: document.querySelector('#__mm_locale_dynamic')?.textContent,
    dynamicCopy: document.querySelector('#__mm_locale_copy')?.textContent,
  })`);
  const change = async (lang) => {
    await evaluate(`(() => {
      const select = document.querySelector('[data-locale]');
      select.value = ${JSON.stringify(lang)};
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`);
    await until(`document.documentElement.lang === ${JSON.stringify(lang)}`, 'locale change');
    await sleep(150);
  };

  await command('Page.enable');
  await command('Runtime.enable');
  await command('Page.navigate', { url: base });
  await until('document.readyState === "complete" && !!document.querySelector("[data-locale]")', 'initial page');
  await sleep(300);
  const initial = await state();
  if (initial.lang !== 'en' || initial.selector !== 'en' || !initial.hero?.includes('Make a video')) {
    throw new Error('Fresh browser did not default to English: ' + JSON.stringify(initial));
  }

  await change('es-MX');
  const spanish = await state();
  if (spanish.lang !== 'es-MX' || spanish.storage !== 'es-MX' ||
      !spanish.hero?.includes('Crea un video') || !spanish.cta?.includes('Crear un video')) {
    throw new Error('Spanish selector interaction failed: ' + JSON.stringify(spanish));
  }
  await evaluate(`(() => {
    const a = document.createElement('button');
    a.id = '__mm_locale_dynamic';
    a.dataset.i18n = 'makeVideo';
    a.textContent = 'Create a video';
    const b = document.createElement('span');
    b.id = '__mm_locale_copy';
    b.textContent = 'Copy prompt';
    document.body.append(a, b);
    return true;
  })()`);
  await until(`document.querySelector('#__mm_locale_dynamic')?.textContent === 'Crear un video' &&
    document.querySelector('#__mm_locale_copy')?.textContent === 'Copiar prompt'`, 'dynamic translations');

  await change('en');
  const english = await state();
  if (english.lang !== 'en' || english.storage !== 'en' ||
      english.injected !== 'Create a video' || english.dynamicCopy !== 'Copy prompt' ||
      !english.hero?.includes('Make a video')) {
    throw new Error('English selector round trip failed: ' + JSON.stringify(english));
  }

  await change('es-MX');
  await command('Page.reload', { ignoreCache: true });
  await until(`document.readyState === 'complete' && document.documentElement.lang === 'es-MX'`, 'persisted Spanish after reload');
  const reloaded = await state();
  if (reloaded.selector !== 'es-MX' || !reloaded.hero?.includes('Crea un video')) {
    throw new Error('Spanish preference did not persist across reload: ' + JSON.stringify(reloaded));
  }

  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  const mobile = await evaluate('({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth })');
  if (mobile.scrollWidth > mobile.width + 2) {
    throw new Error('Mobile page has horizontal overflow: ' + JSON.stringify(mobile));
  }
  if (exceptions.length) throw new Error('Uncaught browser exceptions: ' + exceptions.slice(0, 3).join('; '));
  console.log('PASS: Chromium English default -> Spanish click -> dynamic i18n -> English click -> Spanish reload; mobile 390px; no exceptions');
} finally {
  ws?.close();
  browser.kill('SIGTERM');
  server.kill('SIGTERM');
  rmSync(profile, { recursive: true, force: true });
}

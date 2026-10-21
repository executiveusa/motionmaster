/**
 * Visual + accessibility audit driven by chrome-headless-shell over CDP.
 *
 *   node scripts/audit.mjs [--url http://127.0.0.1:4173/]
 *
 * For every breakpoint it measures: horizontal overflow, the frame rail /
 * progress line switch, touch target sizes, LCP, CLS, console errors and
 * whether the live hero canvas is actually running. Screenshots are written to
 * site/screenshots/.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteDir = dirname(dirname(fileURLToPath(import.meta.url)));
const shotsDir = join(siteDir, 'screenshots');
mkdirSync(shotsDir, { recursive: true });

const args = process.argv.slice(2);
const urlIndex = args.indexOf('--url');
const URL = urlIndex >= 0 ? args[urlIndex + 1] : 'http://127.0.0.1:4173/';

const CHROME =
  process.env.CHROME_PATH ||
  '/workspace/.home/chrome/chrome-headless-shell-linux64/chrome-headless-shell';
const PORT = 9333;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- tiny CDP client ------------------------------------------- */

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.events = new Map();
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.method) {
        const handlers = this.events.get(msg.method) ?? [];
        for (const handler of handlers) handler(msg.params);
      }
    });
  }

  send(method, params = {}, sessionId) {
    const id = ++this.id;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    this.ws.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`timeout: ${method}`));
        }
      }, 30000);
    });
  }

  on(method, handler) {
    const list = this.events.get(method) ?? [];
    list.push(handler);
    this.events.set(method, list);
  }
}

async function connect() {
  const chrome = spawn(
    CHROME,
    [
      '--headless',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--hide-scrollbars',
      `--remote-debugging-port=${PORT}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  );

  let version = null;
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      version = await res.json();
      break;
    } catch {
      await sleep(250);
    }
  }
  if (!version) {
    chrome.kill();
    throw new Error('could not start chrome-headless-shell');
  }

  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  const cdp = new Cdp(ws);
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });

  return { chrome, cdp, sessionId };
}

/* ---------- audit ------------------------------------------------------ */

const METRICS = `
window.__lcp = 0;
window.__cls = 0;
window.__errors = [];
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) window.__lcp = entry.startTime;
}).observe({ type: 'largest-contentful-paint', buffered: true });
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (!entry.hadRecentInput) window.__cls += entry.value;
  }
}).observe({ type: 'layout-shift', buffered: true });
`;

const PROBE = `(() => {
  const doc = document.documentElement;
  const rail = document.querySelector('.rail');
  const line = document.querySelector('.progress-line');
  const bar = document.querySelector('[data-mobile-bar]');
  const interactive = Array.from(document.querySelectorAll('a[href], button, summary, [role="tab"]'));
  const small = interactive
    .filter((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return false;
      return r.height < 44 || r.width < 44;
    })
    .map((el) => {
      const r = el.getBoundingClientRect();
      return (el.textContent || el.tagName).trim().slice(0, 28) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height);
    });
  const time = document.querySelector('[data-hero-time]');
  return {
    scrollWidth: doc.scrollWidth,
    innerWidth: window.innerWidth,
    overflow: doc.scrollWidth - window.innerWidth,
    rail: rail ? getComputedStyle(rail).display : 'none',
    progressLine: line ? getComputedStyle(line).display : 'none',
    mobileBar: bar ? (bar.hidden ? 'hidden' : 'visible') : 'none',
    headings: Array.from(document.querySelectorAll('h1,h2,h3')).map((h) => h.tagName).join(','),
    smallTargets: small,
    timecode: time ? time.textContent : null,
    videos: Array.from(document.querySelectorAll('video')).map((v) => ({
      aria: v.getAttribute('aria-label') ? 'yes' : 'no',
      muted: v.muted,
      loop: v.loop,
      preload: v.preload,
      src: v.currentSrc || v.getAttribute('src') || '(none)',
    })),
    lcp: Math.round(window.__lcp || 0),
    cls: Number((window.__cls || 0).toFixed(4)),
  };
})()`;

const widths = [320, 375, 390, 430, 768, 1024, 1440];
const heights = { 320: 720, 375: 812, 390: 844, 430: 932, 768: 1024, 1024: 900, 1440: 900 };

async function main() {
  const { chrome, cdp, sessionId } = await connect();
  const results = [];

  await cdp.send('Page.enable', {}, sessionId);
  await cdp.send('Runtime.enable', {}, sessionId);
  await cdp.send('Log.enable', {}, sessionId);
  await cdp.send('Network.enable', {}, sessionId);
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: METRICS }, sessionId);

  const consoleErrors = [];
  cdp.on('Runtime.consoleAPICalled', (params) => {
    if (params.type === 'error') {
      consoleErrors.push(params.args.map((a) => a.value ?? a.description ?? '').join(' '));
    }
  });
  cdp.on('Runtime.exceptionThrown', (params) => {
    consoleErrors.push(params.exceptionDetails?.text ?? 'exception');
  });
  cdp.on('Network.requestWillBeSent', (params) => {
    const url = params.request.url;
    if (!url.startsWith(URL) && !url.startsWith('data:') && !url.startsWith('blob:')) {
      consoleErrors.push(`external request: ${url}`);
    }
  });

  for (const width of widths) {
    const height = heights[width];
    await cdp.send(
      'Emulation.setDeviceMetricsOverride',
      {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: width < 768,
        screenWidth: width,
        screenHeight: height,
      },
      sessionId,
    );

    const loaded = new Promise((resolve) => {
      const handler = () => resolve();
      cdp.on('Page.loadEventFired', handler);
    });
    await cdp.send('Page.navigate', { url }, sessionId);
    await loaded;
    await sleep(1800);

    const probe = await cdp.send(
      'Runtime.evaluate',
      { expression: PROBE, returnByValue: true },
      sessionId,
    );
    const value = probe.result.value;

    // is the live canvas actually running? read the timecode twice
    const t1 = await cdp.send(
      'Runtime.evaluate',
      { expression: `document.querySelector('[data-hero-time]')?.textContent`, returnByValue: true },
      sessionId,
    );
    await sleep(700);
    const t2 = await cdp.send(
      'Runtime.evaluate',
      { expression: `document.querySelector('[data-hero-time]')?.textContent`, returnByValue: true },
      sessionId,
    );

    const shot = await cdp.send(
      'Page.captureScreenshot',
      { format: 'png', captureBeyondViewport: true },
      sessionId,
    );
    writeFileSync(join(shotsDir, `page-${width}.png`), Buffer.from(shot.data, 'base64'));

    results.push({
      width,
      ...value,
      heroRunning: t1.result.value !== t2.result.value,
      timecode: `${t1.result.value} -> ${t2.result.value}`,
    });
  }

  // reduced motion pass
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }, sessionId);
  const loaded = new Promise((resolve) => cdp.on('Page.loadEventFired', () => resolve()));
  await cdp.send('Page.navigate', { url }, sessionId);
  await loaded;
  await sleep(1200);
  const rm1 = await cdp.send('Runtime.evaluate', { expression: `document.querySelector('[data-hero-time]')?.textContent`, returnByValue: true }, sessionId);
  await sleep(900);
  const rm2 = await cdp.send('Runtime.evaluate', { expression: `document.querySelector('[data-hero-time]')?.textContent`, returnByValue: true }, sessionId);
  const rmShot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }, sessionId);
  writeFileSync(join(shotsDir, 'page-1440-reduced-motion.png'), Buffer.from(rmShot.data, 'base64'));
  const rmHero = await cdp.send('Runtime.evaluate', { expression: `document.querySelector('[data-beat="out"]') ? getComputedStyle(document.querySelector('[data-beat="out"]')).opacity : 'n/a'`, returnByValue: true }, sessionId);
  const rmReveal = await cdp.send('Runtime.evaluate', { expression: `getComputedStyle(document.querySelector('.clip')).opacity`, returnByValue: true }, sessionId);

  console.log(JSON.stringify({ results, reducedMotion: { timecode: `${rm1.result.value} -> ${rm2.result.value}`, static: rm1.result.value === rm2.result.value, finalFrameOpacity: rmHero.result.value, clipOpacity: rmReveal.result.value } }, null, 2));
  console.log('\nconsole errors / external requests:', consoleErrors.length ? consoleErrors : 'none');

  chrome.kill();
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

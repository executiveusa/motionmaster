#!/usr/bin/env node
/**
 * proof-deploy.mjs — check the deployed page in a real browser.
 *
 * The questions are the ones the ICM rules ask:
 *   - does the page load with no console errors?
 *   - do the scroll scenes actually run (is the stage live, are the frames
 *     moving) rather than sitting there dark?
 *   - is the hero film playing?
 *   - does the sound shelf have sounds in it?
 *   - does the library browser load its index?
 *   - is there any horizontal overflow?
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL_ = process.argv[2] ?? 'https://20vyen0s3mpc9.space.minimax.io/';
const CHROME =
  process.env.CHROME_BIN ??
  '/workspace/.home/chrome/chrome-headless-shell-linux64/chrome-headless-shell';
const PORT = 9411;

const profile = mkdtempSync(join(tmpdir(), 'mm-proof-'));
const chrome = spawn(
  CHROME,
  [
    '--headless',
    '--no-sandbox',
    '--disable-gpu',
    '--hide-scrollbars',
    '--ignore-certificate-errors',
    '--disable-features=LocalNetworkAccessChecks',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    '--window-size=1440,900',
    'about:blank',
  ],
  { stdio: 'ignore' },
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function cdp() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await res.json();
      if (list.length) return list[0].webSocketDebuggerUrl;
    } catch {
      /* not up yet */
    }
    await sleep(300);
  }
  throw new Error('chrome never came up');
}

const wsUrl = await cdp();
const ws = new WebSocket(wsUrl);
let id = 0;
const pending = new Map();
await new Promise((r) => (ws.onopen = r));
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m.result);
    pending.delete(m.id);
  }
};
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const i = ++id;
    const t = setTimeout(() => rej(new Error(`timeout ${method}`)), 30000);
    pending.set(i, (v) => {
      clearTimeout(t);
      res(v);
    });
    ws.send(JSON.stringify({ id: i, method, params }));
  });

const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text ?? 'evaluate failed');
  return r.result.value;
};

await send('Page.enable');
await send('Runtime.enable');
await send('Log.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});
await send('Page.navigate', { url: URL_ });
await sleep(6000);

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

// 1. the page is actually there
const title = await evaluate('document.title');
check('the page loads', typeof title === 'string' && title.length > 0, title);

// 2. no console errors
const errors = await evaluate(
  'JSON.stringify((window.__mmErrors||[]).slice(0,5))',
);
check('no page errors so far', errors === '[]' || errors === undefined, errors ?? '');

// 3. the hero film is playing
const film = await evaluate(`(() => {
  const v = document.querySelector('.hero__video');
  if (!v) return 'no film';
  return JSON.stringify({ paused: v.paused, t: Math.round(v.currentTime*10)/10, w: v.videoWidth, h: v.videoHeight });
})()`);
check('the hero film is playing', /"paused":false/.test(film) && /"w":[1-9]/.test(film), film);

// 4. the scenes are live
const scenes = await evaluate(`(() => {
  const out = [];
  for (const s of document.querySelectorAll('.scene[data-scene]')) {
    out.push({ id: s.dataset.scene, live: s.classList.contains('is-live'), rest: s.classList.contains('is-rest'), h: Math.round(s.getBoundingClientRect().height) });
  }
  return JSON.stringify(out);
})()`);
check('both scenes are live', /"live":true/.test(scenes) && (scenes.match(/"live":true/g) ?? []).length === 2, scenes);

// 5. scroll into the reel and check the frames are visible
await evaluate(`document.querySelector('#demos').scrollIntoView({block:'start'})`);
await sleep(2500);
const reel = await evaluate(`(() => {
  const s = document.querySelector('#demos');
  const frames = [...s.querySelectorAll('.scene__frame')];
  const title = s.querySelector('.scene__title');
  const vis = frames.filter(f => Number(getComputedStyle(f).opacity) > 0.2).length;
  return JSON.stringify({ frames: frames.length, visible: vis, titleOpacity: getComputedStyle(title).opacity, stage: getComputedStyle(s.querySelector('.scene-stage')).position });
})()`);
check(
  'the reel reads at its rest point',
  /"visible":[1-9]/.test(reel) && /"titleOpacity":"1"/.test(reel),
  reel,
);

// 6. the source scene
await evaluate(`document.querySelector('#source').scrollIntoView({block:'start'})`);
await sleep(2000);
const source = await evaluate(`(() => {
  const s = document.querySelector('#source');
  const code = s.querySelector('.scene__code');
  const film = s.querySelector('.scene__film');
  return JSON.stringify({ codeOpacity: getComputedStyle(code).opacity, filmW: Math.round(film.getBoundingClientRect().width), lines: s.querySelectorAll('.scene__code-line').length });
})()`);
check('the source scene shows the code', /"codeOpacity":"0\.[1-9]/.test(source) && /"lines":1[0-9]/.test(source), source);

// 7. the sound shelf
await evaluate(`document.querySelector('#sound').scrollIntoView({block:'start'})`);
await sleep(2500);
const sound = await evaluate(`(() => {
  const s = document.querySelector('#sound');
  const kinds = s.querySelector('[data-sfx-kinds]');
  const kindCount = kinds ? kinds.children.length : 0;
  const list = s.querySelector('[data-sfx-list]');
  return JSON.stringify({ kinds: kindCount, listChildren: list ? list.children.length : 0, note: (s.querySelector('[data-sfx-note]')||{}).textContent });
})()`);
check('the sound shelf has kinds and sounds', /"kinds":[1-9]/.test(sound) && /"listChildren":[1-9]/.test(sound), sound);

// 8. the library browser
await evaluate(`document.querySelector('#library').scrollIntoView({block:'start'})`);
await sleep(3000);
const library = await evaluate(`(() => {
  const s = document.querySelector('#library');
  const list = s.querySelector('[data-library-items]');
  return JSON.stringify({ items: list ? list.children.length : 0 });
})()`);
check('the library browser loaded', /"items":[1-9]/.test(library), library);

// 9. no horizontal overflow
const overflow = await evaluate(
  'JSON.stringify({ c: document.documentElement.clientWidth, s: document.documentElement.scrollWidth })',
);
const ov = JSON.parse(overflow);
check('no horizontal overflow', ov.c === ov.s, `${ov.c} vs ${ov.s}`);

// 10. the console section exists and is wired
const console_ = await evaluate(`(() => {
  const c = document.querySelector('#console');
  if (!c) return 'none';
  return JSON.stringify({
    endpoint: c.dataset.consoleEndpoint,
    starters: c.querySelectorAll('[data-console-starter]').length,
    input: !!c.querySelector('[data-console-input]'),
  });
})()`);
check('the console is wired', /"starters":[1-9]/.test(console_) && /"input":true/.test(console_), console_);

// 11. the mobile width
await send('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true,
});
await sleep(1500);
await evaluate('window.scrollTo(0,0)');
await sleep(1200);
const mobile = await evaluate(
  'JSON.stringify({ c: document.documentElement.clientWidth, s: document.documentElement.scrollWidth, scene: document.querySelector("#demos") ? getComputedStyle(document.querySelector("#demos")).position : "none" })',
);
const mv = JSON.parse(mobile);
check('no horizontal overflow at 390', mv.c === mv.s, `${mv.c} vs ${mv.s}`);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log('\nfailed:');
  for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
}

ws.close();
chrome.kill();
try {
  rmSync(profile, { recursive: true, force: true });
} catch {
  /* the profile may still be held; it is in /tmp */
}
process.exit(failed.length ? 1 : 0);

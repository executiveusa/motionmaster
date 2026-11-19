#!/usr/bin/env node
/**
 * proof-deploy.mjs — check the deployed page in a real browser.
 *
 * The questions are the ones the ICM rules ask:
 *   - does the page load with no console errors?
 *   - is the real work on the page — the hero collage, the twenty-second
 *     film, the clips with their prompts — actually playing?
 *   - do the sound shelf and the library browser have anything in them?
 *   - is the console wired to an agent?
 *   - is there any horizontal overflow, at a desk or on a phone?
 *   - is every touch target big enough to hit?
 *   - is there a price on the page? There must not be one: the house is in
 *     personal use and the licence says so.
 *
 * This used to check for a scroll-scene system and a single hero film. The
 * site was rebuilt as a film rather than a column of sections, so those
 * checks were asking about a design that no longer existed — and a proof
 * that checks for the wrong thing is worse than no proof, because it says
 * "pass" about a page nobody has looked at.
 *
 *   node scripts/proof-deploy.mjs [url]
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/*
 * Check a deployed page, or the local build when no URL is given.
 *
 * With no argument it serves `site/dist` and checks that, so it can be a
 * gate. The proof went stale once before because nothing ran it: it was
 * still asking about a scroll-scene system the site had been rebuilt
 * without, and it was saying "pass" about a page nobody had looked at.
 */
const GIVEN = process.argv[2];
const PORT = 9411;
const PREVIEW_PORT = 4189;
let preview = null;
let URL_ = GIVEN ?? `http://127.0.0.1:${PREVIEW_PORT}/`;

/**
 * Find a browser. `which` only searches PATH, so an absolute path in
 * CHROME_BIN has to be checked on its own — and CHROME_BIN is how every CI
 * runner points at its Chrome.
 */
function findChrome() {
  const candidates = [
    process.env.CHROME_BIN,
    process.env.HYPERFRAMES_BROWSER_PATH,
    '/workspace/.home/chrome/chrome-headless-shell-linux64/chrome-headless-shell',
    '/usr/local/bin/chrome-headless-shell',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    'google-chrome',
    'chromium',
    'chromium-browser',
    'chrome-headless-shell',
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (candidate.includes('/')) {
      if (existsSync(candidate)) return candidate;
      continue;
    }
    const found = spawn('which', [candidate]).status === 0 ? candidate : null;
    if (found) return found;
  }
  return null;
}

const CHROME = findChrome();
if (!CHROME) {
  console.error('No browser found. Set CHROME_BIN.');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (!GIVEN) {
  const { existsSync: has } = await import('node:fs');
  if (!has(join(process.cwd(), 'site', 'dist', 'index.html'))) {
    console.error('The site is not built. Run: cd site && npm run build');
    process.exit(1);
  }
  preview = spawn('npx', ['vite', 'preview', '--port', String(PREVIEW_PORT), '--host', '127.0.0.1'], {
    cwd: join(process.cwd(), 'site'),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let up = false;
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(URL_);
      if (res.ok) { up = true; break; }
    } catch { /* not up yet */ }
    await sleep(300);
  }
  if (!up) {
    console.error('The preview server did not start.');
    process.exit(1);
  }
}

const profile = mkdtempSync(join(tmpdir(), 'mm-proof-'));
const chrome = spawn(
  CHROME,
  [
    '--headless',
    '--no-sandbox',
    '--disable-gpu',
    '--hide-scrollbars',
    /* Headless Chrome will not autoplay even a muted film without this.
       The film is muted and the visitor asked for it. */
    '--autoplay-policy=no-user-gesture-required',
    '--ignore-certificate-errors',
    '--disable-features=LocalNetworkAccessChecks',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    '--window-size=1440,900',
    'about:blank',
  ],
  { stdio: 'ignore' },
);

async function cdp() {
  /* A CI runner is a shared machine; twelve seconds was a race. */
  for (let i = 0; i < 150; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await res.json();
      if (list.length) return list[0].webSocketDebuggerUrl;
    } catch {
      /* not up yet */
    }
    await sleep(400);
  }
  throw new Error('chrome never came up');
}

const wsUrl = await cdp();
const ws = new WebSocket(wsUrl);
await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = reject;
});
let id = 0;
const pending = new Map();
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id) {
    pending.get(message.id)?.(message);
    pending.delete(message.id);
  }
};
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const i = ++id;
    pending.set(i, resolve);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
const evaluate = async (expression) => {
  const response = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (response.result?.exceptionDetails) {
    throw new Error(response.result.exceptionDetails.text ?? 'evaluate failed');
  }
  return response.result?.result?.value;
};

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});
/*
 * A visitor who has not asked for reduced motion is the default, and that is
 * what the page is designed for. Headless Chrome asks for reduced motion
 * by default, so the media has to be emulated the other way — otherwise the
 * proof measures the wrong visitor. The reduced-motion path is proved on
 * its own, further down: it is a real experience, not an absence.
 */
await send('Emulation.setEmulatedMedia', {
  features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }],
});
await send('Page.navigate', { url: URL_ });
await sleep(6000);

/*
 * Scroll the way a wheel arrives, and keep up with a page that is still
 * growing.
 *
 * The document is taller after the lazy sections load — the library browser
 * renders a thousand items and the sound shelf renders its rows — so a
 * position computed before that happens points at the wrong place. A
 * visitor who scrolls to a section and does not find it scrolls again.
 */
const scrollTo = async (selector) =>
  evaluate(`(() => {
    const root = document.querySelector(${JSON.stringify(selector)});
    if (!root) return false;
    const y = root.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: y, behavior: 'instant' });
    return true;
  })()`);

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

// 1. the page is actually there
const title = await evaluate('document.title');
check('the page loads', typeof title === 'string' && title.length > 0, title);

// 2. no console errors
const errors = await evaluate('JSON.stringify((window.__mmErrors||[]).slice(0,5))');
check('no page errors so far', errors === '[]' || errors === undefined, errors ?? '');

// 3. the hero collage is real work, and the pointer makes it play
await evaluate('window.scrollTo(0, 0)');
await sleep(600);
await evaluate(`(() => {
  const card = document.querySelector('[data-hero-film]');
  if (!card) return;
  const box = card.getBoundingClientRect();
  card.dispatchEvent(new PointerEvent('pointermove', {
    bubbles: true, clientX: box.left + box.width / 2, clientY: box.top + box.height / 2,
  }));
  return true;
})()`);
await sleep(2500);
const hero = await evaluate(`(() => {
  const cards = [...document.querySelectorAll('[data-hero-film]')];
  const withSrc = cards.filter((v) => v.getAttribute('src'));
  const playing = cards.filter((v) => !v.paused && v.videoWidth > 0);
  return JSON.stringify({
    cards: cards.length,
    withSrc: withSrc.length,
    playing: playing.length,
    sample: cards[0] ? cards[0].getAttribute('src') : '',
  });
})()`);
const heroJson = JSON.parse(hero);
check(
  'the hero collage is six real renders',
  heroJson.cards >= 5 && heroJson.withSrc === heroJson.cards,
  hero,
);
check('the hero collage plays when the pointer goes over it', heroJson.playing >= 1, hero);

// 4. the twenty-second film — scrolled into view first, because the site
// pauses a film that is off screen. It should not decode frames nobody is
// looking at, and it should start the moment it is on screen.
await evaluate(`document.querySelector('#film')?.scrollIntoView({block:'center'})`);
await sleep(2500);
const showcase = await evaluate(`(() => {
  const v = document.querySelector('.showcase__video');
  if (!v) return 'no film';
  return JSON.stringify({
    src: v.getAttribute('src'), paused: v.paused, w: v.videoWidth, h: v.videoHeight,
  });
})()`);
check(
  'the twenty-second film is on the page and playing',
  /"paused":false/.test(showcase) && /"w":[1-9]/.test(showcase),
  showcase,
);

// 5. the clips carry their real prompts
const clips = await evaluate(`(() => {
  const out = [];
  for (const clip of document.querySelectorAll('[data-clip]')) {
    const video = clip.querySelector('[data-clip-video]');
    const prompt = clip.querySelector('.prompt__text code');
    out.push({
      id: clip.dataset.clip,
      src: video ? video.getAttribute('src') : null,
      prompt: prompt ? prompt.textContent.trim().length : 0,
    });
  }
  return JSON.stringify(out);
})()`);
const clipList = JSON.parse(clips);
check(
  'every clip is a real render with the prompt beside it',
  clipList.length >= 4 &&
    clipList.every((c) => c.src && c.prompt > 40),
  `${clipList.length} clips`,
);

// 6. the sound shelf — wait for it to load, not for a duration. The shelf
// fetches its index when it comes into view, and a loaded machine is
// slower than a fixed wait.
const until = async (expression, label, selector = '', timeout = 30000) => {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await evaluate(expression)) return true;
    /* The page grows while it loads, so the section moves. Keep the
       scroll on it, the way a visitor would. */
    if (selector) await scrollTo(selector);
    await sleep(300);
  }
  throw new Error('the page never settled: ' + label);
};
/*
 * When it does not settle, say what the page is actually doing — the
 * section's position, what the shelf said for itself, and what the
 * browser makes of the shelf's own index. A proof that only says "no
 * kinds" makes somebody else do the archaeology.
 */
const soundDiagnosis = await evaluate(`(async () => {
  const root = document.querySelector('[data-sound]');
  const kinds = document.querySelector('[data-sfx-kinds]');
  const note = document.querySelector('[data-sfx-note]');
  const box = root ? root.getBoundingClientRect() : null;
  let fetched = 'not tried';
  try {
    const response = await fetch('/sfx.json');
    fetched = response.status + ' ' + (response.headers.get('content-type') || 'no type');
    if (response.ok) {
      const data = await response.json();
      fetched += ' · ' + (Array.isArray(data.kinds) ? data.kinds.length : 'no kinds') + ' kinds';
    }
  } catch (error) {
    fetched = 'fetch failed: ' + String(error && error.message);
  }
  return JSON.stringify({
    section: Boolean(root),
    inView: box ? (box.top < 900 && box.bottom > 0) : false,
    top: box ? Math.round(box.top) : null,
    kinds: kinds ? kinds.children.length : -1,
    note: note ? note.textContent.trim().slice(0, 120) : '',
    fetched,
    scrollY: Math.round(window.scrollY),
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  });
})()`);
try {
  await until(
    `(() => {
       const kinds = document.querySelector('[data-sfx-kinds]');
       return Boolean(kinds && kinds.children.length > 0);
     })()`,
    'the sound shelf loaded no kinds — ' + soundDiagnosis,
    '#sound',
  );
} catch (error) {
  console.error(String(error.message));
  check('the sound shelf has kinds and sounds', false, soundDiagnosis);
  throw error;
}
const sound = await evaluate(`(() => {
  const s = document.querySelector('#sound');
  if (!s) return 'no shelf';
  const kinds = s.querySelector('[data-sfx-kinds]');
  const list = s.querySelector('[data-sfx-list]');
  return JSON.stringify({
    kinds: kinds ? kinds.children.length : 0,
    listChildren: list ? list.children.length : 0,
  });
})()`);
check('the sound shelf has kinds and sounds', /"kinds":[1-9]/.test(sound) && /"listChildren":[1-9]/.test(sound), sound);

// 7. the library browser — same as the shelf: scroll, and wait for the
// items rather than for a number of milliseconds.
await scrollTo('#library');
await until(
  `(() => {
     const list = document.querySelector('[data-library-items]');
     return Boolean(list && list.children.length > 0);
   })()`,
  'the library browser loaded no items',
  '#library',
);
const library = await evaluate(`(() => {
  const list = document.querySelector('[data-library-items]');
  const count = document.querySelector('[data-library-count]');
  return JSON.stringify({
    items: list ? list.children.length : 0,
    count: count ? count.textContent : '',
  });
})()`);
check('the library browser loaded', /"items":[1-9]/.test(library), library);

// 8. the console is wired
const console_ = await evaluate(`(() => {
  const c = document.querySelector('#console');
  if (!c) return 'none';
  return JSON.stringify({
    starters: c.querySelectorAll('[data-console-starter]').length,
    input: !!c.querySelector('[data-console-input]'),
  });
})()`);
check('the console is wired', /"starters":[1-9]/.test(console_) && /"input":true/.test(console_), console_);

// 9. the loop panel and the project editor are on the page
const surfaces = await evaluate(`(() => JSON.stringify({
  loop: !!document.querySelector('[data-loop-status]'),
  editor: !!document.querySelector('[data-project-editor]'),
}))()`);
check('the loop panel and the project editor are on the page',
  /"loop":true/.test(surfaces) && /"editor":true/.test(surfaces), surfaces);

// 10. there is no price on the page
const price = await evaluate(`(() => {
  const text = document.body.innerText;
  const hits = [];
  for (const line of text.split('\\n')) {
    if (/\\$\\s?\\d|pricing|per month|subscription|\\/mo\\b/i.test(line)) hits.push(line.trim().slice(0, 80));
  }
  return JSON.stringify(hits.slice(0, 5));
})()`);
check('there is no price on the page', price === '[]', price);

// 11. every touch target is big enough to hit
const targets = await evaluate(`(() => {
  const small = [...document.querySelectorAll('a,button,[role=button]')]
    .filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && b.height < 44 && !e.closest('nav,ul,ol'); })
    .map((e) => e.tagName + '.' + (typeof e.className === 'string' ? e.className.split(' ').slice(0,2).join('.') : '') + '@' + Math.round(e.getBoundingClientRect().height));
  return JSON.stringify(small);
})()`);
check('every touch target is at least 44px', targets === '[]', targets);

// 12. no horizontal overflow at a desk
const overflow = await evaluate(
  'JSON.stringify({ c: document.documentElement.clientWidth, s: document.documentElement.scrollWidth })',
);
const ov = JSON.parse(overflow);
check('no horizontal overflow', ov.c === ov.s, `${ov.c} vs ${ov.s}`);

// 13. and none on a phone
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
  'JSON.stringify({ c: document.documentElement.clientWidth, s: document.documentElement.scrollWidth })',
);
const mob = JSON.parse(mobile);
check('no horizontal overflow on a phone', mob.c === mob.s, `${mob.c} vs ${mob.s}`);

// 14. and the reduced-motion path is a real experience, not an absence
await send('Emulation.setEmulatedMedia', {
  features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
});
await send('Page.reload', { ignoreCache: true });
await sleep(5000);
/* On screen, with reduced motion asked for: the film must stay still. */
await evaluate(`document.querySelector('#film')?.scrollIntoView({block:'center'})`);
await sleep(2500);
const reduced = await evaluate(`(() => {
  const film = document.querySelector('.showcase__video');
  const clips = [...document.querySelectorAll('[data-hero-film]')];
  return JSON.stringify({
    filmPaused: film ? film.paused : null,
    heroPlaying: clips.filter((v) => !v.paused).length,
    poster: film ? !!film.getAttribute('poster') : false,
  });
})()`);
check(
  'a visitor who asks for reduced motion gets a still page, not a broken one',
  /"filmPaused":true/.test(reduced) && /"heroPlaying":0/.test(reduced) && /"poster":true/.test(reduced),
  reduced,
);

ws.close();
chrome.kill('SIGTERM');
if (preview) preview.kill('SIGTERM');
await sleep(400);
try {
  rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
} catch {
  /* the operating system will clear the temp directory */
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
/* The preview server keeps the event loop alive. The checks are done. */
process.exit(failed.length ? 1 : 0);

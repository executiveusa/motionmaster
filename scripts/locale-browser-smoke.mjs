#!/usr/bin/env node
/**
 * MM-10: real Chromium interaction smoke, not a screenshot-only locale claim.
 * Uses the built site served by the real local MCP host, with a fresh browser
 * profile and the browser's DevTools protocol (no third-party browser service).
 */
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
    MOTION_MASTER_MCP_HOST: '127.0.0.1', MOTION_MASTER_MCP_PORT: String(port),
    MOTION_MASTER_API_KEY: 'mm-browser-fixture-key' },
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


  // MM-08: a human can use the private editor without writing JSON or code.
  // This uses the real authenticated local HTTP API, not a mocked fetch.
  const editorInitiallyClosed = await evaluate('(() => { const d = document.querySelector("[data-project-editor] details"); return !!d && !d.open; })()');
  if (!editorInitiallyClosed) throw new Error('Private editor must stay collapsed on the gallery-first page');
  await evaluate('document.querySelector("[data-project-editor] summary").click()');
  await evaluate('(() => { document.querySelector("[data-project-server]").value = location.origin; document.querySelector("[data-project-key]").value = "wrong-fixture-key"; document.querySelector("[data-project-connect]").requestSubmit(); return true; })()');
  await until('document.querySelector("[data-project-status]")?.dataset.i18n === "editorError"', 'wrong private key rejected');
  if (await evaluate('!document.querySelector("[data-project-workspace]").hidden')) {
    throw new Error('Private editor opened with an invalid key');
  }
  await evaluate('(() => { document.querySelector("[data-project-key]").value = "mm-browser-fixture-key"; document.querySelector("[data-project-connect]").requestSubmit(); return true; })()');
  await until('!document.querySelector("[data-project-workspace]").hidden', 'authenticated editor connection');
  await evaluate('(() => { document.querySelector("[data-project-new-title]").value = "Browser editor proof"; document.querySelector("[data-project-new-brief]").value = "A cinematic lower-third for Maya Chen"; document.querySelector("[data-project-new-text]").value = "Maya Chen"; document.querySelector("[data-project-create]").requestSubmit(); return true; })()');
  await until('document.querySelector("[data-project-status]")?.dataset.i18n === "editorCreated"', 'project created through browser');
  const editorProjectId = await evaluate('document.querySelector("[data-project-list]").value');
  if (!/^p_[a-zA-Z0-9_-]+$/.test(editorProjectId)) throw new Error('Editor created no valid project id');
  await evaluate('(() => { const field = document.querySelector("[data-shot-variable]"); const duration = document.querySelector("[data-shot-duration]"); if (!field || !duration) return false; field.value = "Ana Ruiz"; duration.value = "3"; document.querySelector("[data-project-edit]").requestSubmit(); return true; })()');
  await until('document.querySelector("[data-project-status]")?.dataset.i18n === "editorSaved"', 'edited text saved through browser');
  const savedResponse = await fetch(base + 'api/v1/projects/' + editorProjectId, {
    headers: { Authorization: 'Bearer mm-browser-fixture-key' },
  });
  if (!savedResponse.ok) throw new Error('Cannot reopen saved browser project via private API');
  const savedProject = await savedResponse.json();
  if (savedProject.revision.number !== 2 ||
      savedProject.revision.shots[0].duration !== 3 ||
      !Object.values(savedProject.revision.shots[0].values ?? {}).includes('Ana Ruiz')) {
    throw new Error('Browser edits did not persist as an immutable revision');
  }
  await evaluate('document.querySelector("[data-project-render]").click()');
  await until('document.querySelector("[data-project-status]")?.dataset.i18n === "editorQueued"', 'render queued through browser');
  await evaluate('document.querySelector("[data-project-cancel]").click()');
  await until('document.querySelector("[data-project-status]")?.dataset.i18n === "editorCancelled"', 'render cancelled through browser');
  const jobsResponse = await fetch(base + 'api/v1/projects/' + editorProjectId + '/jobs', {
    headers: { Authorization: 'Bearer mm-browser-fixture-key' },
  });
  const jobs = await jobsResponse.json();
  if (!jobsResponse.ok || jobs.length !== 1 || jobs[0].status !== 'cancelled') {
    throw new Error('Browser cancel did not persist in private backend');
  }
  const secretStored = await evaluate('Object.values(localStorage).some((value) => value.includes("mm-browser-fixture-key"))');
  const keyFieldEmpty = await evaluate('document.querySelector("[data-project-key]").value === ""');
  if (secretStored || !keyFieldEmpty) throw new Error('Private key leaked into browser persistence or visible form');

  // MM-10: a decoded MP4 is not proof that a human can play it. Click every
  // actual gallery control in Chromium and verify advancing video time.
  const playback = [];
  for (const id of ['launch-title', 'kinetic-type', 'product-loop', 'footage-title']) {
    const selector = '[data-clip="' + id + '"]';
    const initialVideo = await evaluate('(() => { const clip = document.querySelector(' +
      JSON.stringify(selector) + '); const video = clip?.querySelector("[data-clip-video]");' +
      'return { time: video?.currentTime ?? 0, exists: !!video, disabled: clip?.querySelector("[data-clip-toggle]")?.disabled }; })()');
    if (!initialVideo.exists || initialVideo.disabled) {
      throw new Error('Gallery video unavailable before play: ' + id + ' ' + JSON.stringify(initialVideo));
    }
    await evaluate('document.querySelector(' + JSON.stringify(selector) + ').querySelector("[data-clip-toggle]").click()');
    await until('(() => { const clip = document.querySelector(' + JSON.stringify(selector) + ');' +
      'const video = clip?.querySelector("[data-clip-video]");' +
      'return !!video && !video.paused && !video.error && video.currentTime > ' +
      JSON.stringify(initialVideo.time + 0.15) + '; })()', id + ' actual MP4 playback');
    const result = await evaluate('(() => { const clip = document.querySelector(' +
      JSON.stringify(selector) + '); const video = clip.querySelector("[data-clip-video]");' +
      'return { id: ' + JSON.stringify(id) + ', currentTime: video.currentTime, readyState: video.readyState,' +
      ' videoWidth: video.videoWidth, videoHeight: video.videoHeight, disabled: clip.querySelector("[data-clip-toggle]").disabled }; })()');
    if (result.disabled || !result.videoWidth || !result.videoHeight) {
      throw new Error('Gallery video did not decode for playback: ' + JSON.stringify(result));
    }
    playback.push(result);
    await evaluate('document.querySelector(' + JSON.stringify(selector) + ').querySelector("[data-clip-toggle]").click()');
  }

  await change('es-MX');
  const spanish = await state();
  const spanishEditor = await evaluate('({ summary: document.querySelector("[data-project-editor] summary")?.textContent, save: document.querySelector("[data-project-save]")?.textContent, cancel: document.querySelector("[data-project-cancel]")?.textContent })');
  if (!spanishEditor.summary?.includes('Editar un video guardado') ||
      !spanishEditor.cancel?.includes('Cancelar generación')) {
    throw new Error('Private editor did not translate to Mexican Spanish: ' + JSON.stringify(spanishEditor));
  }

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
  await until(`document.readyState === 'complete' && document.documentElement.lang === 'es-MX' && !document.querySelector('#__mm_locale_dynamic')`, 'persisted Spanish after actual reload');
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
  const proof = {
    kind: 'locale-browser-interaction', passed: true, checkedAt: new Date().toISOString(),
    checks: ['fresh English default', 'Spanish selector click', 'late-mounted data-i18n',
      'dynamic Copy prompt', 'English selector round trip', 'Spanish survives actual reload',
      '390px no horizontal overflow', 'four gallery videos play with advancing timestamps', 'private editor rejects bad key',
      'browser create/edit/reopen immutable revision', 'browser queue/cancel',
      'editor Mexican Spanish labels', 'private key never persisted', 'zero uncaught browser exceptions'],
    playback,
    editor: { projectId: editorProjectId, savedRevision: savedProject.revision.number, authenticated: true },
    viewport: mobile,
  };
  const proofDir = resolve(root, '.completion-proof');
  mkdirSync(proofDir, { recursive: true });
  writeFileSync(resolve(proofDir, 'locale-browser.json'), JSON.stringify(proof, null, 2) + '\n');
  console.log('PASS: Chromium gallery playback 4/4, English/Spanish click, dynamic i18n, mobile 390px, no exceptions');
} finally {
  ws?.close();
  browser.kill('SIGTERM');
  server.kill('SIGTERM');
  // Chromium may still be writing its profile when SIGTERM returns. Cleanup
  // must never mask the actual browser assertion that failed.
  await sleep(350);
  try { rmSync(profile, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 }); }
  catch (error) { console.warn('Chromium profile cleanup:', error.message); }
}

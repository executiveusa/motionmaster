#!/usr/bin/env node
/**
 * MM-08/MM-09: one uninterrupted Chromium -> authenticated local API ->
 * real default HyperFrames worker -> MP4 playback/download -> real source
 * export -> browser upload -> reopened editable project.
 *
 * Never uses a mock renderer, remote staging, owner data, or a production key.
 */
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createProject, createProjectJob, recoverInterruptedProjectJobs, transitionProjectJob } from '../mcp/dist/projects.js';

const root = resolve(import.meta.dirname, '..');
const proof = join(root, '.completion-proof', 'browser-real-worker');
mkdirSync(proof, { recursive: true });
const isolated = mkdtempSync(join(tmpdir(), 'mm-browser-real-worker-'));
const profile = mkdtempSync(join(tmpdir(), 'mm-browser-real-chrome-'));
const downloads = join(isolated, 'downloads');
mkdirSync(downloads);
const port = 4175;
const base = 'http://127.0.0.1:' + port + '/';
const fixtureKey = 'mm-isolated-browser-render-key';
const chrome = [process.env.CHROME_BIN, 'google-chrome', 'chromium', 'chromium-browser']
  .filter(Boolean).find((name) => spawnSync('which', [name], { encoding: 'utf8' }).status === 0);
assert.ok(chrome, 'Chromium is required for real-worker browser acceptance');
for (const name of ['site', 'library', 'plugins']) {
  symlinkSync(join(root, name), join(isolated, name), 'dir');
}
mkdirSync(join(isolated, 'generator', 'vendor'), { recursive: true });
copyFileSync(join(root, 'generator', 'hf.sh'), join(isolated, 'generator', 'hf.sh'));
copyFileSync(join(root, 'generator', 'vendor', 'gsap-3.14.2.min.js'),
  join(isolated, 'generator', 'vendor', 'gsap-3.14.2.min.js'));
let server = spawn(process.execPath, [join(root, 'mcp', 'dist', 'index.js')], {
  cwd: root, stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, MOTION_MASTER_REPO_ROOT: isolated,
    MOTION_MASTER_SERVE_SITE: '1', MOTION_MASTER_RENDER_WORKER: '1',
    MOTION_MASTER_MCP_HOST: '127.0.0.1', MOTION_MASTER_MCP_PORT: String(port),
    MOTION_MASTER_API_KEY: fixtureKey },
});
const serverTail = [];
for (const stream of [server.stdout, server.stderr]) {
  stream.on('data', (chunk) => {
    serverTail.push(String(chunk).slice(-2500));
    if (serverTail.length > 30) serverTail.shift();
  });
}
const browser = spawn(chrome, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  '--autoplay-policy=no-user-gesture-required', '--remote-debugging-port=0',
  '--remote-allow-origins=*', '--user-data-dir=' + profile, 'about:blank',
], { stdio: 'ignore' });
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const report = { kind: 'authenticated-browser-real-default-worker-source-round-trip',
  status: 'running', at: new Date().toISOString(), defaultRenderer: true,
  isolatedWorkspace: true, browser: 'Chromium CDP', checks: [] };
let ws;
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error('Private server exited before ready');
    try { ready = (await fetch(base)).ok; if (ready) break; } catch {}
    await sleep(150);
  }
  assert.ok(ready, 'Isolated private API/site did not start');
  let cdpPort = 0;
  for (let i = 0; i < 100; i++) {
    try { cdpPort = Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]); } catch {}
    if (cdpPort) break;
    await sleep(100);
  }
  assert.ok(cdpPort, 'Chromium CDP port unavailable');
  const tab = await (await fetch('http://127.0.0.1:' + cdpPort + '/json/new?about:blank',
    { method: 'PUT' })).json();
  ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((done, fail) => { ws.onopen = done; ws.onerror = fail; });
  let seq = 0;
  const pending = new Map();
  const exceptions = [];
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') {
      exceptions.push(message.params?.exceptionDetails?.text ?? 'Browser exception');
    }
    if (message.id) { pending.get(message.id)?.(message); pending.delete(message.id); }
  };
  const command = (method, params = {}) => new Promise((done) => {
    const id = ++seq; pending.set(id, done);
    ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const response = await command('Runtime.evaluate', { expression, returnByValue: true });
    if (response.error || response.result?.exceptionDetails) {
      throw new Error('Chromium evaluate failed: ' +
        JSON.stringify(response.error ?? response.result.exceptionDetails).slice(0, 400));
    }
    return response.result?.result?.value;
  };
  const until = async (expression, label, timeout = 15000) => {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      if (await evaluate(expression)) return;
      await sleep(200);
    }
    throw new Error('Chromium timeout: ' + label + '; status=' +
      await evaluate('document.querySelector("[data-project-status]")?.dataset.i18n'));
  };
  const api = async (path) => {
    const response = await fetch(base + 'api/v1/' + path, {
      headers: { Authorization: 'Bearer ' + fixtureKey },
    });
    assert.equal(response.status, 200, path + ' did not return 200');
    return response.json();
  };
  await command('Page.enable');
  await command('Runtime.enable');
  const downloadConfig = await command('Browser.setDownloadBehavior', {
    behavior: 'allow', downloadPath: downloads, eventsEnabled: true,
  });
  if (downloadConfig.error) {
    const fallback = await command('Page.setDownloadBehavior',
      { behavior: 'allow', downloadPath: downloads });
    assert.ok(!fallback.error, 'Chromium download permission unavailable');
  }
  await command('Page.navigate', { url: base });
  await until('document.readyState === "complete" && !!document.querySelector("[data-project-editor]")',
    'site loaded');
  assert.equal(await evaluate('document.documentElement.lang'), 'en', 'English must be default');
  assert.equal(await evaluate('document.querySelector("[data-project-editor] details").open'), false,
    'Gallery-first editor must initially be collapsed');
  report.checks.push('fresh English gallery-first homepage');
  await evaluate('document.querySelector("[data-project-editor] summary").click()');
  await evaluate(`(() => {
    document.querySelector("[data-project-server]").value = location.origin;
    document.querySelector("[data-project-key]").value = ${JSON.stringify(fixtureKey)};
    document.querySelector("[data-project-connect]").requestSubmit();
    return true;
  })()`);
  await until('!document.querySelector("[data-project-workspace]").hidden', 'private connection');
  assert.equal(await evaluate('document.querySelector("[data-project-key]").value'), '',
    'Bearer must be cleared from the visible form');
  report.checks.push('authenticated browser connection with in-memory bearer');
  await evaluate(`(() => {
    document.querySelector("[data-project-new-title]").value = "Real browser MP4 proof";
    document.querySelector("[data-project-new-brief]").value = "A clean readable cinematic lower-third";
    document.querySelector("[data-project-new-text]").value = "Dr. Maya Chen";
    document.querySelector("[data-project-create]").requestSubmit();
    return true;
  })()`);
  await until('document.querySelector("[data-project-status]")?.dataset.i18n === "editorCreated"',
    'browser project creation');
  const projectId = await evaluate('document.querySelector("[data-project-list]").value');
  assert.match(projectId, /^p_[a-zA-Z0-9_-]+$/);
  // Deterministic browser regression: the real worker still renders the MP4,
  // but the browser receives 85 synthetic nonterminal job statuses first.
  // This would strand the UI under the former 80-poll / ~2-minute limit.
  await evaluate(`(() => {
    const nativeFetch = window.fetch.bind(window);
    const nativeTimeout = window.setTimeout.bind(window);
    const probe = { polls: 0 };
    window.__mmLongRenderProbe = probe;
    window.fetch = async (input, init) => {
      const response = await nativeFetch(input, init);
      const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
      const pathname = new URL(typeof input === 'string' ? input : input.url, location.href).pathname;
      if (method === 'GET' && /^\\/api\\/v1\\/projects\\/[^/]+\\/jobs\\/[^/]+$/.test(pathname) &&
          response.ok && probe.polls < 85) {
        const body = await response.clone().json();
        probe.polls++;
        if (probe.polls === 85) window.setTimeout = nativeTimeout;
        return new Response(JSON.stringify({ ...body, status: 'rendering' }), {
          status: response.status, headers: { 'Content-Type': 'application/json' },
        });
      }
      return response;
    };
    window.setTimeout = (handler, delay, ...args) => nativeTimeout(
      handler, delay === 1500 || delay === 5000 ? 1 : delay, ...args);
    return true;
  })()`);
  await evaluate(`(() => {
    document.querySelector("[data-shot-variable]").value = "Ana Ruiz";
    document.querySelector("[data-shot-duration]").value = "3";
    document.querySelector("[data-project-render]").click();
    return true;
  })()`);
  await until('["editorQueued", "editorWorking", "editorComplete"].includes(document.querySelector("[data-project-status]")?.dataset.i18n)',
    'browser render request');
  const saved = await api('projects/' + projectId);
  assert.equal(saved.revision.number, 2, 'Render must persist the visible edit first');
  assert.equal(saved.revision.shots[0].duration, 3);
  assert.ok(Object.values(saved.revision.shots[0].values ?? {}).includes('Ana Ruiz'));
  report.checks.push('browser text/duration edit saved as immutable revision 2 before render');
  await until('window.__mmLongRenderProbe?.polls > 80',
    'render monitoring must continue after 80 nonterminal status polls', 30000);
  report.checks.push('Chromium continues monitoring a long render after 80 status polls');
  await until('["editorComplete", "editorFailed"].includes(document.querySelector("[data-project-status]")?.dataset.i18n)',
    'default-worker MP4 render', 200000);
  assert.equal(await evaluate('document.querySelector("[data-project-status]").dataset.i18n'),
    'editorComplete', 'Default worker failed or did not publish the browser render');
  const jobs = await api('projects/' + projectId + '/jobs');
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].status, 'ready');
  assert.equal(jobs[0].revision, 2);
  await until('document.querySelector("[data-project-video]")?.videoWidth > 0',
    'authenticated MP4 blob decoded', 20000);
  await evaluate('document.querySelector("[data-project-video]").play()');
  await until('document.querySelector("[data-project-video]")?.currentTime > 0.25',
    'rendered private MP4 advances in Chromium', 15000);
  report.checks.push('real default worker ready + private MP4 decoded and played in Chromium');
  // A completed video must remain playable and exportable after the editor
  // reopens its persisted project; this must not enqueue a second render.
  await evaluate('document.querySelector("[data-project-open]").click()');
  await until('document.querySelector("[data-project-status]")?.dataset.i18n === "editorComplete" && ' +
    '!document.querySelector("[data-project-result]").hidden && ' +
    'document.querySelector("[data-project-video]")?.videoWidth > 0',
    'reopened project recovers its completed MP4', 30000);
  assert.equal((await api('projects/' + projectId + '/jobs')).length, 1,
    'Reopening a saved video must not queue a duplicate render');
  await evaluate('document.querySelector("[data-project-video]").play()');
  await until('document.querySelector("[data-project-video]")?.currentTime > 0.2',
    'reopened MP4 advances in Chromium', 15000);
  report.checks.push('saved project reopen restores playable current-revision MP4 without rerender');
  // A full browser reload clears the in-memory bearer. Reconnect explicitly,
  // reopen the durable project and verify that its MP4 still plays.
  await command('Page.reload', { ignoreCache: true });
  await until('document.readyState === "complete" && !!document.querySelector("[data-project-editor]")',
    'browser reloaded without persisted credentials');
  assert.equal(await evaluate('document.querySelector("[data-project-key]").value'), '',
    'Reload must not restore a secret to the key input');
  await evaluate('document.querySelector("[data-project-editor] summary").click()');
  await evaluate(`(() => {
    document.querySelector("[data-project-server]").value = location.origin;
    document.querySelector("[data-project-key]").value = ${JSON.stringify(fixtureKey)};
    document.querySelector("[data-project-connect]").requestSubmit();
    return true;
  })()`);
  await until('!document.querySelector("[data-project-workspace]").hidden',
    'private workspace reconnected after browser reload');
  await evaluate('document.querySelector("[data-project-open]").click()');
  await until('document.querySelector("[data-project-status]")?.dataset.i18n === "editorComplete" && ' +
    'document.querySelector("[data-project-video]")?.videoWidth > 0',
    'rendered MP4 restored after full browser reload', 30000);
  assert.equal((await api('projects/' + projectId + '/jobs')).length, 1,
    'Browser reload and reopen must not queue a duplicate render');
  report.checks.push('full browser reload + explicit reauthentication restores durable MP4');
  // MM-13: actually terminate and restart the private API + worker process.
  // The browser and the on-disk project survive; no mocked API or renderer is used.
  const stopped = new Promise((done) => server.once('exit', done));
  assert.equal(server.kill('SIGTERM'), true, 'Private server did not accept shutdown');
  await Promise.race([
    stopped,
    sleep(10000).then(() => { throw new Error('Private server did not stop for restart'); }),
  ]);
  server = spawn(process.execPath, [join(root, 'mcp', 'dist', 'index.js')], {
    cwd: root, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, MOTION_MASTER_REPO_ROOT: isolated,
      MOTION_MASTER_SERVE_SITE: '1', MOTION_MASTER_RENDER_WORKER: '1',
      MOTION_MASTER_MCP_HOST: '127.0.0.1', MOTION_MASTER_MCP_PORT: String(port),
      MOTION_MASTER_API_KEY: fixtureKey },
  });
  for (const stream of [server.stdout, server.stderr]) {
    stream.on('data', (chunk) => {
      serverTail.push(String(chunk).slice(-2500));
      if (serverTail.length > 30) serverTail.shift();
    });
  }
  let restarted = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error('Private server exited during restart');
    try { restarted = (await fetch(base)).ok; if (restarted) break; } catch {}
    await sleep(150);
  }
  assert.ok(restarted, 'Private API did not return after process restart');
  const durableJobs = await api('projects/' + projectId + '/jobs');
  assert.equal(durableJobs.length, 1, 'Server restart duplicated the completed job');
  assert.equal(durableJobs[0].id, jobs[0].id, 'Server restart changed the job identity');
  assert.equal(durableJobs[0].status, 'ready', 'Server restart lost the completed MP4');
  const denied = await fetch(base + 'api/v1/projects/' + projectId + '/jobs');
  assert.equal(denied.status, 401, 'Restarted private API must still require authentication');
  await command('Page.reload', { ignoreCache: true });
  await until('document.readyState === "complete" && !!document.querySelector("[data-project-editor]")',
    'site loaded after private API process restart');
  assert.equal(await evaluate('document.querySelector("[data-project-key]").value'), '',
    'Server restart must not cause a bearer secret to persist in the browser');
  await evaluate('document.querySelector("[data-project-editor] summary").click()');
  await evaluate(`(() => {
    document.querySelector("[data-project-server]").value = location.origin;
    document.querySelector("[data-project-key]").value = ${JSON.stringify(fixtureKey)};
    document.querySelector("[data-project-connect]").requestSubmit();
    return true;
  })()`);
  await until('!document.querySelector("[data-project-workspace]").hidden',
    'private workspace reconnect after server restart');
  await evaluate('document.querySelector("[data-project-open]").click()');
  await until('document.querySelector("[data-project-status]")?.dataset.i18n === "editorComplete" && ' +
    'document.querySelector("[data-project-video]")?.videoWidth > 0',
    'completed MP4 restored after real API process restart', 30000);
  await evaluate('document.querySelector("[data-project-video]").play()');
  await until('document.querySelector("[data-project-video]")?.currentTime > 0.2',
    'MP4 plays after private API process restart', 15000);
  assert.equal((await api('projects/' + projectId + '/jobs')).length, 1,
    'Reopening after server restart must not create a duplicate render');
  report.checks.push('real API/worker process restart preserves private auth, job ID and playable MP4');
  await evaluate('document.querySelector("[data-project-download]").click()');
  await until('!document.querySelector("[data-project-source]").disabled',
    'MP4 download action finished', 30000);
  await evaluate('document.querySelector("[data-project-source]").click()');
  const mp4Path = join(downloads, 'motion-master-' + projectId + '.mp4');
  const archivePath = join(downloads, 'motion-master-' + projectId + '.json.gz');
  const end = Date.now() + 30000;
  while ((!existsSync(mp4Path) || !existsSync(archivePath)) && Date.now() < end) await sleep(200);
  assert.ok(existsSync(mp4Path), 'Browser MP4 download did not arrive');
  assert.ok(existsSync(archivePath), 'Browser source download did not arrive');
  const mp4 = readFileSync(mp4Path);
  const archive = readFileSync(archivePath);
  assert.ok(mp4.length > 1000, 'Downloaded MP4 is empty');
  const probe = spawnSync('ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,width,height',
      '-of', 'json', mp4Path], { encoding: 'utf8' });
  assert.equal(probe.status, 0, 'Downloaded browser MP4 did not decode in FFprobe');
  const info = JSON.parse(probe.stdout);
  assert.ok(info.streams.some((stream) => stream.codec_type === 'video' && stream.width > 0));
  assert.ok(Math.abs(Number(info.format.duration) - 3) < 0.3, 'Edited duration absent from MP4');
  const bundle = JSON.parse(gunzipSync(archive).toString('utf8'));
  assert.equal(bundle.format, 'motion-master-source');
  assert.equal(bundle.render.revision, 2);
  assert.ok(bundle.files.some((file) => file.path === 'index.html'));
  assert.ok(bundle.revisions[1].shots[0].values &&
    Object.values(bundle.revisions[1].shots[0].values).includes('Ana Ruiz'));
  copyFileSync(mp4Path, join(proof, 'browser-edited.mp4'));
  copyFileSync(archivePath, join(proof, 'browser-edited-source.json.gz'));
  const earlyFrame = join(proof, 'browser-edited-frame-early.png');
  const lateFrame = join(proof, 'browser-edited-frame-late.png');
  for (const [time, destination] of [['0.3', earlyFrame], ['2.0', lateFrame]]) {
    const decoded = spawnSync('ffmpeg',
      ['-v', 'error', '-y', '-ss', time, '-i', mp4Path, '-frames:v', '1', destination],
      { encoding: 'utf8' });
    assert.equal(decoded.status, 0, 'Browser MP4 failed to decode frame at ' + time);
  }
  assert.notEqual(hash(readFileSync(earlyFrame)), hash(readFileSync(lateFrame)),
    'Browser-rendered MP4 has no verified frame-to-frame motion');
  report.artifacts = { mp4: 'browser-edited.mp4', mp4Sha256: hash(mp4),
    source: 'browser-edited-source.json.gz', sourceSha256: hash(archive),
    duration: Number(info.format.duration) };
  report.checks.push('human Download MP4 and Export source buttons produce valid real artifacts');
  await evaluate('document.querySelector("[data-project-import-toggle]").click()');
  await evaluate(`(() => {
    const binary = atob(${JSON.stringify(archive.toString('base64'))});
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const transfer = new DataTransfer();
    transfer.items.add(new File([bytes], 'browser-edited-source.json.gz', { type: 'application/gzip' }));
    document.querySelector("[data-project-import-file]").files = transfer.files;
    document.querySelector("[data-project-import]").requestSubmit();
    return true;
  })()`);
  await until('document.querySelector("[data-project-status]")?.dataset.i18n === "editorImported"',
    'real exported source imported via Chromium', 30000);
  const importedId = await evaluate('document.querySelector("[data-project-list]").value');
  assert.match(importedId, /^p_[a-zA-Z0-9_-]+$/);
  assert.notEqual(importedId, projectId, 'Source import must not overwrite original');
  const imported = await api('projects/' + importedId);
  assert.equal(imported.revision.number, 2);
  assert.equal(imported.revision.shots[0].duration, 3);
  assert.ok(Object.values(imported.revision.shots[0].values ?? {}).includes('Ana Ruiz'));
  assert.equal((await api('projects/' + importedId + '/jobs')).length, 0,
    'Import must not fabricate a completed render');
  assert.ok(await evaluate('!document.querySelector("[data-project-edit]").hidden'),
    'Imported source did not reopen in the human editor');
  report.checks.push('browser imports actual rendered source into distinct editable project');
  report.project = { original: projectId, imported: importedId, revision: imported.revision.number };
  await command('Emulation.setDeviceMetricsOverride',
    { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await evaluate(`(() => {
    document.documentElement.style.scrollBehavior = "auto";
    document.body.style.scrollBehavior = "auto";
    document.querySelector("[data-project-editor]").scrollIntoView({behavior:"instant",block:"start"});
    return true;
  })()`);
  await until('Math.abs(document.querySelector("[data-project-editor]").getBoundingClientRect().top) < 140',
    'imported editor visible in mobile viewport', 10000);
  await sleep(350);
  await until('document.querySelector("[data-mobile-bar]")?.hidden === true',
    'mobile gallery CTA hidden while editing', 10000);
  const toolbar = await evaluate(`(() => {
    const buttons = [...document.querySelectorAll('.project-editor__toolbar > button')];
    const positions = buttons.map((button) => Math.round(button.getBoundingClientRect().top));
    return { rows: new Set(positions).size, buttons: buttons.length,
      hiddenCta: document.querySelector('[data-mobile-bar]').hidden };
  })()`);
  assert.equal(toolbar.buttons, 5, 'Mobile editor toolbar actions unexpectedly changed');
  assert.ok(toolbar.rows <= 3, 'Mobile editor controls are stacked into too many rows');
  assert.equal(toolbar.hiddenCta, true, 'Sticky gallery CTA covers the active editor');
  report.checks.push('mobile editor compact toolbar and no overlapping sticky gallery CTA');
  const shot = await command('Page.captureScreenshot', { format: 'png' });
  assert.ok(shot.result?.data, 'Mobile browser screenshot unavailable');
  writeFileSync(join(proof, 'imported-editor-mobile.png'), Buffer.from(shot.result.data, 'base64'));
  const mobile = await evaluate('({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth })');
  assert.ok(mobile.scrollWidth <= mobile.width + 2, 'Mobile editor overflows viewport');
  assert.equal(exceptions.length, 0, 'Uncaught browser exception: ' + exceptions.slice(0, 3).join('; '));
  report.checks.push('mobile 390px imported editor, no overflow or uncaught errors');

  // MM-08: simulate a durable in-flight job interrupted at process startup.
  // The browser must disclose the failure and reuse the SAME job on retry.
  // This fixture runs only in the isolated workspace, never against owner data.
  const retryProject = createProject(isolated, {
    title: 'Interrupted render recovery', brief: 'A clean cinematic lower-third',
    shots: imported.revision.shots,
  }).project;
  const interrupted = createProjectJob(isolated, retryProject.id, 1);
  transitionProjectJob(isolated, retryProject.id, interrupted.id, 'start');
  assert.equal(recoverInterruptedProjectJobs(isolated), 1);
  assert.equal((await api('projects/' + retryProject.id + '/jobs'))[0].status, 'failed');
  await evaluate('document.querySelector("[data-project-refresh]").click()');
  await until(`[...document.querySelector("[data-project-list]").options].some(o => o.value === ${JSON.stringify(retryProject.id)})`,
    'interrupted project listed');
  await evaluate(`(() => {
    document.querySelector("[data-project-list]").value = ${JSON.stringify(retryProject.id)};
    document.querySelector("[data-project-open]").click();
  })()`);
  await until('document.querySelector("[data-project-status]")?.dataset.i18n === "editorFailed"',
    'reopened interrupted job shows retryable failure');
  assert.equal((await api('projects/' + retryProject.id + '/jobs')).length, 1,
    'Opening a failed render must not create another job');
  await evaluate(`(() => {
    const selector = document.querySelector("[data-locale]");
    selector.value = "es-MX";
    selector.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);
  await until('document.documentElement.lang === "es-MX" && ' +
    'document.querySelector("[data-project-status]")?.textContent.includes("Se detuvo")',
    'Mexican Spanish failed-render recovery copy');
  await evaluate(`(() => {
    const selector = document.querySelector("[data-locale]");
    selector.value = "en";
    selector.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);
  await until('document.documentElement.lang === "en" && ' +
    'document.querySelector("[data-project-status]")?.textContent.includes("The render stopped")',
    'English failed-render recovery copy');
  report.checks.push('reopen interrupted render shows failure and reversible en/es-MX guidance');
  await evaluate('document.querySelector("[data-project-render]").click()');
  await until('["editorQueued", "editorWorking", "editorComplete"].includes(document.querySelector("[data-project-status]")?.dataset.i18n)',
    'existing failed job retried from browser');
  await until('["editorComplete", "editorFailed"].includes(document.querySelector("[data-project-status]")?.dataset.i18n)',
    'retried job completes through real worker', 200000);
  assert.equal(await evaluate('document.querySelector("[data-project-status]").dataset.i18n'),
    'editorComplete', 'Retried render did not complete');
  const afterRetry = await api('projects/' + retryProject.id + '/jobs');
  assert.equal(afterRetry.length, 1, 'Retry must not create a duplicate job');
  assert.equal(afterRetry[0].id, interrupted.id, 'Retry must retain durable job identity');
  assert.equal(afterRetry[0].status, 'ready');
  assert.equal(afterRetry[0].attempts, 2, 'Retry must increment attempts only when started');
  await until('document.querySelector("[data-project-video]")?.videoWidth > 0',
    'retried MP4 decoded in browser', 20000);
  await evaluate('document.querySelector("[data-project-video]").play()');
  await until('document.querySelector("[data-project-video]")?.currentTime > 0.2',
    'retried MP4 advances in Chromium', 15000);
  report.checks.push('failed durable job retried with same ID, real worker MP4 playable in Chromium');

  report.status = 'passed';
  console.log('PASS: uninterrupted Chromium -> real HyperFrames worker -> playable/downloadable MP4 -> source export/import/reopen');
} catch (error) {
  report.status = 'failed';
  report.error = String(error);
  report.serverLogTail = serverTail.join('').slice(-4000);
  console.error(report.error);
  process.exitCode = 1;
} finally {
  writeFileSync(join(proof, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  ws?.close();
  browser.kill('SIGTERM');
  server.kill('SIGTERM');
  await sleep(400);
  for (const directory of [profile, isolated]) {
    try { rmSync(directory, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 }); }
    catch (error) { console.warn('Temporary directory cleanup:', error.message); }
  }
}

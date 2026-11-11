#!/usr/bin/env node
/**
 * Qualify the whole HyperFrames block pool against the gate.
 *
 *   node scripts/qualify-blocks.mjs [--limit N] [--only id,id] [--resume]
 *
 * The registry has 448 blocks. They are not all equal: some clip their own
 * text, some leave the first frame empty, some put a label under the contrast
 * floor. The gate finds all of that, and the matcher can only ever choose a
 * block that passes once the whole pool has been measured.
 *
 * Each block is installed on its own, mounted in a host page with its
 * variables filled from a neutral brief, and checked. The verdicts are
 * written after every block, so the run can be interrupted and resumed, and
 * a killed run still leaves what it learned.
 *
 * The cost is one browser launch per block — about fourteen seconds — so the
 * whole pool takes about an hour and a half on two cores.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import {
  existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, cpSync, readdirSync, statSync,
} from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirnameSafe(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
function dirnameSafe(p) { return p.slice(0, p.lastIndexOf('/')); }

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const opt = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};

const limit = Number(opt('limit', 0));
const only = (opt('only', '') || '').split(',').map((s) => s.trim()).filter(Boolean);
const resume = flag('resume');
const WORK = resolve(ROOT, 'generator', 'qualify');
const VERDICTS = resolve(ROOT, 'library', 'block-verdicts.json');

/* The CLI is cached from the npx install; use it directly so the run does
   not hit the network 448 times. */
const NPKG = resolve(process.env.HOME || '/workspace/.home', '.npm/_npx');
let HF = null;
if (existsSync(NPKG)) {
  for (const dir of readdirSync(NPKG)) {
    const bin = join(NPKG, dir, 'node_modules/.bin/hyperframes');
    if (existsSync(bin)) { HF = bin; break; }
  }
}
if (!HF) HF = 'npx';
const BROWSER = process.env.HYPERFRAMES_BROWSER_PATH ||
  '/workspace/.home/chrome/chrome-headless-shell-linux64/chrome-headless-shell';

const { fillBlock, headlineFrom } = await import(join(ROOT, 'mcp', 'dist', 'blocks.js')).catch(async () => {
  execFileSync('npm', ['run', 'build'], { cwd: join(ROOT, 'mcp'), stdio: 'inherit' });
  return import(join(ROOT, 'mcp', 'dist', 'blocks.js'));
});

const blocksFile = JSON.parse(readFileSync(join(ROOT, 'library', 'blocks.json'), 'utf8'));
const tokens = JSON.parse(readFileSync(join(ROOT, 'plugins', 'motion-master', 'assets', 'motion-tokens.json'), 'utf8'));

/* A neutral brief. The point is to measure the block, not to admire it. */
const BRIEF = 'a calm title card and a product reveal for ACME coffee';

const blocks = blocksFile.blocks.filter((b) => (only.length ? only.includes(b.id) : true));

/* ------------------------------------------------------------- the verdicts */

function loadVerdicts() {
  if (!existsSync(VERDICTS)) return { verdicts: {} };
  try {
    return JSON.parse(readFileSync(VERDICTS, 'utf8'));
  } catch {
    return { verdicts: {} };
  }
}
function saveVerdicts(file) {
  const sorted = {};
  for (const key of Object.keys(file.verdicts).sort()) sorted[key] = file.verdicts[key];
  writeFileSync(VERDICTS, `${JSON.stringify({
    generated: 'scripts/qualify-blocks.mjs',
    note:
      'What the HyperFrames gate said about each block, measured on this machine. A block ' +
      'marked ok:false is not used to build a film. Delete the file to measure them again.',
    verdicts: sorted,
  }, null, 2)}\n`, 'utf8');
}

/* ------------------------------------------------------------ one block */

/** Kill any browser still holding a file in the work tree. */
function killStrayBrowsers() {
  try {
    execFileSync('pkill', ['-f', 'chrome-headless-shell'], { stdio: 'ignore' });
  } catch {
    /* nothing to kill */
  }
}

function findBlockFile(dir, id) {
  const comps = join(dir, 'compositions');
  if (!existsSync(comps)) return null;
  /*
   * The CLI lays blocks out in more than one shape: some go straight into
   * compositions/, some into compositions/components/, and some into a
   * directory named after the block. So the tree is walked, and the file
   * named after the block is preferred over any other.
   */
  const found = [];
  const walk = (current) => {
    for (const name of readdirSync(current)) {
      const path = join(current, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (name.endsWith('.html')) found.push(path);
    }
  };
  walk(comps);
  if (!found.length) return null;
  const exact = found.find((path) => path.endsWith(`${sep}${id}.html`));
  const pick = exact ?? found[0];
  return { abs: pick, rel: relative(dir, pick).split(sep).join('/') };
}

function localiseGsap(dir) {
  const gsap = join(ROOT, 'generator', 'vendor', 'gsap-3.14.2.min.js');
  if (!existsSync(gsap)) return;
  cpSync(gsap, join(dir, 'gsap-3.14.2.min.js'));
  const comps = join(dir, 'compositions');
  if (!existsSync(comps)) return;
  /* Every block file, at whatever depth it was installed. */
  const walk = (current) => {
    for (const name of readdirSync(current)) {
      const path = join(current, name);
      if (statSync(path).isDirectory()) { walk(path); continue; }
      if (!name.endsWith('.html')) continue;
      const depth = relative(comps, path).split(sep).length - 1;
      const prefix = depth === 0 ? './' : '../'.repeat(depth);
      const before = readFileSync(path, 'utf8');
      const after = before.replace(
        /<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/gsap@[^"]*"><\/script>/g,
        `<script src="${prefix}gsap-3.14.2.min.js"></script>`,
      );
      if (after !== before) writeFileSync(path, after);
    }
  };
  walk(comps);
}

function gateReasons(dir) {
  const checks = join(dir, '.hyperframes', 'artifacts', 'checks');
  if (!existsSync(checks)) return [];
  const reports = readdirSync(checks)
    .filter((n) => n.endsWith('.json'))
    .map((n) => join(checks, n))
    .sort((a, b) => readFileSync(b, 'utf8').length - readFileSync(a, 'utf8').length);
  if (!reports.length) return [];
  try {
    const report = JSON.parse(readFileSync(reports[0], 'utf8'));
    const out = [];
    for (const section of ['lint', 'runtime', 'layout', 'motion', 'contrast', 'craft']) {
      const block = report[section];
      if (!block || !Array.isArray(block.findings)) continue;
      for (const finding of block.findings) {
        if (finding.severity === 'info') continue;
        const where = finding.file ? ` ${finding.file}` : '';
        const when = finding.t !== undefined ? ` t=${finding.t}` : '';
        out.push(`${finding.code || section}:${where}${when} ${finding.message || ''}`.trim());
      }
    }
    return out;
  } catch {
    return [];
  }
}

function qualify(block) {
  /*
   * Not every registry entry is a composition. 238 of the 448 are snippets —
   * markup and CSS to paste into a composition, not a composition to mount.
   * The matcher already refuses them; the gate would only say the same thing
   * more slowly, so they are recorded with the reason that is actually true.
   */
  const mountable = (block.files || []).some((f) => f.type === 'hyperframes:composition');
  if (!mountable) {
    return {
      ok: false,
      errors: 0,
      reasons: [
        'not_mountable: the registry lists this as a snippet, not a composition — it is pasted into a composition, never mounted',
      ],
    };
  }

  /*
   * A clean directory for this block.
   *
   * The work tree lives on a network mount, and a browser that has not quite
   * let go of a file leaves an .nfs* placeholder behind: the directory cannot
   * be removed and the run stops on the first block it has already seen.
   * So any browser still alive is killed first, the removal is retried, and
   * if the directory still will not go, a fresh one is used instead.
   */
  let dir = join(WORK, block.id);
  killStrayBrowsers();
  try {
    rmSync(dir, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
  } catch {
    dir = join(WORK, `${block.id}-${Date.now()}`);
  }
  mkdirSync(dir, { recursive: true });

  try {
    execFileSync(HF, ['add', block.id, '--dir', dir, '--no-clipboard'],
      { stdio: ['ignore', 'ignore', 'ignore'], timeout: 120_000 });
  } catch (error) {
    return { ok: false, errors: 1, reasons: [`install_failed: ${String(error.message).slice(0, 120)}`] };
  }

  localiseGsap(dir);
  const file = findBlockFile(dir, block.id);
  if (!file) return { ok: false, errors: 1, reasons: ['no_composition_file: the block installed nothing'] };

  let values = {};
  try {
    const filled = fillBlock(block, { brief: BRIEF, tokens, headline: headlineFrom(BRIEF) });
    values = Object.fromEntries(Object.entries(filled.values || {}).filter(([, v]) => v !== null && v !== undefined));
  } catch (error) {
    return { ok: false, errors: 1, reasons: [`fill_failed: ${String(error.message).slice(0, 120)}`] };
  }

  const duration = Number(block.durationSeconds ?? block.duration ?? 4);
  const width = block.dimensions?.width ?? 1920;
  const height = block.dimensions?.height ?? 1080;
  const ground = tokens.palette.playerZone;

  writeFileSync(join(dir, 'index.html'), `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" width="1920" height="1080" />
    <title>${block.id}</title>
    <script src="./gsap-3.14.2.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: ${ground}; }
      #root { position: relative; width: 100%; height: 100%; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${duration}" data-width="1920" data-height="1080">
      <div
        id="${block.id}"
        data-composition-id="${block.id}"
        data-composition-src="${file.rel}"
        data-start="0"
        data-duration="${duration}"
        data-track-index="1"
        data-width="${width}"
        data-height="${height}"
        data-variable-values='${JSON.stringify(values).replace(/'/g, '&#39;')}'
        style="position: absolute; inset: 0; background: ${ground};"
      ></div>
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = gsap.timeline({ paused: true });
      window.__timelines["main"].seek(0);
    </script>
  </body>
</html>
`);

  let ok = true;
  let output = '';
  try {
    output = execFileSync(HF, ['check', dir],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 180_000 });
  } catch (error) {
    ok = false;
    output = `${error.stdout || ''}\n${error.stderr || ''}`;
  }

  const reasons = gateReasons(dir);
  const errors = /\b(\d+) error\(s\)/.exec(output)?.[1];
  const errorCount = errors ? Number(errors) : ok ? 0 : 1;

  if (!ok && !reasons.length) {
    reasons.push('gate_failed: the check did not pass and left no structured report');
  }
  return { ok, errors: errorCount, reasons };
}

/* ------------------------------------------------------------------ the run */

const file = loadVerdicts();
file.verdicts = file.verdicts || {};
/*
 * The verdicts are only thrown away when --fresh is asked for. A run with
 * --only measures one block and must not throw away what the last run
 * measured; and a run without --resume still keeps what is already known.
 */
if (flag('fresh')) {
  file.verdicts = {};
}
saveVerdicts(file);

mkdirSync(WORK, { recursive: true });
const started = Date.now();
let done = 0;
let failed = 0;
const targets = limit ? blocks.slice(0, limit) : blocks;

console.log(`qualifying ${targets.length} block(s) — this takes about 14 seconds each`);

for (const block of targets) {
  if (file.verdicts[block.id] && resume) {
    done += 1;
    continue;
  }
  const verdict = qualify(block);
  file.verdicts[block.id] = {
    ...verdict,
    checkedAt: new Date().toISOString(),
  };
  saveVerdicts(file);
  done += 1;
  if (!verdict.ok) failed += 1;
  const elapsed = ((Date.now() - started) / 1000).toFixed(0);
  const rate = (done / Math.max(1, (Date.now() - started) / 1000)).toFixed(2);
  console.log(
    `${String(done).padStart(3)}/${targets.length} ${verdict.ok ? 'ok  ' : 'FAIL'} ${block.id}` +
    `${verdict.ok ? '' : ` — ${verdict.reasons[0] || ''}`}` +
    `  (${elapsed}s, ${rate}/s, ${failed} failed)`,
  );
}

const passed = Object.values(file.verdicts).filter((v) => v.ok).length;
const rejected = Object.values(file.verdicts).filter((v) => !v.ok).length;
console.log(`\n${passed} blocks pass, ${rejected} do not, of ${Object.keys(file.verdicts).length} measured.`);
console.log(`verdicts: ${VERDICTS}`);
process.exit(0);

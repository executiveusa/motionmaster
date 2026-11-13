#!/usr/bin/env node
/**
 * Qualify the vendored HyperFrames compositions.
 *
 * The registry blocks were measured one by one: 448 of them, 75 passed. The
 * thirty-six compositions that came with the studio's new repos are in the
 * same native format, so they get the same measurement — mounted, filled
 * from a neutral brief, and put through `hyperframes check`.
 *
 *   node scripts/qualify-compositions.mjs [--only id,id] [--resume]
 *
 * The verdicts land in `library/composition-verdicts.json`, and the house
 * library is built from the ones that pass.
 *
 * Two things happen to a composition before it is measured, and both are
 * recorded in the work directory:
 *
 *   - **The GSAP reference is localised.** These compositions load GSAP from
 *     a CDN; the renderer has no network, so the script is pointed at the
 *     copy the generator already ships.
 *   - **Undeclared font families are declared.** The gate is right about
 *     these: a composition that names a font the renderer cannot supply gets
 *     the wrong typography, silently. Each undeclared family gets a
 *     `@font-face` with `src: local(...)`, which is what the gate asks for
 *     and which is the truth about how these fonts are used — they are
 *     system fonts.
 */
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const WORK = join(ROOT, "generator", "qualify-compositions");
const VERDICTS = join(ROOT, "library", "composition-verdicts.json");

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const option = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fallback;
};

/* The same neutral brief the registry blocks were measured with, so the two
   sets of verdicts mean the same thing. */
const BRIEF = "a calm title card and a product reveal for ACME coffee";

const NPKG = resolve(process.env.HOME || "/workspace/.home", ".npm/_npx");
let HF = null;
if (existsSync(NPKG)) {
  for (const dir of readdirSync(NPKG)) {
    const bin = join(NPKG, dir, "node_modules/.bin/hyperframes");
    if (existsSync(bin)) {
      HF = bin;
      break;
    }
  }
}
if (!HF) HF = "npx";
const BROWSER = process.env.HYPERFRAMES_BROWSER_PATH ||
  "/workspace/.home/chrome/chrome-headless-shell-linux64/chrome-headless-shell";

const { fillBlock } = await import(join(ROOT, "mcp", "dist", "blocks.js")).catch(async () => {
  execFileSync("npm", ["run", "build"], { cwd: join(ROOT, "mcp"), stdio: "inherit" });
  return import(join(ROOT, "mcp", "dist", "blocks.js"));
});
const tokens = JSON.parse(
  readFileSync(join(ROOT, "plugins", "motion-master", "assets", "motion-tokens.json"), "utf8"),
);

/* ------------------------------------------------------------- the compositions */

const SETS = [
  { dir: "motion-library", kind: "composition" },
  { dir: "reelforge", kind: "block" },
];

function compositions() {
  const out = [];
  for (const set of SETS) {
    const root = join(ROOT, "studio", "compositions", set.dir);
    if (!existsSync(root)) continue;
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const directory = join(root, entry.name);
      const file = ["index.html", "block.html"].map((n) => join(directory, n)).find((p) => existsSync(p));
      if (!file) continue;
      out.push({ id: entry.name, set: set.dir, kind: set.kind, directory, file });
    }
  }
  return out;
}

/** The variables a composition declares, read out of its own markup. */
function variablesOf(html) {
  const match = html.match(/data-composition-variables=['"]([\s\S]*?)['"]/);
  if (!match) return [];
  try {
    return JSON.parse(match[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'"));
  } catch {
    return [];
  }
}

/* --------------------------------------------------------------- the patching */

const FONT_STACK = /font-family\s*:\s*([^;{}]+)/g;

/**
 * The font families a document names that the renderer cannot supply.
 *
 * The renderer resolves a family from its own list; anything else falls back
 * to a generic font and the typography is quietly wrong. These compositions
 * name CJK system fonts, so the fix is a `@font-face` with `src: local(...)`:
 * it declares the family honestly and tells the renderer where to find it.
 */
function undeclaredFamilies(html) {
  const declared = new Set(
    [...html.matchAll(/@font-face\s*\{[^}]*font-family\s*:\s*['"]([^'"]+)['"]/g)].map((m) =>
      m[1].toLowerCase(),
    ),
  );
  const families = new Set();
  for (const match of html.matchAll(FONT_STACK)) {
    for (const raw of match[1].split(",")) {
      const name = raw.trim().replace(/^['"]|['"]$/g, "");
      if (!name || /^(sans-serif|serif|monospace|system-ui|-apple-system|inherit|initial|unset|cursive|fantasy)$/i.test(name)) {
        continue;
      }
      if (declared.has(name.toLowerCase())) continue;
      /* A generic family in a stack is a fallback, not a request. */
      if (/\b(sans|serif|mono|system)\b/i.test(name) && name.split(/\s+/).length === 1) continue;
      families.add(name);
    }
  }
  return [...families];
}

function declareFonts(html) {
  const families = undeclaredFamilies(html);
  if (!families.length) return { html, declared: [] };
  const faces = families
    .map(
      (family) =>
        `      @font-face { font-family: '${family}'; src: local('${family.replace(/'/g, "\\'")}'); }`,
    )
    .join("\n");
  const patched = html.replace(/<style>/, `<style>\n${faces}`);
  return { html: patched, declared: families };
}

/** Point the GSAP CDN reference at the copy the generator ships. */
function localiseGsap(html, prefix) {
  return html.replace(
    /<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/gsap@[^"]*"><\/script>/g,
    `<script src="${prefix}gsap-3.14.2.min.js"></script>`,
  );
}

/* ------------------------------------------------------------------ the gate */

function gateReasons(dir) {
  const checks = join(dir, ".hyperframes", "artifacts", "checks");
  if (!existsSync(checks)) return [];
  const reports = readdirSync(checks)
    .filter((n) => n.endsWith(".json"))
    .map((n) => join(checks, n))
    .sort((a, b) => readFileSync(b, "utf8").length - readFileSync(a, "utf8").length);
  if (!reports.length) return [];
  try {
    const report = JSON.parse(readFileSync(reports[0], "utf8"));
    const out = [];
    for (const section of ["lint", "runtime", "layout", "motion", "contrast", "craft"]) {
      const block = report[section];
      if (!block || !Array.isArray(block.findings)) continue;
      for (const finding of block.findings) {
        if (finding.severity === "info") continue;
        const where = finding.file ? ` ${finding.file}` : "";
        const when = finding.t !== undefined ? ` t=${finding.t}` : "";
        out.push(`${finding.code || section}:${where}${when} ${finding.message || ""}`.trim());
      }
    }
    return out;
  } catch {
    return [];
  }
}

function killStrayBrowsers() {
  try {
    execFileSync("pkill", ["-f", "[c]hrome-headless-shell"], { stdio: "ignore" });
  } catch {
    /* nothing to kill */
  }
}

/* ------------------------------------------------------------------- the run */

function qualify(composition) {
  let dir = join(WORK, `${composition.set}-${composition.id}`);
  killStrayBrowsers();
  try {
    rmSync(dir, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
  } catch {
    dir = join(WORK, `${composition.set}-${composition.id}-${Date.now()}`);
  }
  mkdirSync(dir, { recursive: true });

  const isBlock = composition.kind === "block";
  const fileName = isBlock ? "block.html" : "index.html";
  const html = readFileSync(composition.file, "utf8");
  const variables = variablesOf(html);

  if (isBlock) {
    /* A block is mounted in a host composition, the way the registry blocks
       are: the block sits one level down, so its GSAP reference has to
       climb out. */
    const blockDir = join(dir, "compositions");
    mkdirSync(blockDir, { recursive: true });
    const patched = declareFonts(localiseGsap(html, "../")).html;
    writeFileSync(join(blockDir, fileName), patched);
    cpSync(join(ROOT, "generator", "vendor", "gsap-3.14.2.min.js"), join(dir, "gsap-3.14.2.min.js"));
  } else {
    const patched = declareFonts(localiseGsap(html, "./")).html;
    writeFileSync(join(dir, fileName), patched);
    cpSync(join(ROOT, "generator", "vendor", "gsap-3.14.2.min.js"), join(dir, "gsap-3.14.2.min.js"));
    /* Any sibling files the composition needs — styles, presets, assets. */
    for (const entry of readdirSync(composition.directory, { withFileTypes: true })) {
      if (entry.isDirectory() || entry.name === fileName) continue;
      cpSync(join(composition.directory, entry.name), join(dir, entry.name), { recursive: true });
    }
  }

  /* Fill the variables from the neutral brief, the way the registry blocks
     were filled, so the two sets of verdicts mean the same thing. */
  let values = {};
  let fillError = undefined;
  try {
    const block = {
      id: composition.id,
      type: "hyperframes:composition",
      title: composition.id,
      description: "",
      tags: [],
      author: null,
      license: null,
      dimensions: null,
      duration: null,
      variables,
      files: [],
    };
    const filled = fillBlock(block, { brief: BRIEF, tokens });
    values = Object.fromEntries(
      Object.entries(filled.values ?? {}).filter(([, v]) => v !== null && v !== undefined),
    );
  } catch (error) {
    fillError = `fill_failed: ${String(error.message).slice(0, 120)}`;
  }

  /* The values go onto the element that carries the composition id. */
  const encoded = JSON.stringify(values).replace(/'/g, "&#39;");
  if (isBlock) {
    const host = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" width="1920" height="1080" />
    <title>${composition.id}</title>
    <script src="./gsap-3.14.2.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: #0E0E10; }
      #root { position: relative; width: 100%; height: 100%; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="6" data-width="1920" data-height="1080">
      <div
        id="${composition.id}"
        data-composition-id="${composition.id}"
        data-composition-src="./compositions/${fileName}"
        data-start="0"
        data-duration="6"
        data-track-index="1"
        data-width="1920"
        data-height="1080"
        data-variable-values='${encoded}'
        style="position: absolute; inset: 0; background: #0E0E10;"
      ></div>
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = gsap.timeline({ paused: true });
      window.__timelines["main"].seek(0);
    </script>
  </body>
</html>
`;
    writeFileSync(join(dir, "index.html"), host, "utf8");
  } else {
    const target = join(dir, fileName);
    const source = readFileSync(target, "utf8");
    const patched = source.replace(
      /(<[^>]*data-composition-id="(?:main|[^"]+)"[^>]*)/,
      (m) => (m.includes("data-variable-values") ? m : `${m} data-variable-values='${encoded}'`),
    );
    writeFileSync(target, patched);
  }

  if (fillError) {
    return { ok: false, errors: 1, reasons: [fillError], declaredFonts: [] };
  }

  let ok = true;
  let output = "";
  try {
    output = execFileSync(HF, ["check", dir, "--timeout=45000", "--samples=5"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 300_000,
      env: { ...process.env, HYPERFRAMES_BROWSER_PATH: BROWSER },
    });
  } catch (error) {
    ok = false;
    output = `${error.stdout || ""}\n${error.stderr || ""}`;
  }

  const reasons = gateReasons(dir);
  const errors = /\b(\d+) error\(s\)/.exec(output)?.[1];
  const errorCount = errors ? Number(errors) : ok ? 0 : 1;

  if (!ok && !reasons.length) {
    reasons.push("gate_failed: the check did not pass and left no structured report");
  }
  return {
    ok: ok && errorCount === 0,
    errors: errorCount,
    reasons,
    declaredFonts: undeclaredFamilies(html),
  };
}

/* ------------------------------------------------------------------- the run */

mkdirSync(WORK, { recursive: true });
const known = existsSync(VERDICTS)
  ? JSON.parse(readFileSync(VERDICTS, "utf8"))
  : { generated: "scripts/qualify-compositions.mjs", verdicts: {} };
known.verdicts = known.verdicts || {};

const only = option("only", "");
const wanted = only ? only.split(",").map((s) => s.trim()) : null;
const fresh = flag("fresh");

let passed = 0;
let failed = 0;

for (const composition of compositions()) {
  if (wanted && !wanted.includes(composition.id)) continue;
  const key = `${composition.set}/${composition.id}`;
  if (!fresh && known.verdicts[key]) {
    const verdict = known.verdicts[key];
    if (verdict.ok) passed += 1;
    else failed += 1;
    console.log(`skip  ${key} — already measured (${verdict.ok ? "pass" : "fail"})`);
    continue;
  }

  const result = qualify(composition);
  known.verdicts[key] = {
    ...result,
    set: composition.set,
    block: composition.id,
    file: composition.file.replace(`${ROOT}/`, ""),
  };
  writeFileSync(VERDICTS, `${JSON.stringify(known, null, 2)}\n`, "utf8");
  if (result.ok) passed += 1;
  else failed += 1;
  console.log(`${result.ok ? "PASS" : "FAIL"}  ${key}${result.reasons[0] ? ` — ${result.reasons[0].slice(0, 110)}` : ""}`);
}

console.log(`\n${passed} pass, ${failed} fail, ${Object.keys(known.verdicts).length} measured`);
console.log(`wrote ${VERDICTS}`);

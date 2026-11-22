#!/usr/bin/env node
/**
 * Build a Meta ad for a placement.
 *
 * A sixteen-by-nine scene cropped to nine-by-sixteen keeps a third of its
 * width, and what survives is a slice: the headline ends up half off the
 * canvas. So the ad is **authored at the placement's own size** instead of
 * cropped to it. The type stack sits inside the safe area by construction —
 * the safe area is read out of the placement, not guessed at — and the copy
 * that the platform shows lives in the ad's JSON, not in the pixels.
 *
 *   node scripts/build-meta-ad.mjs --placement reels-9x16 \
 *       --eyebrow "NEW" --claim "Slow mornings, delivered" --brand "ACME" \
 *       [--accent "#FF4A1C"] [--out <dir>] [--guide]
 *
 * Writes the composition, the ad's JSON (copy, placement, measurements) and a
 * short report. The report states the crop loss of the alternative, because
 * that is the number a person needs to see to understand why this was built
 * rather than cropped.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const option = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fallback;
};

const meta = await import(`file://${join(ROOT, "mcp", "dist", "meta.js")}`).catch(async () => {
  const { execFileSync } = await import("node:child_process");
  execFileSync("npm", ["run", "build"], { cwd: join(ROOT, "mcp"), stdio: "inherit" });
  return import(`file://${join(ROOT, "mcp", "dist", "meta.js")}`);
});

const placementId = option("placement", "reels-9x16");
const p = meta.placement(placementId);
if (!p) {
  console.error(`There is no placement called "${placementId}".`);
  process.exit(1);
}

const outDir = option("out", join(ROOT, "studio", "ads", "build"));
const showGuide = flag("guide");

const tokens = JSON.parse(
  readFileSync(join(ROOT, "plugins", "motion-master", "assets", "motion-tokens.json"), "utf8"),
);
const kitPath = join(ROOT, "studio", "kits", "house.json");
const kit = existsSync(kitPath) ? JSON.parse(readFileSync(kitPath, "utf8")) : {};
const kitPalette = kit.palette ?? {};

const durationSeconds = Number(option("duration", "6"));

/* ---- the composition ---------------------------------------------------- */

mkdirSync(outDir, { recursive: true });
cpSync(join(ROOT, "generator", "compositions", "meta-ad", "index.html"), join(outDir, "index.html"));
cpSync(join(ROOT, "generator", "compositions", "meta-ad", "gsap-3.14.2.min.js"), join(outDir, "gsap-3.14.2.min.js"));
cpSync(join(ROOT, "generator", "compositions", "meta-ad", "hyperframes.json"), join(outDir, "hyperframes.json"));
cpSync(join(ROOT, "generator", "compositions", "meta-ad", "fonts"), join(outDir, "fonts"), { recursive: true });

const values = {
  eyebrow: option("eyebrow", "NEW"),
  claim: option("claim", ""),
  brand: option("brand", ""),
  accent: option("accent", kitPalette.accent ?? tokens.palette.accent ?? "#FF4A1C"),
  canvas: option("canvas", tokens.palette.ink ?? "#111113"),
  ink: option("ink", tokens.palette.canvas ?? "#F4F4F2"),
  /* The muted ink has to clear AA on the canvas it sits on. The house's
     mutedInk is for light surfaces; on the dark ad canvas it does not. */
  muted: option("muted", "#7C7C80"),
  safeTop: p.safeZone.top,
  safeBottom: p.safeZone.bottom,
  safeLeft: p.safeZone.left,
  safeRight: p.safeZone.right,
  duration: durationSeconds,
  showGuide,
};

const encoded = JSON.stringify(values).replace(/'/g, "&#39;");
let host = readFileSync(join(outDir, "index.html"), "utf8");
host = host
  .replace('data-duration="6"', `data-duration="${durationSeconds}"`)
  .replace('data-width="1440"', `data-width="${p.width}"`)
  .replace('data-height="2560"', `data-height="${p.height}"`)
  .replace(/(<div id="root"[^>]*)/, (m) => `${m} data-variable-values='${encoded}'`);
writeFileSync(join(outDir, "index.html"), host);

/* ---- the ad's own file --------------------------------------------------- */

/*
 * The ad is three things: the file, the copy the platform shows, and the
 * placement it is for. They live together so the campaign can be checked
 * without opening anything.
 */
const safe = meta.safeAreaOf(p);
const loss = meta.cropLoss(p);
const ad = {
  placement: p.id,
  placementName: p.name,
  placements: p.placements,
  master: { width: p.width, height: p.height, aspect: p.aspect },
  durationSeconds,
  safeArea: safe,
  safeZone: p.safeZone,
  /* The copy the platform shows. The creative carries the brand; this carries
     the words, where they can be translated and read aloud. */
  copy: {
    primaryText: option("primary-text", ""),
    headline: option("headline", ""),
    description: option("description", ""),
    label: option("label", ""),
  },
  /* What the alternative would have cost: cropping a landscape frame. */
  cropLoss: {
    keptWidth: Number(loss.keptWidth.toFixed(4)),
    keptHeight: Number(loss.keptHeight.toFixed(4)),
    lost: Number(loss.lost.toFixed(4)),
    note:
      `Cropping a 1920x1080 frame to ${p.aspect} keeps ${(loss.keptWidth * 100).toFixed(0)}% of its ` +
      `width. This ad was composed at ${p.width}x${p.height} instead.`,
  },
  source: p.source,
  readOn: p.readOn,
};
writeFileSync(join(outDir, "ad.json"), `${JSON.stringify(ad, null, 2)}\n`, "utf8");

/* ---- the report --------------------------------------------------------- */

console.log(`${p.name} ← ${p.aspect}`);
console.log(`  master      ${p.width}x${p.height}`);
console.log(`  safe area   ${safe.width}x${safe.height} at ${safe.x},${safe.y}`);
console.log(`  type        ${values.eyebrow ? `"${values.eyebrow}"` : "(no eyebrow)"} ${values.claim ? `"${values.claim}"` : "(no claim)"}`);
console.log(`  copy        primary ${ad.copy.primaryText.length} chars, headline ${ad.copy.headline.length} chars`);
const problems = meta.checkCopy(ad.copy, p);
if (problems.length) {
  console.log("\n  the copy is not within Meta's limits yet:");
  for (const problem of problems) console.log(`    ${problem.field}: ${problem.message}`);
}
console.log(`\nwrote ${outDir}`);

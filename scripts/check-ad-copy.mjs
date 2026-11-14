#!/usr/bin/env node
/**
 * Check an ad's copy against the placement's limits.
 *
 * The words live in the platform, not in the picture — so the limits live
 * here too, next to the placement they belong to. Meta asks for a primary
 * text of at least forty characters and at most a hundred and fifty, and a
 * headline of twenty-seven characters on Feed or fifty-five on Reels.
 *
 *   node scripts/check-ad-copy.mjs --placement reels-9x16 \
 *       --primary-text "…" --headline "…"
 *
 * A copy that is too short is as wrong as one that is too long. The bottom of
 * the Feed is covered by the platform's own furniture; a twenty-character
 * primary text gets the link a "Shop now" button, which is not what the
 * brief asked for.
 */
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const argv = process.argv.slice(2);
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
  console.error(`The placements are: ${meta.PLACEMENTS.map((x) => x.id).join(", ")}`);
  process.exit(1);
}

const copy = {
  primaryText: option("primary-text", option("primaryText", "")),
  headline: option("headline", ""),
  description: option("description", ""),
  label: option("label", ""),
};

const problems = meta.checkCopy(copy, p);
const report = {
  placement: p.id,
  name: p.name,
  copy: {
    primaryText: { text: copy.primaryText, length: copy.primaryText.length, limit: p.text.primaryMax },
    headline: { text: copy.headline, length: copy.headline.length, limit: p.text.headlineMax },
  },
  ok: problems.length === 0,
  problems,
};

if (argv.includes("--json")) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`${p.name} — ${p.aspect}, ${p.width}×${p.height}`);
  console.log(`  primary text : ${copy.primaryText.length} characters (${p.text.primaryMin}–${p.text.primaryMax})`);
  console.log(`  headline     : ${copy.headline.length} characters (max ${p.text.headlineMax})`);
  for (const problem of problems) console.log(`  ✗ ${problem.field}: ${problem.message}`);
  console.log(problems.length === 0 ? "\nPASS  the copy fits the placement" : "\nFAIL  the copy does not fit");
}

process.exit(problems.length === 0 ? 0 : 1);

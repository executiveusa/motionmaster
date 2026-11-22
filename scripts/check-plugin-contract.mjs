#!/usr/bin/env node
/**
 * The plugin contract gate.
 *
 * Motion Master has one offer, and it lives in `licence.json`. This gate makes
 * sure nothing else says otherwise.
 *
 * It exists because the plugin used to advertise a paid product with a hosted
 * render allowance while `licence.json` said `onSale: false`, and one manifest
 * still said "33 skills" when there were 47. An agent reads the manifest
 * description before it reads anything else, so a stale offer is not a copy
 * problem — it is a wrong instruction to every agent that loads the package.
 *
 * Two checks:
 *   1. The generated files are in sync with `licence.json`.
 *   2. No agent-readable file restates a price or a live offer while the
 *      product is not on sale.
 *
 *   node scripts/check-plugin-contract.mjs
 *
 * The exit code is 0 only when every check passed.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const licence = JSON.parse(readFileSync(join(repoRoot, "licence.json"), "utf8"));
const onSale = licence.status?.onSale === true;

const failures = [];
function check(ok, label, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(label);
  return ok;
}

/* ---- 1. the generated files are in sync --------------------------------- */

const sync = spawnSync(process.execPath, [join(repoRoot, "scripts", "sync-plugin-contract.mjs"), "--check"], {
  cwd: repoRoot,
  encoding: "utf8",
});
check(sync.status === 0, "the generated contract files are in sync with licence.json", (sync.stderr ?? "").trim().split("\n").slice(-1)[0]);

/* ---- 2. nothing agent-readable restates a price ------------------------- */

/**
 * The files an agent can load: the plugin package, the three marketplace
 * catalogs, the repository README and the finishing prompts.
 *
 * `plugins/deliverable.md` is excluded because it is the historical record of
 * the deliverable, and it carries a status banner saying so. The banner is
 * checked below, so the exclusion cannot rot into a hole.
 */
const scanned = [];
const SKIP = new Set(["plugins/deliverable.md"]);

function walk(absolute, relativePath) {
  if (!existsSync(absolute)) return;
  const stat = statSync(absolute);
  if (stat.isDirectory()) {
    for (const entry of readdirSync(absolute, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      walk(join(absolute, entry.name), relativePath ? `${relativePath}/${entry.name}` : entry.name);
    }
    return;
  }
  if (!/\.(md|json|ts|tsx|mjs|js|txt|ya?ml)$/i.test(absolute)) return;
  if (SKIP.has(relativePath)) return;
  scanned.push(relativePath);
}

walk(join(repoRoot, "plugins"), "plugins");
for (const manifest of [".agents/plugins/marketplace.json", ".claude-plugin/marketplace.json", ".cursor-plugin/marketplace.json"]) {
  if (existsSync(join(repoRoot, manifest))) scanned.push(manifest);
}
for (const file of ["README.md", ".mavis/prompts/plugin-finish.md", ".mavis/prompts/site-finish.md"]) {
  if (existsSync(join(repoRoot, file))) scanned.push(file);
}

check(scanned.length > 0, "there are agent-readable files to check", `${scanned.length} files`);

/* The banned strings, built from licence.json so the rule follows the data. */
const tierPrices = licence.tiers.map((tier) => tier.display);
/**
 * Phrases that only appear in a live offer. A denial — "Motion Master does not
 * run a hosted render service" — is the opposite of an offer and is allowed.
 */
const liveOfferPhrases = [
  "paid, one-time licence",
  "paid one-time licence",
  "buy the licence",
  "licence key is delivered by email",
  "with an allowance in your licence",
  "hosted rendering on studio",
  "hosted rendering, with an allowance",
];

if (onSale) {
  check(true, "the product is on sale, so prices are allowed");
} else {
  const banned = [...tierPrices, ...liveOfferPhrases];
  const hits = [];
  for (const file of scanned) {
    const text = readFileSync(join(repoRoot, file), "utf8");
    for (const needle of banned) {
      if (text.includes(needle)) hits.push(`${file}: "${needle}"`);
    }
  }
  check(hits.length === 0, `no agent-readable file restates a price or a live offer (${scanned.length} files)`, hits.slice(0, 4).join(" | "));
}

/* ---- 3. the historical document says what it is ------------------------- */

const deliverablePath = join(repoRoot, "plugins", "deliverable.md");
if (existsSync(deliverablePath)) {
  const text = readFileSync(deliverablePath, "utf8");
  check(text.includes("not on\n> sale") || text.includes("not on sale"), "the historical deliverable carries a status banner");
} else {
  check(true, "the historical deliverable is not present");
}

/* ---- 4. the manifests count what is actually there ---------------------- */

{
  const skills = readdirSync(join(repoRoot, "plugins", "motion-master", "skills"), { withFileTypes: true }).filter((e) => e.isDirectory()).length;
  const source = readFileSync(join(repoRoot, "mcp", "src", "index.ts"), "utf8");
  const tools = (source.match(/const TOOL_NAMES = \[([\s\S]*?)\]/) ?? ["", ""])[1].match(/"[a-z_]+"/g)?.length ?? 0;
  const manifests = [
    ".agents/plugins/marketplace.json",
    ".claude-plugin/marketplace.json",
    ".cursor-plugin/marketplace.json",
    "plugins/motion-master/plugin.json",
    "plugins/motion-master/.codex-plugin/plugin.json",
    "plugins/motion-master/.claude-plugin/plugin.json",
  ];
  let stale = 0;
  for (const manifest of manifests) {
    const path = join(repoRoot, manifest);
    if (!existsSync(path)) continue;
    const text = readFileSync(path, "utf8");
    // A count is only wrong if it is not the real one. Any other number is
    // not a skill count and is left alone.
    const numbers = [...text.matchAll(/\b(\d+)\s+(?:upstream\s+)?(?:motion\s+)?skills\b/g)].map((m) => Number(m[1]));
    if (numbers.some((n) => n !== skills)) stale += 1;
  }
  check(stale === 0, `every manifest says ${skills} skills`, stale ? `${stale} manifest(s) disagree` : "");
}

console.log(failures.length === 0 ? "\nALL PASS" : `\n${failures.length} FAILED`);
process.exit(failures.length === 0 ? 0 : 1);

#!/usr/bin/env node
/**
 * Generate the agent-readable contract from `licence.json`.
 *
 * Motion Master has one source of truth for its offer: `licence.json` at the
 * repo root. The landing page imports it. The MCP server gets a generated
 * twin. This script finishes the job for the files an AGENT reads — the
 * plugin manifests, the plugin README, the plugin LICENSE and the brand
 * asset — so that a price, a tier list or a rendering promise can never be
 * restated by hand and drift.
 *
 * It was written because the plugin still advertised a paid product with a
 * hosted-render allowance while `licence.json` said `onSale: false`, and one
 * manifest still said "33 skills" when there were 47.
 *
 *   node scripts/sync-plugin-contract.mjs            regenerate
 *   node scripts/sync-plugin-contract.mjs --check    fail if anything is stale
 *
 * The markdown blocks are replaced between `<!-- mm:offer:start -->` and
 * `<!-- mm:offer:end -->`. The JSON files are written whole, so a hand edit
 * shows up as a diff.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const pluginRoot = join(repoRoot, "plugins", "motion-master");

const licence = JSON.parse(readFileSync(join(repoRoot, "licence.json"), "utf8"));
const onSale = licence.status?.onSale === true;

/* ---- the real numbers, counted rather than remembered -------------------- */

function countSkills() {
  const dir = join(pluginRoot, "skills");
  if (!existsSync(dir)) return 0;
  return readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).length;
}

function countTools() {
  const source = readFileSync(join(repoRoot, "mcp", "src", "index.ts"), "utf8");
  const match = source.match(/const TOOL_NAMES = \[([\s\S]*?)\]/);
  if (!match) return 0;
  return (match[1].match(/"[a-z_]+"/g) ?? []).length;
}

function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

function countLibraryItems() {
  const catalogue = readJson(join(repoRoot, "library", "catalogue.json"), null);
  if (!catalogue) return 0;
  return Array.isArray(catalogue) ? catalogue.length : (catalogue.items?.length ?? 0);
}

function countBlocks() {
  const blocks = readJson(join(repoRoot, "library", "blocks.json"), null);
  if (!blocks) return 0;
  return Array.isArray(blocks) ? blocks.length : (blocks.blocks?.length ?? 0);
}

function countPassingBlocks() {
  const verdicts = readJson(join(repoRoot, "library", "block-verdicts.json"), null);
  const list = verdicts?.verdicts ?? verdicts;
  if (!list || typeof list !== "object") return 0;
  return Object.values(list).filter((v) => v && v.ok === true).length;
}

function countSounds() {
  const sfx = readJson(join(repoRoot, "library", "sfx.json"), null);
  return sfx?.counts?.total ?? 0;
}

const facts = {
  skills: countSkills(),
  tools: countTools(),
  libraryItems: countLibraryItems(),
  blocks: countBlocks(),
  passingBlocks: countPassingBlocks(),
  sounds: countSounds(),
};

/* ---- the text ----------------------------------------------------------- */

/**
 * The description every agent reads first. It must describe what the thing
 * IS, and it must not describe what the thing COSTS when nothing is for
 * sale. When the founder flips `onSale`, the same generator writes the offer
 * back in — so this text never has to be rewritten by hand.
 */
function description() {
  const studio = [
    "Motion Master is an in-house motion-design studio for AI agents.",
    `It ships ${facts.skills} skills: the LottieFiles motion-design doctrine, the official GSAP and Remotion skills, the motionmaxxing craft law with its measured gates, sixty complete film styles, 124 authored shot cards, 244 reusable motion effects and a ${facts.libraryItems}-item open-source prompt library, each keeping its own licence and attribution.`,
    "The Motion Master router adds the motion doctrine, the palette and type tokens, the anti-slop rules and the brand kits.",
    "",
    `The MCP server exposes ${facts.tools} tools. It plans the shot list and writes the animation, then renders the file on your own machine and hands you a video you own.`,
    `There is a deterministic prompt enhancer that diagnoses a weak brief and fills only what is missing, ${facts.blocks} installable HyperFrames motion blocks with the lint and layout gate that decides what ships, a render queue that works one job at a time, and a ${facts.sounds}-sound effects shelf. An HTTP API at /api/v1 serves the same tools to scripts and CI.`,
    "",
    "Every render passes a hard gate: contrast, text floor, occlusion, overlap and the motion budget. A render that fails the gate is not published.",
  ];

  if (!onSale) {
    studio.push(
      "",
      "Motion Master is not on sale. It is used in-house. The terms it would ship under are recorded in licence.json at the repo root and are not published.",
    );
    return studio.join("\n");
  }

  studio.push(
    "",
    `Motion Master is a paid, one-time licence: ${licence.tiers
      .map((tier) => `${tier.label} ${tier.display}`)
      .join(", ")}. One payment, no subscription.`,
  );
  return studio.join("\n");
}

function shortDescription() {
  if (onSale) return "Storyboard, choreograph and render motion design in code";
  return "An in-house motion-design studio for AI agents";
}

/** The listing line a marketplace shows next to the plugin. */
function marketplaceDescription() {
  const base =
    "Motion Master — an in-house motion-design studio for AI agents: the motion doctrine, the token set, the skills and the MCP server.";
  return onSale ? `${base} A paid, one-time licence: ${licence.tiers.map((t) => `${t.label} ${t.display}`).join(", ")}.` : base;
}

/** The listing line for the plugin itself inside a marketplace. */
function pluginDescription() {
  const base = `Motion design for AI agents: ${facts.skills} skills, the Motion Master doctrine and tokens, a deterministic storyboard planner, and a Remotion and HyperFrames composition generator.`;
  return onSale
    ? `${base} A paid, one-time licence: ${licence.tiers.map((t) => `${t.label} ${t.display}`).join(", ")}.`
    : `${base} It is used in-house and is not on sale.`;
}

/** The block that replaces the offer section in the markdown files. */
function offerBlock(kind) {
  const lines = [];

  if (kind === "root") {
    // The repository README. It has to say the status first, because this is
    // the file an agent reads when it lands in the repository.
    lines.push(
      "**It is not on sale.** The founder is using it in-house. The terms it would",
      "ship under are recorded in `licence.json` — so a launch is one edit rather than",
      "a rebuild. Nothing in this repository may present a purchase as available.",
    );
    if (onSale) {
      lines.push(
        "",
        `**It is a paid, one-time licence**: ${licence.tiers
          .map((tier) => `**${tier.label} ${tier.priceLine}**`)
          .join(", ")}. One payment, no subscription, no per-render billing.`,
      );
    }
    return lines.join("\n");
  }

  if (kind === "readme") {
    lines.push(
      "**Not on sale.** Motion Master is the founder's own motion-design studio, used",
      "in-house. The terms it would ship under are recorded in `licence.json` at the",
      "repo root; they are not published and nothing is purchasable today.",
    );
    if (onSale) {
      lines.push("", "| Tier | Price | What you get |", "| --- | --- | --- |");
      for (const tier of licence.tiers) {
        lines.push(`| **${tier.label}** | **${tier.priceLine}** | ${tier.includes.join("; ")}. |`);
      }
    }
  } else {
    lines.push(
      "The files written for Motion Master itself are proprietary.",
      onSale
        ? `They are sold as a **paid, one-time licence** (${licence.tiers
            .map((tier) => `${tier.label} ${tier.display}`)
            .join(", ")} — one payment, no subscription).`
        : "They are used in-house. The terms they would ship under are recorded in `licence.json` at the repo root and are not published.",
    );
  }

  lines.push(
    "",
    onSale
      ? "Motion Master does not run a hosted render service. Compositions are rendered on the buyer's own machine with Remotion, and real footage is mixed by a Montage instance the buyer runs themselves."
      : "Motion Master does not run a hosted render service. Compositions render locally, and real footage is mixed by a Montage instance the owner runs themselves.",
  );
  return lines.join("\n");
}

/* ---- the writers -------------------------------------------------------- */

const MARKER_START = "<!-- mm:offer:start -->";
const MARKER_END = "<!-- mm:offer:end -->";

function replaceMarked(markdown, block) {
  const start = markdown.indexOf(MARKER_START);
  const end = markdown.indexOf(MARKER_END);
  if (start === -1 || end === -1) {
    throw new Error("no marked offer block found — add the markers before running this");
  }
  return markdown.slice(0, start) + `${MARKER_START}\n${block}\n${MARKER_END}` + markdown.slice(end + MARKER_END.length);
}

function jsonFile(path, mutate) {
  const current = readFileSync(path, "utf8");
  const data = JSON.parse(current);
  mutate(data);
  return { current, next: `${JSON.stringify(data, null, 2)}\n` };
}

const files = [];

/* the two portable manifests */
for (const relative of ["plugin.json", ".codex-plugin/plugin.json"]) {
  const path = join(pluginRoot, relative);
  const { current, next } = jsonFile(path, (data) => {
    const interface_ = data.extensions?.["com.openai"]?.interface ?? data.interface;
    if (!interface_) throw new Error(`${relative}: no interface block to write into`);
    interface_.longDescription = description();
    interface_.shortDescription = shortDescription();
    if (data.description) data.description = shortDescription();
  });
  files.push({ path, current, next });
}

/* The Claude Code manifest. It is a different shape — a plain description,
   not an interface block — and it is the one that was left saying "33 motion
   skills" long after the count changed. */
{
  const path = join(pluginRoot, ".claude-plugin", "plugin.json");
  const { current, next } = jsonFile(path, (data) => {
    data.description = `Motion design for AI agents: ${facts.skills} motion skills, the Motion Master doctrine and tokens, a deterministic storyboard planner, and a Meta ad studio that composes for the placement.`;
  });
  files.push({ path, current, next });
}

/* the brand asset: the rendering promise, generated from the same file */
{
  const path = join(pluginRoot, "assets", "brand.json");
  const { current, next } = jsonFile(path, (data) => {
    data.offer = {
      source: "licence.json (repo root)",
      note: "Prices, tier lists and the rendering policy live in licence.json at the repo root. Read them from there; do not restate them here.",
    };
    data.rendering = {
      local: {
        ...licence.rendering.local,
        note: onSale
          ? licence.rendering.local.note
          : "Compositions render locally with Remotion. There is no per-minute fee and nothing leaves the owner's machine.",
      },
      hosted: {
        ...licence.rendering.hosted,
        available: onSale && licence.rendering.hosted.available,
        allowanceNote: onSale
          ? licence.rendering.hosted.allowanceNote
          : "Motion Master is not on sale, so no hosted rendering is offered and no allowance is published. The recorded terms live in licence.json.",
        note: onSale
          ? licence.rendering.hosted.note
          : "Compositions render locally. The MCP server never renders anything itself.",
      },
    };
  });
  files.push({ path, current, next });
}

/* the two markdown files, by marker */
for (const [relative, kind] of [
  ["README.md", "readme"],
  ["LICENSE.md", "licence"],
]) {
  const path = join(pluginRoot, relative);
  const current = readFileSync(path, "utf8");
  const next = replaceMarked(current, offerBlock(kind));
  files.push({ path, current, next });
}

/* the repository README */
{
  const path = join(repoRoot, "README.md");
  const current = readFileSync(path, "utf8");
  const next = replaceMarked(current, offerBlock("root"));
  files.push({ path, current, next });
}

/* the three marketplace manifests — the first thing a host shows an agent */
for (const relative of [
  ".agents/plugins/marketplace.json",
  ".claude-plugin/marketplace.json",
  ".cursor-plugin/marketplace.json",
]) {
  const path = join(repoRoot, relative);
  const { current, next } = jsonFile(path, (data) => {
    if (typeof data.description === "string") data.description = marketplaceDescription();
    if (typeof data.metadata?.description === "string") data.metadata.description = marketplaceDescription();
    for (const plugin of data.plugins ?? []) {
      if (typeof plugin.description === "string") plugin.description = pluginDescription();
      const interface_ = plugin.interface;
      if (!interface_) continue;
      interface_.longDescription = description();
      interface_.shortDescription = shortDescription();
    }
    const top = data.interface;
    if (top && typeof top === "object") {
      if (typeof top.shortDescription === "string") top.shortDescription = shortDescription();
      if (typeof top.longDescription === "string") top.longDescription = description();
    }
  });
  files.push({ path, current, next });
}

/* ---- run ---------------------------------------------------------------- */

const check = process.argv.includes("--check");
let stale = 0;

for (const file of files) {
  if (file.current === file.next) {
    console.log(`ok    ${file.path.replace(`${repoRoot}/`, "")}`);
    continue;
  }
  if (check) {
    console.error(`stale ${file.path.replace(`${repoRoot}/`, "")}`);
    stale += 1;
  } else {
    writeFileSync(file.path, file.next);
    console.log(`wrote ${file.path.replace(`${repoRoot}/`, "")}`);
  }
}

if (check && stale > 0) {
  console.error(`\n${stale} file(s) are out of date with licence.json. Run: node scripts/sync-plugin-contract.mjs`);
  process.exit(1);
}

if (!check) {
  console.log(
    `\nMotion Master is ${onSale ? "on sale" : "not on sale"}. Skills: ${facts.skills}. Tools: ${facts.tools}. Blocks: ${facts.passingBlocks}/${facts.blocks} passing.`,
  );
}

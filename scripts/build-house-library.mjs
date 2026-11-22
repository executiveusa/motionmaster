#!/usr/bin/env node
/**
 * Build the house library.
 *
 * The 3,988 library items are prompts: good for inspiration, useless for
 * assembly. An agent handed one has to write the animation itself, every
 * time, and gets a different result each time.
 *
 * The house library is the other thing. Every block that has passed the gate
 * becomes a reusable scene: the motion already works, the variables are named,
 * the shot role it serves is known, and it is bound to a brand kit. An agent
 * picks a scene, fills the content variables and renders it.
 *
 *   node scripts/build-house-library.mjs
 *
 * Nothing here is invented. The scenes come from the registry, the passing
 * comes from the gate verdicts, and the roles come from the role map — all
 * three are read from disk. A block that failed the gate is never here, so a
 * template can never be built on something that clips its own text.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { isQualified } from "../mcp/dist/verdicts.js";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const blocksPath = join(ROOT, "library", "blocks.json");
const verdictsPath = join(ROOT, "library", "block-verdicts.json");
const rolesPath = join(ROOT, "library", "block-roles.json");
const compositionVerdictsPath = join(ROOT, "library", "composition-verdicts.json");
const outPath = join(ROOT, "studio", "templates.json");

/**
 * The shot role each vendored composition serves.
 *
 * Written down here rather than inferred, for the same reason the block role
 * table is: it is a judgement about what a scene is for, and it should be
 * arguable.
 */
const COMPOSITION_ROLES = {
  "bar-chart-grow": "data",
  "before-after-stat": "data",
  "big-number-card": "data",
  "compact-number-callout": "data",
  "concept-spotlight": "typography",
  "donut-progress": "data",
  "horizontal-bar-compare": "data",
  "iteration-loop": "rhythm",
  "key-point-marker": "typography",
  "keyword-blast": "typography",
  "line-chart-draw": "data",
  "metric-pulse": "data",
  "mode-choice-compare": "data",
  "myth-fact-swap": "typography",
  "number-counter": "data",
  "number-impact": "data",
  "quote-card": "typography",
  "source-citation-card": "typography",
  "stat-duel": "data",
  "status-split": "data",
  "three-step-flow": "rhythm",
  "timeline-scan": "rhythm",
  "top-rank-list": "data",
  "turning-point-line": "data",
};

const blocks = JSON.parse(readFileSync(blocksPath, "utf8")).blocks;
const verdicts = JSON.parse(readFileSync(verdictsPath, "utf8")).verdicts ?? {};
const roleMap = JSON.parse(readFileSync(rolesPath, "utf8")).roles ?? {};

/** The role a scene is filed under first — the one it is best at. */
const ROLE_ORDER = [
  "opening",
  "typography",
  "camera",
  "data",
  "effects",
  "interaction",
  "ui-entrance",
  "rhythm",
  "transition",
  "outro",
];

/**
 * The house default for a scene: the format the studio renders in. A block
 * that came in at 1080×1080 is a square scene, and saying so is better than
 * letting the renderer guess.
 */
function formatOf(block) {
  const dims = block.dimensions;
  if (!dims || !dims.width || !dims.height) return { width: 1920, height: 1080, aspect: "16:9" };
  const aspect =
    dims.width === dims.height ? "1:1" : dims.width > dims.height ? "16:9" : "9:16";
  return { width: dims.width, height: dims.height, aspect };
}

const templates = [];

for (const block of blocks) {
  const verdict = verdicts[block.id];
  /* The house's policy, not the gate's severity column: a scene whose text
     is 14 px on a phone is not a scene the house publishes. */
  if (!isQualified(verdict)) continue;

  const roles = roleMap[block.id];
  if (!roles || !roles.length) continue;

  const format = formatOf(block);
  const durationSeconds = block.duration ?? 6;
  const variables = (block.variables ?? []).map((variable) => ({
    id: variable.id,
    type: variable.type,
    role: variable.role ?? "content",
    label: variable.label ?? variable.id,
    description: variable.description ?? "",
    default: variable.default ?? null,
    options: variable.options ?? [],
  }));

  /* The variables an agent has to fill. The style ones are the house's
     business — they are what makes it look like the studio. */
  const contentVariables = variables.filter((v) => v.role === "content");

  const role = [...roles].sort((a, b) => ROLE_ORDER.indexOf(a) - ROLE_ORDER.indexOf(b))[0];

  const description = (block.description ?? "").trim();
  const title = (block.title ?? block.id).trim();

  templates.push({
    id: block.id,
    name: title,
    role,
    roles,
    source: { kind: "registry", id: block.id },
    block: block.id,
    kit: "house",
    durationSeconds,
    format,
    fps: 30,
    tags: block.tags ?? [],
    /* The brief that produces this scene. It is the block's own description
       turned into a brief, plus the format the studio renders in — nothing
       that is not already in the registry. */
    prompt:
      `${title}. ${description} Render at ${format.width}x${format.height}, ${format.aspect}, 30fps, ` +
      `about ${durationSeconds} seconds, with the house brand kit.`,
    /* What the scene is for, in a sentence an agent can act on. */
    why: contentVariables.length
      ? `A ${role} scene. Fill ${contentVariables.length} content variable${contentVariables.length === 1 ? "" : "s"} and it renders.`
      : `A ${role} scene with nothing to fill. It renders as it is.`,
    variables,
    contentVariables: contentVariables.map((v) => v.id),
    license: block.license ?? null,
    author: block.author ?? null,
  });
}

/* ---- the vendored compositions ------------------------------------------ */

/*
 * Thirty-six HyperFrames compositions came in with the studio's new repos.
 * They were measured the same way the registry blocks were: mounted, filled
 * from a neutral brief, and put through the gate. Twenty-four of the
 * twenty-seven motion-library templates pass; none of the eight reelforge
 * blocks do, because their failure is structural rather than craft — they
 * are written as one large file with the root styled by class.
 *
 * Only the ones that pass become house scenes.
 */
const compositionVerdicts = existsSync(compositionVerdictsPath)
  ? JSON.parse(readFileSync(compositionVerdictsPath, "utf8")).verdicts ?? {}
  : {};

for (const verdict of Object.values(compositionVerdicts)) {
  if (!isQualified(verdict)) continue;
  const id = verdict.block;
  const directory = join(ROOT, "studio", "compositions", verdict.set, id);
  const file = ["index.html", "block.html"].map((n) => join(directory, n)).find((p) => existsSync(p));
  if (!file) continue;

  const html = readFileSync(file, "utf8");
  const variableMatch = html.match(/data-composition-variables=['"]([\s\S]*?)['"]/);
  let variables = [];
  try {
    variables = variableMatch ? JSON.parse(variableMatch[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'")) : [];
  } catch {
    variables = [];
  }
  const role = COMPOSITION_ROLES[id];
  if (!role) continue;

  const duration = Number(html.match(/data-duration="([\d.]+)"/)?.[1] ?? 5);

  templates.push({
    id,
    name: id
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" "),
    role,
    roles: [role],
    source: { kind: "local", id, path: file.replace(`${ROOT}/`, "") },
    kit: "house",
    durationSeconds: duration,
    format: { width: 1920, height: 1080, aspect: "16:9" },
    fps: 30,
    tags: [verdict.set],
    prompt:
      `${id}. A ${role} scene from the studio's motion library. Render at 1920x1080, 16:9, 30fps, ` +
      `about ${duration} seconds, with the house brand kit.`,
    why: `A ${role} scene that passed the gate. Fill its content variables and it renders.`,
    variables: variables.map((v) => ({
      id: v.id,
      type: v.type,
      role: v.role ?? "content",
      label: v.label ?? v.id,
      description: v.description ?? "",
      default: v.default ?? null,
      options: v.options ?? [],
    })),
    contentVariables: variables.filter((v) => (v.role ?? "content") === "content").map((v) => v.id),
    license: "MIT",
    author: "nutllwhy",
  });
}

templates.sort((a, b) => a.id.localeCompare(b.id));

const byRole = {};
for (const template of templates) {
  for (const role of template.roles) {
    byRole[role] = (byRole[role] ?? 0) + 1;
  }
}

const document = `${JSON.stringify(
    {
      generated: "scripts/build-house-library.mjs",
      note:
        "The house library: every motion block that passed the gate, as a reusable scene. An agent picks " +
        "a scene by the shot role it serves, fills the content variables and renders it. Nothing in here " +
        "failed the gate, and nothing in here is invented.",
      counts: {
        total: templates.length,
        byRole: Object.fromEntries(Object.entries(byRole).sort((a, b) => b[1] - a[1])),
      },
      templates,
    },
    null,
    2,
  )}\n`;

if (process.argv.includes("--check")) {
  let current = "";
  try {
    current = readFileSync(outPath, "utf8");
  } catch {
    console.error(`stale: ${outPath} does not exist. Run: node scripts/build-house-library.mjs`);
    process.exit(1);
  }
  if (current !== document) {
    console.error(`stale: ${outPath} is out of date with the gate verdicts and the role map.`);
    console.error("Run: node scripts/build-house-library.mjs");
    process.exit(1);
  }
  console.log(`the house library is in sync: ${templates.length} scenes`);
  process.exit(0);
}

writeFileSync(outPath, document, "utf8");

console.log(`${templates.length} house scenes`);
for (const [role, count] of Object.entries(byRole).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(count).padStart(3)}  ${role}`);
}
const uncovered = ROLE_ORDER.filter((role) => !byRole[role]);
if (uncovered.length) console.log(`\nno scene serves: ${uncovered.join(", ")}`);
console.log(`\nwrote ${outPath}`);

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
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const blocksPath = join(ROOT, "library", "blocks.json");
const verdictsPath = join(ROOT, "library", "block-verdicts.json");
const rolesPath = join(ROOT, "library", "block-roles.json");
const outPath = join(ROOT, "studio", "templates.json");

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
  if (!verdict || !verdict.ok) continue;

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

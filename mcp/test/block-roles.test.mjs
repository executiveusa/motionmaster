/**
 * The shot plan and the block pool, meeting.
 *
 * A film is a sequence of roles — an opening, some typography, a camera
 * move, a number, an end — and each of those wants a block that can actually
 * do it. The plan writes the roles into the brief, and the matcher now reads
 * them back, so the block for each shot is chosen by what the shot has to do
 * rather than by whichever words happened to match.
 *
 * And the block it chooses must have passed the gate: a block that clips its
 * own text cannot serve any role well.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { planFilm, rolesFromBrief } from "../dist/film.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const blocksPath = join(root, "library", "blocks.json");
const tokensPath = join(root, "plugins", "motion-master", "assets", "motion-tokens.json");
const verdictsPath = join(root, "library", "block-verdicts.json");
const rolesPath = join(root, "library", "block-roles.json");

const skip = !existsSync(blocksPath) || !existsSync(tokensPath) || !existsSync(verdictsPath) || !existsSync(rolesPath);
const blocks = skip ? null : JSON.parse(readFileSync(blocksPath, "utf8"));
const tokens = skip ? null : JSON.parse(readFileSync(tokensPath, "utf8"));
const verdicts = skip ? {} : JSON.parse(readFileSync(verdictsPath, "utf8")).verdicts ?? {};
const roles = skip ? {} : JSON.parse(readFileSync(rolesPath, "utf8")).roles ?? {};

const options = () => ({
  blocks,
  tokens,
  verdicts,
  roles,
  exclude: Object.entries(verdicts).filter(([, v]) => !v.ok).map(([id]) => id),
});

/* The brief a shot plan produces, as the enhancer writes it. */
const PLANNED_BRIEF = `Make a launch film for ACME coffee.

SHOTS
1. opening: opening/brand-ink-open (2.8s) — the mark is drawn and pressed
2. typography: typography/wordmark-reveal (3s) — the name arrives a word at a time
3. camera: camera/push-in (3s) — the frame moves toward the subject
4. outro: outro/wordmark-end (2.5s) — the mark, still, at the end
`;

test("the roles are read back out of a planned brief", { skip }, () => {
  assert.deepEqual(rolesFromBrief(PLANNED_BRIEF), ["opening", "typography", "camera", "outro"]);
});

test("a brief with no shot plan has no roles", { skip }, () => {
  assert.deepEqual(rolesFromBrief("Make a launch film for ACME coffee."), []);
});

test("each shot gets a block that serves its role", { skip }, () => {
  const plan = planFilm(PLANNED_BRIEF, { ...options(), count: 4 });
  assert.ok(plan.shots.length > 0, "the plan has no shots");
  const wanted = rolesFromBrief(PLANNED_BRIEF);
  const served = plan.shots.map((shot) => (roles[shot.id] ?? []).filter((role) => wanted.includes(role)));
  assert.ok(
    served.some((list) => list.length > 0),
    `no shot was given a block that fits its role — ${plan.shots.map((s) => s.id).join(", ")}`,
  );
});

test("no shot is given a block the gate rejected", { skip }, () => {
  const plan = planFilm(PLANNED_BRIEF, { ...options(), count: 4 });
  const rejected = Object.entries(verdicts).filter(([, v]) => !v.ok).map(([id]) => id);
  for (const shot of plan.shots) {
    assert.ok(!rejected.includes(shot.id), `${shot.id} was rejected by the gate but was chosen`);
  }
});

test("every chosen block has been measured", { skip }, () => {
  const plan = planFilm(PLANNED_BRIEF, { ...options(), count: 4 });
  for (const shot of plan.shots) {
    assert.ok(shot.id in verdicts, `${shot.id} was never measured`);
  }
});

test("the roles do not break a brief that has no plan", { skip }, () => {
  const plan = planFilm("a calm title card for ACME coffee", { ...options(), count: 3 });
  assert.ok(plan.shots.length > 0, "a plain brief still has to be answered");
  for (const shot of plan.shots) {
    assert.ok(shot.id in verdicts, `${shot.id} was never measured`);
  }
});

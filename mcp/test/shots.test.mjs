/**
 * The shot vocabulary and the effect shelf.
 *
 * Both come from vendored upstream work, so these tests check the things
 * that would break quietly: the cards parse, the ids are unique, the plan
 * respects the length it was given, and the catalogue agrees with the source
 * files on disk.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

import {
  energyRank,
  getShot,
  loadShots,
  matchShots,
  planShots,
  SHOT_ROLES,
} from "../src/shots.ts";
import {
  countEffectFiles,
  getEffect,
  loadEffectCategories,
  loadEffects,
  matchEffects,
  transitionEffects,
} from "../src/effects.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILLS = resolve(HERE, "..", "..", "plugins", "motion-master", "skills");

const shots = loadShots(SKILLS);
const effects = loadEffects(SKILLS);

test("the shot cards load", () => {
  assert.ok(shots.length > 100, `expected the full card set, got ${shots.length}`);
});

test("every shot has an id, a role, a summary and a path", () => {
  for (const shot of shots) {
    assert.ok(shot.id.includes("/"), `${shot.id} has no role`);
    assert.ok(shot.summary.length > 0, `${shot.id} has no summary`);
    assert.ok(shot.useWhen.length > 0, `${shot.id} has no use-when line`);
    assert.ok(shot.path.length > 0, `${shot.id} has no path`);
    assert.ok(existsSync(join(SKILLS, shot.path)), `${shot.path} does not exist`);
  }
});

test("the shot ids are unique", () => {
  assert.equal(new Set(shots.map((s) => s.id)).size, shots.length);
});

test("every role has at least one card", () => {
  for (const role of SHOT_ROLES) {
    assert.ok(
      shots.some((s) => s.role === role),
      `no card for the ${role} role`,
    );
  }
});

test("a card can be fetched by its full id and by its bare name", () => {
  const first = shots[0];
  assert.ok(getShot(shots, first.id));
  assert.ok(getShot(shots, first.name));
  assert.equal(getShot(shots, "not-a-shot"), undefined);
});

test("energy ranks in the order the cards describe", () => {
  assert.ok(energyRank("低") < energyRank("中"));
  assert.ok(energyRank("中") < energyRank("高"));
  assert.ok(energyRank("低中") < energyRank("中"));
  assert.ok(energyRank("中高") > energyRank("中"));
});

test("matching a brief returns cards, best first", () => {
  const matched = matchShots(shots, "a chart of signups that counts up", { limit: 5 });
  assert.ok(matched.length > 0, "nothing matched");
  assert.ok(
    matched[0].score >= matched[matched.length - 1].score,
    "the results are not in score order",
  );
});

test("a shot plan opens cheap and closes on the outro", () => {
  const plan = planShots(shots, "a launch film for a developer tool dashboard", {
    durationSeconds: 20,
  });
  assert.ok(plan.shots.length >= 3, "the plan is too short to be a film");
  assert.equal(plan.shots[0].role, "opening");
  assert.equal(plan.shots[plan.shots.length - 1].role, "outro");
  assert.ok(
    energyRank(plan.shots[0].energy) <= 3,
    "the opening spends more energy than the cards allow",
  );
});

test("a shot plan is trimmed to the length it was given", () => {
  const plan = planShots(shots, "a launch film for a developer tool dashboard", {
    durationSeconds: 12,
  });
  const total = plan.shots.reduce((a, s) => a + (s.durationSeconds ?? 0), 0);
  assert.ok(total <= 12.6, `the plan runs ${total}s, which is over 12s`);
  assert.ok(plan.unresolved.length > 0, "the plan changed its mind without saying so");
});

test("a shot plan cites the card each shot came from", () => {
  const plan = planShots(shots, "a launch film", { durationSeconds: 20 });
  for (const shot of plan.shots) {
    assert.ok(getShot(shots, shot.id), `${shot.id} is not a card`);
    assert.ok(shot.reason.length > 0, `${shot.id} has no reason`);
  }
});

test("the plan says when it could not decide something", () => {
  const plan = planShots(shots, "a launch film", { durationSeconds: 4 });
  assert.ok(plan.unresolved.length > 0, "a four second film should not be quietly satisfied");
});

test("the effect catalogue loads every effect", () => {
  assert.equal(effects.length, 244, `expected 244 effects, got ${effects.length}`);
});

test("the catalogue agrees with the source files on disk", () => {
  assert.equal(
    countEffectFiles(SKILLS),
    effects.length,
    "the catalogue and the source tree disagree",
  );
});

test("every effect has a description, a duration and a path", () => {
  for (const effect of effects) {
    assert.ok(effect.description.length > 0, `${effect.id} has no description`);
    assert.ok(effect.durationSeconds !== null, `${effect.id} has no duration`);
    assert.ok(existsSync(join(SKILLS, effect.path)), `${effect.path} does not exist`);
  }
});

test("every effect carries its own tags", () => {
  const untagged = effects.filter((e) => e.tags.length === 0);
  assert.equal(untagged.length, 0, `${untagged.length} effects have no tags`);
});

test("the effect ids are unique", () => {
  assert.equal(new Set(effects.map((e) => e.id)).size, effects.length);
});

test("the categories cover every effect", () => {
  const categories = loadEffectCategories(SKILLS);
  const counted = categories.reduce((a, c) => a + c.count, 0);
  assert.equal(counted, effects.length);
});

test("there are transitions to change gear with", () => {
  const transitions = transitionEffects(effects);
  assert.ok(transitions.length >= 10, `expected the transition set, got ${transitions.length}`);
  for (const t of transitions) assert.equal(t.category, "transitions");
});

test("matching an effect brief finds transitions", () => {
  const matched = matchEffects(effects, "a glitch wipe between two shots", { limit: 5 });
  assert.ok(matched.length > 0, "nothing matched");
  assert.ok(
    matched.some((m) => m.effect.category === "transitions"),
    "a wipe request did not find a wipe",
  );
});

test("an effect can be fetched by its id", () => {
  const first = effects[0];
  assert.ok(getEffect(effects, first.id));
  assert.equal(getEffect(effects, "not/an-effect"), undefined);
});

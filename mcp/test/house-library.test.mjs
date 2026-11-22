/**
 * Tests for the house library.
 *
 * The house library is generated from the gate verdicts and the role map, so
 * the tests are about the guarantees that generation is supposed to give:
 * every scene passed the gate, every scene serves a role, and every scene
 * points at a block that is really there.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { existsSync, readFileSync } from "node:fs";

import {
  getHouseTemplate,
  houseLibraryProblems,
  listHouseTemplates,
  loadHouseLibrary,
  planHouseTemplate,
} from "../dist/houselibrary.js";
import { loadTokens } from "../dist/tokens.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");
const libraryPath = join(repoRoot, "studio", "templates.json");
const tokens = loadTokens(join(repoRoot, "plugins", "motion-master", "assets", "motion-tokens.json"));

const skip = existsSync(libraryPath)
  ? false
  : "studio/templates.json is missing — run: node scripts/build-house-library.mjs";

test("the house library is built", { skip }, () => {
  const library = loadHouseLibrary(repoRoot);
  assert.ok(library.templates.length > 0, "there are house scenes");
  assert.equal(library.counts.total, library.templates.length);
});

test("every house scene passed the gate", { skip }, () => {
  const registry = JSON.parse(
    readFileSync(join(repoRoot, "library", "block-verdicts.json"), "utf8"),
  ).verdicts ?? {};
  const compositions = JSON.parse(
    readFileSync(join(repoRoot, "library", "composition-verdicts.json"), "utf8"),
  ).verdicts ?? {};
  const library = loadHouseLibrary(repoRoot);
  for (const template of library.templates) {
    if (template.source?.kind === "local") {
      const key = Object.keys(compositions).find(
        (k) => k.endsWith(`/${template.source.id}`),
      );
      const verdict = key ? compositions[key] : undefined;
      assert.ok(verdict, `${template.id} has a verdict`);
      assert.equal(verdict.ok, true, `${template.id} passed the gate`);
      continue;
    }
    const verdict = registry[template.block];
    assert.ok(verdict, `${template.id} has a verdict`);
    assert.equal(verdict.ok, true, `${template.id} passed the gate`);
  }
});

test("every house scene serves at least one shot role", { skip }, () => {
  const library = loadHouseLibrary(repoRoot);
  for (const template of library.templates) {
    assert.ok(template.roles.length > 0, `${template.id} serves a role`);
    assert.ok(template.role, `${template.id} has a primary role`);
  }
});

test("the house library has no problems", { skip }, () => {
  const problems = houseLibraryProblems(repoRoot);
  assert.deepEqual(problems, [], JSON.stringify(problems));
});

test("all ten shot roles are covered", { skip }, () => {
  const roles = [
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
  const library = loadHouseLibrary(repoRoot);
  for (const role of roles) {
    assert.ok(library.counts.byRole[role] > 0, `a scene serves "${role}"`);
  }
});

test("a scene can be filtered by role", { skip }, () => {
  const openings = listHouseTemplates(repoRoot, { role: "opening" });
  assert.ok(openings.length > 0);
  for (const template of openings) {
    assert.ok(template.roles.includes("opening"));
  }
});

test("a scene can be searched by name and by tag", { skip }, () => {
  const byTag = listHouseTemplates(repoRoot, { query: "lower-third" });
  assert.ok(byTag.length > 0, "a search finds something");
  const byName = listHouseTemplates(repoRoot, { query: "Lower" });
  assert.ok(byName.length > 0, "a name search finds something");
});

test("a scene carries its content variables and a prompt that produces it", { skip }, () => {
  const library = loadHouseLibrary(repoRoot);
  for (const template of library.templates) {
    assert.ok(template.prompt.length > 20, `${template.id} has a prompt`);
    assert.ok(Array.isArray(template.variables), `${template.id} names its variables`);
    assert.ok(template.durationSeconds > 0, `${template.id} has a duration`);
    assert.ok(template.format.width > 0, `${template.id} has a format`);
    for (const id of template.contentVariables) {
      assert.ok(
        template.variables.some((variable) => variable.id === id),
        `${template.id} lists ${id} among its variables`,
      );
    }
  }
});

test("a scene can be planned from a brief", { skip }, () => {
  const library = loadHouseLibrary(repoRoot);
  const template = library.templates.find((t) => t.contentVariables.length > 0);
  assert.ok(template, "there is a scene with something to fill");
  const planned = planHouseTemplate(repoRoot, template.id, {
    brief: "A launch film for a coffee subscription called Slow mornings",
    tokens,
  });
  assert.deepEqual(planned.problems, []);
  assert.ok(planned.filled, "the scene was filled");
  assert.ok(planned.filled.values, "it has values");
});

test("a scene that does not exist says so", { skip }, () => {
  const planned = planHouseTemplate(repoRoot, "no-such-scene", { brief: "x", tokens });
  assert.equal(planned.template, undefined);
  assert.ok(planned.problems.length > 0);
  assert.equal(getHouseTemplate(repoRoot, "no-such-scene"), undefined);
});

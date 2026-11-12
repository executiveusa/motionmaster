/**
 * Tests for brand kits: the per-project overrides of the canonical tokens.
 *
 * A kit is authored by an agent, so the rules that protect the renderer are
 * the rules under test: a kit overrides, it never deletes; a kit may not
 * change the system identity; a palette value is a colour and not a typo.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";

import {
  getBrandKit,
  listBrandKits,
  resolveTokens,
  saveBrandKit,
  validateKit,
  KIT_SECTIONS,
} from "../dist/brandkit.js";
import { loadTokens } from "../dist/tokens.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");
const tokensPath = join(repoRoot, "plugins", "motion-master", "assets", "motion-tokens.json");
const base = loadTokens(tokensPath);

test("the house kit is on disk and valid", () => {
  const kits = listBrandKits(repoRoot);
  assert.ok(kits.length >= 1, "there is at least one kit");
  const house = kits.find((k) => k.id === "house");
  assert.ok(house, "the house kit exists");
  const { kit, problems } = getBrandKit(repoRoot, "house", base);
  assert.deepEqual(problems, [], `the house kit has no problems: ${JSON.stringify(problems)}`);
  assert.ok(kit);
});

test("every kit on disk is valid against the canonical tokens", () => {
  for (const summary of listBrandKits(repoRoot)) {
    const { problems } = getBrandKit(repoRoot, summary.id, base);
    assert.deepEqual(problems, [], `kit "${summary.id}" is valid`);
  }
});

test("a kit overrides only where it speaks", () => {
  const resolved = resolveTokens(base, {
    id: "test",
    name: "Test",
    palette: { accent: "#00FF00" },
  });
  assert.equal(resolved.palette.accent, "#00FF00", "the override wins");
  assert.equal(resolved.palette.canvas, base.palette.canvas, "the base survives where the kit is silent");
  assert.equal(resolved.easing.entrance.name, base.easing.entrance.name, "other sections are untouched");
});

test("a kit may not remove a token", () => {
  const resolved = resolveTokens(base, {
    id: "test",
    name: "Test",
    palette: { accent: "#00FF00" },
  });
  for (const key of Object.keys(base.palette)) {
    assert.ok(key in resolved.palette, `palette.${key} still exists`);
  }
});

test("a kit may not change the system identity", () => {
  const problems = validateKit({ id: "x", name: "X", antiSlop: ["be different"] }, base);
  assert.ok(problems.some((p) => p.path === "antiSlop"), "antiSlop is protected");
  const problems2 = validateKit({ id: "x", name: "X", version: "9.9.9" }, base);
  assert.ok(problems2.some((p) => p.path === "version"), "version is protected");
});

test("a palette value must be a colour", () => {
  const problems = validateKit({ id: "x", name: "X", palette: { accent: "orange" } }, base);
  assert.ok(problems.some((p) => p.path === "palette.accent"), "the bad colour is reported");
  const ok = validateKit({ id: "x", name: "X", palette: { accent: "#FF4A1C" } }, base);
  assert.deepEqual(ok, [], "a hex colour is accepted");
});

test("a kit may only override a token that exists", () => {
  const problems = validateKit({ id: "x", name: "X", palette: { nonexistent: "#000000" } }, base);
  assert.ok(problems.some((p) => p.path === "palette.nonexistent"), "the unknown token is reported");
});

test("an unknown section is an error, not a silent no-op", () => {
  const problems = validateKit({ id: "x", name: "X", colourz: { accent: "#000000" } }, base);
  assert.ok(problems.some((p) => p.path === "colourz"), "the misspelled section is reported");
});

test("a kit id has to be usable as a file name", () => {
  const problems = validateKit({ id: "Not A Kit!", name: "X" }, base);
  assert.ok(problems.some((p) => p.path === "id"), "a bad id is reported");
});

test("a kit with problems is never written", () => {
  const dir = mkdtempSync(join(tmpdir(), "mm-kit-"));
  try {
    const result = saveBrandKit(dir, { id: "broken", name: "Broken", palette: { accent: "nope" } }, base);
    assert.equal(result.saved, false);
    assert.ok(result.problems.length > 0);
    const listing = listBrandKits(dir);
    assert.equal(listing.length, 0, "nothing was written");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a good kit is written and can be read back", () => {
  const dir = mkdtempSync(join(tmpdir(), "mm-kit-"));
  try {
    const result = saveBrandKit(
      dir,
      { id: "night", name: "Night", palette: { accent: "#7C5CFF" } },
      base,
    );
    assert.equal(result.saved, true, JSON.stringify(result.problems));
    const listing = listBrandKits(dir);
    assert.equal(listing.length, 1);
    assert.equal(listing[0].id, "night");
    assert.deepEqual(listing[0].overrides, ["palette"]);
    const { kit, problems } = getBrandKit(dir, "night", base);
    assert.deepEqual(problems, []);
    assert.equal(kit.palette.accent, "#7C5CFF");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a missing kit says so instead of failing quietly", () => {
  const { kit, problems } = getBrandKit(repoRoot, "no-such-kit", base);
  assert.equal(kit, undefined);
  assert.ok(problems.length > 0);
});

test("the kit sections are the ones the tokens actually have", () => {
  for (const section of KIT_SECTIONS) {
    assert.ok(section in base, `the base tokens have a "${section}" section`);
  }
});

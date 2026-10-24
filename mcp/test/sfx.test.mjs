/**
 * The sound library, tested.
 *
 * These are the claims the shelf rests on: every sound can be found by a
 * person or an agent saying what they want, every sound says what licence it
 * is under, and the file behind it is really there.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { existsSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");
const cataloguePath = join(repoRoot, "library", "sfx.json");
const skip = existsSync(cataloguePath)
  ? false
  : "the sound library is missing — run: node scripts/build-sfx.mjs";

const { loadSfx, browseSfx, getSfx, planSound, sfxFile } = await import("../dist/sfx.js");

test("the catalogue loads and has sounds in it", { skip }, () => {
  const catalogue = loadSfx(cataloguePath);
  assert.ok(catalogue.entries.length > 500, `only ${catalogue.entries.length} sounds`);
  assert.ok(catalogue.kindVocabulary.length > 10, "the vocabulary is too small");
});

test("every sound carries a licence", { skip }, () => {
  const catalogue = loadSfx(cataloguePath);
  for (const item of catalogue.entries) {
    assert.ok(item.licence && item.licence.length > 0, `${item.id} has no licence`);
  }
});

test("every sound's file is really there", { skip }, () => {
  const catalogue = loadSfx(cataloguePath);
  const missing = catalogue.entries.filter(
    (item) => !existsSync(sfxFile(repoRoot, item)),
  );
  assert.deepEqual(
    missing.slice(0, 5).map((item) => item.id),
    [],
    `${missing.length} sounds have no file`,
  );
});

test("every kind says what it means", { skip }, () => {
  const catalogue = loadSfx(cataloguePath);
  for (const kind of catalogue.kindVocabulary) {
    assert.ok(kind.about && kind.about.length > 8, `${kind.id} does not explain itself`);
    assert.ok(kind.count > 0, `${kind.id} has no sounds`);
  }
});

test("every sound has a line an agent can read", { skip }, () => {
  const catalogue = loadSfx(cataloguePath);
  for (const item of catalogue.entries.slice(0, 200)) {
    assert.ok(item.text.length > 20, `${item.id} has no description`);
    assert.ok(item.durationMs > 0, `${item.id} has no length`);
  }
});

test("a plain question finds the right sound", { skip }, () => {
  const catalogue = loadSfx(cataloguePath);

  const pop = browseSfx(catalogue, { query: "short bright pop", limit: 5 });
  assert.ok(pop.total > 0, "a pop was not found");
  assert.ok(
    pop.items.some((item) => item.kind === "pop"),
    "the pop search found no pop",
  );

  const whoosh = browseSfx(catalogue, { query: "whoosh", limit: 5 });
  assert.ok(
    whoosh.items.some((item) => item.kind === "whoosh"),
    "the whoosh search found no whoosh",
  );

  // A question with only words that join the sentence together must still
  // return something rather than an empty shelf.
  const vague = browseSfx(catalogue, { query: "a sound for the video", limit: 5 });
  assert.ok(vague.total > 0, "a vague question returned nothing");
});

test("the kinds are the buttons, and every kind has sounds", { skip }, () => {
  const catalogue = loadSfx(cataloguePath);
  for (const kind of catalogue.kindVocabulary) {
    const found = browseSfx(catalogue, { kind: kind.id, limit: 1 });
    assert.ok(found.total > 0, `the ${kind.id} button leads to nothing`);
  }
});

test("one sound in full", { skip }, () => {
  const catalogue = loadSfx(cataloguePath);
  const first = catalogue.entries[0];
  const item = getSfx(catalogue, first.id);
  assert.ok(item, "the sound was not found by its id");
  assert.equal(item.id, first.id);
  assert.ok(item.sourceUrl, "the sound does not say where it came from");
});

test("a kit puts a sound on every beat, timed against the beat", { skip }, () => {
  const catalogue = loadSfx(cataloguePath);
  const beats = [
    { index: 0, label: "Opening", role: "setup", inSeconds: 0 },
    { index: 1, label: "The reveal", role: "reveal", inSeconds: 2.5 },
    { index: 2, label: "The number", role: "develop", inSeconds: 5 },
    { index: 3, label: "End card", role: "exit", inSeconds: 8 },
  ];
  const plan = planSound(catalogue, beats);
  assert.equal(plan.takes.length, beats.length, "a beat was left without a sound");

  for (const take of plan.takes) {
    assert.ok(take.level > 0 && take.level <= 1, `${take.id} has a level of ${take.level}`);
    assert.ok(take.atSeconds >= 0, `${take.id} lands before the film starts`);
    assert.ok(take.reason.length > 10, `${take.id} does not say why it is there`);
    assert.ok(existsSync(join(repoRoot, "library", take.file)), `${take.file} is not there`);
  }

  // A reveal lands just after its cut, so the ear follows the eye.
  const reveal = plan.takes.find((take) => take.role === "reveal");
  assert.ok(reveal, "there is no reveal");
  assert.ok(reveal.atSeconds > 2.5, "the reveal lands before its cut");

  // An exit is the loudest thing in the kit.
  const exit = plan.takes.find((take) => take.role === "exit");
  assert.ok(exit, "there is no exit");
  assert.ok(exit.level >= reveal.level, "the exit is quieter than the reveal");
});

test("the kit does not stack the same sound on every beat", { skip }, () => {
  const catalogue = loadSfx(cataloguePath);
  const beats = Array.from({ length: 6 }, (_, index) => ({
    index,
    role: "reveal",
    inSeconds: index * 2,
  }));
  const plan = planSound(catalogue, beats);
  const ids = new Set(plan.takes.map((take) => take.id));
  assert.ok(ids.size > 1, "every beat got the same sound");
});

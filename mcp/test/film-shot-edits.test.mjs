import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { planFilm, trimShotDuration, writeHostComposition } from "../dist/film.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const blocksPath = join(root, "library", "blocks.json");
const tokensPath = join(root, "plugins", "motion-master", "assets", "motion-tokens.json");
const skip = !existsSync(blocksPath) || !existsSync(tokensPath);
const blocks = skip ? null : JSON.parse(readFileSync(blocksPath, "utf8"));
const tokens = skip ? null : JSON.parse(readFileSync(tokensPath, "utf8"));

function eligible() {
  return blocks.blocks.filter((block) =>
    block.variables.length > 0 &&
    !block.tags.includes("transitions-dev-port") &&
    block.files.some((file) => file.type === "hyperframes:composition" || file.path.endsWith(".html"))
  );
}

test("MM-08: explicit edit preserves selected block order rather than rematching the brief", { skip }, () => {
  const candidates = eligible().slice(0, 2);
  assert.equal(candidates.length, 2);
  const ids = candidates.map((block) => block.id).reverse();
  const plan = planFilm("A brand launch", { blocks, tokens, selectedIds: ids });
  assert.deepEqual(plan.shots.map((shot) => shot.id), ids);
  assert.deepEqual(plan.shots.map((shot) => shot.index), [0, 1]);
  assert.ok(plan.shots.every((shot) => shot.src.endsWith(".html")));
});

test("MM-08: reject missing, duplicate and excluded shot IDs", { skip }, () => {
  const id = eligible()[0].id;
  const options = { blocks, tokens };
  assert.throws(() => planFilm("A brand launch", { ...options, selectedIds: ["nonexistent-shot"] }), /ineligible/);
  assert.throws(() => planFilm("A brand launch", { ...options, selectedIds: [id, id] }), /unique/);
  assert.throws(() => planFilm("A brand launch", { ...options, selectedIds: [id], exclude: [id] }), /ineligible/);
  assert.throws(() => planFilm("A brand launch", { ...options, selectedIds: [] }), /unique/);
});

test("MM-08: trims never extend the installed block or accept invalid durations", () => {
  assert.equal(trimShotDuration(undefined, 4), 4);
  assert.equal(trimShotDuration(2.5, 4), 2.5);
  assert.equal(trimShotDuration(4, 4), 4);
  for (const bad of [0, -1, 4.1, Infinity, NaN]) {
    assert.throws(() => trimShotDuration(bad, 4), /duration/);
  }
});

test("MM-08: reordered and trimmed shot timeline is written into editable HyperFrames source", { skip }, (t) => {
  const ids = eligible().slice(0, 2).map((block) => block.id).reverse();
  const plan = planFilm("A brand launch", { blocks, tokens, selectedIds: ids });
  plan.shots = plan.shots.map((shot, index) => ({
    ...shot, index, duration: index === 0 ? 1 : 2,
  }));
  plan.total = 3;
  const out = mkdtempSync(join(tmpdir(), "mm-shot-edit-"));
  t.after(() => rmSync(out, { recursive: true, force: true }));
  writeHostComposition(plan, out, tokens);
  const html = readFileSync(join(out, "index.html"), "utf8");
  const source = JSON.parse(readFileSync(join(out, "brief.json"), "utf8"));
  assert.ok(html.indexOf(`data-composition-id="${ids[0]}"`) < html.indexOf(`data-composition-id="${ids[1]}"`));
  assert.match(html, /data-start="0"\s+data-duration="1"/);
  assert.match(html, /data-start="1"\s+data-duration="2"/);
  assert.match(html, /data-composition-id="main" data-start="0" data-duration="3"/);
  assert.deepEqual(source.shots.map((shot) => shot.id), ids);
});

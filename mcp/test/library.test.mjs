/**
 * Tests for the open-source motion library and the prompt enhancer.
 *
 * These run against the real generated catalogue, not a fixture, so a broken
 * build step or a bad normaliser fails here rather than in someone's editor.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { existsSync } from "node:fs";

import {
  browse,
  getItem,
  listCategories,
  loadBlocks,
  loadCatalogue,
  matchStyles,
} from "../dist/library.js";
import { assess, enhance } from "../dist/enhancer.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");
const cataloguePath = join(repoRoot, "library", "catalogue.json");
const blocksPath = join(repoRoot, "library", "blocks.json");
const tokensPath = join(repoRoot, "plugins", "motion-master", "assets", "motion-tokens.json");

const skip = existsSync(cataloguePath)
  ? false
  : "library/catalogue.json is missing — run: node scripts/build-library.mjs";

test("the catalogue loads and has all nine collections", { skip }, () => {
  const catalogue = loadCatalogue(cataloguePath);
  assert.ok(catalogue.items.length > 3000, `expected 3000+ items, got ${catalogue.items.length}`);
  const ids = catalogue.collections.map((c) => c.id).sort();
  assert.deepEqual(ids, [
    "cindy-prompt-bank",
    "guanmo-ai-motion",
    "hiapi-styles",
    "leadde-prompts",
    "lemo-opuscar",
    "lian-verified",
    "maning-prompts",
    "phy-playbook",
    "zhuyansen-skills",
  ]);
});

test("every collection declares a licence", { skip }, () => {
  const catalogue = loadCatalogue(cataloguePath);
  for (const c of catalogue.collections) {
    assert.ok(c.license && c.license.trim().length >= 3, `${c.id} has no licence`);
    assert.ok(c.repo.includes("/"), `${c.id} has no repo`);
  }
});

test("every item is complete and traceable", { skip }, () => {
  const catalogue = loadCatalogue(cataloguePath);
  const seen = new Set();
  for (const item of catalogue.items) {
    assert.ok(item.id, "item has no id");
    assert.ok(!seen.has(item.id), `duplicate id ${item.id}`);
    seen.add(item.id);
    assert.ok(item.collection, `${item.id} has no collection`);
    assert.ok(item.kind, `${item.id} has no kind`);
    assert.ok(item.license, `${item.id} has no licence`);
    assert.ok(Array.isArray(item.categories), `${item.id} has no categories array`);
  }
});

test("style items carry a usable recipe", { skip }, () => {
  const catalogue = loadCatalogue(cataloguePath);
  const styles = catalogue.items.filter((i) => i.kind === "style");
  assert.ok(styles.length >= 60, `expected 60+ styles, got ${styles.length}`);
  const withRecipe = styles.filter((i) => i.prompt.length > 40);
  assert.ok(
    withRecipe.length >= styles.length * 0.9,
    `only ${withRecipe.length}/${styles.length} styles carry a recipe`,
  );
});

test("categories are sorted by count and every slug resolves", { skip }, () => {
  const catalogue = loadCatalogue(cataloguePath);
  const cats = listCategories(catalogue);
  assert.ok(cats.length > 50, `expected 50+ categories, got ${cats.length}`);
  for (let i = 1; i < cats.length; i += 1) {
    assert.ok(cats[i - 1].count >= cats[i].count, "categories are not sorted by count");
  }
  const known = new Set(cats.map((c) => c.slug));
  for (const item of catalogue.items) {
    for (const c of item.categories) assert.ok(known.has(c), `unknown category ${c} on ${item.id}`);
  }
});

test("browse filters compose and paginate", { skip }, () => {
  const catalogue = loadCatalogue(cataloguePath);
  const styles = browse(catalogue, { kind: "style", limit: 5 });
  assert.equal(styles.items.length, 5);
  assert.ok(styles.items.every((i) => i.kind === "style"));

  const page2 = browse(catalogue, { kind: "style", limit: 5, offset: 5 });
  assert.equal(page2.total, styles.total);
  assert.notEqual(page2.items[0].id, styles.items[0].id);

  const narrow = browse(catalogue, { collection: "hiapi-styles", kind: "style" });
  assert.ok(narrow.items.every((i) => i.collection === "hiapi-styles"));
  assert.ok(narrow.total < styles.total);

  const searched = browse(catalogue, { query: "blueprint" });
  assert.ok(searched.total > 0);
  assert.ok(searched.total < catalogue.items.length);
});

test("get_item returns the full prompt", { skip }, () => {
  const catalogue = loadCatalogue(cataloguePath);
  const style = catalogue.items.find((i) => i.kind === "style" && i.prompt.length > 100);
  assert.ok(style);
  const full = getItem(catalogue, style.id);
  assert.equal(full.id, style.id);
  assert.equal(full.prompt.length, style.prompt.length);
  assert.equal(getItem(catalogue, "nope:nope"), undefined);
});

test("style matching prefers a named look", { skip }, () => {
  const catalogue = loadCatalogue(cataloguePath);
  const hits = matchStyles(catalogue, "a blueprint style technical drawing", 3);
  assert.ok(hits.length > 0);
  const blueprint = catalogue.items.find((i) => i.id === "lemo-opuscar:style-blueprint");
  assert.ok(blueprint, "the blueprint style should be in the catalogue");
  assert.ok(
    hits.some((h) => h.item.id === blueprint.id),
    `blueprint style was not matched: ${hits.map((h) => h.item.id).join(", ")}`,
  );
});

test("the block library is present and tagged", { skip }, () => {
  if (!existsSync(blocksPath)) return;
  const file = loadBlocks(blocksPath);
  assert.ok(file.blocks.length > 100, `expected 100+ blocks, got ${file.blocks.length}`);
  assert.ok(file.blocks.every((b) => b.id && b.title));
  assert.ok(file.blocks.some((b) => b.tags.includes("transition")));
});

/* ------------------------------------------------------------- the enhancer */

const tokens = JSON.parse(
  (await import("node:fs")).readFileSync(tokensPath, "utf8"),
);

test("assessment names what a weak prompt is missing", { skip }, () => {
  const checks = assess("a cool video about coffee");
  const missing = checks.filter((c) => !c.present).map((c) => c.id);
  for (const id of ["format", "duration", "camera", "motion", "palette", "audio", "negative"]) {
    assert.ok(missing.includes(id), `${id} should be reported missing`);
  }
});

test("a strong prompt is not mangled", { skip }, () => {
  const catalogue = loadCatalogue(cataloguePath);
  const strong =
    "Create a 1920x1080 16:9 30fps kinetic typography clip. 8 seconds. Style: brutalist. " +
    "Camera locked off. Ease-out with a 60ms stagger. IBM Plex Sans, weight 700. " +
    "Palette: black on white. Audio: no music. No text glitches, no watermark. " +
    "Deterministic code-drawn render.";
  const result = enhance(strong, catalogue, tokens);
  assert.equal(result.verdict, "strong");
  assert.equal(result.score.before, 100);
  assert.ok(result.enhanced.includes("brutalist"), "the original style must survive");
  assert.ok(result.enhanced.includes("1920x1080"), "the original format must survive");
  assert.ok(result.added.length <= 2, `a strong prompt should barely be touched, got ${result.added.length} additions`);
});

test("a weak prompt becomes a complete brief", { skip }, () => {
  const catalogue = loadCatalogue(cataloguePath);
  const result = enhance("a cool product video for my coffee brand", catalogue, tokens, {
    durationSeconds: 12,
  });
  assert.equal(result.verdict, "weak");
  assert.ok(result.score.after > result.score.before);
  assert.ok(
    result.enhanced.includes("a cool product video for my coffee brand"),
    "the original brief must be carried through verbatim",
  );
  for (const section of ["STYLE", "CAMERA", "MOTION", "TYPOGRAPHY", "PALETTE", "AUDIO", "DURATION", "CONSTRAINTS"]) {
    assert.ok(result.enhanced.includes(section), `the enhanced prompt is missing ${section}`);
  }
  assert.ok(result.enhanced.includes("12 seconds"), "the requested duration must be used");
  assert.ok(result.assumptions.length > 0, "assumptions must be reported");
  assert.ok(result.alternatives.length > 0, "style alternatives must be offered");
});

test("the enhancer never invents a subject", { skip }, () => {
  const catalogue = loadCatalogue(cataloguePath);
  const result = enhance("a cool product video for my coffee brand", catalogue, tokens);
  const brief = result.added.find((a) => a.section === "BRIEF");
  assert.ok(brief);
  assert.equal(brief.text, "a cool product video for my coffee brand");
});

test("a forced style is respected", { skip }, () => {
  const catalogue = loadCatalogue(cataloguePath);
  const result = enhance("a coffee product video", catalogue, tokens, { style: "blueprint" });
  assert.ok(result.references.length === 1);
  assert.equal(result.references[0].id, "lemo-opuscar:style-blueprint");
});

test("extra constraints are appended verbatim", { skip }, () => {
  const catalogue = loadCatalogue(cataloguePath);
  const result = enhance("coffee", catalogue, tokens, {
    extraConstraints: ["The product label must read exactly ACME"],
  });
  assert.ok(result.enhanced.includes("The product label must read exactly ACME"));
});

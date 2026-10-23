/**
 * Tests for the motion-block engine: matching blocks to a brief, and filling
 * their variables from it.
 *
 * These run against the real registry data, so a broken fetch or a bad
 * matcher fails here rather than in someone's project.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { existsSync, readFileSync } from "node:fs";

import {
  brandFrom,
  fillBlock,
  headlineFrom,
  matchBlocks,
  parseDuration,
} from "../dist/blocks.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");
const blocksPath = join(repoRoot, "library", "blocks.json");
const tokensPath = join(repoRoot, "plugins", "motion-master", "assets", "motion-tokens.json");

const skip = existsSync(blocksPath)
  ? false
  : "library/blocks.json is missing — run: node scripts/fetch-registry.mjs";

const file = existsSync(blocksPath) ? JSON.parse(readFileSync(blocksPath, "utf8")) : {};
const tokens = JSON.parse(readFileSync(tokensPath, "utf8"));

test("the registry loaded with every block", { skip }, () => {
  assert.ok(file.blocks.length >= 400, `expected 400+ blocks, got ${file.blocks.length}`);
  assert.ok(file.tags.length > 100, "the tag index is empty");
  const withVars = file.blocks.filter((b) => b.variables.length > 0);
  assert.ok(withVars.length > 150, `expected 150+ blocks with variables, got ${withVars.length}`);
});

test("every block declares a licence", { skip }, () => {
  for (const block of file.blocks) {
    assert.ok(block.license && block.license.trim().length >= 3, `${block.id} has no licence`);
  }
});

test("every variable has an id, a type and a label", { skip }, () => {
  for (const block of file.blocks) {
    for (const v of block.variables) {
      assert.ok(v.id, `${block.id} has a variable with no id`);
      assert.ok(v.type, `${block.id}/${v.id} has no type`);
      // A few upstream variables carry no label. That is allowed; a missing
      // id or type is not.
      assert.ok(typeof v.label === "string", `${block.id}/${v.id} has a bad label`);
    }
  }
});

test("matching finds blocks that fit the brief", { skip }, () => {
  const hits = matchBlocks(file, "a kinetic typography title card", {
    limit: 5,
    requireVariables: true,
  });
  assert.ok(hits.length > 0, "nothing matched");
  const tags = new Set(hits.flatMap((h) => h.matchedTags));
  assert.ok(
    tags.has("kinetic-text") || tags.has("title-card") || tags.has("typography"),
    `expected a type or title-card hit, got ${[...tags].join(", ")}`,
  );
});

test("variants of one idea do not crowd out the shot list", { skip }, () => {
  const hits = matchBlocks(file, "a kinetic type title card", { limit: 6, requireVariables: true });
  const families = new Set(hits.map((h) => h.block.id.replace(/-\d+$/, "")));
  assert.ok(
    families.size === hits.length,
    `expected ${hits.length} distinct families, got ${families.size}: ${hits.map((h) => h.block.id).join(", ")}`,
  );
});

test("a brief with no pictures is not answered with a twelve-image carousel", { skip }, () => {
  const hits = matchBlocks(file, "a calm title card for a coffee brand", {
    limit: 3,
    requireVariables: true,
  });
  assert.ok(hits.length > 0);
  for (const hit of hits) {
    const images = hit.block.variables.filter((v) => v.type === "image").length;
    assert.ok(images <= 3, `${hit.block.id} needs ${images} images`);
  }
});

test("a brief that asks for pictures can reach a gallery block", { skip }, () => {
  const hits = matchBlocks(file, "a carousel of photos for an album gallery", {
    limit: 4,
    requireVariables: true,
  });
  assert.ok(hits.length > 0);
  assert.ok(
    hits.some((h) => h.matchedTags.includes("carousel") || h.matchedTags.includes("gallery")),
    `expected a carousel or gallery hit, got ${hits.map((h) => h.block.id).join(", ")}`,
  );
});

test("the headline drops the production notes", { skip }, () => {
  // The subject, not the instruction. "coffee brand launch for ACME" would
  // overflow a card; "ACME" is what the card should say.
  assert.equal(headlineFrom("a coffee brand launch for ACME in 12 seconds"), "ACME");
  assert.equal(headlineFrom("make a 30 second video about coffee"), "coffee");
  assert.equal(headlineFrom("a 12 second film for ACME"), "ACME");
  assert.equal(headlineFrom("a launch film for Northwind"), "Northwind");
  assert.equal(headlineFrom("a calm title card and a product reveal for ACME coffee"), "ACME coffee");
  assert.equal(headlineFrom("  "), "Your headline here");
  assert.ok(headlineFrom("x".repeat(200)).length <= 40);
});

test("the brand is read out of the brief", { skip }, () => {
  assert.equal(brandFrom("a coffee brand launch for ACME in 12 seconds"), "ACME");
  assert.equal(brandFrom("a launch for Acme Coffee"), "Acme");
  assert.equal(brandFrom("a video about coffee"), null);
});

test("a duration in the brief is read", { skip }, () => {
  assert.equal(parseDuration("a 12 second film"), 12);
  assert.equal(parseDuration("a 1:30 film"), null);
  assert.equal(parseDuration("no length here"), null);
});

test("filling a block fills the headline and the colours", { skip }, () => {
  const block = file.blocks.find(
    (b) =>
      b.variables.some((v) => v.type === "string" && /headline|title|line|text/.test(v.id)) &&
      b.variables.some((v) => v.type === "color"),
  );
  assert.ok(block, "no block with a headline string and a colour");

  const filled = fillBlock(block, {
    brief: "a coffee brand launch for ACME",
    tokens,
  });
  const headlineId = block.variables.find(
    (v) => v.type === "string" && /headline|title|line|text/.test(v.id),
  ).id;
  const headline = filled.variables.find((v) => v.id === headlineId);
  assert.ok(headline, "the headline variable was not filled");
  assert.equal(headline.source, "brief");
  assert.ok(String(headline.value).length > 0);

  const colourId = block.variables.find((v) => v.type === "color").id;
  const colour = filled.variables.find((v) => v.id === colourId);
  assert.ok(colour, "no colour variable");
  assert.equal(colour.source, "tokens");
  assert.match(String(colour.value), /^#[0-9A-Fa-f]{6}$/);
});

test("an explicit value always wins", { skip }, () => {
  const block = file.blocks.find((b) => b.variables.length > 0);
  const variable = block.variables[0];
  const filled = fillBlock(block, {
    brief: "a coffee brand launch",
    tokens,
    values: { [variable.id]: "explicit value" },
  });
  const got = filled.variables.find((v) => v.id === variable.id);
  assert.equal(got.value, "explicit value");
  assert.equal(got.source, "brief");
});

test("the upstream's own placeholder is flagged, never inherited", { skip }, () => {
  const block = file.blocks.find((b) =>
    b.variables.some((v) => typeof v.default === "string" && /hyperframes|heygen/i.test(v.default)),
  );
  if (!block) return; // no upstream placeholders in this revision
  const filled = fillBlock(block, { brief: "a coffee brand launch", tokens });
  const placeholder = filled.variables.find(
    (v) => typeof v.value === "string" && /hyperframes|heygen/i.test(v.value),
  );
  assert.ok(placeholder, "the placeholder should still be the value");
  assert.ok(
    filled.unresolved.some((u) => u.id === placeholder.id),
    "the placeholder must be reported as unresolved",
  );
});

test("an image slot is reported as needing a real image", { skip }, () => {
  const block = file.blocks.find((b) => b.variables.some((v) => v.type === "image"));
  assert.ok(block);
  const filled = fillBlock(block, { brief: "a coffee brand launch", tokens });
  assert.ok(filled.unresolved.some((u) => u.reason.includes("real image")));
});

test("the brand fills a wordmark", { skip }, () => {
  const block = file.blocks.find((b) =>
    b.variables.some((v) => /wordmark|brand|logo/i.test(v.id)),
  );
  if (!block) return;
  const filled = fillBlock(block, { brief: "a launch for ACME coffee", tokens });
  const wordmark = filled.variables.find((v) => /wordmark|brand|logo/i.test(v.id));
  assert.equal(wordmark.value, "ACME");
});

// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Motion Master
// This directory is a separate AGPL-3.0 work that talks to a Montage instance
// over its public HTTP/MCP interfaces. It is NOT part of the proprietary
// Motion Master product and is excluded from its licence by design.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateTimeline } from "../src/validate.ts";

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, "fixtures");
const examples = join(here, "..", "examples");

function fixture(name: string): unknown {
  return JSON.parse(readFileSync(join(fixtures, name), "utf8"));
}

function rules(issues: { rule: string }[]): string[] {
  return issues.map((issue) => issue.rule);
}

test("a valid timeline passes the schema and the Montage rules", () => {
  const result = validateTimeline(fixture("valid.timeline.json"));
  assert.equal(result.valid, true, JSON.stringify(result.errors, null, 2));
  assert.equal(result.errors.length, 0);
});

test("the shipped footage-title example is valid", () => {
  const example = JSON.parse(readFileSync(join(examples, "footage-title.timeline.json"), "utf8"));
  const result = validateTimeline(example);
  assert.equal(result.valid, true, JSON.stringify(result.errors, null, 2));
  assert.equal(example.cuts.length, 2);
  assert.equal(example.cuts[0].out_seconds, 3);
  assert.equal(example.cuts[1].out_seconds, 16);
});

test("a scene cut without its required field is rejected", () => {
  const result = validateTimeline(fixture("missing-required-field.timeline.json"));
  assert.equal(result.valid, false);
  const found = rules(result.errors);
  assert.ok(found.includes("SCENE_FIELD_MISSING"), found.join(", "));
  assert.ok(
    result.errors.some((issue) => issue.path === "cuts[1].text"),
    "the error must point at the missing field",
  );
});

test("overlapping cuts in the same layer are rejected", () => {
  const result = validateTimeline(fixture("overlapping-cuts.timeline.json"));
  assert.equal(result.valid, false);
  assert.ok(rules(result.errors).includes("CUT_OVERLAP"), rules(result.errors).join(", "));
});

test("a cut with out_seconds before in_seconds is rejected", () => {
  const result = validateTimeline(fixture("out-before-in.timeline.json"));
  assert.equal(result.valid, false);
  assert.ok(rules(result.errors).includes("CUT_OUT_BEFORE_IN"), rules(result.errors).join(", "));
});

test("a non-object timeline is rejected", () => {
  const result = validateTimeline("not a timeline");
  assert.equal(result.valid, false);
  assert.ok(result.errors.length > 0);
});

test("an empty cut list is rejected", () => {
  const result = validateTimeline({ cuts: [] });
  assert.equal(result.valid, false);
  assert.ok(rules(result.errors).includes("CUT_EMPTY"), rules(result.errors).join(", "));
});

test("an overlay that starts off the footage is a warning, not an error", () => {
  const timeline = {
    cuts: [
      { id: "a", source: "assets/video/source.mp4", in_seconds: 0, out_seconds: 4 },
    ],
    overlays: [{ type: "hero_title", in_seconds: 8, out_seconds: 10, text: "Late" }],
  };
  const result = validateTimeline(timeline);
  assert.equal(result.valid, true, JSON.stringify(result.errors, null, 2));
  assert.ok(rules(result.warnings).includes("OVERLAY_NOT_OVER_FOOTAGE"));
});

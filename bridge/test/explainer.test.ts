// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Motion Master
// This directory is a separate AGPL-3.0 work that talks to a Montage instance
// over its public HTTP/MCP interfaces. It is NOT part of the proprietary
// Motion Master product and is excluded from its licence by design.

import { test } from "node:test";
import assert from "node:assert/strict";
import { buildExplainerTimeline } from "../src/explainer.ts";
import { loadTokens } from "../src/tokens.ts";
import { validateTimeline } from "../src/validate.ts";

test("a brief becomes a footage cut plus motion-graphics overlays", () => {
  const timeline = buildExplainerTimeline({
    source: "assets/video/source.mp4",
    durationSeconds: 16,
    openingSeconds: 3,
    title: "MOTION MASTER",
    subtitle: "Your footage, in motion",
    sectionTitle: "SOURCE FOOTAGE",
  });

  assert.equal(timeline.cuts.length, 2);
  assert.equal(timeline.cuts[0].in_seconds, 0);
  assert.equal(timeline.cuts[0].out_seconds, 3);
  assert.equal(timeline.cuts[0].source_in_seconds, 0);
  assert.equal(timeline.cuts[1].in_seconds, 3);
  assert.equal(timeline.cuts[1].out_seconds, 16);
  assert.equal(timeline.cuts[1].source_in_seconds, 3);

  const hero = timeline.overlays?.find((overlay) => overlay.type === "hero_title");
  assert.ok(hero);
  assert.equal(hero.in_seconds, 3);
  assert.equal(hero.out_seconds, 14);
  assert.equal(hero.text, "MOTION MASTER");

  const section = timeline.overlays?.find((overlay) => overlay.type === "section_title");
  assert.ok(section);
  assert.equal(section.text, "SOURCE FOOTAGE");
  assert.equal(section.position, "top-left");
  assert.equal(section.accentColor, "#FF4A1C");
});

test("the built timeline passes validation", () => {
  const timeline = buildExplainerTimeline({
    source: "assets/video/source.mp4",
    durationSeconds: 16,
    title: "MOTION MASTER",
    sectionTitle: "SOURCE FOOTAGE",
  });
  const result = validateTimeline(timeline);
  assert.equal(result.valid, true, JSON.stringify(result.errors, null, 2));
});

test("a brief without footage is refused", () => {
  assert.throws(
    () => buildExplainerTimeline({ source: "", durationSeconds: 16, title: "x" }),
    /real footage/,
  );
  assert.throws(
    () => buildExplainerTimeline({ source: "a.mp4", durationSeconds: 0, title: "x" }),
    /durationSeconds/,
  );
});

test("the theme override comes from the Motion Master tokens", async () => {
  const loaded = await loadTokens();
  const timeline = buildExplainerTimeline(
    { source: "assets/video/source.mp4", durationSeconds: 8, title: "Tokens" },
    { tokens: loaded.tokens },
  );
  assert.equal(timeline.themeConfig?.accentColor, loaded.tokens.palette.accent);
  assert.equal(timeline.themeConfig?.backgroundColor, loaded.tokens.palette.canvas);
  assert.equal(timeline.themeConfig?.headingFont, loaded.tokens.type.displayFont);
});

/**
 * Regression for MM-02: a valid storyboard must emit animation selectors that
 * actually match generated nodes. A passing TypeScript build does not prove this.
 * Pixel-level and MP4 tests remain required before a release.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { planVideo } from "../dist/planner.js";
import { buildHyperFramesProject } from "../dist/hyperframes-composer.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const tokens = JSON.parse(readFileSync(join(repoRoot, "plugins/motion-master/assets/motion-tokens.json"), "utf8"));

test("HyperFrames generated GSAP targets real beat nodes and makes them visible", () => {
  const storyboard = planVideo({
    brief: "Make a 15 second launch title for ACME",
    durationSeconds: 15, fps: 30, width: 1920, height: 1080,
  }, tokens);
  const result = buildHyperFramesProject(storyboard, tokens, { projectName: "selector-proof" });
  const html = result.files.find((file) => file.path.endsWith("/index.html"))?.contents;
  assert.ok(html, "the generator must provide a full HTML composition");
  assert.equal(result.composition.durationInFrames, 450);
  assert.equal(result.composition.width, 1920);
  assert.equal(result.composition.height, 1080);
  for (const [i, beat] of storyboard.beats.entries()) {
    const track = `.beat[data-track-index="${i}"]`;
    const label = `${track} .beat__label`;
    assert.ok(html.includes(`data-track-index="${i}"`), `beat ${i} has no generated nodes`);
    assert.ok(html.includes(`tl.set(${JSON.stringify(track)}, { opacity: 1 }`), `beat ${i} is never made visible`);
    assert.ok(html.includes(`tl.fromTo(${JSON.stringify(label)},`), `beat ${i} animation does not target a matching label`);
    if (beat.outSeconds < storyboard.duration.seconds) {
      assert.ok(html.includes(`tl.set(${JSON.stringify(track)}, { opacity: 0 }`), `beat ${i} is never hidden`);
    }
    assert.equal(html.includes(`#b${i} .beat__label`), false, `obsolete broken selector in beat ${i}`);
  }
});

test("every timeline selector uses a beat track that exists in markup", () => {
  const storyboard = planVideo({ brief: "Show a kinetic typography announcement", elementCount: 5 }, tokens);
  const result = buildHyperFramesProject(storyboard, tokens);
  const html = result.files.find((file) => file.path.endsWith("/index.html")).contents;
  const selectors = [...html.matchAll(/tl\\.(?:set|fromTo|to)\\(("(?:\\\\.|[^"\\\\])*")/g)]
    .map((match) => JSON.parse(match[1]));
  assert.ok(selectors.length >= storyboard.beats.length * 2);
  for (const selector of selectors) {
    const match = selector.match(/^\\.beat\\[data-track-index="(\\d+)"\\](?: \\.beat__label)?$/);
    assert.ok(match, `unexpected timeline selector: ${selector}`);
    const number = Number(match[1]);
    assert.ok(number >= 0 && number < storyboard.beats.length);
    assert.ok(html.includes(`data-track-index="${number}"`), `selector ${selector} matches no generated markup`);
  }
});

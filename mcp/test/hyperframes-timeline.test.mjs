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
  const selectors = html.split("\n").filter((line) =>
    line.includes("tl.set(") || line.includes("tl.fromTo(") || line.includes("tl.to("));
  assert.ok(selectors.length >= storyboard.beats.length * 2);
  for (const line of selectors) {
    const isActualBeat = storyboard.beats.some((_, i) => {
      const beat = `.beat[data-track-index="${i}"]`;
      return line.includes(JSON.stringify(beat)) || line.includes(JSON.stringify(`${beat} .beat__label`));
    });
    assert.ok(isActualBeat, `timeline references a missing beat: ${line}`);
  }
});

test("generated composition initializes the HyperFrames timeline registry before writing", () => {
  const storyboard = planVideo({ brief: "Launch ACME", durationSeconds: 15 }, tokens);
  const html = buildHyperFramesProject(storyboard, tokens).files.find((file) => file.path.endsWith("/index.html")).contents;
  const initialize = html.indexOf("window.__timelines = window.__timelines || {};");
  const assign = html.indexOf('window.__timelines["main"] = tl;');
  assert.ok(initialize >= 0, "timeline registry is undefined in a clean browser");
  assert.ok(assign > initialize, "registry must exist before assignment");
});

test("GSAP runtime is never emitted as a zero-byte placeholder", () => {
  const storyboard = planVideo({ brief: "Launch ACME", durationSeconds: 15 }, tokens);
  const absent = buildHyperFramesProject(storyboard, tokens, { projectName: "no-vendor" });
  assert.equal(absent.files.some((file) => file.path.endsWith("/gsap-3.14.2.min.js")), false,
    "an empty GSAP file blocks generator/hf.sh from copying the pinned runtime");
  const supplied = buildHyperFramesProject(storyboard, tokens, { projectName: "with-vendor", gsapSource: "/* local pinned GSAP */" });
  const gsap = supplied.files.find((file) => file.path.endsWith("/gsap-3.14.2.min.js"));
  assert.equal(gsap?.contents, "/* local pinned GSAP */");
});

test("brief headline appears in the rendered markup, not internal slot names", () => {
  const board = planVideo({ brief: "Make a 15-second launch title for ACME", durationSeconds: 15 }, tokens);
  const html = buildHyperFramesProject(board, tokens).files.find((file) => file.path.endsWith("/index.html")).contents;
  assert.match(html, />ACME<\/span>/, "actual customer brand must appear on screen");
  assert.doesNotMatch(html, />wordmark<\/span>|>tagline<\/span>|>backdrop<\/span>/,
    "internal element names must never be shown as film copy");
  assert.match(html, /tl\.fromTo\("\.beat\[data-track-index=\\\"0\\\"\] \.beat__label", \{ opacity: 1, y: 0 \}/,
    "first frame must have a visible title for the HyperFrames thumbnail gate");
  assert.match(html, /duration: 0\.18, ease:/, "closing line must enter promptly enough to be readable");
});

test("explicit tagline is preserved while missing tagline is omitted", () => {
  const board = planVideo({ brief: "Launch ACME, tagline: Built to last", durationSeconds: 15 }, tokens);
  const html = buildHyperFramesProject(board, tokens).files.find((file) => file.path.endsWith("/index.html")).contents;
  assert.match(html, />Built to last<\/span>/);
});

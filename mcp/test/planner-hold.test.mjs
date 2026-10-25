import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { planVideo } from "../dist/planner.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const tokens = JSON.parse(readFileSync(join(repoRoot, "plugins/motion-master/assets/motion-tokens.json"), "utf8"));

test("default launch-title hold uses seconds, not 1000x milliseconds", () => {
  const board = planVideo({ brief: "Make a 15-second launch title for ACME", durationSeconds: 15 }, tokens);
  const hold = board.beats.find((beat) => beat.role === "hold");
  assert.ok(hold, "launch template must include a readable hold");
  assert.equal(hold.holdMs, 2000, "default hold should reserve exactly 2 seconds");
  assert.ok(hold.durationSeconds < 3, "hold must not consume the entire film");
  assert.ok(board.beats.filter((beat) => beat.role !== "hold").every((beat) => beat.durationSeconds >= 1),
    "other shots should have meaningful duration in a 15s film");
  assert.equal(board.duration.frames, 450);
  assert.equal(board.beats.at(-1).outSeconds, 15);
});

test("explicit holdSeconds and brief hold remain in seconds", () => {
  for (const options of [
    { brief: "15s launch title, hold 3 seconds" },
    { brief: "Launch title", durationSeconds: 15, holdSeconds: 3 },
  ]) {
    const board = planVideo(options, tokens);
    const hold = board.beats.find((beat) => beat.role === "hold");
    assert.equal(hold.holdMs, 3000);
    assert.ok(hold.durationSeconds < 4);
  }
});

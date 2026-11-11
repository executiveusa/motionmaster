/**
 * The vox engine.
 *
 * These are the pieces that fail quietly: the stepped clock, the projection,
 * the world data, and the script's own timings. A caption that drifts out of
 * its beat looks fine in one still and wrong in motion, so the timings are
 * checked here rather than by eye.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { boil, stutterFrame, stutterProgress, stutterStep } from "../src/vox/stutter.ts";
import { COUNTRIES, WORLD } from "../src/vox/world.ts";
import { cameraAt, countryPath, project, WORLD_CAMERA } from "../src/vox/geo.ts";
import { groupIntoLines, wordsFor } from "../src/vox/WordCaptions.tsx";
import { BEATS, CAPTION_LINES, CUES, ROUTE } from "../src/vox/script.ts";

/* ------------------------------------------------------------- the clock */

test("the step is derived from the frame rate", () => {
  assert.equal(stutterStep(24, 12), 2);
  assert.equal(stutterStep(30, 12), 3);
  assert.equal(stutterStep(60, 12), 5);
  assert.equal(stutterStep(12, 12), 1);
});

test("the stepped frame holds for the whole step", () => {
  for (const fps of [24, 30, 60]) {
    const step = stutterStep(fps, 12);
    for (let frame = 0; frame < 120; frame++) {
      const stepped = stutterFrame(frame, fps, 12);
      assert.equal(stepped % step, 0, `frame ${frame} at ${fps}fps is off the step`);
      assert.ok(stepped <= frame, "the stepped frame moved backwards");
      assert.ok(frame - stepped < step, "the value was held for too long");
    }
  }
});

test("the stepped clock is monotonic", () => {
  let previous = -1;
  for (let frame = 0; frame < 200; frame++) {
    const stepped = stutterFrame(frame, 24, 12);
    assert.ok(stepped >= previous, "the stepped clock went backwards");
    previous = stepped;
  }
});

test("progress computed on the stepped clock lands on steps", () => {
  const values = new Set();
  for (let frame = 0; frame < 60; frame++) {
    values.add(stutterProgress(frame, 24, 0, 48, 12));
  }
  assert.ok(values.size <= 25, `too many distinct values: ${values.size}`);
});

test("the boil is a slow lean and a slow breath", () => {
  const a = boil(0.5, { sway: 0.5, pulse: 0.004 });
  const b = boil(0.5, { sway: 0.5, pulse: 0.004 });
  assert.equal(a.rotation, b.rotation, "the boil is not deterministic");
  assert.ok(Math.abs(a.rotation) <= 0.5, "the sway is bigger than it should be");
  assert.ok(Math.abs(a.scale - 1) <= 0.004, "the pulse is bigger than it should be");
  // It never stops: the value at two different moments is not the same.
  assert.notEqual(boil(0.5).rotation, boil(3.0).rotation);
});

/* ------------------------------------------------------------- the world */

test("the world has its boundaries", () => {
  assert.ok(COUNTRIES.length > 150, `expected the world, got ${COUNTRIES.length}`);
  assert.equal(WORLD.countries.length, COUNTRIES.length);
});

test("every country is a usable outline", () => {
  for (const country of COUNTRIES) {
    assert.ok(country.n.length > 0, "a country has no name");
    assert.ok(country.p.length > 0, `${country.n} has no outline`);
    for (const ring of country.p) {
      assert.ok(ring.length >= 4, `${country.n} has a degenerate ring`);
      for (const point of ring) {
        assert.equal(point.length, 2, `${country.n} has a malformed point`);
        assert.ok(point[0] >= -180 && point[0] <= 180, `${country.n} has a bad longitude`);
        assert.ok(point[1] >= -90 && point[1] <= 90, `${country.n} has a bad latitude`);
      }
    }
  }
});

test("Antarctica is not in the map", () => {
  assert.equal(
    COUNTRIES.find((c) => c.n === "Antarctica"),
    undefined,
    "Antarctica stretches across the bottom of a Mercator frame",
  );
});

test("the projection puts a known place in the right place", () => {
  // The equator runs through the middle of the frame.
  const equator = project({ lat: 0, lng: 0 });
  assert.ok(Math.abs(equator.x - 960) < 1, "the centre meridian is off");
  assert.ok(Math.abs(equator.y - 540) < 1, "the equator is off");
  // North is up: a higher latitude is a smaller y.
  const north = project({ lat: 40, lng: 0 });
  assert.ok(north.y < equator.y, "north is not up");
});

test("a country draws a path", () => {
  const d = countryPath(COUNTRIES.find((c) => c.n === "Portugal") ?? COUNTRIES[0]);
  assert.ok(d.startsWith("M"), "the path does not start with a move");
  assert.ok(d.includes("Z"), "the path is not closed");
});

test("the camera can look at a place", () => {
  const camera = cameraAt({ lat: 38.72, lng: -9.14 }, 3);
  assert.equal(camera.scale, 3);
  const p = project({ lat: 38.72, lng: -9.14 });
  assert.ok(Math.abs(camera.x - p.x) < 0.001);
  assert.equal(WORLD_CAMERA.scale, 1);
});

/* ----------------------------------------------------------- the captions */

test("a phrase becomes words that fill its own length", () => {
  const words = wordsFor("THE FILE IS YOURS.", 2, 3);
  assert.equal(words.length, 4);
  assert.equal(words[0].start, 2);
  assert.ok(Math.abs(words[3].end - 5) < 0.001, "the words do not fill the phrase");
  for (let i = 1; i < words.length; i++) {
    assert.ok(words[i].start >= words[i - 1].start, "the words go backwards");
  }
});

test("lines break on sentence punctuation", () => {
  const words = wordsFor("ONE. TWO. THREE", 0, 6);
  const lines = groupIntoLines(words);
  // Two sentences and a trailing fragment: three lines, because a caption
  // line that runs on past a full stop is a paragraph.
  assert.equal(lines.length, 3, "the lines did not break on the full stops");
  assert.equal(lines[0].words[0].text, "ONE.");
});

test("an empty phrase makes no words", () => {
  assert.equal(wordsFor("   ", 0, 2).length, 0);
});

/* ------------------------------------------------------------ the script */

test("the script is five beats, in order, with no overlap", () => {
  assert.ok(BEATS.length >= 4, "the script is too short to be a film");
  for (let i = 1; i < BEATS.length; i++) {
    const previous = BEATS[i - 1];
    const beat = BEATS[i];
    assert.ok(
      beat.from > previous.from,
      `beat ${i} starts before the beat before it`,
    );
  }
});

test("every caption word sits inside its own beat", () => {
  CAPTION_LINES.forEach((line, i) => {
    const beat = BEATS[i];
    const first = line.words[0];
    const last = line.words[line.words.length - 1];
    assert.ok(first, `beat ${i} has no words`);
    assert.ok(Math.abs(first.start - beat.from) < 0.001, `beat ${i} starts late`);
    assert.ok(
      last.end <= beat.from + beat.seconds + 0.001,
      `beat ${i} runs past its own length`,
    );
  });
});

test("the caption text and the headline are different sentences", () => {
  for (const beat of BEATS) {
    if (!beat.headline) continue;
    assert.notEqual(
      beat.headline.replace(/[.,]/g, "").toLowerCase(),
      beat.text.replace(/[.,]/g, "").toLowerCase(),
      `"${beat.headline}" repeats its own caption`,
    );
  }
});

test("the script has no count-of-three headline", () => {
  // The house rule: a headline that counts three things in a row is the
  // generator's tic. The script is checked, not trusted.
  for (const beat of BEATS) {
    const text = `${beat.headline ?? ""} ${beat.text}`;
    const tricolon = /\b(one|two|three|four|five)\b[^\n]*\b(one|two|three|four|five)\b[^\n]*\b(one|two|three|four|five)\b/i;
    assert.ok(!tricolon.test(text), `"${text}" counts three things`);
  }
});

test("every cue lands on a file that exists", () => {
  assert.ok(CUES.length >= 4, "the film has no sound");
  for (const cue of CUES) {
    assert.ok(cue.file.startsWith("sfx/"), `the cue ${cue.file} is not a sound`);
    assert.ok(cue.at >= 0, "a cue lands before the film starts");
  }
});

test("the route is three real places, in order", () => {
  assert.equal(ROUTE.length, 3);
  for (const point of ROUTE) {
    assert.ok(point.at.lat >= -90 && point.at.lat <= 90, "a latitude is out of range");
    assert.ok(point.at.lng >= -180 && point.at.lng <= 180, "a longitude is out of range");
    assert.ok(point.label.length > 0, "a place has no name");
  }
});

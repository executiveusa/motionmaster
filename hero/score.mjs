#!/usr/bin/env node
/**
 * Score the hero film.
 *
 *   node hero/score.mjs [--kit hero/sound-kit.json] [--video <mp4>] [--out <mp4>]
 *
 * The kit is the score: a list of cues, each with a time, a sound from the
 * shelf, a level and a reason. This script places them, mixes them under the
 * bed, normalises to a target loudness and muxes the result onto the picture.
 *
 * Every sound is checked against the shelf before it is used. A cue that names
 * a sound we do not have is a failure, not a silent hole.
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = dirname(here);
const args = process.argv.slice(2);
const argOf = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};

const KIT = resolve(argOf('kit', join(here, 'sound-kit.json')));
const VIDEO = resolve(argOf('video', join(here, 'motion-master-hero-short.mp4')));
const OUT = resolve(argOf('out', join(here, 'motion-master-hero-short.mp4')));
const SFX = join(repo, 'library');

const kit = JSON.parse(readFileSync(KIT, 'utf8'));

// ── the shelf: every cue must name a sound we actually have ──────────────────
const shelf = JSON.parse(readFileSync(join(SFX, 'sfx.json'), 'utf8'));
const byId = new Map(shelf.entries.map((s) => [s.id, s]));

const problems = [];
const resolveSound = (c) => {
  const s = byId.get(c.id);
  if (!s) {
    problems.push(`cue at ${c.at}s names "${c.id}", which is not in the shelf`);
    return null;
  }
  const path = join(SFX, s.file);
  if (!existsSync(path)) {
    problems.push(`cue at ${c.at}s names "${c.id}", whose file is missing: ${s.file}`);
    return null;
  }
  return path;
};

const cues = kit.cues.map((c) => ({ ...c, path: resolveSound(c) })).filter((c) => c.path);
const bed = kit.bed ? { ...kit.bed, path: resolveSound(kit.bed) } : null;
if (kit.bed && !bed) problems.push('the bed names a sound we do not have');

if (!existsSync(VIDEO)) {
  console.error(`No video at ${VIDEO}`);
  process.exit(1);
}
if (problems.length) {
  console.error('The kit does not match the shelf:\n  ' + problems.join('\n  '));
  process.exit(1);
}

// ── build the mix ────────────────────────────────────────────────────────────
// The picture is input 0; every sound follows it, so the filter graph and the
// input indices can never drift apart.
const inputs = ['-i', VIDEO];
const filters = [];
let idx = 1;   // the input number of the next sound
let n = 0;     // the label number of the next cue

for (const c of cues) {
  inputs.push('-i', c.path);
  const ms = Math.round(c.at * 1000);
  filters.push(
    `[${idx}:a]aformat=channel_layouts=stereo,adelay=${ms}:all=1,volume=${c.gainDb}dB[c${n}]`,
  );
  idx++;
  n++;
}

// The bed: one file, looped across the whole film, filtered down so it never
// competes with the hits, and faded out before the end card.
//
// A single loop of a ten-second whoosh would pulse once every ten seconds,
// and anyone listening would hear the seam. So the bed is four layers of the
// same file, each looping from a different point and running at a slightly
// different tempo. The sum has no period at all, so it never repeats.
const BED_LAYERS = [
  { start: 0, tempo: 0.965 },
  { start: 96000, tempo: 0.988 },
  { start: 204000, tempo: 1.014 },
  { start: 312000, tempo: 1.041 },
];
const bedLabels = [];
if (bed) {
  const bedGain = bed.gainDb - 6; // four layers at -6 dB each make one bed
  BED_LAYERS.forEach((layer, i) => {
    inputs.push('-i', bed.path);
    filters.push(
      `[${idx}:a]aformat=channel_layouts=stereo,` +
        `aloop=loop=-1:size=480000:start=${layer.start},` +
        `atempo=${layer.tempo},` +
        `lowpass=f=${bed.lowpassHz},volume=${bedGain}dB,` +
        `atrim=0:${kit.duration},asetpts=N/SR/TB,` +
        `afade=t=in:st=0:d=2.5,afade=t=out:st=${(kit.duration - 6).toFixed(2)}:d=5[bed${i}]`,
    );
    bedLabels.push(`[bed${i}]`);
    idx++;
  });
}

const mixLabels = cues.map((_, i) => `[c${i}]`);
mixLabels.push(...bedLabels);
filters.push(`${mixLabels.join('')}amix=inputs=${mixLabels.length}:normalize=0:dropout_transition=0[mixed]`);
// The mix is padded to the length of the picture and the whole thing is
// written out once, so the loudness can be measured and then corrected
// exactly, instead of being guessed at in one pass.
filters.push(`[mixed]apad,atrim=0:${kit.duration},asetpts=N/SR/TB[mixout]`);

const TMP = join(here, '.score-mix.wav');
const mixArgs = [
  '-y', '-nostdin',
  ...inputs,
  '-filter_complex', filters.join(';'),
  '-map', '[mixout]',
  '-ac', '2',
  '-ar', '48000',
];

const run = (a) =>
  new Promise((res, rej) => {
    const p = spawn('ffmpeg', a, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => (err += d.toString()));
    p.on('close', (code) => (code === 0 ? res(err) : rej(new Error(err.slice(-3000)))));
  });

console.log(`scoring ${kit.cues.length} cues + ${bed ? `${BED_LAYERS.length} bed layers` : 'no bed'}`);

// pass one: measure the mix as it stands
let measureErr = '';
try {
  // The measurement has to live inside the same graph: ffmpeg will not let a
  // simple -af and a -filter_complex feed the same stream.
  const measFilters = filters.concat(
    `[mixout]loudnorm=I=${kit.target.integratedLufs}:TP=${kit.target.truePeakDb}:LRA=${kit.target.lra}:print_format=json[meas]`,
  );
  measureErr = await run([
    '-y', '-nostdin', ...inputs,
    '-filter_complex', measFilters.join(';'),
    '-map', '[meas]', '-f', 'null', '-',
  ]);
  // the same mix, written out, for the correction pass
  await run([...mixArgs, TMP]);
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
const grab = (label) => {
  const m = measureErr.match(new RegExp(`"${label}"\\s*:\\s*"?(-?[0-9.]+)`));
  return m ? m[1] : null;
};
const measured = {
  i: grab('input_i'),
  tp: grab('input_tp'),
  lra: grab('input_lra'),
  thresh: grab('input_thresh'),
};
console.log('measured:', JSON.stringify(measured));
if (measured.i === null) {
  console.error('could not measure the mix');
  process.exit(1);
}

// pass two: correct it to the kit's target, exactly
const argsOut = [
  '-y', '-nostdin',
  '-i', TMP,
  '-i', VIDEO,
  '-filter_complex',
  `[0:a]loudnorm=I=${kit.target.integratedLufs}:TP=${kit.target.truePeakDb}:LRA=${kit.target.lra}:` +
    `measured_I=${measured.i}:measured_TP=${measured.tp}:measured_LRA=${measured.lra}:measured_thresh=${measured.thresh}:` +
    `linear=true:print_format=summary[out]`,
  '-map', '[out]',
  '-map', '1:v:0',
  '-c:v', 'copy',
  '-c:a', 'aac',
  '-b:a', '192k',
  '-ar', '48000',
  '-ac', '2',
  '-shortest',
  OUT,
];

const err = await new Promise((res, rej) => {
  const p = spawn('ffmpeg', argsOut, { stdio: ['ignore', 'ignore', 'pipe'] });
  let e = '';
  p.stderr.on('data', (d) => (e += d.toString()));
  p.on('close', (code) => (code === 0 ? res(e) : rej(new Error(e.slice(-3000)))));
});
console.log(err.split('\n').filter((l) => /Integrated|True Peak|LRA/i.test(l)).join('\n'));
console.log(`wrote ${OUT} (${(statSync(OUT).size / 1024 / 1024).toFixed(2)} MB)`);

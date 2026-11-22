#!/usr/bin/env node
/**
 * sound-ad.mjs — give a rendered ad a sound bed and its accents.
 *
 *   node scripts/sound-ad.mjs --file studio/ads/build/ad.mp4 --out studio/ads/render/ad.mp4
 *
 * An ad with no sound is a slideshow. Meta says sound on an ad is worth
 * more than sound off it, and the house already owns 1,470 sounds with
 * their licences — so the sounds come from the house shelf, not from
 * somewhere with a licence nobody can read.
 *
 * The plan is a list of moments: a sound, when it starts, and how loud it
 * is. The picture is never touched — the video stream is copied, so the
 * render that passed the house gate is the render that ships.
 *
 * The file it writes is measured, not assumed: the script reads the
 * duration, the loudness and the presence of an audio stream back out of
 * the result and prints them.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const option = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fallback;
};

const file = option("file", "");
const out = option("out", join(ROOT, "studio", "ads", "render", "ad.mp4"));
const planFile = option("plan", "");

if (!file) {
  console.error("Give the film to sound: --file <path>");
  process.exit(1);
}
if (!existsSync(file)) {
  console.error(`There is no file at ${file}.`);
  process.exit(1);
}

/* The catalogue is the house's own index of what it owns and what it may
   use. A sound is only allowed if it is in here. */
const catalogue = JSON.parse(readFileSync(join(ROOT, "library", "sfx.json"), "utf8"));
const byTitle = new Map(catalogue.entries.map((e) => [e.title, e]));

/*
 * The default plan: a warm open, the claim, the product, the end tag.
 * This is the ACME coffee ad, and the sounds are chosen for it — a low
 * swell to open, a soft bloom under the claim, one drop of coffee at the
 * product moment, and a small pop to close.
 */
const DEFAULT_PLAN = [
  { sound: "pro whoosh big swell", at: 0.00, gain: -14, why: "the low swell that opens the film" },
  { sound: "logo sting soft_bloom", at: 0.55, gain: -12, why: "the claim arrives, warm" },
  { sound: "drip drop", at: 2.60, gain: -6, why: "one drop of coffee at the product moment" },
  { sound: "pop 2", at: 5.20, gain: -10, why: "the end tag" },
];

const plan = planFile
  ? JSON.parse(readFileSync(resolve(ROOT, planFile), "utf8"))
  : DEFAULT_PLAN;

const probe = (target, args) =>
  execFileSync("ffprobe", ["-v", "error", ...args, "-of", "json", target], { encoding: "utf8" });

const videoInfo = JSON.parse(probe(file, ["-show_entries", "stream=codec_type,duration,width,height"]));
const videoStream = videoInfo.streams.find((s) => s.codec_type === "video");
const duration = Number(videoStream?.duration ?? 0);
if (!duration) {
  console.error("The file has no readable video stream.");
  process.exit(1);
}

const parts = [];
const inputs = ["-i", file];
for (const moment of plan) {
  const entry = byTitle.get(moment.sound);
  if (!entry) {
    console.error(`The house does not own a sound called "${moment.sound}".`);
    process.exit(1);
  }
  const path = join(ROOT, "library", entry.file);
  if (!existsSync(path)) {
    console.error(`The sound file is missing: ${entry.file}`);
    process.exit(1);
  }
  inputs.push("-i", path);
}

plan.forEach((moment, index) => {
  const ms = Math.max(0, Math.round(moment.at * 1000));
  parts.push(
    `[${index + 1}:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,` +
      `volume=${moment.gain}dB,adelay=${ms}|${ms}[a${index}]`,
  );
});
/*
 * The mix is normalised to the loudness a social ad is played at —
 * -16 LUFS integrated, true peak under -1.5 dBTP — and then padded to
 * exactly the length of the picture. An ad that is quiet gets played
 * quiet.
 */
parts.push(
  `${plan.map((_, i) => `[a${i}]`).join("")}amix=inputs=${plan.length}:normalize=0,` +
    `loudnorm=I=-16:TP=-1.5:LRA=11,` +
    `apad=whole_dur=${duration},atrim=0:${duration}[aout]`,
);

mkdirSync(dirname(resolve(out)), { recursive: true });
execFileSync(
  "ffmpeg",
  [
    "-nostdin", "-y", ...inputs,
    "-filter_complex", parts.join(";"),
    "-map", "0:v", "-map", "[aout]",
    "-c:v", "copy",
    "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
    "-shortest",
    resolve(out),
  ],
  { stdio: ["ignore", "ignore", "pipe"] },
);

/* Measure the file that was written, not the file that was intended. */
const result = JSON.parse(probe(resolve(out), ["-show_entries", "stream=codec_type,codec_name,duration,channels,sample_rate", "-show_entries", "format=duration"]));
const audio = result.streams.find((s) => s.codec_type === "audio");
if (!audio) {
  console.error("The finished file has no audio stream. The sound did not land.");
  process.exit(1);
}
/* loudnorm prints its measurement on stderr, not stdout. */
const loudness = spawnSync(
  "ffmpeg",
  ["-nostdin", "-i", resolve(out), "-af", "loudnorm=I=-16:print_format=json", "-f", "null", "-"],
  { encoding: "utf8" },
);
const measured = JSON.parse(((loudness.stderr ?? "").match(/\{[\s\S]*?\}/g) ?? ["{}"]).pop());

const ledger = plan.map((moment) => {
  const entry = byTitle.get(moment.sound);
  return {
    sound: moment.sound,
    at: moment.at,
    gain: moment.gain,
    why: moment.why,
    licence: entry.licence,
    author: entry.author,
    source: entry.sourceUrl,
  };
});
writeFileSync(
  join(dirname(resolve(out)), "ad-sound.json"),
  JSON.stringify({ file: resolve(out), duration, sounds: ledger }, null, 2) + "\n",
);

console.log(`sound: ${plan.length} sounds · ${duration.toFixed(1)}s · ${audio.codec_name} ${audio.channels === 1 ? "mono" : "stereo"} ${audio.sample_rate}Hz`);
for (const row of ledger) {
  console.log(`  ${row.at.toFixed(2)}s  ${String(row.gain).padStart(4)}dB  ${row.sound.padEnd(26)} ${row.licence} · ${row.author}`);
}
console.log(`measured: ${measured.input_i ?? "?"} LUFS integrated, ${measured.input_tp ?? "?"} dB true peak`);
console.log(`wrote ${resolve(out)}`);

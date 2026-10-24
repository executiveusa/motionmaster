#!/usr/bin/env node
/**
 * normalise-sfx.mjs — put every sound in the library at the same level.
 *
 *   node scripts/normalise-sfx.mjs [--dry]
 *
 * A library where one file is at -6 dBFS and the next at -30 has no use: the
 * mix decides how loud a sound is, not the file. So every sound is normalised
 * to the same reference level and its measured level is written into the
 * catalogue, and the film's mix works from numbers rather than from
 * guessing.
 *
 * The reference is -1 dBFS peak, which is what earshot's own bank uses.
 *
 * Peak, not integrated loudness: most of these are a tenth of a second long,
 * and an integrated loudness reading over a tenth of a second is a number
 * about the gate, not about the sound. The peak is what the ear hears on a
 * single hit anyway.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const REPO = resolve(HERE, "..");
const LIB = join(REPO, "library", "sfx");
const TARGET_PEAK_DB = -1;

const argv = process.argv.slice(2);
const dry = argv.includes("--dry");
/** Only one subtree, e.g. `--only earshot`. */
const only = argv.includes("--only") ? argv[argv.indexOf("--only") + 1] : null;

function walk(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(path));
    else if (/\.(mp3|wav)$/i.test(entry.name)) out.push(path);
  }
  return out;
}

/**
 * Measure a file: integrated loudness and true peak.
 *
 * ffmpeg writes the ebur128 summary to stderr, so stderr is what is read —
 * stdout is empty and always will be.
 */
function measure(path) {
  const result = spawnSync(
    "ffmpeg",
    ["-nostdin", "-hide_banner", "-i", path, "-af", "ebur128=peak=true", "-f", "null", "-"],
    { encoding: "utf8" },
  );
  const text = String(result.stderr ?? "");
  const i = text.match(/I:\s*(-?\d+(?:\.\d+)?) LUFS/);
  const p = text.match(/Peak:\s*(-?\d+(?:\.\d+)?) dBFS/);
  return { lufs: i ? Number(i[1]) : null, peak: p ? Number(p[1]) : null };
}

let files = walk(LIB);
if (only) files = files.filter((path) => path.includes(`/${only}/`));
console.log(`${files.length} files${only ? ` in ${only}` : ""}`);

const measurements = {};
let changed = 0;
let failed = 0;

for (const [index, path] of files.entries()) {
  const before = measure(path);
  const key = path.slice(LIB.length + 1);

  if (before.peak === null) {
    failed += 1;
    continue;
  }
  // Within a tenth of a decibel is close enough.
  if (Math.abs(before.peak - TARGET_PEAK_DB) <= 0.1) continue;

  const gain = TARGET_PEAK_DB - before.peak;

  if (!dry) {
    // The temporary file keeps the original extension, so ffmpeg knows what
    // format to write without being told.
    const extension = path.slice(path.lastIndexOf("."));
    const tmp = `${path}.norm${extension}`;
    try {
      execFileSync(
        "ffmpeg",
        [
          "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
          "-i", path,
          "-af", `volume=${gain.toFixed(2)}dB`,
          "-ar", "48000",
          tmp,
        ],
        { stdio: ["ignore", "ignore", "inherit"] },
      );
      execFileSync("mv", ["-f", tmp, path]);
      changed += 1;
    } catch {
      failed += 1;
      continue;
    }
    const after = measure(path);
    measurements[key] = { ...after, wasPeak: before.peak, gainDb: Math.round(gain * 10) / 10 };
  }

  if ((index + 1) % 100 === 0) console.log(`  ${index + 1}/${files.length}`);
}

if (!dry) {
  const levelsPath = join(REPO, "library", "sfx-levels.json");
  const existing = existsSync(levelsPath)
    ? (() => {
        try {
          return JSON.parse(readFileSync(levelsPath, "utf8")).levels ?? {};
        } catch {
          return {};
        }
      })()
    : {};
  const merged = { ...existing };
  for (const [key, value] of Object.entries(measurements)) merged[key] = value;
  writeFileSync(
    levelsPath,
    `${JSON.stringify(
      {
        generated: "scripts/normalise-sfx.mjs",
        referencePeakDb: TARGET_PEAK_DB,
        count: Object.keys(merged).length,
        levels: merged,
      },
      null,
      1,
    )}\n`,
    "utf8",
  );
}

console.log(`normalised ${changed}, measured ${Object.keys(measurements).length}, failed ${failed}`);

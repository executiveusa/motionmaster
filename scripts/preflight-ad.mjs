#!/usr/bin/env node
/**
 * Preflight a rendered ad against its placement.
 *
 * This is the last gate before a file is handed over: the things Meta will
 * crop or reject. It is not the taste gate — that is the house gate, and it
 * runs on the composition. This one measures the file.
 *
 *   node scripts/preflight-ad.mjs --placement reels-9x16 --file ad.mp4
 *
 * The measurements come from ffprobe. A number this script reports is one it
 * read out of the file, not one it assumed.
 */
import { execFileSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const argv = process.argv.slice(2);
const option = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fallback;
};

const meta = await import(`file://${join(ROOT, "mcp", "dist", "meta.js")}`).catch(async () => {
  const { execFileSync: run } = await import("node:child_process");
  run("npm", ["run", "build"], { cwd: join(ROOT, "mcp"), stdio: "inherit" });
  return import(`file://${join(ROOT, "mcp", "dist", "meta.js")}`);
});

const placementId = option("placement", "reels-9x16");
const file = option("file", "");
if (!file) {
  console.error("Give the file to check: --file <path>");
  process.exit(1);
}
if (!existsSync(file)) {
  console.error(`There is no file at ${file}.`);
  process.exit(1);
}

function probe(path) {
  const raw = execFileSync(
    "ffprobe",
    [
      "-v", "error",
      "-show_entries", "stream=codec_type,codec_name,width,height,r_frame_rate:format=duration,size",
      "-of", "json",
      path,
    ],
    { encoding: "utf8" },
  );
  return JSON.parse(raw);
}

const probed = probe(file);
const video = (probed.streams ?? []).find((s) => s.codec_type === "video");
const audio = (probed.streams ?? []).find((s) => s.codec_type === "audio");
if (!video) {
  console.error(`${file} has no video stream.`);
  process.exit(1);
}
const [num, den] = String(video.r_frame_rate ?? "0/1").split("/").map(Number);
const fps = den ? num / den : undefined;

const result = meta.preflight(placementId, {
  file,
  width: video.width,
  height: video.height,
  durationSeconds: probed.format?.duration ? Number(probed.format.duration) : undefined,
  bytes: statSync(file).size,
  codec: video.codec_name,
  audioCodec: audio?.codec_name,
  fps,
  hasAudio: Boolean(audio),
});

if (argv.includes("--json")) {
  console.log(JSON.stringify(result, null, 2));
} else {
  const p = meta.placement(placementId);
  console.log(`${file} → ${p.name} (${p.aspect}, ${p.width}×${p.height})`);
  console.log(`  frame   : ${result.measured.width}×${result.measured.height}`);
  console.log(`  length  : ${Number(result.measured.durationSeconds ?? 0).toFixed(3)}s`);
  console.log(`  video   : ${result.measured.codec}${result.measured.audioCodec ? `, ${result.measured.audioCodec}` : ""}`);
  console.log(`  size    : ${(Number(result.measured.bytes ?? 0) / 1_000_000).toFixed(2)} MB`);
  for (const finding of result.findings) {
    console.log(`  ${finding.severity === "error" ? "✗" : "!"} ${finding.code}: ${finding.message}`);
  }
  console.log(result.ok ? "\nPASS  the file is inside the placement's contract" : "\nFAIL  the file is outside the contract");
}

process.exit(result.ok ? 0 : 1);

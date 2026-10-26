#!/usr/bin/env node
/**
 * Verify the gallery uses decodable video files, real posters and the exact
 * recorded prompts. A manifest flag or nonzero file size is not video proof.
 * Read-only: no rendering service, API keys, uploads or paid model calls.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dirname, "..");
const clips = JSON.parse(readFileSync(join(root, "site/src/clips.json"), "utf8")).clips;
const manifest = JSON.parse(readFileSync(join(root, "site/src/data/clip-manifest.json"), "utf8")).clips;
const proof = join(root, ".completion-proof");
mkdirSync(proof, { recursive: true });
const results = [];

function run(program, args, maxBuffer = 8 * 1024 * 1024) {
  const result = spawnSync(program, args, { encoding: "buffer", timeout: 60_000, maxBuffer });
  if (result.status !== 0 || result.error) {
    throw Error(program + " failed: " + (result.stderr?.toString() ?? result.error?.message ?? "").slice(-500));
  }
  return result.stdout;
}

for (const clip of clips) {
  const entry = manifest[clip.id];
  if (!entry?.video || !entry?.poster) throw Error(clip.id + ": manifest must confirm real video and poster");
  if (!clip.src?.startsWith("/clips/") || !clip.poster?.startsWith("/clips/")) {
    throw Error(clip.id + ": unexpected gallery media path");
  }
  if (entry.videoSrc !== clip.src || entry.posterSrc !== clip.poster) {
    throw Error(clip.id + ": source and generated manifest disagree");
  }
  if (!clip.prompt?.trim() || !clip.renderedWith?.trim()) throw Error(clip.id + ": missing source prompt/provenance");
  const videoPath = join(root, "site/public", clip.src);
  const posterPath = join(root, "site/public", clip.poster);
  if (!existsSync(videoPath) || !existsSync(posterPath)) throw Error(clip.id + ": gallery media missing");
  const jpeg = readFileSync(posterPath);
  if (jpeg.length < 1024 || jpeg[0] !== 0xff || jpeg[1] !== 0xd8) throw Error(clip.id + ": invalid JPEG poster");

  const info = JSON.parse(run("ffprobe", [
    "-v", "error", "-show_entries", "format=duration:stream=codec_type,codec_name,width,height",
    "-of", "json", videoPath
  ]).toString());
  const stream = info.streams?.find((item) => item.codec_type === "video");
  const seconds = Number(info.format?.duration);
  if (!stream || stream.width < 320 || stream.height < 180 ||
      !Number.isFinite(seconds) || seconds < 3 || seconds > 180) {
    throw Error(clip.id + ": no usable video stream/duration");
  }
  if (Math.abs(seconds - Number(clip.durationSeconds)) > 1.5) {
    throw Error(clip.id + ": displayed duration differs from MP4 by >1.5 seconds");
  }
  // Decode an actual frame near the start and another in the second half.
  for (const at of [0.5, Math.max(1, seconds * 0.65)]) {
    const png = run("ffmpeg", [
      "-v", "error", "-ss", at.toFixed(2), "-i", videoPath,
      "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "-"
    ]);
    if (png.length < 1000 || png.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
      throw Error(clip.id + ": frame decode failed at " + at.toFixed(2) + "s");
    }
  }
  results.push({ id: clip.id, seconds, width: stream.width, height: stream.height,
    codec: stream.codec_name, promptCharacters: clip.prompt.length, decodedFrames: 2 });
  console.log("PASS gallery MP4 " + clip.id + " " + seconds.toFixed(2) + "s " + stream.width + "x" + stream.height);
}
writeFileSync(join(proof, "gallery-media.json"), JSON.stringify({
  kind: "gallery-media-decode-not-browser-playback", clips: results, passed: true
}, null, 2) + "\n");

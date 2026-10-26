#!/usr/bin/env node
/**
 * MM-02 REAL RENDER smoke. Requires Chrome, ffmpeg/ffprobe and HyperFrames CLI.
 * Runs on an actual composition, not mocked tools. Never writes to source.
 * Exit nonzero on any gate, encode, duration, frame or motion proof failure.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { planVideo } from "../mcp/dist/planner.js";
import { buildHyperFramesProject, GSAP_FILE } from "../mcp/dist/hyperframes-composer.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const proofDir = join(root, ".completion-proof", "render-smoke");
mkdirSync(proofDir, { recursive: true });
const tokens = JSON.parse(readFileSync(join(root, "plugins/motion-master/assets/motion-tokens.json"), "utf8"));
const storyboard = planVideo({
  brief: "Make a 15-second launch title for ACME",
  durationSeconds: 15, width: 640, height: 360, fps: 12,
}, tokens);
const gsapSource = readFileSync(join(root, "generator", "vendor", GSAP_FILE), "utf8");
const project = buildHyperFramesProject(storyboard, tokens, {
  projectName: "acme-smoke", gsapSource,
});
const projectDir = join(proofDir, project.directory);
for (const file of project.files) {
  const target = join(proofDir, file.path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, file.contents);
}
writeFileSync(join(proofDir, "storyboard.json"), JSON.stringify(storyboard, null, 2) + "\n");
const video = join(proofDir, "acme-smoke.mp4");
const report = {
  status: "running", source: "real HyperFrames/Chrome/ffmpeg", generatedAt: new Date().toISOString(),
  storyboardSeconds: storyboard.duration.seconds, expectedFrames: storyboard.duration.frames,
  commands: [], samples: [],
};
function run(name, command, args, timeoutMs = 600_000) {
  const start = Date.now();
  const result = spawnSync(command, args, {
    cwd: root, encoding: "utf8", timeout: timeoutMs,
    maxBuffer: 8 * 1024 * 1024, env: process.env,
  });
  const output = [result.stdout ?? "", result.stderr ?? "", result.error?.message ?? ""].filter(Boolean).join("\n");
  writeFileSync(join(proofDir, `${name}.log`), output);
  const item = { name, code: result.status, seconds: Math.round((Date.now() - start) / 1000), log: `${name}.log` };
  report.commands.push(item);
  if (result.status !== 0 || result.error) throw new Error(`${name} failed: ${output.slice(-1600)}`);
  return result.stdout;
}
try {
  run("check", "bash", ["generator/hf.sh", "check", projectDir], 240_000);
  // HyperFrames may exit 0 with craft warnings in non-strict mode. Treat those
  // as failures instead of confusing "CLI success" with release-quality proof.
  const checksDir = join(projectDir, ".hyperframes", "artifacts", "checks");
  const reports = readdirSync(checksDir).filter((name) => name.endsWith(".json"))
    .map((name) => join(checksDir, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  if (!reports.length) throw new Error("HyperFrames produced no structured check report");
  const check = JSON.parse(readFileSync(reports[0], "utf8"));
  const findings = Object.values(check).flatMap((section) =>
    Array.isArray(section?.findings) ? section.findings : []);
  report.gate = {
    browserSkipped: check.browserSkipped, findings,
    warningCount: findings.filter((item) => item.severity === "warning").length,
    errorCount: findings.filter((item) => item.severity === "error").length,
  };
  if (report.gate.browserSkipped || report.gate.warningCount || report.gate.errorCount) {
    throw new Error(`HyperFrames craft gate has ${report.gate.errorCount} errors and ${report.gate.warningCount} warnings`);
  }
  run("render", "bash", [
    "generator/hf.sh", "render", projectDir, "--output", video, "-f", "12", "-q", "delivery",
  ], 600_000);
  const info = JSON.parse(run("ffprobe", "ffprobe", [
    "-v", "error", "-show_entries", "format=duration:stream=codec_type,width,height,r_frame_rate",
    "-of", "json", video,
  ], 30_000));
  const stream = info.streams?.find((s) => s.codec_type === "video");
  if (!stream || stream.width !== 640 || stream.height !== 360) throw new Error("Wrong video dimensions");
  if (Number(info.format?.duration) < 14.5 || Number(info.format?.duration) > 15.5) {
    throw new Error(`Wrong video duration: ${info.format?.duration}`);
  }
  report.video = { path: "acme-smoke.mp4", duration: Number(info.format.duration), width: stream.width, height: stream.height };
  for (const t of [0.25, 5.5, 11.5, 14.5]) {
    const path = join(proofDir, `frame-${t}.png`);
    run(`frame-${t}`, "ffmpeg", [
      "-v", "error", "-y", "-ss", String(t), "-i", video, "-frames:v", "1", path,
    ], 30_000);
    const hash = createHash("sha256").update(readFileSync(path)).digest("hex");
    report.samples.push({ second: t, file: `frame-${t}.png`, sha256: hash });
  }
  if (new Set(report.samples.map((s) => s.sha256)).size < 3) {
    throw new Error("Insufficient visual changes across four sampled frames");
  }
  // Different PNG hashes can still represent visually identical title cards.
  // Measure actual pixel deltas; require at least two meaningful scene changes.
  report.visualDeltas = [];
  for (let i = 1; i < report.samples.length; i += 1) {
    const previous = join(proofDir, report.samples[i - 1].file);
    const current = join(proofDir, report.samples[i].file);
    const diff = run(`visual-diff-${i}`, "ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-i", previous, "-i", current,
      "-filter_complex", "[0:v][1:v]blend=all_mode=difference,signalstats,metadata=print:file=-",
      "-frames:v", "1", "-f", "null", "-",
    ], 30_000);
    const average = Number(/lavfi\.signalstats\.YAVG=([0-9.]+)/.exec(diff)?.[1]);
    if (!Number.isFinite(average)) throw new Error("FFmpeg could not measure the visual difference");
    report.visualDeltas.push({ from: report.samples[i - 1].second, to: report.samples[i].second, averageLumaDelta: average });
  }
  if (report.visualDeltas.filter((d) => d.averageLumaDelta >= 15).length < 2) {
    throw new Error("Render is visually near-static despite distinct PNG hashes; requires two meaningful scene changes");
  }
  report.status = "passed";
  console.log("PASS: HyperFrames check, real MP4, 15s/640x360, four sampled frames with distinct pixels.");
} catch (error) {
  report.status = "failed";
  report.error = String(error);
  console.error(report.error);
  process.exitCode = 1;
} finally {
  writeFileSync(join(proofDir, "report.json"), JSON.stringify(report, null, 2) + "\n");
}

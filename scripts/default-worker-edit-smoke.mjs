#!/usr/bin/env node
/**
 * MM-08: real default HyperFrames worker edit/rerender proof.
 * Isolated workspace; no injected FFmpeg renderer or owner project mutations.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadConfig } from "../mcp/dist/config.js";
import { loadBlocks } from "../mcp/dist/library.js";
import { createProject, createProjectJob, readProjectJob, saveRevision } from "../mcp/dist/projects.js";
import { runProjectJob } from "../mcp/dist/project-worker.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const proof = join(root, ".completion-proof", "default-worker-edit");
mkdirSync(proof, { recursive: true });
const temp = mkdtempSync(join(tmpdir(), "mm-default-worker-"));
const report = { status: "running", renderer: "shipped renderProjectRevision (not injected)", generatedAt: new Date().toISOString(), renders: [] };
const hash = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

function run(command, args, timeout = 30_000) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", timeout, maxBuffer: 4 * 1024 * 1024 });
  if (result.error || result.status !== 0) {
    throw new Error(command + " failed: " + (result.stderr ?? result.error?.message ?? "").slice(-1800));
  }
  return result.stdout;
}
function prove(label, projectId, jobId, expected) {
  const path = join(temp, "workspace", "projects", projectId, "artifacts", jobId + ".mp4");
  assert.ok(existsSync(path), label + ": no MP4 artifact");
  const info = JSON.parse(run("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_type,width,height", "-of", "json", path]));
  const video = info.streams?.find((s) => s.codec_type === "video");
  assert.ok(video?.width > 0 && video?.height > 0, label + ": missing video stream");
  const duration = Number(info.format?.duration);
  assert.ok(Math.abs(duration - expected) < 0.3, label + ": expected " + expected + "s, got " + duration);
  // A decodable MP4 alone is not proof of motion. Decode two actual times and
  // require changed pixels; archive both frames for independent review.
  const still = join(proof, label + "-frame-early.png");
  const late = join(proof, label + "-frame-late.png");
  run("ffmpeg", ["-v", "error", "-y", "-ss", "0.3", "-i", path, "-frames:v", "1", still]);
  run("ffmpeg", ["-v", "error", "-y", "-ss", "1.8", "-i", path, "-frames:v", "1", late]);
  assert.notEqual(hash(still), hash(late), label + ": frames at 0.3s and 1.8s are identical (no proven motion)");
  copyFileSync(path, join(proof, label + ".mp4"));
  report.renders.push({ label, jobId, duration, width: video.width, height: video.height, sha256: hash(path), earlyFrameSha256: hash(still), lateFrameSha256: hash(late), video: label + ".mp4", earlyFrame: label + "-frame-early.png", lateFrame: label + "-frame-late.png" });
}

try {
  mkdirSync(join(temp, "generator", "vendor"), { recursive: true });
  copyFileSync(join(root, "generator", "hf.sh"), join(temp, "generator", "hf.sh"));
  copyFileSync(join(root, "generator", "vendor", "gsap-3.14.2.min.js"), join(temp, "generator", "vendor", "gsap-3.14.2.min.js"));
  const config = { ...loadConfig(), repoRoot: temp, blocksPath: join(root, "library", "blocks.json"), tokensPath: join(root, "plugins", "motion-master", "assets", "motion-tokens.json") };
  const candidates = loadBlocks(config.blocksPath).blocks.filter((b) =>
    b.variables?.some((v) => v.type === "string") &&
    !b.variables.some((v) => ["image", "video", "audio"].includes(v.type)) &&
    !b.tags.includes("transitions-dev-port") &&
    b.files.some((f) => f.type === "hyperframes:composition") &&
    (b.duration ?? 0) >= 3.5
  );
  assert.ok(candidates.length, "No eligible self-contained editable motion blocks");
  // Split-flap-board is deliberately NOT used: its intermediate rotating glyphs
  // fail the shipped HyperFrames readability gate (13 line_unread warnings in
  // CI 40193303487). Use a text-forward composition whose copy holds while
  // its border moves. Keep this pinned: a catalogue change must fail visibly.
  const selected = candidates.find((b) => b.id === "lt-neon-border");
  assert.ok(selected, "Pinned lt-neon-border composition is unavailable; do not silently substitute a different block");
  assert.ok(selected.duration >= 4.8, "Pinned block duration changed; requalify the edit smoke");
  report.selectedBlock = selected.id;
  const editableText = selected.variables.find((variable) => variable.type === "string");
  assert.ok(editableText, "Pinned composition has no editable text variable");
  report.editedVariable = editableText.id;
  const { project } = createProject(temp, { title: "Default worker proof", brief: "A cinematic lower-third for Dr. Maya Chen", shots: [{ id: selected.id, title: "First version", duration: 3.5 }] });
  const first = createProjectJob(temp, project.id, 1);
  await runProjectJob(config, project.id, first.id); // NO renderer override
  const initial = readProjectJob(temp, project.id, first.id);
  assert.equal(initial?.status, "ready", "Default first render failed: " + (initial?.error ?? initial?.status));
  prove("original", project.id, first.id, 3.5);

  // Reopen persisted project and job in a separate Node process.
  const moduleUrl = pathToFileURL(join(root, "mcp", "dist", "projects.js")).href;
  const check = "import assert from 'node:assert/strict'; import {readProject,readProjectJob} from " + JSON.stringify(moduleUrl) +
    "; const [root,id,job]=process.argv.slice(1); assert.equal(readProject(root,id)?.project.currentRevision,1); assert.equal(readProjectJob(root,id,job)?.status,'ready');";
  run(process.execPath, ["--input-type=module", "-e", check, temp, project.id, first.id]);
  report.reopenedInNewProcess = true;

  const revision = saveRevision(temp, project.id, 1, { title: "Trimmed", brief: "A cinematic lower-third for Dr. Maya Chen", shots: [{ id: selected.id, title: "Shorter version", duration: 3.0, values: { [editableText.id]: "Ana Ruiz" } }] });
  assert.equal(revision.revision.number, 2);
  const second = createProjectJob(temp, project.id, 2);
  await runProjectJob(config, project.id, second.id); // same real renderer
  const edited = readProjectJob(temp, project.id, second.id);
  assert.equal(edited?.status, "ready", "Default edited render failed: " + (edited?.error ?? edited?.status));
  prove("edited", project.id, second.id, 3.0);
  const source = JSON.parse(readFileSync(join(temp, "workspace", "projects", project.id, "renders", second.id, "brief.json"), "utf8"));
  assert.equal(source.shots.length, 1);
  assert.equal(source.shots[0].id, selected.id);
  assert.equal(source.shots[0].duration, 3.0);
  assert.equal(source.shots[0].values[editableText.id], "Ana Ruiz",
    "Edited text did not reach the generated HyperFrames variable payload");
  assert.notEqual(hash(join(proof, "original-frame-late.png")),
    hash(join(proof, "edited-frame-late.png")),
    "Text edit did not change the actual rendered late frame");
  assert.notEqual(report.renders[0].sha256, report.renders[1].sha256);
  report.textOverrideVerifiedInSource = true;
  report.status = "passed";
  console.log("PASS: default HyperFrames worker rendered, reopened, edited, rerendered and decoded real MP4s.");
} catch (error) {
  report.status = "failed";
  report.error = String(error);
  console.error(report.error);
  process.exitCode = 1;
} finally {
  writeFileSync(join(proof, "report.json"), JSON.stringify(report, null, 2) + "\n");
  rmSync(temp, { recursive: true, force: true });
}

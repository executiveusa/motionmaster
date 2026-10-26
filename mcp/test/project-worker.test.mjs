import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "../dist/config.js";
import {
  createProject, createProjectJob, readProject, readProjectJob, saveRevision,
  transitionProjectJob, recoverInterruptedProjectJobs,
} from "../dist/projects.js";
import { cancelRunningProjectJob, processProjectQueue, runProjectJob } from "../dist/project-worker.js";

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "mm-worker-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const config = { ...loadConfig(), repoRoot: root };
  const { project } = createProject(root, { title: "Test", brief: "A cinematic launch film" });
  return { root, config, projectId: project.id };
}

async function ffmpegRenderer(_config, _revision, outputDir) {
  const video = join(outputDir, "film.mp4");
  execFileSync("ffmpeg", [
    "-loglevel", "error", "-f", "lavfi", "-i", "color=c=blue:s=320x180:r=12:d=0.5",
    "-c:v", "mpeg4", "-y", video,
  ], { timeout: 20_000 });
  return video;
}

test("MM-05: worker produces a real MP4, persists a ready job and reopens its immutable revision", async (t) => {
  const { root, config, projectId } = fixture(t);
  const job = createProjectJob(root, projectId, 1);
  await runProjectJob(config, projectId, job.id, ffmpegRenderer);
  const saved = readProjectJob(root, projectId, job.id);
  assert.equal(saved.status, "ready");
  assert.equal(saved.attempts, 1);
  assert.equal(saved.artifact, `artifacts/${job.id}.mp4`);
  const artifact = join(root, "workspace", "projects", projectId, saved.artifact);
  assert.equal(existsSync(artifact), true);
  const codec = execFileSync("ffprobe", [
    "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_name",
    "-of", "default=noprint_wrappers=1", artifact,
  ], { encoding: "utf8" });
  assert.match(codec, /codec_name=mpeg4/);
  assert.equal(readProject(root, projectId).revision.brief, "A cinematic launch film");
  await runProjectJob(config, projectId, job.id, ffmpegRenderer);
  assert.equal(readProjectJob(root, projectId, job.id).attempts, 1);
});

test("MM-05: edited revision can be queued separately without overwriting the first artifact", async (t) => {
  const { root, config, projectId } = fixture(t);
  const first = createProjectJob(root, projectId, 1);
  await runProjectJob(config, projectId, first.id, ffmpegRenderer);
  const edited = saveRevision(root, projectId, 1, {
    title: "New title", brief: "A different film", shots: [],
  });
  const second = createProjectJob(root, projectId, edited.revision.number);
  await runProjectJob(config, projectId, second.id, ffmpegRenderer);
  assert.equal(readProjectJob(root, projectId, first.id).status, "ready");
  assert.equal(readProjectJob(root, projectId, second.id).status, "ready");
  assert.notEqual(first.id, second.id);
  assert.equal(readProject(root, projectId).revision.brief, "A different film");
});

test("MM-05: cancellation during a render cannot publish an artifact or resurrect a job", async (t) => {
  const { root, config, projectId } = fixture(t);
  const job = createProjectJob(root, projectId, 1);
  let release;
  const pause = new Promise((resolve) => { release = resolve; });
  let entered;
  const started = new Promise((resolve) => { entered = resolve; });
  const work = runProjectJob(config, projectId, job.id, async (...args) => {
    entered();
    await pause;
    return ffmpegRenderer(...args);
  });
  await started;
  transitionProjectJob(root, projectId, job.id, "cancel");
  release();
  await work;
  assert.equal(readProjectJob(root, projectId, job.id).status, "cancelled");
  assert.equal(readProjectJob(root, projectId, job.id).artifact, undefined);
});

test("MM-05: invalid output fails closed and restart recovery does not silently re-render", async (t) => {
  const { root, config, projectId } = fixture(t);
  const job = createProjectJob(root, projectId, 1);
  await runProjectJob(config, projectId, job.id, async () => "/tmp/untrusted.mp4");
  assert.equal(readProjectJob(root, projectId, job.id).status, "failed");
  transitionProjectJob(root, projectId, job.id, "retry");
  transitionProjectJob(root, projectId, job.id, "start");
  assert.equal(recoverInterruptedProjectJobs(root), 1);
  assert.equal(readProjectJob(root, projectId, job.id).status, "failed");
});

test("MM-08: a saved edited shot list reaches the worker without losing order or trim", async (t) => {
  const { root, config, projectId } = fixture(t);
  const edits = [
    { id: "shot-b", title: "Second first", duration: 1.5 },
    { id: "shot-a", title: "First second", duration: 2 },
  ];
  saveRevision(root, projectId, 1, {
    title: "Edited", brief: "A cinematic launch film", shots: edits,
  });
  const job = createProjectJob(root, projectId, 2);
  let received;
  await runProjectJob(config, projectId, job.id, async (cfg, revision, outputDir) => {
    received = revision.shots;
    return ffmpegRenderer(cfg, revision, outputDir);
  });
  assert.deepEqual(received, edits);
  assert.equal(readProjectJob(root, projectId, job.id).status, "ready");
  assert.deepEqual(readProject(root, projectId).revision.shots, edits);
  // The injected FFmpeg renderer only verifies revision delivery and durable
  // lifecycle; default HyperFrames edited MP4 proof is still required.
});

test("MM-05: empty queue drains without writing anything", async (t) => {
  const { config } = fixture(t);
  await processProjectQueue(config);
});

test("MM-05: opt-in queue drain serially renders two queued jobs and keeps revisions distinct", async (t) => {
  const { root, config, projectId } = fixture(t);
  const first = createProjectJob(root, projectId, 1);
  const second = createProjectJob(root, projectId, 1);
  let concurrent = 0;
  let peak = 0;
  const renderer = async (...args) => {
    concurrent++;
    peak = Math.max(peak, concurrent);
    try { return await ffmpegRenderer(...args); }
    finally { concurrent--; }
  };
  await processProjectQueue(config, renderer);
  assert.equal(peak, 1);
  assert.equal(readProjectJob(root, projectId, first.id).status, "ready");
  assert.equal(readProjectJob(root, projectId, second.id).status, "ready");
});

test("MM-05: cancelling an active durable job aborts its renderer and never publishes video", async (t) => {
  const { root, config, projectId } = fixture(t);
  const job = createProjectJob(root, projectId, 1);
  let entered;
  const started = new Promise((resolve) => { entered = resolve; });
  let observedAbort = false;
  const work = runProjectJob(config, projectId, job.id, async (_config, _revision, _outputDir, signal) => {
    assert.ok(signal, "renderer must receive a cancellation signal");
    entered();
    await new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => {
        observedAbort = true;
        reject(new Error("render interrupted"));
      }, { once: true });
    });
    throw new Error("cancelled renderer should never complete");
  });
  await started;
  transitionProjectJob(root, projectId, job.id, "cancel");
  assert.equal(cancelRunningProjectJob(root, projectId, job.id), true);
  await work;
  assert.equal(observedAbort, true);
  assert.equal(cancelRunningProjectJob(root, projectId, job.id), false);
  assert.equal(readProjectJob(root, projectId, job.id).status, "cancelled");
  assert.equal(readProjectJob(root, projectId, job.id).artifact, undefined);
});

test("MM-09: reject symlinked renderer output instead of exporting an external MP4", async (t) => {
  const { root, config, projectId } = fixture(t);
  const job = createProjectJob(root, projectId, 1);
  const outside = await ffmpegRenderer(config, null, root);
  const work = await import("node:fs");
  const external = join(root, "film.mp4");
  assert.equal(outside, external);
  await runProjectJob(config, projectId, job.id, async (_config, _revision, outputDir) => {
    const link = join(outputDir, "film.mp4");
    work.symlinkSync(external, link);
    return link;
  });
  const saved = readProjectJob(root, projectId, job.id);
  assert.equal(saved.status, "failed");
  assert.equal(saved.artifact, undefined);
  assert.equal(existsSync(join(root, "workspace", "projects", projectId, "artifacts", job.id + ".mp4")), false);
  assert.equal(existsSync(external), true, "original external video must not be removed");
});

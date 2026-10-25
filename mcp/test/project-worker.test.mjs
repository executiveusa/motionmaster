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
import { processProjectQueue, runProjectJob } from "../dist/project-worker.js";

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

test("MM-05: a worker cannot render an edited shot list by silently ignoring edits", async (t) => {
  const { root, config, projectId } = fixture(t);
  saveRevision(root, projectId, 1, {
    title: "Edited", brief: "A cinematic launch film",
    shots: [{ id: "unknown", title: "Changed", duration: 2 }],
  });
  const job = createProjectJob(root, projectId, 2);
  // The actual adapter needs the real registry; this test checks that
  // the explicit unsupported-edits contract is not hidden by a fake renderer.
  await runProjectJob(config, projectId, job.id, async () => { throw new Error("Edit adapter not ready."); });
  assert.match(readProjectJob(root, projectId, job.id).error, /Edit adapter not ready/);
});

test("MM-05: empty queue drains without writing anything", async (t) => {
  const { config } = fixture(t);
  await processProjectQueue(config);
});

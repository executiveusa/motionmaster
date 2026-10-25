import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { loadConfig } from "../dist/config.js";
import { createHttpHandler } from "../dist/index.js";
import { createProject, createProjectJob, saveRevision, transitionProjectJob } from "../dist/projects.js";
import { exportProjectSource, inspectProjectSource } from "../dist/project-source-bundle.js";

test("MM-09: source export retains immutable revisions, exact source bytes and licence warning", async (t) => {
  const prior = process.env.MOTION_MASTER_API_KEY;
  process.env.MOTION_MASTER_API_KEY = "mm09-source-test-key";
  const root = mkdtempSync(join(tmpdir(), "mm-source-"));
  const config = { ...loadConfig(), repoRoot: root, host: "127.0.0.1" };
  const server = createServer((req, res) => { void createHttpHandler(config)(req, res); });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    rmSync(root, { recursive: true, force: true });
    if (prior === undefined) delete process.env.MOTION_MASTER_API_KEY;
    else process.env.MOTION_MASTER_API_KEY = prior;
  });

  const { project } = createProject(root, { title: "Title", brief: "Original brief" });
  saveRevision(root, project.id, 1, { title: "Title v2", brief: "New brief", shots: [] });
  const job = createProjectJob(root, project.id, 2);
  const source = join(root, "workspace", "projects", project.id, "renders", job.id);
  mkdirSync(join(source, "compositions"), { recursive: true });
  writeFileSync(join(source, "index.html"), "<html>editable source</html>\n");
  writeFileSync(join(source, "hyperframes.json"), '{"paths":{"blocks":"compositions"}}\n');
  writeFileSync(join(source, "brief.json"), '{"brief":"New brief"}\n');
  const binary = Buffer.from([0, 255, 1, 128, 13, 10]);
  writeFileSync(join(source, "compositions", "shot.html"), binary);
  writeFileSync(join(source, "film.mp4"), "excluded from source archive");
  const videoDir = join(root, "workspace", "projects", project.id, "artifacts");
  mkdirSync(videoDir, { recursive: true });
  const video = join(videoDir, job.id + ".mp4");
  execFileSync("ffmpeg", [
    "-loglevel", "error", "-f", "lavfi", "-i", "color=c=green:s=320x180:r=12:d=0.5",
    "-c:v", "mpeg4", "-y", video,
  ], { timeout: 20_000 });
  const endpoint = `http://127.0.0.1:${server.address().port}/api/v1/projects/${project.id}/jobs/${job.id}/source`;
  const headers = { authorization: "Bearer mm09-source-test-key" };
  assert.equal((await fetch(endpoint, { headers })).status, 409, "pending job has no source download");
  transitionProjectJob(root, project.id, job.id, "start");
  transitionProjectJob(root, project.id, job.id, "complete", { artifact: `artifacts/${job.id}.mp4` });
  assert.equal((await fetch(endpoint)).status, 401);
  assert.equal((await fetch(endpoint, { headers: { authorization: "Bearer invalid" } })).status, 401);
  const response = await fetch(endpoint, { headers });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/gzip");
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  const archive = Buffer.from(await response.arrayBuffer());
  assert.deepEqual(archive, exportProjectSource(root, project.id, job.id), "archive is deterministic");
  const unpacked = inspectProjectSource(archive);
  assert.equal(unpacked.project.title, "Title v2");
  assert.equal(unpacked.revisions.length, 2);
  assert.equal(unpacked.revisions[0].brief, "Original brief");
  assert.equal(unpacked.revisions[1].brief, "New brief");
  assert.equal(unpacked.render.revision, 2);
  assert.equal(unpacked.licence.upstreamAssets, "review-required");
  assert.ok(unpacked.files.some((f) => f.path === "compositions/shot.html" &&
    Buffer.from(f.base64, "base64").equals(binary)));
  assert.ok(!unpacked.files.some((f) => f.path === "film.mp4"));
  assert.equal((await fetch(endpoint, { method: "POST", headers })).status, 405);

  const altered = JSON.parse(gunzipSync(archive).toString("utf8"));
  altered.files[0].sha256 = "0".repeat(64);
  assert.throws(() => inspectProjectSource(gzipSync(Buffer.from(JSON.stringify(altered)))), /checksum/);
  assert.throws(() => inspectProjectSource(Buffer.from("not-gzip")));

  const external = join(root, "external");
  mkdirSync(external);
  symlinkSync(external, join(source, "compositions", "linked"));
  assert.throws(() => exportProjectSource(root, project.id, job.id), /Symlinks/);
  assert.equal((await fetch(endpoint, { headers })).status, 409);
});

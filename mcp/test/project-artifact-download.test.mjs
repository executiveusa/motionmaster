import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "../dist/config.js";
import { createHttpHandler } from "../dist/index.js";
import { createProject, createProjectJob, transitionProjectJob } from "../dist/projects.js";

test("MM-09: completed MP4 download is bearer-protected, byte-perfect, and refuses unsafe artifacts", async (t) => {
  const previous = process.env.MOTION_MASTER_API_KEY;
  process.env.MOTION_MASTER_API_KEY = "private-mm09-test-token";
  const root = mkdtempSync(join(tmpdir(), "mm-artifact-"));
  const config = { ...loadConfig(), repoRoot: root, host: "127.0.0.1" };
  const handler = createHttpHandler(config);
  const server = createServer((req, res) => { void handler(req, res); });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    rmSync(root, { recursive: true, force: true });
    if (previous === undefined) delete process.env.MOTION_MASTER_API_KEY;
    else process.env.MOTION_MASTER_API_KEY = previous;
  });

  const { project } = createProject(root, { title: "Launch", brief: "A title film" });
  const job = createProjectJob(root, project.id, 1);
  const base = `http://127.0.0.1:${server.address().port}/api/v1/projects/${project.id}/jobs/${job.id}`;
  const headers = { authorization: "Bearer private-mm09-test-token" };
  const pending = await fetch(base + "/artifact", { headers });
  assert.equal(pending.status, 409, "unrendered jobs are never downloadable");
  assert.equal((await fetch(base + "/artifact")).status, 401, "no anonymous access");
  assert.equal((await fetch(base + "/artifact", { headers: { authorization: "Bearer wrong" } })).status, 401);

  const artifactDir = join(root, "workspace", "projects", project.id, "artifacts");
  mkdirSync(artifactDir, { recursive: true });
  const video = join(artifactDir, job.id + ".mp4");
  execFileSync("ffmpeg", [
    "-loglevel", "error", "-f", "lavfi", "-i", "color=c=blue:s=320x180:r=12:d=0.5",
    "-c:v", "mpeg4", "-y", video,
  ], { timeout: 20_000 });
  const expected = readFileSync(video);
  assert.ok(expected.length > 0);
  transitionProjectJob(root, project.id, job.id, "start");
  transitionProjectJob(root, project.id, job.id, "complete", { artifact: `artifacts/${job.id}.mp4` });

  const status = await fetch(base, { headers });
  assert.equal(status.status, 200);
  assert.equal((await status.json()).downloadUrl, `/api/v1/projects/${project.id}/jobs/${job.id}/artifact`);
  const response = await fetch(base + "/artifact", { headers });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "video/mp4");
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(Number(response.headers.get("content-length")), expected.length);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), expected, "download must preserve MP4 bytes");

  const head = await fetch(base + "/artifact", { method: "HEAD", headers });
  assert.equal(head.status, 200);
  assert.equal(Number(head.headers.get("content-length")), expected.length);
  assert.equal((await head.arrayBuffer()).byteLength, 0);
  assert.equal((await fetch(base + "/artifact", { method: "POST", headers })).status, 405);
  assert.equal((await fetch(base.replace(job.id, "j_missing") + "/artifact", { headers })).status, 404);

  const outside = join(root, "outside.mp4");
  writeFileSync(outside, expected);
  unlinkSync(video);
  symlinkSync(outside, video);
  assert.equal((await fetch(base + "/artifact", { headers })).status, 403, "symlink artifacts must be denied");
  unlinkSync(video);
  assert.equal(existsSync(video), false);
  assert.equal((await fetch(base + "/artifact", { headers })).status, 404, "missing files must fail closed");
});

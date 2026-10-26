import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { loadConfig } from "../dist/config.js";
import { createHttpHandler } from "../dist/index.js";
import { listProjectJobs, listProjects, readProject, readRevision } from "../dist/projects.js";
import { importProjectSource, inspectProjectSource } from "../dist/project-source-bundle.js";

const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const entry = (path, bytes) => ({
  path, size: bytes.length, sha256: sha(bytes), base64: bytes.toString("base64"),
});
const zip = (bundle) => gzipSync(Buffer.from(JSON.stringify(bundle)));

function fixture() {
  const createdAt = "2026-10-25T00:00:00.000Z";
  const sourceId = "p_original";
  const first = {
    schemaVersion: 1, projectId: sourceId, number: 1, createdAt,
    title: "Original", brief: "A calm opening", shots: [],
  };
  const second = {
    ...first, number: 2, title: "Edited", brief: "A calm closing",
    shots: [{ id: "title-card", title: "Closing", duration: 3.5 }],
  };
  const html = Buffer.from("<html><script>window.untrusted = true</script></html>");
  const binary = Buffer.from([0, 255, 1, 128, 13, 10]);
  return {
    format: "motion-master-source", version: 1,
    project: { title: second.title, brief: second.brief, sourceId },
    revisions: [first, second],
    render: { jobId: "j_original", revision: 2 },
    licence: { product: null, upstreamAssets: "review-required", note: "Check original rights" },
    files: [
      entry("index.html", html),
      entry("hyperframes.json", Buffer.from("{}")),
      entry("compositions/scene.html", Buffer.from("<div>editable</div>")),
      entry("assets/original.bin", binary),
    ],
  };
}

test("MM-09: reimport creates a new project, preserves edits and quarantines source without creating a ready job", (t) => {
  const root = mkdtempSync(join(tmpdir(), "mm-import-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const bundle = fixture();
  const imported = importProjectSource(root, zip(bundle));
  assert.notEqual(imported.project.id, bundle.project.sourceId);
  assert.equal(imported.sourceId, bundle.project.sourceId);
  assert.equal(imported.project.currentRevision, 2);
  assert.equal(imported.revision.brief, "A calm closing");
  assert.deepEqual(imported.revision.shots, bundle.revisions[1].shots);
  assert.equal(readRevision(root, imported.project.id, 1).brief, "A calm opening");
  assert.equal(readProject(root, imported.project.id).project.title, "Edited");
  assert.deepEqual(listProjectJobs(root, imported.project.id), [], "an imported source is not a verified render");
  const base = join(root, "workspace", "projects", imported.project.id, "imports", "j_original");
  assert.deepEqual(readFileSync(join(base, "assets", "original.bin")), Buffer.from([0, 255, 1, 128, 13, 10]));
  assert.match(readFileSync(join(base, "import.json"), "utf8"), /untrusted/);
  assert.equal(imported.importedFiles, 4);

  const before = listProjects(root).length;
  const badPath = structuredClone(bundle);
  badPath.files[2].path = "compositions/../escape.html";
  assert.throws(() => importProjectSource(root, zip(badPath)), /Unsafe/);
  const badRevision = structuredClone(bundle);
  badRevision.revisions[1].number = 9;
  assert.throws(() => inspectProjectSource(zip(badRevision)), /revision history/);
  const badSource = structuredClone(bundle);
  badSource.revisions[0].projectId = "p_different";
  assert.throws(() => importProjectSource(root, zip(badSource)), /revision history/);
  const badShot = structuredClone(bundle);
  badShot.revisions[1].shots[0].duration = -2;
  assert.throws(() => importProjectSource(root, zip(badShot)), /revision history/);
  assert.equal(listProjects(root).length, before, "invalid imports must not create projects");
});

test("MM-09: source import HTTP endpoint is bearer-protected and reopens a durable project", async (t) => {
  const prior = process.env.MOTION_MASTER_API_KEY;
  process.env.MOTION_MASTER_API_KEY = "mm-import-private-test";
  const root = mkdtempSync(join(tmpdir(), "mm-import-http-"));
  const config = { ...loadConfig(), repoRoot: root, host: "127.0.0.1" };
  const handler = createHttpHandler(config);
  const server = createServer((req, res) => { void handler(req, res); });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    rmSync(root, { recursive: true, force: true });
    if (prior === undefined) delete process.env.MOTION_MASTER_API_KEY;
    else process.env.MOTION_MASTER_API_KEY = prior;
  });
  const base = `http://127.0.0.1:${server.address().port}/api/v1/projects`;
  const archive = zip(fixture());
  const headers = { authorization: "Bearer mm-import-private-test", "content-type": "application/gzip" };
  assert.equal((await fetch(base + "/import", { method: "POST", body: archive, headers: { "content-type": "application/gzip" } })).status, 401);
  assert.equal((await fetch(base + "/import", { method: "POST", body: archive, headers: { ...headers, authorization: "Bearer wrong" } })).status, 401);
  assert.equal((await fetch(base + "/import", { method: "POST", body: archive, headers: { ...headers, "content-type": "application/json" } })).status, 415);
  assert.equal((await fetch(base + "/import", { method: "POST", body: Buffer.from("not gzip"), headers })).status, 400);
  const response = await fetch(base + "/import", { method: "POST", body: archive, headers });
  assert.equal(response.status, 201);
  const imported = await response.json();
  assert.equal(imported.project.currentRevision, 2);
  const reopened = await fetch(base + "/" + imported.project.id, { headers });
  assert.equal(reopened.status, 200);
  assert.equal((await reopened.json()).revision.brief, "A calm closing");
  const jobs = await fetch(base + "/" + imported.project.id + "/jobs", { headers });
  assert.deepEqual(await jobs.json(), []);
  assert.equal(listProjects(root).length, 1);
});

import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "../dist/config.js";
import { createHttpHandler } from "../dist/index.js";

async function fixture(t, host = "127.0.0.1") {
  const root = mkdtempSync(join(tmpdir(), "mm-private-gate-"));
  const config = { ...loadConfig(), repoRoot: root, host };
  const handler = createHttpHandler(config);
  const server = createServer((req, res) => { void handler(req, res); });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    rmSync(root, { recursive: true, force: true });
  });
  return { root, base: `http://127.0.0.1:${server.address().port}` };
}

function env(t, key, value) {
  const previous = process.env[key];
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
  t.after(() => {
    if (previous === undefined) delete process.env[key];
    else process.env[key] = previous;
  });
}

test("MM-06: private files, films, API and MCP refuse a network listener without a key", async (t) => {
  env(t, "MOTION_MASTER_API_KEY", undefined);
  env(t, "MOTION_MASTER_ALLOWED_ORIGINS", undefined);
  const { base } = await fixture(t, "0.0.0.0");
  for (const path of ["/files", "/files/test.txt", "/films", "/films/example/video", "/api/v1/projects", "/mcp"]) {
    const response = await fetch(base + path);
    assert.equal(response.status, 403, path);
  }
  const health = await fetch(base + "/health");
  assert.equal(health.status, 200);
  const document = await health.json();
  assert.equal(document.status, "ok");
  assert.equal(typeof document.name, "string");
  assert.equal(typeof document.version, "string");
  assert.deepEqual(Object.keys(document).sort(), ["name", "status", "version"]);
  // The unauthenticated probe must not disclose host configuration, local
  // paths, tenant names, tool inventory, token sources or licence records.
  for (const privateKey of ["mcpEndpoint", "tools", "skills", "clips", "tokens", "montage", "licence", "domain", "rendering"]) {
    assert.equal(Object.hasOwn(document, privateKey), false, privateKey);
  }
});

test("MM-06: bearer token protects local files, films, chat and MCP", async (t) => {
  env(t, "MOTION_MASTER_API_KEY", "test-secret-not-for-production");
  env(t, "MOTION_MASTER_ALLOWED_ORIGINS", undefined);
  const { base } = await fixture(t);
  for (const path of ["/files", "/films", "/api/v1/projects", "/chat", "/mcp"]) {
    const response = await fetch(base + path);
    assert.equal(response.status, 401, path);
  }
  const allowed = await fetch(base + "/files", {
    headers: { authorization: "Bearer test-secret-not-for-production" },
  });
  assert.equal(allowed.status, 200);
  assert.deepEqual((await allowed.json()).files, []);
});

test("MM-06: uploaded files are flat and cannot follow symlinks outside workspace", async (t) => {
  env(t, "MOTION_MASTER_API_KEY", undefined);
  env(t, "MOTION_MASTER_ALLOWED_ORIGINS", undefined);
  const { root, base } = await fixture(t);
  const files = join(root, "workspace", "files");
  mkdirSync(files, { recursive: true });
  writeFileSync(join(files, "sample.txt"), "private sample");
  const outside = join(root, "outside.txt");
  writeFileSync(outside, "outside secret");
  symlinkSync(outside, join(files, "linked.txt"));
  const ok = await fetch(base + "/files/sample.txt");
  assert.equal(ok.status, 200);
  assert.equal(await ok.text(), "private sample");
  const head = await fetch(base + "/files/sample.txt", { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(head.headers.get("content-length"), "14");
  for (const name of ["%2e%2e%2foutside.txt", "sub%2fsecret.txt", "%5csecret.txt"]) {
    const response = await fetch(base + "/files/" + name);
    assert.equal(response.status, 400, name);
  }
  const linked = await fetch(base + "/files/linked.txt");
  assert.equal(linked.status, 403);
  assert.equal((await fetch(base + "/files/sample.txt", { method: "DELETE" })).status, 405);
});

test("MM-13: authenticated private API JSON preserves the exact approved CORS origin", async (t) => {
  env(t, "MOTION_MASTER_API_KEY", "test-secret-not-for-production");
  env(t, "MOTION_MASTER_ALLOWED_ORIGINS", "https://owner-preview.example");
  const { base } = await fixture(t);
  const approved = await fetch(base + "/api/v1/projects", {
    headers: {
      origin: "https://owner-preview.example",
      authorization: "Bearer test-secret-not-for-production",
    },
  });
  assert.equal(approved.status, 200);
  assert.equal(approved.headers.get("access-control-allow-origin"), "https://owner-preview.example");
  assert.equal(approved.headers.get("vary"), "origin");

  const forbidden = await fetch(base + "/api/v1/projects", {
    headers: {
      origin: "https://untrusted.example",
      authorization: "Bearer test-secret-not-for-production",
    },
  });
  assert.equal(forbidden.status, 403);
  assert.notEqual(forbidden.headers.get("access-control-allow-origin"), "https://untrusted.example");
});

test("MM-09: real binary and multipart uploads round-trip exact bytes", async (t) => {
  env(t, "MOTION_MASTER_API_KEY", undefined);
  env(t, "MOTION_MASTER_ALLOWED_ORIGINS", undefined);
  const { base } = await fixture(t);
  const raw = Buffer.from([0, 255, 1, 0, 137, 80, 78, 71, 13, 10]);
  let response = await fetch(base + "/files", {
    method: "POST",
    headers: { "content-type": "image/png", "x-file-name": "raw.png" },
    body: raw,
  });
  assert.equal(response.status, 201);
  const rawFile = (await response.json()).file;
  response = await fetch(base + rawFile.url);
  assert.equal(response.status, 200);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), raw);

  const form = new FormData();
  form.append("file", new Blob([raw], { type: "image/png" }), "frame.png");
  response = await fetch(base + "/files", { method: "POST", body: form });
  assert.equal(response.status, 201);
  const multipartFile = (await response.json()).file;
  response = await fetch(base + multipartFile.url);
  assert.equal(response.status, 200);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), raw);
});

test("MM-06: cross-origin private browser access requires an explicit allowlist", async (t) => {
  env(t, "MOTION_MASTER_API_KEY", undefined);
  env(t, "MOTION_MASTER_ALLOWED_ORIGINS", undefined);
  const { base } = await fixture(t);
  const foreign = await fetch(base + "/files", { headers: { origin: "https://untrusted.example" } });
  assert.equal(foreign.status, 403);
  const local = await fetch(base + "/files", { headers: { origin: base } });
  assert.equal(local.status, 200);
  process.env.MOTION_MASTER_ALLOWED_ORIGINS = "https://owner-preview.example";
  const approved = await fetch(base + "/files", { headers: { origin: "https://owner-preview.example" } });
  assert.equal(approved.status, 200);
  const preflight = await fetch(base + "/files", {
    method: "OPTIONS",
    headers: { origin: "https://owner-preview.example", "access-control-request-method": "POST" },
  });
  assert.equal(preflight.status, 204);
  assert.match(preflight.headers.get("access-control-allow-headers"), /authorization/);
});

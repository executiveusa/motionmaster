import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { loadConfig } from "../dist/config.js";
import { startChatServer } from "../dist/index.js";

test("private combined mode serves UI, supports byte-range media and keeps MCP/health separate", async () => {
  const root = mkdtempSync(join(tmpdir(), "mm-single-origin-"));
  const dist = join(root, "site", "dist");
  mkdirSync(join(dist, "assets"), { recursive: true });
  writeFileSync(join(dist, "index.html"), "<!doctype html><title>Motion Master private test</title>");
  writeFileSync(join(dist, "assets", "app.js"), "console.log('ok');");
  writeFileSync(join(dist, "clip.mp4"), Buffer.from("0123456789abcdef"));
  const original = process.env.MOTION_MASTER_SERVE_SITE;
  process.env.MOTION_MASTER_SERVE_SITE = "1";
  const config = { ...loadConfig(), host: "127.0.0.1", port: 0, repoRoot: root };
  const running = await startChatServer(config);
  const port = running.server.address().port;
  const base = `http://127.0.0.1:${port}`;
  try {
    let response = await fetch(base + "/");
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /text\/html/);
    assert.match(await response.text(), /Motion Master private test/);

    response = await fetch(base + "/assets/app.js");
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /javascript/);

    response = await fetch(base + "/clip.mp4", { headers: { range: "bytes=2-5" } });
    assert.equal(response.status, 206);
    assert.equal(response.headers.get("content-range"), "bytes 2-5/16");
    assert.equal(await response.text(), "2345");

    response = await fetch(base + "/clip.mp4", { method: "HEAD" });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-length"), "16");

    response = await fetch(base + "/%00secrets");
    assert.equal(response.status, 403);

    response = await fetch(base + "/health");
    assert.equal(response.status, 200);
    assert.equal((await response.json()).name, "motion-master");

    response = await fetch(base + "/nothing-here");
    assert.equal(response.status, 404);
  } finally {
    await running.close();
    if (original === undefined) delete process.env.MOTION_MASTER_SERVE_SITE;
    else process.env.MOTION_MASTER_SERVE_SITE = original;
    rmSync(root, { recursive: true, force: true });
  }
});

test("a non-loopback configuration refuses combined-mode serving", async () => {
  const root = mkdtempSync(join(tmpdir(), "mm-non-loopback-"));
  const dist = join(root, "site", "dist");
  mkdirSync(dist, { recursive: true });
  writeFileSync(join(dist, "index.html"), "private");
  const original = process.env.MOTION_MASTER_SERVE_SITE;
  process.env.MOTION_MASTER_SERVE_SITE = "1";
  const config = { ...loadConfig(), host: "0.0.0.0", port: 0, repoRoot: root };
  const running = await startChatServer(config);
  const port = running.server.address().port;
  try {
    const response = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(response.status, 403);
  } finally {
    await running.close();
    if (original === undefined) delete process.env.MOTION_MASTER_SERVE_SITE;
    else process.env.MOTION_MASTER_SERVE_SITE = original;
    rmSync(root, { recursive: true, force: true });
  }
});

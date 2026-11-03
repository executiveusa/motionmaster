import test from "node:test";
import assert from "node:assert/strict";
import { requestHunyuanVisual } from "../dist/hunyuan-prompt.js";

test("Hunyuan stays explicitly disabled by default", async () => {
  const result = await requestHunyuanVisual("ACME", { enabled: false });
  assert.equal(result.visual, "");
  assert.match(result.warning, /not enabled/i);
});

test("Hunyuan refuses non-loopback or credential-bearing worker URLs", async () => {
  let called = false;
  const fetchImpl = async () => { called = true; throw Error("must not run"); };
  for (const workerUrl of [
    "https://api.vendor.example/enhance",
    "http://169.254.169.254/enhance",
    "http://user:pass@127.0.0.1:8789/enhance",
    "http://127.0.0.1:8789/other",
    "http://127.0.0.1:8789/enhance?x=1",
  ]) {
    const result = await requestHunyuanVisual("ACME", { enabled: true, workerUrl, fetchImpl });
    assert.equal(result.visual, "");
    assert.match(result.warning, /loopback/i);
  }
  assert.equal(called, false);
});

test("Hunyuan accepts a bounded local visual suggestion and makes no render call", async () => {
  let calls = 0;
  const fetchImpl = async (url, options) => {
    calls++;
    assert.equal(String(url), "http://127.0.0.1:8789/enhance");
    assert.equal(options.method, "POST");
    assert.deepEqual(JSON.parse(options.body), { prompt: "ACME logo reveal" });
    return new Response(JSON.stringify({ enhanced: "Warm cinematic light; high contrast typography" }), { status: 200 });
  };
  const result = await requestHunyuanVisual("ACME logo reveal", {
    enabled: true, workerUrl: "http://127.0.0.1:8789/enhance", fetchImpl,
  });
  assert.equal(result.visual, "Warm cinematic light; high contrast typography");
  assert.equal(calls, 1);
});

test("Hunyuan errors or malformed output fall back without changing the original", async () => {
  for (const fetchImpl of [
    async () => { throw Error("offline"); },
    async () => new Response(JSON.stringify({ enhanced: "" }), { status: 200 }),
    async () => new Response(JSON.stringify({ enhanced: "x".repeat(4001) }), { status: 200 }),
  ]) {
    const result = await requestHunyuanVisual("ACME unchanged", {
      enabled: true, workerUrl: "http://127.0.0.1:8789/enhance", fetchImpl,
    });
    assert.equal(result.visual, "");
    assert.match(result.warning, /unavailable/i);
  }
});

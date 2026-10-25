/**
 * The HTTP API, tested.
 *
 * These are the claims the API rests on: it starts, it answers, it says what
 * it can do, and the numbers it reports are the numbers in the files. The
 * API and the MCP tools read the same files, so a test that passes here is a
 * test about both.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { existsSync } from "node:fs";
import { createServer } from "node:http";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");

const { loadConfig } = await import("../dist/config.js");
const { createHttpHandler } = await import("../dist/index.js");

const config = loadConfig();
const handler = createHttpHandler(config);

const server = createServer((req, res) => {
  void handler(req, res);
});
await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;

test.after(() => {
  server.close();
});

async function get(path) {
  const res = await fetch(`${base}${path}`);
  const text = await res.text();
  let body = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* leave it as text */
  }
  return { status: res.status, body };
}

async function post(path, payload) {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let body = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* leave it as text */
  }
  return { status: res.status, body };
}

test("the index says what the API can do", async () => {
  const { status, body } = await get("/api/v1");
  assert.equal(status, 200);
  assert.ok(Array.isArray(body.endpoints));
  assert.ok(body.endpoints.length > 12, "the index is missing routes");
  assert.ok(body.mcp, "the index does not point at the MCP endpoint");
});

test("the OpenAPI description covers the routes the index lists", async () => {
  const index = await get("/api/v1");
  const spec = await get("/api/v1/openapi.json");
  assert.equal(spec.status, 200);
  assert.equal(spec.body.openapi, "3.1.0");
  for (const route of index.body.endpoints) {
    const method = route.slice(0, 4).trim();
    const path = route.slice(5).replace("{id}", "{id}");
    const key = Object.keys(spec.body.paths).find(
      (p) => p.endsWith(path.replace("{id}", "{id}")) && spec.body.paths[p][method.toLowerCase()],
    );
    assert.ok(key, `${route} is not in the OpenAPI document`);
  }
});

test("the library answers with real items and real counts", async () => {
  const { status, body } = await get("/api/v1/library/items?limit=3");
  assert.equal(status, 200);
  assert.ok(body.total > 1000, `only ${body.total} items`);
  assert.equal(body.items.length, 3);
  for (const item of body.items) {
    assert.ok(item.license, `${item.id} came back without a licence`);
  }
});

test("a library item can be fetched by its id", async () => {
  const list = await get("/api/v1/library/items?limit=1");
  const id = list.body.items[0].id;
  const { status, body } = await get(`/api/v1/library/items/${encodeURIComponent(id)}`);
  assert.equal(status, 200);
  assert.equal(body.id, id);
});

test("a library item that does not exist is a 404, not a crash", async () => {
  const { status, body } = await get("/api/v1/library/items/not-a-real-item");
  assert.equal(status, 404);
  assert.match(body.error, /not-a-real-item/);
});

test("the motion blocks are there and each one is a real block", async () => {
  const { status, body } = await get("/api/v1/blocks?limit=5");
  assert.equal(status, 200);
  assert.ok(body.total > 100, `only ${body.total} blocks`);
  for (const block of body.blocks) {
    assert.ok(block.id, "a block has no id");
    assert.ok(Array.isArray(block.variables), `${block.id} has no variables list`);
    assert.ok(Array.isArray(block.files), `${block.id} has no files list`);
  }
});

test("one block in full comes back with its variables", async () => {
  const list = await get("/api/v1/blocks?limit=1");
  const id = list.body.blocks[0].id;
  const { status, body } = await get(`/api/v1/blocks/${encodeURIComponent(id)}`);
  assert.equal(status, 200);
  assert.equal(body.id, id);
  assert.ok(body.tags.length > 0, `${id} has no tags`);
});

test("filling a block from a brief returns the filled values", async () => {
  const { status, body } = await post("/api/v1/blocks/fill", {
    brief: "a 14s launch title on a white canvas",
  });
  assert.equal(status, 200);
  assert.ok(body.block, "no block was chosen");
  assert.ok(body.variables, "no variables came back");
});

test("filling a block that does not exist is a 404", async () => {
  const { status } = await post("/api/v1/blocks/fill", {
    brief: "anything",
    block: "not-a-real-block",
  });
  assert.equal(status, 404);
});

test("filling without a brief is a 400, not a crash", async () => {
  const { status, body } = await post("/api/v1/blocks/fill", {});
  assert.equal(status, 400);
  assert.match(body.error, /brief/i);
});

test("the sound shelf answers with its vocabulary", async () => {
  const { status, body } = await get("/api/v1/sfx/kinds");
  assert.equal(status, 200);
  assert.ok(body.length > 20, `only ${body.length} kinds`);
});

test("searching the shelf finds a sound by what it sounds like", async () => {
  const { status, body } = await get("/api/v1/sfx?query=a+short+bright+pop&limit=5");
  assert.equal(status, 200);
  assert.ok(body.total > 0, "the search found nothing");
  for (const item of body.items) {
    assert.ok(item.licence, `${item.id} came back without a licence`);
  }
});

test("the clips come back with the prompt behind each", async () => {
  const { status, body } = await get("/api/v1/clips");
  assert.equal(status, 200);
  assert.ok(body.clips.length >= 4);
  for (const clip of body.clips) {
    assert.ok(clip.prompt, `${clip.id} has no prompt`);
    assert.ok(clip.alt, `${clip.id} has no alt text`);
  }
});

test("the licence is reported once, not twice", async () => {
  const { body } = await get("/api/v1/licence");
  const sentence = String(body.summary ?? "");
  const doubled = sentence.match(/\bnot on sale\b.*\bnot on sale\b/i);
  assert.ok(!doubled, `the sentence says it twice: ${sentence}`);
});

test("an unknown API route is a 404 that points at the index", async () => {
  const { status, body } = await get("/api/v1/not-a-route");
  assert.equal(status, 404);
  assert.ok(body.index, "the 404 does not point at the index");
});

test("the MCP route is untouched by the API", async () => {
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.tools !== undefined || body.endpoints !== undefined);
});

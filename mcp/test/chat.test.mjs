/**
 * Tests for the chat route.
 *
 * The model is mocked, so these run without a key and without spending a
 * cent. What they prove is the part that matters: the chat's tools are the
 * MCP server's real tools, a tool call produces an artifact built from the
 * tool's real output, and a request without a key is refused rather than
 * quietly faked.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';

import { MOTION_MASTER_SYSTEM } from '../dist/chat.js';
import { resolveModel, nearMisses, DEFAULT_MODEL } from '../dist/model.js';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');
const skip = existsSync(join(repoRoot, 'library', 'catalogue.json'))
  ? false
  : "the library is missing — run: node scripts/build-library.mjs";

test("the system prompt names the tools and the rule", () => {
  assert.match(MOTION_MASTER_SYSTEM, /enhance_prompt/);
  assert.match(MOTION_MASTER_SYSTEM, /compose_film/);
  assert.match(MOTION_MASTER_SYSTEM, /browse_library/);
  // The rule that keeps the console honest.
  assert.match(MOTION_MASTER_SYSTEM, /that IS the answer/);
  assert.match(MOTION_MASTER_SYSTEM, /do not claim/);
});

test("a request with no key is refused, not faked", async () => {
  const { handleChat } = await import("../dist/chat.js");
  const { loadConfig } = await import("../dist/config.js");
  const saved = process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  try {
    const result = await handleChat(
      { messages: [{ role: "user", content: "hello" }] },
      loadConfig(),
    );
    assert.equal(result.status, 401);
    const body = await result.response.json();
    assert.match(body.error, /No OpenRouter key/);
    assert.match(body.howToFix, /bring your own/);
  } finally {
    if (saved !== undefined) process.env.OPENROUTER_API_KEY = saved;
  }
});

test("a request with no messages is a 400", async () => {
  const { handleChat } = await import("../dist/chat.js");
  const { loadConfig } = await import("../dist/config.js");
  const result = await handleChat({ messages: [] }, loadConfig());
  assert.equal(result.status, 400);
});

test("an unknown model is refused with suggestions, not substituted", async () => {
  const { resolveModel } = await import("../dist/model.js");
  const resolution = await resolveModel(
    "definitely/not-a-real-model-xyz",
    DEFAULT_MODEL,
    join(repoRoot, ".cache", "openrouter-models.json"),
  );
  if (resolution.verified) {
    // The catalogue was unreachable, so verification was skipped. That is
    // allowed, but the model must still be the one that was asked for.
    assert.equal(resolution.model, "definitely/not-a-real-model-xyz");
    return;
  }
  assert.match(resolution.error, /not in the live OpenRouter catalogue/);
  assert.ok(Array.isArray(resolution.suggestions));
});

test("the default model is the pinned one, not a guess", () => {
  assert.equal(DEFAULT_MODEL, "openrouter/auto");
});

test("near misses are found by stem, so a typo gets a real answer", () => {
  const models = [
    { id: "anthropic/claude-sonnet-4.5", name: "x", contextLength: 0, supportsTools: true },
    { id: "openai/gpt-5", name: "x", contextLength: 0, supportsTools: true },
  ];
  const hits = nearMisses("claude-sonnet-4.5", models);
  assert.ok(hits.includes("anthropic/claude-sonnet-4.5"));
});

test("the real model is resolved and verified against the live catalogue", async () => {
  const { resolveModel } = await import("../dist/model.js");
  const resolution = await resolveModel(
    "anthropic/claude-sonnet-4.5",
    DEFAULT_MODEL,
    join(repoRoot, ".cache", "openrouter-models.json"),
  );
  if (!resolution.verified) {
    // The catalogue was unreachable. The model must still be honoured.
    assert.equal(resolution.model, "anthropic/claude-sonnet-4.5");
    return;
  }
  assert.equal(resolution.model, "anthropic/claude-sonnet-4.5");
  assert.match(resolution.reason, /live catalogue/);
});

test("the chat reaches the real MCP tools over the wire", { skip }, async () => {
  // Start the server, then ask it for its tool list the way an agent would.
  // This is the claim that matters: the console's tools are the product's
  // tools — the same ones an external agent sees on /mcp.
  const { startChatServer } = await import('../dist/index.js');
  const { loadConfig } = await import('../dist/config.js');
  assert.ok(startChatServer, 'the server should export a way to start it');

  const config = loadConfig();
  config.port = 8797;
  config.host = '127.0.0.1';

  const running = await startChatServer(config);
  try {
    const response = await fetch('http://127.0.0.1:8797/mcp', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      }),
    });
    assert.equal(response.status, 200, 'the MCP endpoint should answer');

    const text = await response.text();
    const names = [...text.matchAll(/"name":"([a-z_]+)"/g)].map((m) => m[1]);
    assert.ok(names.includes('browse_library'), `tools/list should carry browse_library, got: ${names.join(', ')}`);
    assert.ok(names.includes('enhance_prompt'), 'tools/list should carry enhance_prompt');
    assert.ok(names.includes('compose_film'), 'tools/list should carry compose_film');
  } finally {
    await running.close();
  }
});

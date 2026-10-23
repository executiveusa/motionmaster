/**
 * The end-to-end chat test.
 *
 * A real Motion Master MCP server runs on a real port. The chat connects to
 * it over HTTP, calls a real tool, and the tool's real output is what the
 * artifact is built from. Only the language model is mocked, so the test
 * costs nothing and needs no key.
 *
 * This is the claim the whole console rests on: **the chat's tools are the
 * product's tools.**
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { MockLanguageModelV3, simulateReadableStream } from 'ai/test';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');
const skip = existsSync(join(repoRoot, 'library', 'catalogue.json'))
  ? false
  : "the library is missing — run: node scripts/build-library.mjs";

const PORT = 8799;

async function waitForHealth(url, attempts = 40) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(`${url}/health`);
      if (response.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

/** Collect the parts of a UI message stream. */
async function readParts(response) {
  const parts = [];
  const reader = response.body?.getReader();
  if (!reader) return parts;
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let boundary = buffer.indexOf('\n\n');
    while (boundary !== -1) {
      const chunk = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const line = chunk.split('\n').find((l) => l.startsWith('data:'));
      const payload = line?.slice(5).trim();
      if (payload && payload !== '[DONE]') {
        try {
          parts.push(JSON.parse(payload));
        } catch {
          /* not a part */
        }
      }
      boundary = buffer.indexOf('\n\n');
    }
  }
  return parts;
}

test("the chat calls a real tool and the artifact is built from its real output", { skip }, async () => {
  const child = spawn(process.execPath, [join(repoRoot, 'mcp', 'dist', 'index.js')], {
    env: { ...process.env, MOTION_MASTER_MCP_PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    const base = `http://127.0.0.1:${PORT}`;
    const up = await waitForHealth(base);
    assert.ok(up, "the MCP server did not start");

    const { handleChat } = await import('../dist/chat.js');
    const { loadConfig } = await import('../dist/config.js');

    const config = loadConfig();
    config.port = PORT;

    // A model that calls browse_library and then says something.
    let step = 0;
    const model = new MockLanguageModelV3({
      doStream: async () => {
        step += 1;
        if (step === 1) {
          return {
            stream: simulateReadableStream({
              chunks: [
                {
                  type: 'tool-call',
                  toolCallId: 'call-1',
                  toolName: 'browse_library',
                  input: JSON.stringify({ kind: 'style', limit: 2 }),
                },
                {
                  type: 'finish',
                  finishReason: { unified: 'tool-calls', raw: 'tool_calls' },
                  usage: {
                    inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
                    outputTokens: { total: 5, text: 5, reasoning: 0 },
                  },
                },
              ],
            }),
          };
        }
        return {
          stream: simulateReadableStream({
            chunks: [
              { type: 'text-start', id: '0' },
              { type: 'text-delta', id: '0', delta: 'Here is a style.' },
              { type: 'text-end', id: '0' },
              {
                type: 'finish',
                finishReason: { unified: 'stop', raw: 'stop' },
                usage: {
                  inputTokens: { total: 20, noCache: 20, cacheRead: 0, cacheWrite: 0 },
                  outputTokens: { total: 8, text: 8, reasoning: 0 },
                },
              },
            ],
          }),
        };
      },
    });

    const result = await handleChat(
      { messages: [{ role: 'user', content: 'show me a style' }], apiKey: 'test-key' },
      config,
      undefined,
      { createModel: () => model },
    );

    assert.equal(result.status, 200, 'the chat should start');

    const parts = await readParts(result.response);
    const types = parts.map((p) => p.type);

    assert.ok(types.includes('text-delta'), 'the model text should stream');
    // The SDK announces a tool call with `tool-input-start` when the tool can
    // stream its input, and with `tool-input-available` when the input arrives
    // in one piece — which is what an MCP tool does.
    assert.ok(
      types.includes('tool-input-start') || types.includes('tool-input-available'),
      'the tool call should be announced',
    );

    const artifact = parts.find((p) => p.type === 'data-artifact');
    assert.ok(artifact, 'a tool call must produce an artifact');
    assert.equal(artifact.data.tool, 'browse_library');
    assert.equal(artifact.data.kind, 'library');

    // The artifact holds the tool's real output: real item ids, from the real
    // catalogue, not a description of them.
    const items = artifact.data.payload?.items;
    assert.ok(Array.isArray(items) && items.length > 0, 'the artifact must carry the real items');
    const first = items[0];
    assert.match(String(first.id), /:/, 'an item id should be a real catalogue id');
  } finally {
    child.kill('SIGTERM');
    await once(child, 'exit').catch(() => undefined);
  }
});

test("the chat refuses an unknown model instead of substituting one", { skip }, async () => {
  const { resolveModel } = await import('../dist/model.js');
  const resolution = await resolveModel(
    'not-a-real-model-nope',
    'openrouter/auto',
    join(repoRoot, '.cache', 'openrouter-models.json'),
  );
  if (resolution.verified) {
    // The catalogue was unreachable; the model must still be honoured.
    assert.equal(resolution.model, 'not-a-real-model-nope');
    return;
  }
  assert.ok(resolution.error, 'an unknown model must be an error');
  assert.equal(resolution.model, 'not-a-real-model-nope');
});

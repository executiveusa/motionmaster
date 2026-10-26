/**
 * The Montage handover, end to end.
 *
 * A fake Montage instance (a test double for the routes documented in
 * docs/05-MONTAGE-INTEGRATION.md) is started, the real MCP server is started
 * against it, and mix_footage is called for real. The test asserts that the
 * timeline travelled over the wire — the fake instance recorded the PUT, with
 * the expected version and the projected document.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { startFakeMontage } from "./fixtures/fake-montage-server.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const mcpDir = resolve(here, "..");
const port = 8792;
const baseUrl = `http://127.0.0.1:${port}`;

const TIMELINE = {
  cuts: [
    {
      type: "none",
      source: "footage/source.mp4",
      source_in_seconds: 0,
      in_seconds: 0,
      out_seconds: 3,
      animation: "ken-burns",
    },
    {
      type: "none",
      source: "footage/source.mp4",
      source_in_seconds: 3,
      in_seconds: 3,
      out_seconds: 14,
    },
  ],
  overlays: [
    { type: "hero_title", text: "Motion Master", in_seconds: 3, out_seconds: 9, position: "center" },
    { type: "section_title", text: "Product update", subtitle: "00:03", in_seconds: 0, out_seconds: 3 },
  ],
};

async function startServer(env = {}) {
  const child = spawn(process.execPath, ["dist/index.js"], {
    cwd: mcpDir,
    env: {
      ...process.env,
      MOTION_MASTER_MCP_HOST: "127.0.0.1",
      MOTION_MASTER_MCP_PORT: String(port),
      ...env,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    output += chunk;
  });
  child.stderr.on("data", (chunk) => {
    output += chunk;
  });

  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return { child, output: () => output };
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`The server did not start. Output:\n${output}`);
}

let montage;
let server;
let client;

test.before(async () => {
  montage = await startFakeMontage({ version: 3 });
  server = await startServer({
    MOTION_MASTER_MONTAGE_URL: montage.url,
    MOTION_MASTER_MONTAGE_TENANT: "tenant_owner",
  });
  client = new Client({ name: "motion-master-montage-test", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`));
  await client.connect(transport);
});

test.after(async () => {
  if (client) await client.close();
  if (server) {
    server.child.kill("SIGTERM");
    await once(server.child, "exit");
  }
  if (montage) await montage.close();
});

test("mix_footage hands the timeline to the Montage instance over its public API", async () => {
  const result = await client.callTool({
    name: "mix_footage",
    arguments: { timeline: TIMELINE },
  });

  assert.notEqual(result.isError, true, JSON.stringify(result.structuredContent));

  const payload = result.structuredContent;
  assert.equal(payload.delivered, true);
  assert.equal(payload.validation.valid, true);
  assert.equal(payload.montage.projectId, "demo-project");
  assert.equal(payload.montage.expectedVersion, 3);
  assert.equal(payload.montage.storedVersion, 4);

  // The instance really was contacted, on the documented routes.
  const paths = montage.requests.map((request) => `${request.method} ${request.path}`);
  assert.ok(paths.includes("GET /api/health"), "the health route was not called");
  assert.ok(paths.includes("GET /api/projects"), "the projects route was not called");
  assert.ok(
    paths.includes("GET /api/v1/projects/demo-project/timeline"),
    "the timeline route was not read",
  );
  assert.ok(
    paths.includes("PUT /api/v1/projects/demo-project/timeline"),
    "the timeline was not written",
  );
  assert.ok(
    paths.includes("POST /api/v1/projects/demo-project/validate"),
    "the project was not validated",
  );

  // The write carried the right version and the projected document.
  const put = montage.requests.find(
    (request) => request.method === "PUT" && request.path.endsWith("/timeline"),
  );
  assert.equal(put.body.expected_version, 3);
  assert.equal(put.body.timeline.version, 3);
  assert.equal(put.body.timeline.tracks.length, 2);
  const videoTrack = put.body.timeline.tracks.find((track) => track.type === "video");
  assert.equal(videoTrack.items.length, 2);
  assert.equal(videoTrack.items[0].assetId, "footage/source.mp4");
  assert.equal(videoTrack.items[0].durationSeconds, 3);
  const overlayTrack = put.body.timeline.tracks.find((track) => track.type === "overlay");
  assert.equal(overlayTrack.items.length, 2);
  assert.equal(overlayTrack.items[0].text, "Motion Master");

  // The tenant header is the documented local-auth header.
  assert.equal(put.headers["x-yappy-tenant"], "tenant_owner");
});

test("mix_footage refuses a timeline that would break the Montage rules", async () => {
  const result = await client.callTool({
    name: "mix_footage",
    arguments: {
      timeline: {
        cuts: [
          { type: "none", source: "a.mp4", in_seconds: 5, out_seconds: 2 },
          { type: "none", source: "b.mp4", start_seconds: 0, duration_seconds: 4 },
        ],
        overlays: [{ type: "not_a_real_overlay", text: "x" }],
      },
    },
  });
  assert.equal(result.isError, true);
  const issues = result.structuredContent.issues;
  assert.ok(issues.some((issue) => issue.message.includes("out_seconds")));
  assert.ok(issues.some((issue) => issue.message.includes("Unknown overlay type")));
});

test("the recorded licence stays available via the API, not the public health probe", async () => {
  const health = await (await fetch(`${baseUrl}/health`)).json();
  assert.deepEqual(Object.keys(health).sort(), ["name", "status", "version"]);
  const response = await fetch(`${baseUrl}/api/v1/licence`);
  assert.equal(response.status, 200);
  const licence = await response.json();
  assert.equal(licence.type, "paid-one-time");
  assert.equal(licence.status.onSale, false);
  assert.equal(licence.tiers[0].price, 99);
  assert.equal(licence.tiers[1].price, 399);
  assert.equal(licence.rendering.local.available, true);
  assert.equal(licence.rendering.hosted.tier, "studio");
  assert.equal(licence.rendering.hosted.allowance, null);
  assert.equal(licence.domain.url, null);
  assert.equal(licence.domain.tld, null);
});

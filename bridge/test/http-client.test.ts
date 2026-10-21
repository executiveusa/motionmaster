// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Motion Master
// This directory is a separate AGPL-3.0 work that talks to a Montage instance
// over its public HTTP/MCP interfaces. It is NOT part of the proprietary
// Motion Master product and is excluded from its licence by design.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { once } from "node:events";
import { MontageHttpClient } from "../src/http-client.ts";
import type { MontageProjectEvent } from "../src/types.ts";

/** A local stand-in for the Montage board API. */
async function startMockServer(): Promise<{ url: string; close: () => Promise<void> }> {
  const server: Server = createServer((request, response) => {
    const url = request.url ?? "/";
    if (url === "/api/health") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ ok: true, app: "backlot" }));
      return;
    }
    if (url === "/api/projects") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify([{ project_id: "demo", title: "Demo project", live: true }]));
      return;
    }
    if (url === "/api/project/demo/state") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ project_id: "demo", title: "Demo project" }));
      return;
    }
    if (url === "/api/project/demo/events") {
      response.writeHead(200, {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
      });
      response.write(`data: ${JSON.stringify({ type: "hello", project_id: "demo" })}\n\n`);
      response.write(`data: ${JSON.stringify({ type: "change", project_id: "demo" })}\n\n`);
      return; // keep the stream open
    }
    if (url.startsWith("/media/demo/")) {
      response.writeHead(200, { "content-type": "video/mp4" });
      response.end(Buffer.from([0, 0, 0, 0, 0]));
      return;
    }
    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ detail: "not found" }));
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return {
    url: `http://127.0.0.1:${port}`,
    close: async () => {
      server.closeAllConnections?.();
      server.close();
      await once(server, "close");
    },
  };
}

test("the bridge reads the board API", async () => {
  const mock = await startMockServer();
  try {
    const client = new MontageHttpClient({ baseUrl: mock.url });

    const health = await client.health();
    assert.equal(health.ok, true);
    assert.equal(health.app, "backlot");

    const projects = await client.listProjects();
    assert.equal(projects.length, 1);
    assert.equal(projects[0].project_id, "demo");

    const state = await client.getProjectState("demo");
    assert.equal(state.title, "Demo project");
  } finally {
    await mock.close();
  }
});

test("mediaUrl points at the Montage media endpoint", () => {
  const client = new MontageHttpClient({ baseUrl: "http://127.0.0.1:8000/" });
  assert.equal(
    client.mediaUrl("demo", "assets/video/source.mp4"),
    "http://127.0.0.1:8000/media/demo/assets/video/source.mp4",
  );
  assert.equal(
    client.thumbUrl("demo", "assets/poster.png", 320),
    "http://127.0.0.1:8000/thumb/demo/assets/poster.png?w=320",
  );
});

test("watchProject consumes the change feed", async () => {
  const mock = await startMockServer();
  try {
    const client = new MontageHttpClient({ baseUrl: mock.url });
    const events: MontageProjectEvent[] = [];
    const stop = client.watchProject("demo", (event) => events.push(event));

    const deadline = Date.now() + 5000;
    while (events.length < 2 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    stop();

    assert.deepEqual(
      events.map((event) => event.type),
      ["hello", "change"],
    );
    assert.equal(events[1].project_id, "demo");
  } finally {
    await mock.close();
  }
});

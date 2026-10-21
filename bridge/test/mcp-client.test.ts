// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Motion Master
// This directory is a separate AGPL-3.0 work that talks to a Montage instance
// over its public HTTP/MCP interfaces. It is NOT part of the proprietary
// Motion Master product and is excluded from its licence by design.

import { test } from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { McpStdioClient } from "../src/mcp-client.ts";
import { McpTimelineTransport, MontageTimelineStore } from "../src/timeline-store.ts";
import { buildExplainerTimeline } from "../src/explainer.ts";

const here = dirname(fileURLToPath(import.meta.url));
const serverScript = join(here, "fixtures", "fake-mcp-server.mjs");

test("the MCP client talks to a stdio server", async () => {
  const client = new McpStdioClient({ command: "node", args: [serverScript] });
  try {
    await client.start();
    const tools = await client.listTools();
    assert.ok(tools.some((tool) => tool.name === "timeline_replace"));

    const validation = (await client.callTool("project_validate", {
      tenant_id: "tenant_owner",
      project_id: "prj_test",
    })) as { valid: boolean };
    assert.equal(validation.valid, true);
  } finally {
    await client.close();
  }
});

test("the timeline store reads and replaces a timeline over MCP", async () => {
  const client = new McpStdioClient({ command: "node", args: [serverScript] });
  try {
    await client.start();
    const store = new MontageTimelineStore({
      transport: new McpTimelineTransport(client),
      tenantId: "tenant_owner",
    });

    const current = await store.getTimeline("prj_test");
    assert.equal(current.version, 3);
    assert.ok(Array.isArray(current.tracks));

    const explainer = buildExplainerTimeline({
      source: "assets/video/source.mp4",
      durationSeconds: 16,
      title: "MOTION MASTER",
      sectionTitle: "SOURCE FOOTAGE",
    });

    const saved = await store.replaceTimeline("prj_test", explainer);
    assert.equal(saved.version, 4, "the stored timeline is versioned by Montage");
    assert.equal(saved.canvas.durationSeconds, 16);
    assert.equal(saved.tracks[0].items.length, 2);
    assert.equal(saved.tracks[0].items[0].startSeconds, 0);
    assert.equal(saved.tracks[0].items[0].sourceStartSeconds, 0);
    assert.equal(saved.tracks[1].items.length, 2);

    const roundTrip = await store.getExplainerTimeline("prj_test");
    assert.equal(roundTrip.cuts.length, 2);
    assert.equal(roundTrip.cuts[1].out_seconds, 16);
    assert.equal(roundTrip.overlays?.[0].type, "hero_title");

    const validation = await store.validateTimeline("prj_test");
    assert.equal(validation.valid, true);
  } finally {
    await client.close();
  }
});

test("a stale expected version is refused", async () => {
  const client = new McpStdioClient({ command: "node", args: [serverScript] });
  try {
    await client.start();
    const store = new MontageTimelineStore({
      transport: new McpTimelineTransport(client),
      tenantId: "tenant_owner",
    });
    await assert.rejects(
      () =>
        store.replaceTimeline(
          "prj_test",
          { version: 1, canvas: { width: 1920, height: 1080, fps: 30 }, tracks: [] },
          { expectedVersion: 1 },
        ),
      /version/i,
    );
  } finally {
    await client.close();
  }
});

// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Motion Master
// This directory is a separate AGPL-3.0 work that talks to a Montage instance
// over its public HTTP/MCP interfaces. It is NOT part of the proprietary
// Motion Master product and is excluded from its licence by design.

/**
 * A fake MCP server used by the bridge tests.
 *
 * It speaks the same wire format as the Montage MCP server (JSON-RPC 2.0 over
 * stdio, tools/call results returned as a JSON text content block) and
 * implements the same optimistic version rule for `timeline_replace`.
 *
 * Usage: node fake-mcp-server.mjs
 */

import { createInterface } from "node:readline";

const state = {
  timeline: {
    version: 3,
    canvas: { width: 1920, height: 1080, fps: 30, durationSeconds: 0 },
    tracks: [],
  },
};

const tools = [
  { name: "timeline_get", description: "Get canonical Timeline v1 state" },
  { name: "timeline_replace", description: "Replace canonical Timeline v1 state" },
  { name: "project_validate", description: "Validate canonical stored project state" },
  { name: "project_list", description: "List tenant projects" },
  { name: "project_get", description: "Get one tenant-owned project" },
  { name: "project_create", description: "Create a project" },
];

function callTool(name, args) {
  switch (name) {
    case "timeline_get":
      return state.timeline;
    case "timeline_replace": {
      const expected = Number(args.expected_version);
      if (!Number.isInteger(expected) || expected < 1) {
        throw new Error("expected_version must be an integer >= 1");
      }
      const incoming = args.timeline ?? {};
      if (incoming.version !== expected) {
        throw new Error("timeline.version must equal expected_version before save");
      }
      if (state.timeline.version !== expected) {
        throw new Error("version conflict");
      }
      state.timeline = { ...incoming, version: expected + 1 };
      return {
        projectId: args.project_id,
        updatedAt: "2026-10-21T00:00:00Z",
        timeline: state.timeline,
      };
    }
    case "project_validate":
      return {
        valid: true,
        schemaVersion: "1.0.0",
        projectId: args.project_id,
        tenantId: args.tenant_id,
      };
    case "project_list":
      return [{ projectId: "prj_test", title: "Test project" }];
    case "project_get":
      return { projectId: args.project_id, title: "Test project" };
    default:
      throw new Error(`unknown tool: ${name}`);
  }
}

const reader = createInterface({ input: process.stdin });
reader.on("line", (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let message;
  try {
    message = JSON.parse(trimmed);
  } catch {
    return;
  }
  if (typeof message.id !== "number") return; // notification

  const respond = (result) => {
    process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id: message.id, result })}\n`);
  };
  const fail = (code, messageText) => {
    process.stdout.write(
      `${JSON.stringify({
        jsonrpc: "2.0",
        id: message.id,
        error: { code, message: messageText },
      })}\n`,
    );
  };

  if (message.method === "initialize") {
    respond({
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "fake-montage-mcp", version: "0.0.1" },
    });
    return;
  }
  if (message.method === "tools/list") {
    respond({ tools });
    return;
  }
  if (message.method === "tools/call") {
    try {
      const value = callTool(message.params?.name, message.params?.arguments ?? {});
      respond({ content: [{ type: "text", text: JSON.stringify(value) }], isError: false });
    } catch (error) {
      respond({
        content: [{ type: "text", text: String(error instanceof Error ? error.message : error) }],
        isError: true,
      });
    }
    return;
  }
  fail(-32601, `method not found: ${message.method}`);
});

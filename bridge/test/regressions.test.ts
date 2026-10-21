// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Motion Master
// This directory is a separate AGPL-3.0 work that talks to a Montage instance
// over its public HTTP/MCP interfaces. It is NOT part of the proprietary
// Motion Master product and is excluded from its licence by design.

/**
 * Regression tests for three defects found in review:
 *
 *  1. The write-back path returned a document whose `version` was one behind what
 *     Montage actually stored (Montage stores `version + 1`).
 *  2. The Explainer -> Timeline v1 -> Explainer round trip silently dropped the
 *     media path of a cut, because the fallback expression collapsed to "".
 *  3. `MONTAGE_TOKEN` was documented in the README but never sent, so a Montage
 *     instance in hosted auth mode would reject every call.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MontageTimelineStore,
  HttpTimelineTransport,
  toTimelineDocument,
  fromTimelineDocument,
  type MontageTimelineTransport,
} from "../src/timeline-store.ts";
import { MontageHttpClient } from "../src/http-client.ts";
import type { ExplainerTimeline } from "../src/types.ts";

const EXPLAINER: ExplainerTimeline = {
  cuts: [
    {
      id: "cut-1",
      source: "assets/video/source.mp4",
      in_seconds: 0,
      out_seconds: 3,
      source_in_seconds: 0,
    },
    {
      id: "cut-2",
      source: "assets/video/source.mp4",
      in_seconds: 3,
      out_seconds: 16,
      source_in_seconds: 3,
    },
  ],
  overlays: [
    { type: "hero_title", in_seconds: 3, out_seconds: 14, text: "MOTION MASTER" },
  ],
};

/** A transport that records what it was asked to do and echoes nothing back. */
function silentTransport(): MontageTimelineTransport & { calls: unknown[][] } {
  const calls: unknown[][] = [];
  return {
    calls,
    async getTimeline() {
      calls.push(["getTimeline"]);
      return { version: 7, canvas: {}, tracks: [] };
    },
    async replaceTimeline(...args: unknown[]) {
      calls.push(["replaceTimeline", ...args]);
      return {}; // deliberately empty, so the fallback path is exercised
    },
    async validateProject() {
      calls.push(["validateProject"]);
      return { ok: true };
    },
  };
}

test("write-back reports the version Montage actually stored, not the one sent", async () => {
  const transport = silentTransport();
  const store = new MontageTimelineStore({ transport, tenantId: "tenant_owner" });

  const saved = await store.replaceTimeline("project-1", EXPLAINER, { expectedVersion: 7 });

  // Montage stores version + 1. The bridge must not hand back a stale version.
  assert.equal(saved.version, 8);
  assert.equal(transport.calls[0]?.[0], "replaceTimeline");
  assert.equal(transport.calls[0]?.[3], 7, "expected_version must be the version we sent");
});

test("a cut keeps its media path across the Timeline v1 round trip", () => {
  const document = toTimelineDocument(EXPLAINER, 1);
  const back = fromTimelineDocument(document);

  assert.equal(back.cuts.length, 2);
  assert.equal(back.cuts[0]?.source, "assets/video/source.mp4");
  assert.equal(back.cuts[1]?.source, "assets/video/source.mp4");
  assert.equal(back.cuts[1]?.source_in_seconds, 3);
  assert.equal(back.cuts[1]?.out_seconds, 16);
  assert.equal(back.overlays?.[0]?.text, "MOTION MASTER");
});

test("a cut with no recoverable source is an error, not a silent empty path", () => {
  const document = toTimelineDocument(EXPLAINER, 1);
  // Drop the cached explainer so the reconstruction path actually runs, and strip
  // both places the source can live, as a foreign document would.
  if (document.extensions) delete document.extensions.explainer;
  for (const track of document.tracks) {
    for (const item of track.items) {
      delete item.assetId;
      if (item.extensions) delete item.extensions.source;
    }
  }

  assert.throws(
    () => fromTimelineDocument(document),
    /carries no media source/,
    "a cut without a source must fail loudly rather than round trip to an empty path",
  );
});

test("MONTAGE_TOKEN is sent as a bearer token when set", async () => {
  const seen: { headers: Record<string, string> }[] = [];
  const client = new MontageHttpClient({
    baseUrl: "http://127.0.0.1:9999",
    token: "secret-token",
    fetchImpl: (async (_url: string, init?: RequestInit) => {
      const headers: Record<string, string> = {};
      new Headers(init?.headers).forEach((value, key) => {
        headers[key] = value;
      });
      seen.push({ headers });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch,
  });

  await client.health();

  assert.equal(seen[0]?.headers["authorization"], "Bearer secret-token");
});

test("the studio HTTP transport sends the bearer token as well", async () => {
  const seen: { url: string; headers: Record<string, string> }[] = [];
  const client = new MontageHttpClient({
    baseUrl: "http://127.0.0.1:9999",
    token: "hosted-token",
    fetchImpl: (async (url: string, init?: RequestInit) => {
      const headers: Record<string, string> = {};
      new Headers(init?.headers).forEach((value, key) => {
        headers[key] = value;
      });
      seen.push({ url, headers });
      return new Response(JSON.stringify({ version: 3, canvas: {}, tracks: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch,
  });

  const transport = new HttpTimelineTransport(client, "tenant_owner");
  await transport.getTimeline("tenant_owner", "project-1");

  // In hosted auth mode the studio API is the only way in (Montage's MCP server
  // is local-stdio only), so the token has to travel on this path too.
  assert.equal(seen[0]?.headers["authorization"], "Bearer hosted-token");
  assert.equal(seen[0]?.headers["x-yappy-tenant"], "tenant_owner");
  assert.match(seen[0]?.url ?? "", /\/api\/v1\/projects\/project-1\/timeline$/);
});

test("no Authorization header is sent when no token is configured", async () => {
  const seen: { headers: Record<string, string> }[] = [];
  const client = new MontageHttpClient({
    baseUrl: "http://127.0.0.1:9999",
    fetchImpl: (async (_url: string, init?: RequestInit) => {
      const headers: Record<string, string> = {};
      new Headers(init?.headers).forEach((value, key) => {
        headers[key] = value;
      });
      seen.push({ headers });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch,
  });

  await client.health();

  assert.equal(seen[0]?.headers["authorization"], undefined);
});

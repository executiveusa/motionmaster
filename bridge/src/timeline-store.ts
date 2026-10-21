// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Motion Master
// This directory is a separate AGPL-3.0 work that talks to a Montage instance
// over its public HTTP/MCP interfaces. It is NOT part of the proprietary
// Motion Master product and is excluded from its licence by design.

/**
 * Timeline operations against a Montage instance.
 *
 * The studio tools are the authority for timeline state:
 *   timeline_get(tenant_id, project_id)
 *   timeline_replace(tenant_id, project_id, expected_version, timeline)
 *   project_validate(tenant_id, project_id)
 *
 * `timeline_replace` is optimistic: the stored document's `version` must
 * equal `expected_version`, and the saved document gets `version + 1`.
 */

import { MontageHttpClient } from "./http-client.ts";
import { McpStdioClient } from "./mcp-client.ts";
import type {
  ExplainerTimeline,
  MontageOverlay,
  MontageOverlayType,
  MontageProjectValidation,
  MontageTimelineDocument,
  MontageTimelineItem,
} from "./types.ts";

/** Transport used to reach the timeline tools of a Montage instance. */
export interface MontageTimelineTransport {
  getTimeline(tenantId: string, projectId: string): Promise<unknown>;
  replaceTimeline(
    tenantId: string,
    projectId: string,
    expectedVersion: number,
    timeline: Record<string, unknown>,
  ): Promise<unknown>;
  validateProject(tenantId: string, projectId: string): Promise<unknown>;
}

/** Transport that calls the Montage MCP tools over stdio. */
export class McpTimelineTransport implements MontageTimelineTransport {
  private readonly client: McpStdioClient;

  constructor(client: McpStdioClient) {
    this.client = client;
  }

  async getTimeline(tenantId: string, projectId: string): Promise<unknown> {
    return this.client.callTool("timeline_get", { tenant_id: tenantId, project_id: projectId });
  }

  async replaceTimeline(
    tenantId: string,
    projectId: string,
    expectedVersion: number,
    timeline: Record<string, unknown>,
  ): Promise<unknown> {
    return this.client.callTool("timeline_replace", {
      tenant_id: tenantId,
      project_id: projectId,
      expected_version: expectedVersion,
      timeline,
    });
  }

  async validateProject(tenantId: string, projectId: string): Promise<unknown> {
    return this.client.callTool("project_validate", { tenant_id: tenantId, project_id: projectId });
  }
}

/**
 * Transport that calls the Montage studio HTTP API instead of MCP.
 *
 * Routes (verified in the Montage repository):
 *   GET  /api/v1/projects/{project_id}/timeline
 *   PUT  /api/v1/projects/{project_id}/timeline   body: { expected_version, timeline }
 *   POST /api/v1/projects/{project_id}/validate
 * In local auth mode the `X-Yappy-Tenant` header is required.
 */
export class HttpTimelineTransport implements MontageTimelineTransport {
  private readonly http: MontageHttpClient;
  private readonly tenantId: string;

  constructor(http: MontageHttpClient, tenantId: string) {
    this.http = http;
    this.tenantId = tenantId;
  }

  private async request(path: string, init: RequestInit = {}): Promise<unknown> {
    const headers = new Headers(init.headers);
    headers.set("X-Yappy-Tenant", this.tenantId);
    if (init.body) headers.set("Content-Type", "application/json");
    // `requestWithAuth` (not a bare `fetch`) so a configured MONTAGE_TOKEN is
    // sent here too: in hosted auth mode this studio API is the only way in,
    // and it rejects calls without the bearer token.
    const response = await this.http.requestWithAuth(path, { ...init, headers });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Montage studio API ${response.status} for ${path}: ${body.slice(0, 300)}`);
    }
    return response.json();
  }

  async getTimeline(tenantId: string, projectId: string): Promise<unknown> {
    void tenantId;
    return this.request(`/api/v1/projects/${encodeURIComponent(projectId)}/timeline`);
  }

  async replaceTimeline(
    tenantId: string,
    projectId: string,
    expectedVersion: number,
    timeline: Record<string, unknown>,
  ): Promise<unknown> {
    void tenantId;
    return this.request(`/api/v1/projects/${encodeURIComponent(projectId)}/timeline`, {
      method: "PUT",
      body: JSON.stringify({ expected_version: expectedVersion, timeline }),
    });
  }

  async validateProject(tenantId: string, projectId: string): Promise<unknown> {
    void tenantId;
    return this.request(`/api/v1/projects/${encodeURIComponent(projectId)}/validate`, {
      method: "POST",
    });
  }
}

/** Options for {@link MontageTimelineStore}. */
export interface MontageTimelineStoreOptions {
  transport: MontageTimelineTransport;
  /** Tenant that owns the projects. Default: `MONTAGE_TENANT_ID` or `tenant_owner`. */
  tenantId?: string;
}

function isTimelineDocument(value: unknown): value is MontageTimelineDocument {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as MontageTimelineDocument).version === "number" &&
    Array.isArray((value as MontageTimelineDocument).tracks)
  );
}

function isExplainerTimeline(value: unknown): value is ExplainerTimeline {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as ExplainerTimeline).cuts)
  );
}

/**
 * Project an Explainer timeline onto the canonical Timeline v1 document.
 *
 * The mapping is written by this bridge (Montage does not define one). Cuts
 * become `video` track items, overlays become `text`/`overlay` track items,
 * and the untouched Explainer document is kept under
 * `extensions.explainer` so nothing is lost in the round trip.
 */
export function toTimelineDocument(
  explainer: ExplainerTimeline,
  version: number,
  options: { fps?: number; width?: number; height?: number; background?: string | null } = {},
): MontageTimelineDocument {
  const fps = options.fps ?? 30;
  const width = options.width ?? 1920;
  const height = options.height ?? 1080;
  const durationSeconds = explainer.cuts.reduce(
    (max, cut) => Math.max(max, cut.out_seconds ?? 0),
    0,
  );

  const videoItems: MontageTimelineItem[] = explainer.cuts.map((cut, index) => {
    const duration = Math.max(0, (cut.out_seconds ?? 0) - (cut.in_seconds ?? 0));
    return {
      id: cut.id || `cut-${index + 1}`,
      kind: "asset",
      assetId: typeof cut.source === "string" ? cut.source : null,
      startSeconds: cut.in_seconds ?? 0,
      durationSeconds: duration,
      sourceStartSeconds: cut.source_in_seconds ?? 0,
      sourceEndSeconds: (cut.source_in_seconds ?? 0) + duration,
      extensions: {
        source: cut.source ?? null,
        animation: cut.animation ?? null,
        layer: cut.layer ?? "primary",
        cutType: cut.type ?? null,
      },
    };
  });

  const overlayItems: MontageTimelineItem[] = (explainer.overlays ?? []).map((overlay, index) => ({
    id: `overlay-${index + 1}`,
    kind: "text",
    startSeconds: overlay.in_seconds ?? 0,
    durationSeconds: Math.max(0, (overlay.out_seconds ?? 0) - (overlay.in_seconds ?? 0)),
    text: overlay.text ?? null,
    extensions: {
      overlayType: overlay.type,
      subtitle: overlay.subtitle ?? null,
      accentColor: overlay.accentColor ?? null,
      position: overlay.position ?? null,
    },
  }));

  return {
    version,
    canvas: {
      width,
      height,
      fps,
      durationSeconds,
      background: options.background ?? null,
    },
    tracks: [
      { id: "video", type: "video", order: 0, items: videoItems },
      { id: "overlay", type: "overlay", order: 1, items: overlayItems },
    ],
    extensions: {
      explainer,
      generator: "motion-master-montage-bridge",
    },
  };
}

/** Read an Explainer timeline back out of a Timeline v1 document. */
export function fromTimelineDocument(document: MontageTimelineDocument): ExplainerTimeline {
  const stored = document.extensions?.explainer;
  if (isExplainerTimeline(stored)) return stored;

  const cuts = (document.tracks ?? [])
    .filter((track) => track.type === "video" || track.type === "audio")
    .flatMap((track) => track.items)
    .map((item) => {
      const start = item.startSeconds ?? 0;
      const duration = item.durationSeconds ?? 0;
      // The cut's media path lives in `extensions.source` (written by
      // `toTimelineDocument`) and, as a fallback, in `assetId`. Never silently
      // turn a real cut into an empty source: that loses the footage on the
      // round trip and fails validation on the way back in.
      const source =
        (item.extensions?.source as string | undefined) ??
        (typeof item.assetId === "string" && item.assetId.length > 0 ? item.assetId : undefined);
      if (source === undefined) {
        throw new Error(
          `Timeline item ${item.id} carries no media source. The stored document is ` +
            "missing extensions.source and assetId, so the cut cannot be reconstructed.",
        );
      }
      return {
        id: item.id,
        source,
        in_seconds: start,
        out_seconds: start + duration,
        source_in_seconds: item.sourceStartSeconds ?? 0,
        animation: (item.extensions?.animation as string | undefined) ?? undefined,
        layer: (item.extensions?.layer as string | undefined) ?? "primary",
      };
    });

  const overlays: MontageOverlay[] = (document.tracks ?? [])
    .filter((track) => track.type === "text" || track.type === "overlay" || track.type === "caption")
    .flatMap((track) => track.items)
    .map((item) => {
      const start = item.startSeconds ?? 0;
      return {
        type: ((item.extensions?.overlayType as MontageOverlayType | undefined) ??
          "section_title") as MontageOverlayType,
        in_seconds: start,
        out_seconds: start + (item.durationSeconds ?? 0),
        text: item.text ?? undefined,
        subtitle: (item.extensions?.subtitle as string | undefined) ?? undefined,
        accentColor: (item.extensions?.accentColor as string | undefined) ?? undefined,
        position: (item.extensions?.position as string | undefined) ?? undefined,
      };
    });

  const explainer: ExplainerTimeline = { cuts, overlays };
  const theme = document.extensions?.themeConfig;
  if (theme) explainer.themeConfig = theme as ExplainerTimeline["themeConfig"];
  return explainer;
}

/** Read / write / validate the timeline of a Montage project. */
export class MontageTimelineStore {
  private readonly transport: MontageTimelineTransport;
  readonly tenantId: string;

  constructor(options: MontageTimelineStoreOptions) {
    this.transport = options.transport;
    this.tenantId = options.tenantId ?? process.env.MONTAGE_TENANT_ID ?? "tenant_owner";
  }

  /** Raw stored timeline document (`timeline_get`). */
  async getTimeline(projectId: string): Promise<MontageTimelineDocument> {
    const raw = await this.transport.getTimeline(this.tenantId, projectId);
    if (!isTimelineDocument(raw)) {
      throw new Error(
        `Montage returned an unexpected timeline document for project ${projectId}. ` +
          "Expected { version, canvas, tracks }.",
      );
    }
    return raw;
  }

  /** Stored timeline, projected onto the Explainer composition shape. */
  async getExplainerTimeline(projectId: string): Promise<ExplainerTimeline> {
    return fromTimelineDocument(await this.getTimeline(projectId));
  }

  /**
   * Replace the stored timeline (`timeline_replace`).
   *
   * Accepts either a canonical Timeline v1 document (its `version` is used as
   * `expected_version`) or an Explainer timeline, which is projected onto a
   * Timeline v1 document first.
   */
  async replaceTimeline(
    projectId: string,
    timeline: ExplainerTimeline | MontageTimelineDocument,
    options: { expectedVersion?: number } = {},
  ): Promise<MontageTimelineDocument> {
    let expectedVersion = options.expectedVersion;
    let document: MontageTimelineDocument;

    if (isTimelineDocument(timeline)) {
      document = timeline;
      expectedVersion = expectedVersion ?? timeline.version;
    } else {
      if (expectedVersion === undefined) {
        const current = await this.getTimeline(projectId);
        expectedVersion = current.version;
      }
      document = toTimelineDocument(timeline, expectedVersion);
    }

    const result = (await this.transport.replaceTimeline(
      this.tenantId,
      projectId,
      expectedVersion,
      document as unknown as Record<string, unknown>,
    )) as { timeline?: MontageTimelineDocument };

    // Montage stores the document with `version + 1`. When the transport does not
    // echo the saved document back, mirror that rule here rather than handing the
    // caller a document whose version is one behind what was actually stored.
    return result?.timeline ?? { ...document, version: expectedVersion + 1 };
  }

  /** Validate the stored project state (`project_validate`). */
  async validateTimeline(projectId: string): Promise<MontageProjectValidation> {
    const raw = (await this.transport.validateProject(this.tenantId, projectId)) as
      | MontageProjectValidation
      | undefined;
    if (!raw || typeof raw !== "object") {
      throw new Error(`Montage returned an unexpected validation result for project ${projectId}.`);
    }
    return raw;
  }
}

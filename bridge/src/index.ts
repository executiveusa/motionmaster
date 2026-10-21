// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Motion Master
// This directory is a separate AGPL-3.0 work that talks to a Montage instance
// over its public HTTP/MCP interfaces. It is NOT part of the proprietary
// Motion Master product and is excluded from its licence by design.

/**
 * Motion Master → Montage bridge.
 *
 * The bridge is a CLIENT. It never renders, never copies Montage code and
 * never writes into a Montage project directory. It talks to a Montage
 * instance the user runs themselves:
 *
 *   HTTP  (Backlot board API): listProjects, getProjectState, watchProject,
 *          mediaUrl / thumbUrl, health
 *   MCP   (studio tools):      getTimeline, replaceTimeline, validateTimeline
 *
 * Configuration:
 *   MONTAGE_URL          base URL of the Montage instance (required)
 *   MONTAGE_TENANT_ID    tenant that owns the projects (default: tenant_owner)
 *   MONTAGE_MCP_COMMAND  command that starts the MCP server (default: python)
 *   MONTAGE_MCP_ARGS     arguments for it (default: -m yappy_clipz.mcp_server)
 */

import { MontageHttpClient, type MontageHttpOptions } from "./http-client.ts";
import { McpStdioClient, type McpStdioOptions } from "./mcp-client.ts";
import {
  HttpTimelineTransport,
  McpTimelineTransport,
  MontageTimelineStore,
  type MontageTimelineTransport,
} from "./timeline-store.ts";
import { buildExplainerTimeline, type ExplainerBrief, type BuildExplainerOptions } from "./explainer.ts";
import { loadTokens, type LoadedTokens, type MotionMasterTokens } from "./tokens.ts";
import { validateTimeline, type ValidationResult } from "./validate.ts";
import type {
  ExplainerTimeline,
  MontageProjectEvent,
  MontageProjectState,
  MontageProjectSummary,
  MontageProjectValidation,
  MontageTimelineDocument,
} from "./types.ts";

export * from "./types.ts";
export {
  MontageHttpClient,
  MontageHttpError,
  montageUrlFromEnv,
  parseSseEvent,
  type MontageHttpOptions,
} from "./http-client.ts";
export { McpStdioClient, McpError, type McpStdioOptions, type McpToolDescriptor } from "./mcp-client.ts";
export {
  MontageTimelineStore,
  McpTimelineTransport,
  HttpTimelineTransport,
  toTimelineDocument,
  fromTimelineDocument,
  type MontageTimelineTransport,
  type MontageTimelineStoreOptions,
} from "./timeline-store.ts";
export {
  buildExplainerTimeline,
  attachLicense,
  type ExplainerBrief,
  type BuildExplainerOptions,
} from "./explainer.ts";
export {
  loadTokens,
  mergeTokens,
  themeConfigFromTokens,
  defaultPluginsDir,
  INLINE_TOKENS,
  type LoadedTokens,
  type MotionMasterTokens,
  type MotionMasterPalette,
  type MotionMasterTypeTokens,
} from "./tokens.ts";
export {
  validateTimeline,
  formatValidationResult,
  loadSchema,
  DEFAULT_SCHEMA_PATH,
  SCENE_REQUIRED_FIELDS,
  OVERLAY_REQUIRED_FIELDS,
  type ValidationIssue,
  type ValidationResult,
} from "./validate.ts";

/** Options for {@link createMontageBridge}. */
export interface MontageBridgeOptions {
  /** Base URL of the Montage instance. Defaults to `MONTAGE_URL`. */
  montageUrl?: string;
  /** Tenant that owns the projects. Defaults to `MONTAGE_TENANT_ID`. */
  tenantId?: string;
  /** Which transport carries the timeline tools. Default "mcp". */
  transport?: "mcp" | "http";
  /** MCP server command/args. Defaults to `python -m yappy_clipz.mcp_server`. */
  mcp?: McpStdioOptions;
  /** Token set used by `buildExplainerTimeline`. */
  tokens?: MotionMasterTokens;
  /** Directory the Motion Master token file is read from. */
  pluginsDir?: string;
}

/**
 * The bridge: one object with the whole public surface Motion Master needs.
 */
export class MontageBridge {
  readonly http: MontageHttpClient;
  readonly store: MontageTimelineStore;
  private readonly mcp?: McpStdioClient;
  private readonly pluginsDir?: string;

  private constructor(options: {
    http: MontageHttpClient;
    store: MontageTimelineStore;
    mcp?: McpStdioClient;
    pluginsDir?: string;
  }) {
    this.http = options.http;
    this.store = options.store;
    this.mcp = options.mcp;
    this.pluginsDir = options.pluginsDir;
  }

  /**
   * Build a bridge.
   *
   * With the default `transport: "mcp"` the MCP server is spawned lazily on
   * the first timeline call, so the bridge can be constructed (and the board
   * API used) without a Montage MCP server running.
   */
  static async create(options: MontageBridgeOptions = {}): Promise<MontageBridge> {
    const http = new MontageHttpClient({ baseUrl: options.montageUrl });
    const tenantId = options.tenantId ?? process.env.MONTAGE_TENANT_ID ?? "tenant_owner";
    const mode = options.transport ?? "mcp";

    if (mode === "http") {
      const transport: MontageTimelineTransport = new HttpTimelineTransport(http, tenantId);
      return new MontageBridge({
        http,
        store: new MontageTimelineStore({ transport, tenantId }),
        pluginsDir: options.pluginsDir,
      });
    }

    const client = new McpStdioClient({
      command: process.env.MONTAGE_MCP_COMMAND ?? options.mcp?.command ?? "python",
      args: process.env.MONTAGE_MCP_ARGS
        ? process.env.MONTAGE_MCP_ARGS.split(" ").filter(Boolean)
        : options.mcp?.args ?? ["-m", "yappy_clipz.mcp_server"],
      ...options.mcp,
    });
    const transport: MontageTimelineTransport = new McpTimelineTransport(client);
    return new MontageBridge({
      http,
      store: new MontageTimelineStore({ transport, tenantId }),
      mcp: client,
      pluginsDir: options.pluginsDir,
    });
  }

  /** `GET /api/projects` */
  listProjects(): Promise<MontageProjectSummary[]> {
    return this.http.listProjects();
  }

  /** `GET /api/project/{id}/state` */
  getProjectState(projectId: string): Promise<MontageProjectState> {
    return this.http.getProjectState(projectId);
  }

  /** `GET /media/{project_id}/{file_path}` */
  mediaUrl(projectId: string, filePath: string): string {
    return this.http.mediaUrl(projectId, filePath);
  }

  /** `GET /thumb/{project_id}/{file_path}` */
  thumbUrl(projectId: string, filePath: string, width?: 320 | 640 | 960): string {
    return this.http.thumbUrl(projectId, filePath, width);
  }

  /** Consume `GET /api/project/{id}/events` (SSE). Returns a stop function. */
  watchProject(
    projectId: string,
    onEvent: (event: MontageProjectEvent) => void,
    options?: { signal?: AbortSignal },
  ): () => void {
    return this.http.watchProject(projectId, onEvent, options);
  }

  /** `timeline_get` MCP tool. */
  getTimeline(projectId: string): Promise<MontageTimelineDocument> {
    return this.store.getTimeline(projectId);
  }

  /** `timeline_replace` MCP tool. */
  replaceTimeline(
    projectId: string,
    timeline: ExplainerTimeline | MontageTimelineDocument,
    options?: { expectedVersion?: number },
  ): Promise<MontageTimelineDocument> {
    return this.store.replaceTimeline(projectId, timeline, options);
  }

  /** `project_validate` MCP tool. */
  validateTimeline(projectId: string): Promise<MontageProjectValidation> {
    return this.store.validateTimeline(projectId);
  }

  /** Build an Explainer timeline from a motion brief. */
  buildExplainerTimeline(
    brief: ExplainerBrief,
    options: BuildExplainerOptions = {},
  ): ExplainerTimeline {
    return buildExplainerTimeline(brief, options);
  }

  /** Read the Motion Master tokens. */
  async loadTokens(): Promise<LoadedTokens> {
    return loadTokens({ pluginsDir: this.pluginsDir });
  }

  /** Stop the MCP server, if one was started. */
  async close(): Promise<void> {
    await this.mcp?.close();
  }
}

/** Convenience factory: {@link MontageBridge.create}. */
export function createMontageBridge(options: MontageBridgeOptions = {}): Promise<MontageBridge> {
  return MontageBridge.create(options);
}

export type { MontageProjectEvent, MontageProjectState, MontageProjectSummary };

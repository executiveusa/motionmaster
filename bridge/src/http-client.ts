// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Motion Master
// This directory is a separate AGPL-3.0 work that talks to a Montage instance
// over its public HTTP/MCP interfaces. It is NOT part of the proprietary
// Motion Master product and is excluded from its licence by design.

/**
 * HTTP client for the Montage "Backlot" board API.
 *
 * Verified endpoints (read from the Montage repository, read-only):
 *   GET  /api/health
 *   GET  /api/projects
 *   GET  /api/project/{project_id}/state
 *   GET  /api/project/{project_id}/events      (SSE change feed)
 *   GET  /api/library/events                  (SSE change feed)
 *   GET  /thumb/{project_id}/{file_path}       (?w=320|640|960)
 *   GET  /media/{project_id}/{file_path}
 *   GET  /p/{project_id}   GET /p/{project_path}   GET /
 *
 * The board server never writes to project directories; it only reports state.
 */

import type {
  MontageProjectEvent,
  MontageProjectState,
  MontageProjectSummary,
} from "./types.ts";

/** Options for {@link MontageHttpClient}. */
export interface MontageHttpOptions {
  /** Base URL of the Montage instance, e.g. `http://127.0.0.1:8000`. */
  baseUrl?: string;
  /** Injectable fetch (tests use a local mock server). */
  fetchImpl?: typeof fetch;
  /** Bearer token for hosted auth mode. Defaults to `MONTAGE_TOKEN`. */
  token?: string;
  /** Per-request timeout in milliseconds. Default 15000. */
  timeoutMs?: number;
}

/** Thrown for non-2xx responses. */
export class MontageHttpError extends Error {
  status: number;
  url: string;
  body: string;
  constructor(status: number, url: string, body: string) {
    super(`Montage HTTP ${status} for ${url}: ${body.slice(0, 400)}`);
    this.name = "MontageHttpError";
    this.status = status;
    this.url = url;
    this.body = body;
  }
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function encodePath(filePath: string): string {
  return filePath
    .split("/")
    .filter((segment) => segment.length > 0 && segment !== ".")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

/** Read the Montage base URL from the environment (`MONTAGE_URL`). */
export function montageUrlFromEnv(env: Record<string, string | undefined> = process.env): string {
  const value = env.MONTAGE_URL?.trim();
  if (!value) {
    throw new Error(
      "MONTAGE_URL is not set. Point it at the Montage instance you run yourself, " +
        'e.g. MONTAGE_URL="http://127.0.0.1:8000".',
    );
  }
  return stripTrailingSlash(value);
}

/** Client for the Montage board HTTP API. */
export class MontageHttpClient {
  readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly token: string | undefined;

  constructor(options: MontageHttpOptions = {}) {
    this.baseUrl = stripTrailingSlash(
      options.baseUrl ?? process.env.MONTAGE_URL?.trim() ?? "http://127.0.0.1:8000",
    );
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
    this.timeoutMs = options.timeoutMs ?? 15000;
    this.token = options.token ?? process.env.MONTAGE_TOKEN?.trim() ?? undefined;
  }

  /** Absolute URL of a path on this Montage instance. */
  url(path: string): string {
    return `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  }

  /**
   * Auth headers for a request.
   *
   * `MONTAGE_TOKEN` is only needed when the instance runs in hosted auth mode;
   * in local mode the `X-Yappy-Tenant` header is what identifies the tenant.
   */
  private authHeaders(init: RequestInit): Headers {
    const headers = new Headers(init.headers);
    if (this.token) headers.set("Authorization", `Bearer ${this.token}`);
    return headers;
  }

  /**
   * Perform a request against the Montage instance, with the configured
   * authentication headers attached.
   *
   * Public so that other transports (the studio HTTP transport) send exactly
   * the same headers as the board API client — a configured `MONTAGE_TOKEN`
   * must never be silently dropped on one path and sent on another.
   * Non-2xx responses are returned as-is; the caller decides what to do.
   */
  async requestWithAuth(path: string, init: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await this.fetchImpl(this.url(path), {
        ...init,
        headers: this.authHeaders(init),
        signal: init.signal ?? controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    const response = await this.requestWithAuth(path, init);
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new MontageHttpError(response.status, this.url(path), body);
    }
    return response;
  }

  /** `GET /api/health` — liveness probe of the board server. */
  async health(): Promise<{ ok: boolean; app?: string }> {
    const response = await this.request("/api/health");
    return (await response.json()) as { ok: boolean; app?: string };
  }

  /** `GET /api/projects` — every project the board knows about. */
  async listProjects(): Promise<MontageProjectSummary[]> {
    const response = await this.request("/api/projects");
    const payload = (await response.json()) as unknown;
    return Array.isArray(payload) ? (payload as MontageProjectSummary[]) : [];
  }

  /** `GET /api/project/{project_id}/state` — the board state of one project. */
  async getProjectState(projectId: string): Promise<MontageProjectState> {
    const response = await this.request(`/api/project/${encodeURIComponent(projectId)}/state`);
    return (await response.json()) as MontageProjectState;
  }

  /**
   * `GET /media/{project_id}/{file_path}` — URL of a media file inside a project.
   * The path is project-relative POSIX (e.g. `assets/video/source.mp4`).
   */
  mediaUrl(projectId: string, filePath: string): string {
    return this.url(`/media/${encodeURIComponent(projectId)}/${encodePath(filePath)}`);
  }

  /** `GET /thumb/{project_id}/{file_path}` — URL of a poster/thumbnail. */
  thumbUrl(projectId: string, filePath: string, width: 320 | 640 | 960 = 640): string {
    return this.url(
      `/thumb/${encodeURIComponent(projectId)}/${encodePath(filePath)}?w=${width}`,
    );
  }

  /**
   * Consume `GET /api/project/{project_id}/events` (SSE).
   *
   * The feed emits `data: {"type":"hello"|"change"|"heartbeat", ...}` lines.
   * The returned function stops the subscription.
   */
  watchProject(
    projectId: string,
    onEvent: (event: MontageProjectEvent) => void,
    options: { signal?: AbortSignal } = {},
  ): () => void {
    const controller = new AbortController();
    if (options.signal) {
      if (options.signal.aborted) controller.abort();
      else options.signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
    void this.consumeSse(
      `/api/project/${encodeURIComponent(projectId)}/events`,
      onEvent,
      controller.signal,
    );
    return () => controller.abort();
  }

  /** Consume `GET /api/library/events` (SSE) — changes across all projects. */
  watchLibrary(
    onEvent: (event: MontageProjectEvent) => void,
    options: { signal?: AbortSignal } = {},
  ): () => void {
    const controller = new AbortController();
    if (options.signal) {
      if (options.signal.aborted) controller.abort();
      else options.signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
    void this.consumeSse("/api/library/events", onEvent, controller.signal);
    return () => controller.abort();
  }

  private async consumeSse(
    path: string,
    onEvent: (event: MontageProjectEvent) => void,
    signal: AbortSignal,
  ): Promise<void> {
    let response: Response;
    try {
      response = await this.fetchImpl(this.url(path), {
        headers: this.authHeaders({ headers: { Accept: "text/event-stream" } }),
        signal,
      });
    } catch {
      return; // connection refused / aborted: the caller retries
    }
    if (!response.ok || !response.body) {
      throw new MontageHttpError(response.status, this.url(path), "no event stream");
    }
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
        buffer += decoder.decode(chunk, { stream: true });
        let boundary = buffer.indexOf("\n\n");
        while (boundary !== -1) {
          const raw = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          const event = parseSseEvent(raw);
          if (event) onEvent(event);
          boundary = buffer.indexOf("\n\n");
        }
      }
    } catch {
      // aborted or stream closed
    }
  }
}

/** Parse one `data: {...}` SSE frame. */
export function parseSseEvent(raw: string): MontageProjectEvent | undefined {
  const dataLines = raw
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim());
  if (dataLines.length === 0) return undefined;
  try {
    return JSON.parse(dataLines.join("\n")) as MontageProjectEvent;
  } catch {
    return undefined;
  }
}

/**
 * Montage bridge client (Motion Master MCP side).
 *
 * Motion Master does not render footage. It hands a Montage timeline to a
 * Montage instance that the user runs themselves, over Montage's public HTTP
 * API. The endpoints and tool names used here are the ones documented by the
 * Montage project and re-verified by the bridge task:
 *
 *   GET /api/health
 *   GET /api/projects
 *   GET /api/project/{project_id}/state
 *   GET /api/project/{project_id}/events        (SSE)
 *
 *   MCP tools: project_create, project_list, project_get, project_validate,
 *              timeline_get, timeline_replace
 *
 * Anything this file cannot verify from a fetched source is marked UNVERIFIED.
 */

export interface MontageIssue {
  path: string;
  message: string;
  severity: "error" | "warning";
}

export interface MontageCut {
  type?: string;
  source?: string;
  source_in_seconds?: number;
  in_seconds?: number;
  out_seconds?: number;
  start_seconds?: number;
  duration_seconds?: number;
  animation?: string;
  [key: string]: unknown;
}

export interface MontageOverlay {
  type?: string;
  text?: string;
  subtitle?: string;
  accentColor?: string;
  position?: string;
  [key: string]: unknown;
}

export interface MontageTimeline {
  cuts?: MontageCut[];
  overlays?: MontageOverlay[];
  scenes?: Record<string, unknown>[];
  [key: string]: unknown;
}

export const MONTAGE_CUT_ANIMATIONS = ["zoom-in", "ken-burns"];

export const MONTAGE_OVERLAY_TYPES = [
  "section_title",
  "stat_reveal",
  "hero_title",
  "provider_chip",
];

export const MONTAGE_SCENE_TYPES = [
  "text_card",
  "hero_title",
  "stat_card",
  "callout",
  "comparison",
  "bar_chart",
  "line_chart",
  "pie_chart",
  "kpi_grid",
  "progress_bar",
  "anime_scene",
  "terminal_scene",
  "screenshot_scene",
];

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Validate a Montage timeline against the rules the Motion Master bridge
 * enforces. This is our own clean-room check of the documented subset — it is
 * not Montage code.
 */
export function validateTimeline(timeline: unknown): {
  valid: boolean;
  issues: MontageIssue[];
  summary: {
    cuts: number;
    overlays: number;
    scenes: number;
    totalCutSeconds: number | null;
  };
} {
  const issues: MontageIssue[] = [];

  if (typeof timeline !== "object" || timeline === null || Array.isArray(timeline)) {
    issues.push({
      path: "$",
      message: "The timeline must be a JSON object.",
      severity: "error",
    });
    return {
      valid: false,
      issues,
      summary: { cuts: 0, overlays: 0, scenes: 0, totalCutSeconds: null },
    };
  }

  const value = timeline as MontageTimeline;
  const cuts = Array.isArray(value.cuts) ? value.cuts : [];
  const overlays = Array.isArray(value.overlays) ? value.overlays : [];
  const scenes = Array.isArray(value.scenes) ? value.scenes : [];

  if (!Array.isArray(value.cuts)) {
    issues.push({
      path: "cuts",
      message: "cuts must be an array.",
      severity: "error",
    });
  }
  if (value.overlays !== undefined && !Array.isArray(value.overlays)) {
    issues.push({
      path: "overlays",
      message: "overlays must be an array when present.",
      severity: "error",
    });
  }

  const spans: { index: number; start: number; end: number }[] = [];

  cuts.forEach((cut, index) => {
    const path = `cuts[${index}]`;
    if (typeof cut !== "object" || cut === null) {
      issues.push({ path, message: "Cut must be an object.", severity: "error" });
      return;
    }
    const type = cut.type ?? "none";
    if (type !== "none" && type !== "image") {
      issues.push({
        path: `${path}.type`,
        message: `Unknown cut type "${String(cut.type)}". Montage cuts are "none" (real video) or "image".`,
        severity: "error",
      });
    }
    if (type === "none" && !cut.source) {
      issues.push({
        path: `${path}.source`,
        message: "A video cut needs a source file path.",
        severity: "error",
      });
    }
    if (cut.source_in_seconds !== undefined && !isNumber(cut.source_in_seconds)) {
      issues.push({
        path: `${path}.source_in_seconds`,
        message: "source_in_seconds must be a number.",
        severity: "error",
      });
    }
    if (cut.in_seconds !== undefined && !isNumber(cut.in_seconds)) {
      issues.push({
        path: `${path}.in_seconds`,
        message: "in_seconds must be a number.",
        severity: "error",
      });
    }
    if (cut.out_seconds !== undefined && !isNumber(cut.out_seconds)) {
      issues.push({
        path: `${path}.out_seconds`,
        message: "out_seconds must be a number.",
        severity: "error",
      });
    }
    if (isNumber(cut.in_seconds) && isNumber(cut.out_seconds) && cut.out_seconds <= cut.in_seconds) {
      issues.push({
        path: `${path}.out_seconds`,
        message: "out_seconds must be greater than in_seconds.",
        severity: "error",
      });
    }
    if (
      isNumber(cut.source_in_seconds) &&
      isNumber(cut.in_seconds) &&
      cut.in_seconds < cut.source_in_seconds
    ) {
      issues.push({
        path: `${path}.in_seconds`,
        message: "in_seconds is before source_in_seconds.",
        severity: "error",
      });
    }
    if (cut.animation !== undefined && !MONTAGE_CUT_ANIMATIONS.includes(String(cut.animation))) {
      issues.push({
        path: `${path}.animation`,
        message: `Unknown animation "${String(cut.animation)}". Known: ${MONTAGE_CUT_ANIMATIONS.join(", ")}.`,
        severity: "error",
      });
    }
    if (isNumber(cut.start_seconds) && isNumber(cut.duration_seconds)) {
      if (cut.duration_seconds <= 0) {
        issues.push({
          path: `${path}.duration_seconds`,
          message: "duration_seconds must be greater than zero.",
          severity: "error",
        });
      } else {
        spans.push({
          index,
          start: cut.start_seconds,
          end: cut.start_seconds + cut.duration_seconds,
        });
      }
    }
  });

  // Overlapping cuts on the timeline are a hard error when positions are known.
  spans.sort((a, b) => a.start - b.start);
  for (let i = 1; i < spans.length; i += 1) {
    const previous = spans[i - 1];
    const current = spans[i];
    if (current.start < previous.end - 1e-6) {
      issues.push({
        path: `cuts[${current.index}]`,
        message: `Cut overlaps cut ${previous.index} on the timeline (${current.start}s starts before ${previous.end}s ends).`,
        severity: "error",
      });
    }
  }

  overlays.forEach((overlay, index) => {
    const path = `overlays[${index}]`;
    if (typeof overlay !== "object" || overlay === null) {
      issues.push({ path, message: "Overlay must be an object.", severity: "error" });
      return;
    }
    if (!overlay.type) {
      issues.push({
        path: `${path}.type`,
        message: "An overlay needs a type.",
        severity: "error",
      });
    } else if (!MONTAGE_OVERLAY_TYPES.includes(String(overlay.type))) {
      issues.push({
        path: `${path}.type`,
        message: `Unknown overlay type "${String(overlay.type)}". Known: ${MONTAGE_OVERLAY_TYPES.join(", ")}.`,
        severity: "error",
      });
    }
    if (!overlay.text && !overlay.subtitle) {
      issues.push({
        path: `${path}.text`,
        message: "An overlay needs text or a subtitle.",
        severity: "error",
      });
    }
  });

  let totalCutSeconds: number | null = null;
  for (const cut of cuts) {
    if (isNumber(cut.duration_seconds)) {
      totalCutSeconds = (totalCutSeconds ?? 0) + cut.duration_seconds;
    } else if (isNumber(cut.in_seconds) && isNumber(cut.out_seconds)) {
      totalCutSeconds = (totalCutSeconds ?? 0) + (cut.out_seconds - cut.in_seconds);
    }
  }

  return {
    valid: issues.every((issue) => issue.severity !== "error"),
    issues,
    summary: {
      cuts: cuts.length,
      overlays: overlays.length,
      scenes: scenes.length,
      totalCutSeconds: totalCutSeconds === null ? null : Number(totalCutSeconds.toFixed(3)),
    },
  };
}

export interface MontageRequestResult {
  ok: boolean;
  status: number;
  body: unknown;
  error?: string;
}

/** Minimal HTTP client for a user-run Montage instance. */
export class MontageClient {
  constructor(
    private readonly baseUrl: string,
    private readonly options: { token?: string; timeoutMs?: number } = {},
  ) {}

  get configured(): boolean {
    return this.baseUrl.length > 0;
  }

  private async request(
    path: string,
    init: { method?: string; body?: unknown } = {},
  ): Promise<MontageRequestResult> {
    if (!this.configured) {
      return {
        ok: false,
        status: 0,
        body: null,
        error: "MOTION_MASTER_MONTAGE_URL is not configured.",
      };
    }
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.options.timeoutMs ?? 8000,
    );
    const headers: Record<string, string> = { accept: "application/json" };
    if (this.options.token) headers.authorization = `Bearer ${this.options.token}`;
    if (init.body !== undefined) headers["content-type"] = "application/json";

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: init.method ?? "GET",
        headers,
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        signal: controller.signal,
      });
      const text = await response.text();
      let body: unknown = text;
      try {
        body = text.length > 0 ? JSON.parse(text) : null;
      } catch {
        // keep the raw text
      }
      return { ok: response.ok, status: response.status, body };
    } catch (error) {
      return {
        ok: false,
        status: 0,
        body: null,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  health(): Promise<MontageRequestResult> {
    return this.request("/api/health");
  }

  listProjects(): Promise<MontageRequestResult> {
    return this.request("/api/projects");
  }

  projectState(projectId: string): Promise<MontageRequestResult> {
    return this.request(`/api/project/${encodeURIComponent(projectId)}/state`);
  }
}

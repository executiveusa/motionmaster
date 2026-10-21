/**
 * Montage timeline documents — the Motion Master MCP side.
 *
 * A Montage instance stores a timeline as a *canonical document*:
 *
 *   { version, canvas, tracks: [ { id, type, order, items: [...] } ] }
 *
 * The Motion Master composition ("Explainer") instead consumes an *explainer
 * timeline*:
 *
 *   { cuts: [...], overlays: [...], themeConfig?: {...} }
 *
 * `toMontageDocument()` projects the second onto the first so a timeline that
 * was written for the Motion Master composition can be handed to a Montage
 * instance over its public API.
 *
 * PROVENANCE / LICENCE NOTE
 * -------------------------
 * This file is an independent, clean-room implementation written against
 * Montage's *documented* public interface (the document shape and the route
 * names). It contains no code from the AGPL-3.0 `bridge/` package, which this
 * server does not import, link or vendor. The extension keys used on the
 * items are the de-facto interface between the Motion Master timeline and
 * Montage's item model, not an implementation detail of any one component.
 */

/** A timeline item as Montage stores it. */
export interface MontageTimelineItem {
  id: string;
  kind: "asset" | "text";
  assetId: string | null;
  startSeconds: number;
  durationSeconds: number;
  sourceStartSeconds: number;
  sourceEndSeconds: number;
  text: string | null;
  extensions: Record<string, unknown>;
}

/** A track as Montage stores it. */
export interface MontageTimelineTrack {
  id: string;
  type: "video" | "overlay";
  order: number;
  items: MontageTimelineItem[];
}

/** The canonical timeline document. */
export interface MontageTimelineDocument {
  version: number;
  canvas: {
    width: number;
    height: number;
    fps: number;
    durationSeconds: number;
    background: string | null;
  };
  tracks: MontageTimelineTrack[];
  extensions: Record<string, unknown>;
}

export interface CanvasOptions {
  fps?: number;
  width?: number;
  height?: number;
  background?: string | null;
}

function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function str(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/** Is this already a canonical timeline document? */
export function isTimelineDocument(value: unknown): value is MontageTimelineDocument {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<MontageTimelineDocument>;
  return typeof candidate.version === "number" && Array.isArray(candidate.tracks);
}

/**
 * Project an explainer timeline onto Montage's canonical document.
 *
 * Cuts become items on the `video` track, overlays become items on the
 * `overlay` track, and the untouched explainer timeline is kept under
 * `extensions.explainer` so nothing is lost on the round trip.
 */
export function toMontageDocument(
  timeline: Record<string, unknown>,
  version: number,
  options: CanvasOptions = {},
): MontageTimelineDocument {
  const fps = options.fps ?? 30;
  const width = options.width ?? 1920;
  const height = options.height ?? 1080;

  const rawCuts = Array.isArray(timeline.cuts) ? timeline.cuts : [];
  const rawOverlays = Array.isArray(timeline.overlays) ? timeline.overlays : [];

  const cuts = rawCuts.filter(
    (cut): cut is Record<string, unknown> =>
      typeof cut === "object" && cut !== null && !Array.isArray(cut),
  );
  const overlays = rawOverlays.filter(
    (overlay): overlay is Record<string, unknown> =>
      typeof overlay === "object" && overlay !== null && !Array.isArray(overlay),
  );

  const videoItems: MontageTimelineItem[] = cuts.map((cut, index) => {
    const inSeconds = num(cut.in_seconds);
    const outSeconds = num(cut.out_seconds, inSeconds);
    const sourceIn = num(cut.source_in_seconds);
    const length = Math.max(0, outSeconds - inSeconds);
    return {
      id: `mm-cut-${index + 1}`,
      kind: "asset",
      assetId: str(cut.source),
      startSeconds: inSeconds,
      durationSeconds: length,
      sourceStartSeconds: sourceIn,
      sourceEndSeconds: sourceIn + length,
      text: null,
      extensions: {
        source: str(cut.source),
        animation: str(cut.animation),
        layer: str(cut.layer) ?? "primary",
        cutType: str(cut.type),
      },
    };
  });

  const overlayItems: MontageTimelineItem[] = overlays.map((overlay, index) => {
    const inSeconds = num(overlay.in_seconds);
    const outSeconds = num(overlay.out_seconds, inSeconds);
    return {
      id: `mm-overlay-${index + 1}`,
      kind: "text",
      assetId: null,
      startSeconds: inSeconds,
      durationSeconds: Math.max(0, outSeconds - inSeconds),
      sourceStartSeconds: 0,
      sourceEndSeconds: 0,
      text: str(overlay.text) ?? str(overlay.subtitle),
      extensions: {
        overlayType: str(overlay.type),
        subtitle: str(overlay.subtitle),
        accentColor: str(overlay.accentColor),
        position: str(overlay.position),
      },
    };
  });

  const durationSeconds = videoItems.reduce(
    (max, item) => Math.max(max, item.startSeconds + item.durationSeconds),
    0,
  );

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
      explainer: timeline,
      generator: "motion-master-mcp",
    },
  };
}

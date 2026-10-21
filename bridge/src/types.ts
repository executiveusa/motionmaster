// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Motion Master
// This directory is a separate AGPL-3.0 work that talks to a Montage instance
// over its public HTTP/MCP interfaces. It is NOT part of the proprietary
// Motion Master product and is excluded from its licence by design.

/**
 * Types for the Montage surfaces this bridge speaks.
 *
 * Two document shapes exist in Montage and they are NOT the same thing:
 *
 *  1. `MontageTimelineDocument` — the canonical "Timeline v1" document that the
 *     studio tools store (`timeline_get` / `timeline_replace`). Shape:
 *     `{ version, canvas, tracks, markers?, extensions? }`.
 *
 *  2. `ExplainerTimeline` — the input document of the Remotion `Explainer`
 *     composition: `{ cuts, overlays?, themeConfig?, captions?, audio? }`.
 *     The `cuts` / `overlays` vocabulary (types, in_seconds/out_seconds,
 *     source_in_seconds, animation, accentColor, position) is the one the
 *     "footage mix" workflow needs: real footage cut to in/out points with
 *     motion-graphics overlays composited on top.
 *
 * The bridge stores an ExplainerTimeline inside a Timeline v1 document under
 * `extensions.explainer` and ALSO projects it onto Timeline v1 tracks, so the
 * timeline survives a round trip through either representation.
 */

/** Scene types accepted as `cut.type` by the Explainer composition. */
export type MontageCutType =
  | "text_card"
  | "hero_title"
  | "stat_card"
  | "callout"
  | "comparison"
  | "bar_chart"
  | "line_chart"
  | "pie_chart"
  | "kpi_grid"
  | "progress_bar"
  | "anime_scene"
  | "terminal_scene"
  | "screenshot_scene";

/** Overlay types accepted as `overlay.type` by the Explainer composition. */
export type MontageOverlayType =
  | "section_title"
  | "stat_reveal"
  | "hero_title"
  | "provider_chip";

/** Camera animation names the composer understands for still images. */
export type MontageImageAnimation =
  | "zoom-in"
  | "zoom-out"
  | "pan-left"
  | "pan-right"
  | "ken-burns"
  | "ken-burns-slow-zoom"
  | "parallax"
  | "static"
  | "none";

/** Camera animation names documented for real video cuts. */
export type MontageVideoAnimation = "zoom-in" | "ken-burns";

/** A single entry of the Explainer composition's `cuts` array. */
export interface MontageCut {
  id: string;
  /** Path of the source media, resolved by the composer (staticFile / file:// / http). */
  source?: string;
  /** Timeline position where the cut starts, in seconds. */
  in_seconds: number;
  /** Timeline position where the cut ends, in seconds. */
  out_seconds: number;
  /** Seek position inside the source file, in seconds. */
  source_in_seconds?: number;
  /** Scene type; absent means "real video / image". */
  type?: MontageCutType;
  /** Camera animation for video / image cuts. */
  animation?: MontageImageAnimation | MontageVideoAnimation | string;
  /** Optional layer name; cuts sharing a layer must not overlap. */
  layer?: string;
  transition_in?: string;
  transition_out?: string;
  transition_duration?: number;

  // --- scene payload (only the fields that belong to the chosen type) ---
  text?: string;
  stat?: string;
  subtitle?: string;
  heroSubtitle?: string;
  title?: string;
  callout_type?: "info" | "warning" | "tip" | "quote";
  leftLabel?: string;
  leftValue?: string;
  rightLabel?: string;
  rightValue?: string;
  chartData?: unknown[];
  chartSeries?: unknown[];
  chartAnimation?: string;
  progress?: number;
  progressLabel?: string;
  progressColor?: string;
  images?: string[];
  steps?: unknown[];
  terminalTitle?: string;
  prompt?: string;
  backgroundImage?: string;
  screenshotSteps?: unknown[];
  screenshotSize?: { width: number; height: number };
  backgroundVideo?: string;
  backgroundOverlay?: number;
  color?: string;
  accentColor?: string;
  fontSize?: number;
  [key: string]: unknown;
}

/** A single entry of the Explainer composition's `overlays` array. */
export interface MontageOverlay {
  type: MontageOverlayType;
  in_seconds: number;
  out_seconds: number;
  text?: string;
  subtitle?: string;
  accentColor?: string;
  position?: string;
  providers?: string[];
  cycleSeconds?: number;
  label?: string;
  [key: string]: unknown;
}

/** Theme override handed to the composer (`themeConfig` prop). */
export interface MontageThemeConfig {
  primaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  surfaceColor?: string;
  textColor?: string;
  mutedTextColor?: string;
  headingFont?: string;
  bodyFont?: string;
  monoFont?: string;
  chartColors?: string[];
  [key: string]: unknown;
}

/** The Explainer composition input document. */
export interface ExplainerTimeline {
  cuts: MontageCut[];
  overlays?: MontageOverlay[];
  themeConfig?: MontageThemeConfig;
  captions?: unknown[];
  audio?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Canvas block of the canonical Timeline v1 document. */
export interface MontageTimelineCanvas {
  width: number;
  height: number;
  fps: number;
  durationSeconds?: number | null;
  background?: string | null;
}

/** One item of a Timeline v1 track. */
export interface MontageTimelineItem {
  id: string;
  kind: "asset" | "text" | "shape" | "caption" | "composition" | "data";
  startSeconds: number;
  durationSeconds: number;
  assetId?: string | null;
  shotId?: string | null;
  sourceStartSeconds?: number | null;
  sourceEndSeconds?: number | null;
  text?: string | null;
  effects?: { type: string; parameters?: Record<string, unknown> }[];
  extensions?: Record<string, unknown>;
}

/** One track of the canonical Timeline v1 document. */
export interface MontageTimelineTrack {
  id: string;
  type: "video" | "audio" | "text" | "overlay" | "caption" | "data";
  name?: string | null;
  order: number;
  muted?: boolean;
  locked?: boolean;
  items: MontageTimelineItem[];
}

/** The canonical Timeline v1 document stored by the studio tools. */
export interface MontageTimelineDocument {
  version: number;
  canvas: MontageTimelineCanvas;
  tracks: MontageTimelineTrack[];
  markers?: { id: string; timeSeconds: number; label: string; type?: string | null }[];
  extensions?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Summary returned by `GET /api/projects`. */
export interface MontageProjectSummary {
  project_id: string;
  title: string;
  pipeline_type?: string;
  poster?: string | null;
  live?: boolean;
  last_activity?: number;
  active_stage?: string | null;
  completed_count?: number;
  scene_count?: number;
  [key: string]: unknown;
}

/** Project board state returned by `GET /api/project/{id}/state`. */
export interface MontageProjectState {
  project_id?: string;
  title?: string;
  [key: string]: unknown;
}

/** Event payload delivered by the project SSE feed. */
export interface MontageProjectEvent {
  type: "hello" | "change" | "heartbeat" | string;
  project_id?: string;
  ts?: number;
  [key: string]: unknown;
}

/** Result of the `project_validate` studio tool. */
export interface MontageProjectValidation {
  valid: boolean;
  schemaVersion?: string;
  projectId?: string;
  tenantId?: string;
  [key: string]: unknown;
}

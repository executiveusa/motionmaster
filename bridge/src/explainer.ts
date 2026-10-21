// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Motion Master
// This directory is a separate AGPL-3.0 work that talks to a Montage instance
// over its public HTTP/MCP interfaces. It is NOT part of the proprietary
// Motion Master product and is excluded from its licence by design.

/**
 * Build a Montage Explainer timeline from a Motion Master motion brief.
 *
 * The result is the input document of the Remotion `Explainer` composition:
 * real-footage cuts (source + in/out points) with motion-graphics overlays
 * (hero title, section title, stat badge) composited on top, in the Motion
 * Master palette and type.
 *
 * The bridge never renders. Montage renders, with:
 *   npx remotion render src/index.tsx Explainer out/video.mp4 --props=props.json
 */

import { INLINE_TOKENS, themeConfigFromTokens, type MotionMasterTokens } from "./tokens.ts";
import type { ExplainerTimeline, MontageCut, MontageOverlay, MontageVideoAnimation } from "./types.ts";

/** The motion brief the bridge turns into a Montage timeline. */
export interface ExplainerBrief {
  /**
   * Source media path. The composer resolves relative paths against its own
   * `public/` directory; absolute paths and http(s) URLs work too.
   */
  source: string;
  /** Total length of the piece in seconds (e.g. 16 for 0:16). */
  durationSeconds: number;
  /** Length of the clean footage opening, in seconds. Default 3. */
  openingSeconds?: number;
  /** Where the first cut starts inside the source, in seconds. Default 0. */
  sourceInSeconds?: number;
  /** Hero title text. */
  title: string;
  /** Hero title subtitle. */
  subtitle?: string;
  /** Small section label drawn over the footage. */
  sectionTitle?: string;
  /** Optional corner stat badge. */
  statReveal?: {
    text: string;
    subtitle?: string;
    inSeconds?: number;
    outSeconds?: number;
    position?: string;
  };
  /** Camera animation on the footage cuts. Default "ken-burns". */
  animation?: MontageVideoAnimation;
  /** When the hero title leaves. Default: two seconds before the end. */
  heroOutSeconds?: number;
  /** Where the section label sits. Default "top-left". */
  position?: string;
  /** Accent colour override. Default: the Motion Master accent token. */
  accentColor?: string;
  /** Attach the Motion Master theme override. Default true. */
  includeTheme?: boolean;
  /** Prefix for the generated cut ids. Default "cut". */
  idPrefix?: string;
}

/** Options for {@link buildExplainerTimeline}. */
export interface BuildExplainerOptions {
  /** Token set; defaults to the inline Motion Master tokens. */
  tokens?: MotionMasterTokens;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Build the Explainer timeline for a brief.
 *
 * Layout produced for the standard brief (duration 16s, opening 3s):
 *   cut  0:00 → 0:03   clean footage (first three seconds of the source)
 *   cut  0:03 → 0:16   the rest of the source, held under the graphics
 *   overlay hero_title   0:03 → 0:14
 *   overlay section_title 0:03 → 0:16
 */
export function buildExplainerTimeline(
  brief: ExplainerBrief,
  options: BuildExplainerOptions = {},
): ExplainerTimeline {
  const tokens = options.tokens ?? INLINE_TOKENS;
  const duration = brief.durationSeconds;
  if (!(duration > 0)) {
    throw new Error("ExplainerBrief.durationSeconds must be greater than 0.");
  }
  if (!brief.source) {
    throw new Error("ExplainerBrief.source is required: the timeline needs real footage.");
  }

  const opening = clamp(brief.openingSeconds ?? 3, 0, duration);
  const sourceIn = Math.max(0, brief.sourceInSeconds ?? 0);
  const animation = brief.animation ?? "ken-burns";
  const prefix = brief.idPrefix ?? "cut";
  const accentColor = brief.accentColor ?? tokens.palette.accent;
  const heroOut = clamp(brief.heroOutSeconds ?? duration - 2, opening, duration);

  const cuts: MontageCut[] = [];
  if (opening > 0) {
    cuts.push({
      id: `${prefix}-open`,
      source: brief.source,
      in_seconds: 0,
      out_seconds: opening,
      source_in_seconds: sourceIn,
      animation,
      layer: "primary",
    });
  }
  if (duration > opening) {
    cuts.push({
      id: `${prefix}-hold`,
      source: brief.source,
      in_seconds: opening,
      out_seconds: duration,
      source_in_seconds: sourceIn + opening,
      animation,
      layer: "primary",
    });
  }

  const overlays: MontageOverlay[] = [];
  if (heroOut > opening) {
    overlays.push({
      type: "hero_title",
      in_seconds: opening,
      out_seconds: heroOut,
      text: brief.title,
      ...(brief.subtitle ? { subtitle: brief.subtitle } : {}),
    });
  }
  if (brief.sectionTitle) {
    overlays.push({
      type: "section_title",
      in_seconds: opening,
      out_seconds: duration,
      text: brief.sectionTitle,
      accentColor,
      position: brief.position ?? "top-left",
    });
  }
  if (brief.statReveal) {
    const statIn = clamp(brief.statReveal.inSeconds ?? opening, 0, duration);
    const statOut = clamp(brief.statReveal.outSeconds ?? duration, statIn, duration);
    overlays.push({
      type: "stat_reveal",
      in_seconds: statIn,
      out_seconds: statOut,
      text: brief.statReveal.text,
      ...(brief.statReveal.subtitle ? { subtitle: brief.statReveal.subtitle } : {}),
      accentColor,
      position: brief.statReveal.position ?? "bottom-right",
    });
  }

  const timeline: ExplainerTimeline = { cuts, overlays };
  if (brief.includeTheme !== false) {
    timeline.themeConfig = themeConfigFromTokens(tokens);
  }
  return timeline;
}

/**
 * Attach the AGPL notice to a timeline document so a file written to disk
 * carries the same header as every other file in this directory.
 */
export function attachLicense(timeline: ExplainerTimeline): ExplainerTimeline {
  return {
    _license:
      "SPDX-License-Identifier: AGPL-3.0-only\n" +
      "Copyright (C) 2026 Motion Master\n" +
      "This directory is a separate AGPL-3.0 work that talks to a Montage instance\n" +
      "over its public HTTP/MCP interfaces. It is NOT part of the proprietary\n" +
      "Motion Master product and is excluded from its licence by design.",
    ...timeline,
  };
}

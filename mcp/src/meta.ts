/**
 * Meta placements — the real numbers, and what has to be true of a file.
 *
 * This is the product. Every scene in this repository is 16:9: every
 * composition, every qualified block, every render we ship. Meta's placements
 * are 4:5, 9:16 and 1:1, and Facebook Reels accepts **0% aspect-ratio
 * tolerance**. A 16:9 master cropped to 9:16 loses forty-four per cent of its
 * width; cropped to 4:5 it loses a quarter. And the safe zone on a full-screen
 * vertical placement covers roughly half the frame, because the profile name,
 * the caption, the audio ticker and the call to action all sit on top of it.
 *
 * So a Meta ad is not a sixteen-by-nine film with a caption. It is a family of
 * aspect-specific compositions, each composed for its own safe zone, plus the
 * copy that lives in the platform rather than in the pixels.
 *
 * Every number here is Meta's own, taken from the Ads Guide, with the date it
 * was read. They move, so they carry their source.
 */

export type PlacementId = "feed-4x5" | "reels-9x16" | "square-1x1" | "feed-16x9";

export interface Placement {
  id: PlacementId;
  /** The name a person would use. */
  name: string;
  /** Where it runs. */
  placements: string[];
  /** Meta's recommended master size. */
  width: number;
  height: number;
  aspect: string;
  /**
   * The fraction of each edge that must stay free of text, logos and key
   * creative. Meta's own figures, rounded down to the pixel.
   */
  safeZone: { top: number; bottom: number; left: number; right: number };
  /** The pixel safe area, worked out. */
  safeArea: { x: number; y: number; width: number; height: number };
  /** How long Meta allows the video to be. */
  duration: { min: number; max: number | null };
  /** The narrowest the video may be, and the widest at this length. */
  minWidth: { under30s: number; over30s: number };
  /** The file ceiling. */
  maxFileBytes: number;
  /** The encoding Meta asks for. */
  encoding: {
    codec: string;
    audio: string;
    audioBitrate: string;
    frameRate: string;
    scan: string;
  };
  /**
   * The character limits for the text that lives in the platform, not in the
   * creative. Meta's numbers, from the Ads Guide.
   */
  text: { primaryMin: number; primaryMax: number; headlineMax: number };
  /** How much tolerance the placement allows on the aspect ratio. */
  aspectTolerance: number;
  /** Where the numbers came from, and when they were read. */
  source: string;
  readOn: string;
}

/**
 * The placements we deliver.
 *
 * The numbers are Meta's recommended masters, not the minimums. Meta asks for
 * at least 1080 pixels on the short side, and recommends more; the safe-zone
 * figures are the ones from the Ads Guide's video pages.
 */
export const PLACEMENTS: Placement[] = [
  {
    id: "feed-4x5",
    name: "Feed — 4:5",
    placements: ["Facebook Feed", "Instagram Feed"],
    width: 1440,
    height: 1800,
    aspect: "4:5",
    safeZone: { top: 0, bottom: 0, left: 0, right: 0 },
    safeArea: { x: 0, y: 0, width: 1440, height: 1800 },
    duration: { min: 1, max: 241 * 60 },
    minWidth: { under30s: 120, over30s: 120 },
    maxFileBytes: 4 * 1024 * 1024 * 1024,
    encoding: {
      codec: "H.264",
      audio: "AAC stereo",
      audioBitrate: "128 kbps or higher",
      frameRate: "fixed, 30 fps recommended",
      scan: "progressive",
    },
    text: { primaryMin: 40, primaryMax: 150, headlineMax: 27 },
    aspectTolerance: 0.03,
    source:
      "https://eventsmanager.facebook.com/business/ads-guide/update/video/facebook-facebook-feed",
    readOn: "2026-11-13",
  },
  {
    id: "reels-9x16",
    name: "Reels and Stories — 9:16",
    placements: ["Facebook Reels", "Instagram Reels", "Facebook Stories", "Instagram Stories"],
    width: 1440,
    height: 2560,
    aspect: "9:16",
    /*
     * Meta's own guidance for full-screen vertical: leave roughly fourteen per
     * cent of the top, thirty-five per cent of the bottom and six per cent of
     * each side free of text, logos and key creative. If the ad carries a
     * disclaimer, the bottom becomes forty per cent.
     */
    safeZone: { top: 0.14, bottom: 0.35, left: 0.06, right: 0.06 },
    safeArea: { x: 86, y: 358, width: 1267, height: 1306 },
    duration: { min: 0, max: 15 * 60 },
    minWidth: { under30s: 250, over30s: 500 },
    maxFileBytes: 4 * 1024 * 1024 * 1024,
    encoding: {
      codec: "H.264",
      audio: "AAC stereo",
      audioBitrate: "128 kbps or higher",
      frameRate: "fixed, 30 fps recommended",
      scan: "progressive",
    },
    text: { primaryMin: 40, primaryMax: 150, headlineMax: 55 },
    aspectTolerance: 0,
    source:
      "https://eventsmanager.facebook.com/business/ads-guide/update/video/facebook-facebook-reels",
    readOn: "2026-11-13",
  },
  {
    id: "square-1x1",
    name: "Square — 1:1",
    placements: ["Facebook Feed", "Instagram Feed", "Carousel cards", "In-stream"],
    width: 1440,
    height: 1440,
    aspect: "1:1",
    safeZone: { top: 0, bottom: 0, left: 0, right: 0 },
    safeArea: { x: 0, y: 0, width: 1440, height: 1440 },
    duration: { min: 0, max: 15 * 60 },
    minWidth: { under30s: 250, over30s: 500 },
    maxFileBytes: 4 * 1024 * 1024 * 1024,
    encoding: {
      codec: "H.264",
      audio: "AAC stereo",
      audioBitrate: "128 kbps or higher",
      frameRate: "fixed, 30 fps recommended",
      scan: "progressive",
    },
    text: { primaryMin: 40, primaryMax: 150, headlineMax: 27 },
    aspectTolerance: 0.01,
    source:
      "https://eventsmanager.facebook.com/business/ads-guide/update/video/instagram-feed",
    readOn: "2026-11-13",
  },
  {
    id: "feed-16x9",
    name: "Feed — 16:9",
    placements: ["Facebook Feed (landscape)", "Instagram In-stream"],
    width: 1920,
    height: 1080,
    aspect: "16:9",
    safeZone: { top: 0, bottom: 0, left: 0, right: 0 },
    safeArea: { x: 0, y: 0, width: 1920, height: 1080 },
    duration: { min: 1, max: 241 * 60 },
    minWidth: { under30s: 120, over30s: 120 },
    maxFileBytes: 4 * 1024 * 1024 * 1024,
    encoding: {
      codec: "H.264",
      audio: "AAC stereo",
      audioBitrate: "128 kbps or higher",
      frameRate: "fixed, 30 fps recommended",
      scan: "progressive",
    },
    text: { primaryMin: 40, primaryMax: 150, headlineMax: 27 },
    aspectTolerance: 0.03,
    source:
      "https://eventsmanager.facebook.com/business/ads-guide/update/video/facebook-facebook-feed",
    readOn: "2026-11-13",
  },
];

/** One placement by its id. */
export function placement(id: string): Placement | undefined {
  return PLACEMENTS.find((p) => p.id === id);
}

/* ------------------------------------------------------------------ geometry */

/**
 * The safe area of a placement, in pixels.
 *
 * The fractions are Meta's; the pixels are worked out from the master size, so
 * a safe zone moves when the master does.
 */
export function safeAreaOf(p: Placement): { x: number; y: number; width: number; height: number } {
  const top = Math.round(p.height * p.safeZone.top);
  const bottom = Math.round(p.height * p.safeZone.bottom);
  const left = Math.round(p.width * p.safeZone.left);
  const right = Math.round(p.width * p.safeZone.right);
  return {
    x: left,
    y: top,
    width: p.width - left - right,
    height: p.height - top - bottom,
  };
}

/**
 * The safe area as fractions of the frame, so it can be applied to any size.
 */
export function safeZoneFractions(p: Placement): { top: number; bottom: number; left: number; right: number } {
  return p.safeZone;
}

/**
 * How much of a sixteen-by-nine frame survives a crop to this ratio.
 *
 * This is the number that says why a crop is not a reframe.
 */
export function cropLoss(p: Placement): { keptWidth: number; keptHeight: number; lost: number } {
  const target = p.width / p.height;
  const source = 16 / 9;
  if (Math.abs(target - source) < 0.001) {
    return { keptWidth: 1, keptHeight: 1, lost: 0 };
  }
  if (target < source) {
    /* A taller frame: the width is cut. */
    const kept = target / source;
    return { keptWidth: kept, keptHeight: 1, lost: 1 - kept };
  }
  /* A wider frame: the height is cut. */
  const kept = source / target;
  return { keptWidth: 1, keptHeight: kept, lost: 1 - kept };
}

/* -------------------------------------------------------------- the ad copy */

/**
 * The text of an ad.
 *
 * It lives in the platform, not in the creative. Meta's own guidance is that
 * an ad image or video should carry very little text: the words belong in the
 * primary text field and the headline field, where they are selectable,
 * translatable and readable by a screen reader.
 */
export interface AdCopy {
  /** The body of the ad, below or beside the creative. */
  primaryText: string;
  /** The short line, usually above or below the creative. */
  headline: string;
  /** Optional, and rarely read. */
  description: string;
  /** A label a person can search the campaign by. */
  label: string;
}

export interface CopyProblem {
  field: string;
  message: string;
}

/**
 * Check the copy against the placement's own limits.
 *
 * The limits are Meta's. A primary text that is too short is as wrong as one
 * that is too long: Meta asks for forty characters at the bottom and a
 * hundred and fifty at the top.
 */
export function checkCopy(copy: AdCopy, p: Placement): CopyProblem[] {
  const problems: CopyProblem[] = [];
  const primary = (copy.primaryText ?? "").trim();
  const headline = (copy.headline ?? "").trim();

  if (primary.length < p.text.primaryMin) {
    problems.push({
      field: "primaryText",
      message: `The primary text is ${primary.length} characters. Meta asks for at least ${p.text.primaryMin}.`,
    });
  }
  if (primary.length > p.text.primaryMax) {
    problems.push({
      field: "primaryText",
      message: `The primary text is ${primary.length} characters. The limit is ${p.text.primaryMax}.`,
    });
  }
  if (headline.length > p.text.headlineMax) {
    problems.push({
      field: "headline",
      message: `The headline is ${headline.length} characters. The limit is ${p.text.headlineMax}.`,
    });
  }
  if (!headline) {
    problems.push({ field: "headline", message: "An ad needs a headline." });
  }
  return problems;
}

/**
 * Trim a string to a character limit, on a word boundary.
 *
 * Used when something has to fit and the fit is the point — a headline that
 * has been cut mid-word reads as a mistake, not as a trim.
 */
export function fitTo(text: string, limit: number): string {
  const clean = (text ?? "").trim();
  if (clean.length <= limit) return clean;
  let cut = clean.slice(0, limit);
  const space = cut.lastIndexOf(" ");
  if (space > limit * 0.6) cut = cut.slice(0, space);
  return cut.replace(/[\s,;:.!—-]+$/, "");
}

/* -------------------------------------------------------------- the preflight */

export interface PreflightFinding {
  severity: "error" | "warning";
  code: string;
  message: string;
}

export interface PreflightResult {
  placement: PlacementId;
  file: string;
  ok: boolean;
  findings: PreflightFinding[];
  /** What was measured, so the report is evidence rather than a claim. */
  measured: Record<string, unknown>;
}

/**
 * Check a rendered file against a placement.
 *
 * This is the gate an ad has to pass before it is handed over. It is not the
 * taste gate — that is the house gate, and it runs on the composition. This
 * one checks the things Meta will reject or crop: the ratio, the width, the
 * duration, the encoding and the file size.
 */
export function preflight(
  placementId: PlacementId,
  measured: {
    file: string;
    width?: number;
    height?: number;
    durationSeconds?: number;
    bytes?: number;
    codec?: string;
    audioCodec?: string;
    fps?: number;
    hasAudio?: boolean;
  },
): PreflightResult {
  const p = placement(placementId);
  const findings: PreflightFinding[] = [];
  if (!p) {
    return {
      placement: placementId,
      file: measured.file,
      ok: false,
      findings: [{ severity: "error", code: "unknown_placement", message: `There is no placement called "${placementId}".` }],
      measured: {},
    };
  }

  const ratio = measured.width && measured.height ? measured.width / measured.height : undefined;
  if (ratio) {
    const target = p.width / p.height;
    const drift = Math.abs(ratio - target) / target;
    if (drift > p.aspectTolerance) {
      findings.push({
        severity: "error",
        code: "aspect_ratio",
        message:
          `The frame is ${measured.width}x${measured.height}, which is ${drift * 100 < 0.1 ? drift.toFixed(4) : (drift * 100).toFixed(1)}% off ` +
          `${p.aspect}. ${p.name} allows ${p.aspectTolerance * 100}% tolerance.`,
      });
    }
  }
  if (measured.width) {
    const floor = (measured.durationSeconds ?? 0) >= 30 ? p.minWidth.over30s : p.minWidth.under30s;
    if (measured.width < floor) {
      findings.push({
        severity: "error",
        code: "min_width",
        message: `The frame is ${measured.width} pixels wide. ${p.name} wants at least ${floor}.`,
      });
    }
  }
  if (measured.durationSeconds !== undefined) {
    if (measured.durationSeconds < p.duration.min) {
      findings.push({
        severity: "error",
        code: "duration_short",
        message: `The video is ${measured.durationSeconds} seconds. ${p.name} wants at least ${p.duration.min}.`,
      });
    }
    if (p.duration.max !== null && measured.durationSeconds > p.duration.max) {
      findings.push({
        severity: "error",
        code: "duration_long",
        message: `The video is ${measured.durationSeconds} seconds. ${p.name} allows at most ${p.duration.max}.`,
      });
    }
  }
  if (measured.bytes !== undefined && measured.bytes > p.maxFileBytes) {
    findings.push({
      severity: "error",
      code: "file_size",
      message: `The file is ${measured.bytes} bytes. The ceiling is ${p.maxFileBytes}.`,
    });
  }
  if (measured.codec && !measured.codec.toLowerCase().includes("h264")) {
    findings.push({
      severity: "warning",
      code: "codec",
      message: `The video is ${measured.codec}. Meta asks for H.264.`,
    });
  }
  if (measured.hasAudio === false) {
    findings.push({
      severity: "warning",
      code: "no_audio",
      message: "The video has no audio track. Meta recommends sound on an ad.",
    });
  }

  return {
    placement: p.id,
    file: measured.file,
    ok: findings.every((f) => f.severity !== "error"),
    findings,
    measured: {
      width: measured.width,
      height: measured.height,
      durationSeconds: measured.durationSeconds,
      bytes: measured.bytes,
      codec: measured.codec,
      audioCodec: measured.audioCodec,
      fps: measured.fps,
      hasAudio: measured.hasAudio,
      safeArea: safeAreaOf(p),
      cropLoss: cropLoss(p),
    },
  };
}

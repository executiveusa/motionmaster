// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Motion Master
// This directory is a separate AGPL-3.0 work that talks to a Montage instance
// over its public HTTP/MCP interfaces. It is NOT part of the proprietary
// Motion Master product and is excluded from its licence by design.

/**
 * Motion Master palette + type tokens.
 *
 * The tokens live in `motion-master/plugins/` so the landing site, the skill
 * pack and this bridge all read ONE source of truth. The loader below reads
 * them from disk at runtime; `INLINE_TOKENS` is only the fallback used when
 * the plugin token file cannot be read.
 *
 * Current token file: `plugins/motion-master/assets/motion-tokens.json`
 * (`motion-master.tokens`, v1.0.0). It carries the palette, the typography
 * families, the easing curves, the duration scale and the anti-slop list.
 *
 * TODO(integration-worker): the inline fallback duplicates the palette and
 * the type scale. Keep it in sync with the token file, or drop it once the
 * token file is guaranteed to ship with the plugin. Every load that falls
 * back reports `source: "inline"` so the UI can say so.
 */

import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { MontageThemeConfig } from "./types.ts";

/** Colour tokens of the Motion Master design system ("The Film Lab"). */
export interface MotionMasterPalette {
  canvas: string;
  surface: string;
  ink: string;
  mutedInk: string;
  hairline: string;
  accent: string;
  accentDark: string;
  player: string;
}

/** Type tokens of the Motion Master design system. */
export interface MotionMasterTypeTokens {
  displayFont: string;
  bodyFont: string;
  monoFont: string;
  displayWeight: number;
  labelSize: number;
  labelTracking: string;
  baseSpacing: number;
}

/** The full token set used by the bridge. */
export interface MotionMasterTokens {
  palette: MotionMasterPalette;
  type: MotionMasterTypeTokens;
}

/**
 * Fallback tokens, taken from the Motion Master design lock
 * (`motion-master/docs/03-DESIGN-LOCK.md`, VISUAL SYSTEM block).
 * These are the values the bridge uses until the plugin token file lands.
 */
export const INLINE_TOKENS: MotionMasterTokens = {
  palette: {
    canvas: "#F4F4F2",
    surface: "#FFFFFF",
    ink: "#111113",
    mutedInk: "#6B6B70",
    hairline: "#DDDEDA",
    accent: "#FF4A1C",
    accentDark: "#D63A12",
    player: "#0E0E10",
  },
  type: {
    displayFont: "IBM Plex Sans",
    bodyFont: "IBM Plex Sans",
    monoFont: "IBM Plex Mono",
    displayWeight: 700,
    labelSize: 12,
    labelTracking: "0.12em",
    baseSpacing: 8,
  },
};

/** Where the token values came from. */
export interface LoadedTokens {
  tokens: MotionMasterTokens;
  /** "plugins" when a token file was read from the plugin tree, "inline" otherwise. */
  source: "plugins" | "inline";
  /** Absolute path of the token file that was read, when there was one. */
  path?: string;
  /** Human readable note, e.g. why the inline fallback was used. */
  warning?: string;
}

/** Default location of the Motion Master plugin tree. */
export function defaultPluginsDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  // src/ -> bridge/ -> motion-master/
  return resolve(here, "..", "..", "plugins");
}

const TOKEN_FILE_NAMES = ["motion-tokens.json", "tokens.json", "palette.tokens.json"];

async function findTokenFile(root: string, depth = 0): Promise<string | undefined> {
  if (depth > 4 || !existsSync(root)) return undefined;
  let entries: string[];
  try {
    entries = await readdir(root);
  } catch {
    return undefined;
  }
  for (const name of TOKEN_FILE_NAMES) {
    if (entries.includes(name)) return join(root, name);
  }
  for (const entry of entries) {
    if (entry.startsWith(".") || entry === "node_modules") continue;
    const found = await findTokenFile(join(root, entry), depth + 1);
    if (found) return found;
  }
  return undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function at(source: Record<string, unknown>, path: string[]): unknown {
  let current: unknown = source;
  for (const key of path) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/**
 * Merge a token file over the inline fallback. Unknown keys are ignored and
 * missing keys keep the inline value, so a partial token file is still usable.
 */
export function mergeTokens(raw: unknown): MotionMasterTokens {
  const root = (raw ?? {}) as Record<string, unknown>;
  const palette = (root.palette ?? root.colors ?? {}) as Record<string, unknown>;
  const type = (root.type ?? root.typography ?? {}) as Record<string, unknown>;
  const families = (at(type, ["families"]) ?? {}) as Record<string, unknown>;
  const sansFamily = asString(families.sans) ?? asString(type.displayFont ?? type.display_font);
  const monoFamily = asString(families.mono) ?? asString(type.monoFont ?? type.mono_font);
  return {
    palette: {
      canvas: asString(palette.canvas) ?? INLINE_TOKENS.palette.canvas,
      surface: asString(palette.surface) ?? INLINE_TOKENS.palette.surface,
      ink: asString(palette.ink) ?? INLINE_TOKENS.palette.ink,
      mutedInk:
        asString(palette.mutedInk ?? palette.muted_ink) ?? INLINE_TOKENS.palette.mutedInk,
      hairline: asString(palette.hairline) ?? INLINE_TOKENS.palette.hairline,
      accent: asString(palette.accent) ?? INLINE_TOKENS.palette.accent,
      accentDark:
        asString(palette.accentDark ?? palette.accent_dark) ?? INLINE_TOKENS.palette.accentDark,
      player:
        asString(palette.player ?? palette.playerZone ?? palette.player_zone) ??
        INLINE_TOKENS.palette.player,
    },
    type: {
      displayFont: sansFamily ?? INLINE_TOKENS.type.displayFont,
      bodyFont:
        asString(type.bodyFont ?? type.body_font) ?? sansFamily ?? INLINE_TOKENS.type.bodyFont,
      monoFont: monoFamily ?? INLINE_TOKENS.type.monoFont,
      displayWeight:
        asNumber(type.displayWeight ?? type.display_weight) ??
        asNumber(at(type, ["display", "weight"])) ??
        INLINE_TOKENS.type.displayWeight,
      labelSize:
        asNumber(type.labelSize ?? type.label_size) ??
        asNumber(at(type, ["label", "size"])) ??
        INLINE_TOKENS.type.labelSize,
      labelTracking:
        asString(type.labelTracking ?? type.label_tracking) ??
        asString(at(type, ["label", "tracking"])) ??
        INLINE_TOKENS.type.labelTracking,
      baseSpacing:
        asNumber(type.baseSpacing ?? type.base_spacing) ?? INLINE_TOKENS.type.baseSpacing,
    },
  };
}

/**
 * Read the Motion Master tokens.
 *
 * @param options.pluginsDir plugin tree to scan (defaults to `motion-master/plugins`)
 * @param options.fallback    when false, a missing token file is an error
 */
export async function loadTokens(
  options: { pluginsDir?: string; fallback?: boolean } = {},
): Promise<LoadedTokens> {
  const pluginsDir = options.pluginsDir ?? defaultPluginsDir();
  const file = await findTokenFile(pluginsDir);
  if (!file) {
    if (options.fallback === false) {
      throw new Error(`No Motion Master token file found under ${pluginsDir}`);
    }
    return {
      tokens: INLINE_TOKENS,
      source: "inline",
      warning:
        `No token file under ${pluginsDir}; using the inline Motion Master tokens. ` +
        "TODO(integration-worker): keep the inline fallback in sync with " +
        "plugins/motion-master/assets/motion-tokens.json, or drop it.",
    };
  }
  try {
    const raw = JSON.parse(await readFile(file, "utf8"));
    return { tokens: mergeTokens(raw), source: "plugins", path: file };
  } catch (error) {
    if (options.fallback === false) throw error;
    return {
      tokens: INLINE_TOKENS,
      source: "inline",
      path: file,
      warning: `Could not read ${file} (${String(error)}); using the inline tokens.`,
    };
  }
}

/**
 * Project the Motion Master tokens onto the composer's `themeConfig` prop.
 *
 * The composer merges this over its own default theme, so the render keeps
 * the Motion Master palette without touching a single Montage source file.
 */
export function themeConfigFromTokens(tokens: MotionMasterTokens): MontageThemeConfig {
  const { palette, type } = tokens;
  return {
    primaryColor: palette.ink,
    accentColor: palette.accent,
    backgroundColor: palette.canvas,
    surfaceColor: palette.surface,
    textColor: palette.ink,
    mutedTextColor: palette.mutedInk,
    headingFont: type.displayFont,
    bodyFont: type.bodyFont,
    monoFont: type.monoFont,
    chartColors: [palette.accent, palette.ink, palette.mutedInk, palette.accentDark],
  };
}

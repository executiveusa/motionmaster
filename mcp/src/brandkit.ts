/**
 * Brand kits — per-project overrides of the Motion Master tokens.
 *
 * The canonical token file is one set of values: one palette, one type, one
 * set of easings. That is fine for one brand and useless for a studio that
 * makes work for more than one.
 *
 * A brand kit is a *partial override*. It may change the palette, the type,
 * the easing, the durations, the style durations, the springs, the stagger
 * budget and the motion rules. It may not remove anything: where a kit is
 * silent, the base value survives. A kit is authored by an agent, so a typo
 * becomes a render nobody can explain — every kit is validated before it is
 * saved and before it is used.
 *
 * The rules this file exists to enforce:
 *   - A kit overrides; it never deletes.
 *   - A kit may not change `id`, `version` or `antiSlop`. Those are the
 *     identity of the system and the rules that keep it from going soft.
 *   - Palette values are hex, so a colour is never a typo.
 *   - Only known token sections are accepted, so a misspelled section is an
 *     error rather than a silent no-op.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { MotionTokens } from "./tokens.js";

/** The token sections a kit may override. */
export const KIT_SECTIONS = [
  "palette",
  "typography",
  "easing",
  "duration",
  "durationRanges",
  "styleDurations",
  "spring",
  "stagger",
  "motion",
] as const;

export type KitSection = (typeof KIT_SECTIONS)[number];

/** Sections a kit may never touch. */
export const PROTECTED_SECTIONS = ["id", "version", "antiSlop", "name"] as const;

export interface BrandKit {
  id: string;
  name: string;
  notes?: string;
  palette?: Record<string, string>;
  typography?: Record<string, unknown>;
  easing?: Record<string, unknown>;
  duration?: Record<string, unknown>;
  durationRanges?: Record<string, unknown>;
  styleDurations?: Record<string, unknown>;
  spring?: Record<string, unknown>;
  stagger?: Record<string, unknown>;
  motion?: Record<string, unknown>;
}

export interface KitSummary {
  id: string;
  name: string;
  notes?: string;
  overrides: string[];
}

export interface KitProblem {
  path: string;
  message: string;
}

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const ID = /^[a-z0-9][a-z0-9-]{0,62}$/;

/** The kit directory. `studio/kits` at the repo root. */
export function kitsDir(repoRoot: string): string {
  return join(repoRoot, "studio", "kits");
}

/**
 * Validate a kit against the base tokens.
 *
 * Returns the problems, not a boolean: an agent that saves a kit needs to be
 * told what is wrong with it in a sentence it can act on.
 */
export function validateKit(kit: unknown, base?: MotionTokens): KitProblem[] {
  const problems: KitProblem[] = [];
  if (typeof kit !== "object" || kit === null) {
    return [{ path: "kit", message: "A kit must be an object." }];
  }
  const candidate = kit as Record<string, unknown>;

  if (typeof candidate.id !== "string" || !ID.test(candidate.id)) {
    problems.push({
      path: "id",
      message: "A kit id is lowercase letters, digits and dashes, and it starts with a letter or a digit.",
    });
  }
  if (typeof candidate.name !== "string" || candidate.name.trim() === "") {
    problems.push({ path: "name", message: "A kit needs a name." });
  }

  for (const key of Object.keys(candidate)) {
    if (key === "id" || key === "name" || key === "notes") continue;
    if ((PROTECTED_SECTIONS as readonly string[]).includes(key)) {
      problems.push({
        path: key,
        message: `A kit may not change "${key}". That belongs to the system, not to a brand.`,
      });
      continue;
    }
    if (!(KIT_SECTIONS as readonly string[]).includes(key)) {
      problems.push({
        path: key,
        message: `Unknown token section "${key}". A kit may override: ${KIT_SECTIONS.join(", ")}.`,
      });
      continue;
    }
    const section = candidate[key];
    if (typeof section !== "object" || section === null || Array.isArray(section)) {
      problems.push({ path: key, message: `The "${key}" section must be an object of overrides.` });
      continue;
    }
    if (key === "palette") {
      for (const [token, value] of Object.entries(section as Record<string, unknown>)) {
        if (typeof value !== "string" || !HEX.test(value)) {
          problems.push({
            path: `palette.${token}`,
            message: `"${value}" is not a colour. Use #RRGGBB or #RRGGBBAA.`,
          });
        }
      }
    }
  }

  /* A kit may only override a token that exists. Otherwise the renderer
     silently falls back to the base value and the kit looks like it worked. */
  if (base) {
    for (const section of KIT_SECTIONS) {
      const override = candidate[section];
      if (typeof override !== "object" || override === null) continue;
      const baseSection = (base as unknown as Record<string, unknown>)[section];
      if (typeof baseSection !== "object" || baseSection === null) continue;
      for (const token of Object.keys(override as Record<string, unknown>)) {
        if (!(token in (baseSection as Record<string, unknown>))) {
          problems.push({
            path: `${section}.${token}`,
            message: `The base tokens have no "${token}" in ${section}. A kit overrides a token that exists.`,
          });
        }
      }
    }
  }

  return problems;
}

/**
 * Merge a kit into the base tokens.
 *
 * The base survives everywhere the kit is silent. `id`, `version`, `name` and
 * `antiSlop` are never touched.
 */
export function resolveTokens(base: MotionTokens, kit?: BrandKit | null): MotionTokens {
  if (!kit) return base;
  const resolved: Record<string, unknown> = { ...(base as unknown as Record<string, unknown>) };
  for (const section of KIT_SECTIONS) {
    const override = (kit as unknown as Record<string, unknown>)[section];
    if (typeof override !== "object" || override === null) continue;
    resolved[section] = {
      ...((base as unknown as Record<string, unknown>)[section] as Record<string, unknown>),
      ...(override as Record<string, unknown>),
    };
  }
  resolved.id = base.id;
  resolved.version = base.version;
  resolved.name = base.name;
  resolved.antiSlop = base.antiSlop;
  return resolved as unknown as MotionTokens;
}

/** Every kit on disk, as a summary. */
export function listBrandKits(repoRoot: string): KitSummary[] {
  const dir = kitsDir(repoRoot);
  if (!existsSync(dir)) return [];
  const summaries: KitSummary[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    try {
      const kit = JSON.parse(readFileSync(join(dir, entry.name), "utf8")) as BrandKit;
      summaries.push({
        id: kit.id,
        name: kit.name,
        notes: kit.notes,
        overrides: KIT_SECTIONS.filter((section) => {
          const value = (kit as unknown as Record<string, unknown>)[section];
          return typeof value === "object" && value !== null && Object.keys(value).length > 0;
        }),
      });
    } catch {
      /* a broken file is reported by validateKit when it is read on purpose */
    }
  }
  return summaries.sort((a, b) => a.id.localeCompare(b.id));
}

/** One kit, with its problems. */
export function getBrandKit(
  repoRoot: string,
  id: string,
  base?: MotionTokens,
): { kit?: BrandKit; problems: KitProblem[] } {
  const path = join(kitsDir(repoRoot), `${id}.json`);
  if (!existsSync(path)) return { problems: [{ path: "id", message: `There is no kit called "${id}".` }] };
  let kit: BrandKit;
  try {
    kit = JSON.parse(readFileSync(path, "utf8")) as BrandKit;
  } catch (error) {
    return {
      problems: [{ path: "file", message: `The kit file could not be read: ${(error as Error).message}` }],
    };
  }
  const problems = validateKit(kit, base);
  return { kit, problems };
}

/**
 * Write a kit. The kit is validated first, and a kit with problems is not
 * written — a broken kit that reaches the renderer is worse than no kit.
 */
export function saveBrandKit(
  repoRoot: string,
  kit: unknown,
  base?: MotionTokens,
): { saved?: boolean; problems: KitProblem[]; path?: string } {
  const problems = validateKit(kit, base);
  if (problems.length > 0) return { saved: false, problems };
  const candidate = kit as BrandKit;
  const dir = kitsDir(repoRoot);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${candidate.id}.json`);
  writeFileSync(path, `${JSON.stringify(candidate, null, 2)}\n`);
  return { saved: true, problems: [], path };
}

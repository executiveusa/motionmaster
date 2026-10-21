/**
 * Motion Master token access.
 *
 * The canonical token file is `plugins/motion-master/assets/motion-tokens.json`
 * in the repository. It is read at runtime so that the tokens a user edits in
 * one place are the tokens the server, the skills and the Montage bridge use.
 *
 * `src/tokens.generated.ts` is a generated mirror of that file, produced by
 * `npm run sync:tokens` and checked by `npm run check:tokens`. It is only used
 * when the canonical file cannot be found (e.g. the server is copied out of the
 * repository on its own).
 */
import { readFileSync } from "node:fs";
import { GENERATED_TOKENS } from "./tokens.generated.js";

export interface CubicBezier {
  [index: number]: number;
  cubicBezier: [number, number, number, number];
  name: string;
  role: string;
  note?: string;
}

export interface MotionTokens {
  [key: string]: unknown;
  id: string;
  name: string;
  version: string;
  palette: Record<string, string>;
  typography: Record<string, unknown>;
  easing: Record<string, CubicBezier>;
  duration: Record<string, number>;
  styleDurations: Record<string, { entrance: number; onScreen: number; exit: number; stagger: string }>;
  spring: Record<string, { stiffness: number; damping: number; mass: number; note?: string }>;
  stagger: {
    budgetMs: number;
    rule: string;
    patterns: Record<string, { intervalMs: number; budgetMs: number }>;
  };
  motion: Record<string, unknown>;
  antiSlop: string[];
}

let cached: { tokens: MotionTokens; source: string } | undefined;

function isTokens(value: unknown): value is MotionTokens {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<MotionTokens>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.version === "string" &&
    typeof candidate.palette === "object" &&
    candidate.palette !== null &&
    typeof candidate.easing === "object" &&
    candidate.easing !== null
  );
}

/** Read the canonical token file, falling back to the generated mirror. */
export function loadTokens(tokensPath?: string): MotionTokens {
  if (cached) return cached.tokens;
  if (tokensPath) {
    try {
      const parsed: unknown = JSON.parse(readFileSync(tokensPath, "utf8"));
      if (isTokens(parsed)) {
        cached = { tokens: parsed, source: tokensPath };
        return parsed;
      }
    } catch {
      // fall through to the generated mirror
    }
  }
  cached = {
    tokens: GENERATED_TOKENS as unknown as MotionTokens,
    source: "generated:src/tokens.generated.ts",
  };
  return cached.tokens;
}

/** Where the currently loaded tokens came from — surfaced by get_motion_tokens. */
export function tokenSource(tokensPath?: string): string {
  loadTokens(tokensPath);
  return cached?.source ?? "unknown";
}

export function resetTokenCache(): void {
  cached = undefined;
}

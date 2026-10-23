/**
 * Block matching and filling.
 *
 * A HyperFrames block is a real motion component with a variable schema: the
 * headline strings, the image slots, the speed, the colour, the enum choices.
 * That is the difference between a template planner and something that
 * actually works — the block already knows how to move; it only needs to be
 * told *what* it is showing.
 *
 * This module does three things:
 *   1. picks the blocks whose tags fit a brief,
 *   2. fills their variables from the brief and the Motion Master tokens,
 *   3. writes the values out in the shape HyperFrames expects.
 *
 * It is deterministic. Nothing is invented: a variable that cannot be filled
 * from the brief keeps its default, and every value carries a reason.
 */
import type { TokenShape } from "./enhancer.js";

/**
 * The headline a card carries, and a short label for the small slots.
 */

export interface BlockVariable {
  id: string;
  type: "image" | "enum" | "string" | "number" | "color" | "boolean" | string;
  role: string | null;
  label: string;
  description: string;
  portrays: string[];
  default: unknown;
  min: number | null;
  max: number | null;
  options: { value: string; label: string }[];
}

export interface MotionBlock {
  id: string;
  type: string;
  title: string;
  description: string;
  tags: string[];
  author: string | null;
  dimensions: { width: number; height: number } | null;
  duration: number | null;
  variables: BlockVariable[];
  files: { path: string; target: string; type: string }[];
  license: string;
}

export interface BlockFile {
  generated: string;
  source: string;
  count: number;
  tags: { slug: string; count: number }[];
  blocks: MotionBlock[];
}

export interface FilledValue {
  id: string;
  value: unknown;
  source: "brief" | "tokens" | "default";
  reason: string;
}

export interface FilledBlock {
  id: string;
  title: string;
  tags: string[];
  duration: number | null;
  variables: FilledValue[];
  /** The values in the shape HyperFrames `--variables` expects. */
  values: Record<string, unknown>;
  /** The variables that were left at their default, and why. */
  unresolved: { id: string; reason: string }[];
}

/* --------------------------------------------------------------- matching */

const STOP = new Set([
  "a", "an", "the", "of", "for", "and", "or", "to", "in", "on", "with", "as",
  "at", "by", "from", "is", "it", "this", "that", "be", "are", "make", "create",
  "video", "animation", "animated", "motion", "graphics", "clip", "film", "short",
  "product", "brand", "launch", "show", "my", "our", "their",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

/**
 * Rank the blocks against a brief.
 *
 * A block's tags are the best signal — they are curated and consistent — so
 * they carry most of the weight. The title and description are the tiebreak.
 */
export function matchBlocks(
  file: BlockFile,
  brief: string,
  options: { limit?: number; types?: string[]; requireVariables?: boolean } = {},
): { block: MotionBlock; score: number; matchedTags: string[] }[] {
  const words = new Set(tokenize(brief));
  const lower = brief.toLowerCase();
  // A brief that never mentions pictures should not be answered with a block
  // that needs twelve of them.
  const wantsImages = /\b(image|images|photo|photos|picture|pictures|gallery|carousel|album|artwork|screenshots?)\b/.test(
    lower,
  );

  const pool = file.blocks.filter((b) => {
    if (options.types && !options.types.includes(b.type)) return false;
    if (options.requireVariables && b.variables.length === 0) return false;
    return true;
  });

  const scored = pool.map((block) => {
    const matchedTags: string[] = [];
    let score = 0;
    for (const tag of block.tags) {
      const tagWords = tag.split("-");
      const hit = tagWords.some((w) => words.has(w) || lower.includes(tag));
      if (hit) {
        matchedTags.push(tag);
        score += 6;
      }
    }
    const hay = `${block.title} ${block.description}`.toLowerCase();
    for (const w of words) if (hay.includes(w)) score += 1;
    // A block with variables is usable; one without is only a reference.
    if (block.variables.length > 0) score += 2;

    // Image slots the brief did not ask for are a cost, not a feature.
    const imageSlots = block.variables.filter((v) => v.type === "image").length;
    if (imageSlots > 0) {
      if (wantsImages) score += Math.min(imageSlots, 4);
      else score -= Math.min(imageSlots, 6) * 2;
    }
    // A block whose variables can actually carry the brief's content is a
    // better answer than one whose strings are decorative.
    const contentVars = block.variables.filter(
      (v) => v.type === "string" && v.role !== "style",
    );
    if (contentVars.length > 0) score += 3;

    return { block, score, matchedTags };
  });

  // Variants of one idea are one idea. Keep the best of each family so the
  // result is a shot list, not five flavours of the same block.
  const families = new Map<string, { block: MotionBlock; score: number; matchedTags: string[] }>();
  for (const entry of scored) {
    if (entry.score <= 0) continue;
    const key = familyKey(entry.block);
    const held = families.get(key);
    if (!held || entry.score > held.score) families.set(key, entry);
  }

  return [...families.values()]
    .sort((a, b) => b.score - a.score || a.block.id.localeCompare(b.block.id))
    .slice(0, options.limit ?? 8);
}

/**
 * The family a block belongs to — the stem of its name, with the style
 * variants stripped. "carousel-text-circle-3" and "carousel-text-circle-4" are
 * the same idea at different angles; "titlecard-calm" is its own.
 */
function familyKey(block: MotionBlock): string {
  const stem = block.id
    .replace(/-(\d+)$/, "")
    .replace(/-(style-)?\d+$/, "");
  return stem;
}

/* ---------------------------------------------------------------- filling */

export interface FillContext {
  /** The brief, used to source string values. */
  brief: string;
  /** Explicit values, keyed by variable id. These always win. */
  values?: Record<string, unknown>;
  /** The Motion Master tokens, used for colour and style variables. */
  tokens: TokenShape;
  /** The headline to use when a variable is obviously the main line. */
  headline?: string;
}

/** Pull the subject out of the brief to use as a headline. */
/** Production words that describe the request, not the subject. */
const PRODUCTION_WORDS = new Set([
  "calm", "cinematic", "smooth", "modern", "clean", "minimal", "bold", "dark",
  "light", "quiet", "soft", "sharp", "fast", "slow", "short", "long", "simple",
  "title", "card", "titleline", "product", "reveal", "launch", "promo", "ad",
  "showreel", "intro", "outro", "logo", "wordmark", "kinetic", "type",
  "typography", "animation", "animated", "video", "clip", "film", "piece",
  "social", "spot", "teaser", "opener", "sting", "motion", "graphics",
  "presentation", "deck", "loop", "looping", "seamless", "showcase", "feature",
  "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "twelve", "first", "second", "third",
]);

/** A word that describes the request rather than the subject. */
function isProductionWord(word: string): boolean {
  const bare = word.toLowerCase().replace(/[^a-z]/g, "");
  if (PRODUCTION_WORDS.has(bare)) return true;
  return bare.length > 3 && PRODUCTION_WORDS.has(bare.replace(/s$/, ""));
}

/**
 * The title a card should carry.
 *
 * A brief is an instruction; a headline is a subject. "a calm title card and a
 * product reveal for ACME coffee" is a request for two things — the subject is
 * "ACME coffee". A headline that carries the whole sentence overflows the
 * card it is set in, so the production words come off first and the result is
 * capped short.
 */
export function headlineFrom(brief: string, fallback = "Your headline here"): string {
  let working = brief
    .replace(/^\s*(make|create|generate|build|design|produce|i want|i need|can you|please)\s+/i, "")
    .replace(/[.!?]+$/, "")
    .trim();

  // The duration is a production note, not a headline.
  working = working
    .replace(/\b\d{1,2}\s*(?:-|–|—|to)?\s*\d*\s*(?:s\b|sec\b|secs\b|seconds?\b)/gi, " ")
    .replace(/\b\d{1,2}:\d{2}\b/g, " ")
    .replace(/\b(?:for|in|of|at|within|about|last)\s*$/i, "")
    .trim();

  /*
   * The subject usually sits after a preposition: "… for ACME coffee". Take it
   * before any production phrase is stripped, because the phrase often sits
   * between the request and the subject: "a launch film for Northwind".
   */
  let subject = "";
  const tail = working.match(/\b(?:for|about|of)\s+([^.!?]{2,60})$/i);
  if (tail) {
    const candidate = tail[1].trim();
    const words = candidate.split(/\s+/).filter(Boolean);
    const meaningful = words.filter((w) => !isProductionWord(w));
    if (meaningful.length > 0 && meaningful.length <= 6) subject = meaningful.join(" ");
  }

  // Strip the production phrasing.
  working = working
    .replace(/^\s*(a|an|the)\s+/i, "")
    .replace(/^\s*(video|animation|clip|film|piece|promo|ad)\b\s*/i, "")
    .replace(/\s+(video|animation|clip|film|piece|promo|ad)\b.*$/i, "")
    .replace(/\s+(for|in|of|at|with|about)$/i, "")
    .replace(/\s+/g, " ")
    .replace(/\s+[,;]$/, "")
    .trim();

  let title = subject;
  if (!title) {
    const words = working.split(/\s+/).filter(Boolean);
    const kept = words.filter((w) => !isProductionWord(w));
    title = kept.length > 0 ? kept.join(" ") : working;
  }

  if (!title) return fallback;
  return title.length > 40 ? `${title.slice(0, 39).trimEnd()}…` : title;
}

/**
 * A short label — for a chip, a tag, a kicker. Two or three words at most.
 */
export function shortLabelFrom(brief: string, fallback = "Label"): string {
  const title = headlineFrom(brief, fallback);
  // A chip or a kicker is a small slot. Ten characters is what fits without
  // overflowing its box; a long title in a small chip is a clipped title.
  if (title.length <= 10) return title;
  const first = title.split(/\s+/).filter(Boolean)[0] ?? title;
  if (first.length <= 10) return first;
  return `${first.slice(0, 9)}…`;
}

function isHeadlineVariable(v: BlockVariable): boolean {
  if (v.type !== "string") return false;
  const id = v.id.toLowerCase();
  const label = (v.label || "").toLowerCase();
  // A headline is the main line of a shot. A detail, a chip or a kicker is
  // not — putting a whole title into a 24px chip overflows its box.
  if (isShortVariable(v)) return false;
  return (
    /^(headline|title|main_?text|line\d|headline_?text|supertitle|big_?text)\b/.test(id) ||
    /^(headline|title|main text|caption|wordmark)$/.test(label)
  );
}

/** A chip, a tag, a kicker — something that has to be very short. */
function isShortVariable(v: BlockVariable): boolean {
  if (v.type !== "string") return false;
  const id = v.id.toLowerCase();
  const label = (v.label || "").toLowerCase();
  return (
    /chip|tag|kicker|label|badge|pill|category|eyebrow|overline|detail_?text|sub_?text|caption_?small|stat/.test(id) ||
    /chip|tag|kicker|label|badge|detail|stat/.test(label)
  );
}

/** A wordmark, a logo lockup, a brand name. */
function isBrandVariable(v: BlockVariable): boolean {
  if (v.type !== "string") return false;
  const id = v.id.toLowerCase();
  const label = (v.label || "").toLowerCase();
  return /wordmark|logo|brand|company|organisation|organization/.test(id) ||
    /wordmark|logo|brand/.test(label);
}

/**
 * The upstream project's own placeholder content. A block that ships with
 * "HYPERFRAMES" or a heygen.com URL in it must be replaced, not inherited.
 */
function isUpstreamPlaceholder(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return /hyperframes|heygen/i.test(value);
}

/**
 * Pull a brand name out of a brief: a capitalised word that is not the first
 * word of the sentence. "a launch for ACME in 12 seconds" gives "ACME".
 */
export function brandFrom(brief: string): string | null {
  const words = brief.trim().split(/\s+/);
  const shout = words.find((w) => /^[A-Z][A-Z0-9&.'-]{1,12}$/.test(w));
  if (shout) return shout;

  // "for Acme Coffee" — a name in title case after a preposition.
  for (let i = 1; i < words.length; i += 1) {
    const previous = words[i - 1].toLowerCase().replace(/[^a-z]/g, "");
    if (!["for", "by", "from", "at", "of"].includes(previous)) continue;
    const candidate = words[i].replace(/[^A-Za-z0-9&.'-]/g, "");
    if (/^[A-Z][A-Za-z0-9&.'-]{1,20}$/.test(candidate)) return candidate;
  }
  return null;
}

/**
 * Fill one block's variables.
 *
 * Precedence: an explicit value, then the brief, then the tokens, then the
 * block's own default. Every value says where it came from.
 */
export function fillBlock(block: MotionBlock, context: FillContext): FilledBlock {
  const values: Record<string, unknown> = {};
  const variables: FilledValue[] = [];
  const unresolved: { id: string; reason: string }[] = [];
  const palette = context.tokens.palette ?? {};
  const headline = context.headline ?? headlineFrom(context.brief);

  for (const variable of block.variables) {
    const id = variable.id;
    const explicit = context.values?.[id];

    if (explicit !== undefined && explicit !== null) {
      values[id] = explicit;
      variables.push({
        id,
        value: explicit,
        source: "brief",
        reason: "Supplied by the caller.",
      });
      continue;
    }

    switch (variable.type) {
      case "color": {
        // Style colours come from the Motion Master palette, not from the brief.
        const map: Record<string, string> = {
          background: palette.canvas ?? "#F4F4F2",
          ground: palette.canvas ?? "#F4F4F2",
          canvas: palette.canvas ?? "#F4F4F2",
          surface: palette.surface ?? "#FFFFFF",
          text: palette.ink ?? "#111113",
          ink: palette.ink ?? "#111113",
          foreground: palette.ink ?? "#111113",
          primary: palette.accent ?? "#FF4A1C",
          accent: palette.accent ?? "#FF4A1C",
          secondary: palette.mutedInk ?? "#6B6B70",
          muted: palette.mutedInk ?? "#6B6B70",
          border: palette.hairline ?? "#DDDEDA",
          line: palette.hairline ?? "#DDDEDA",
        };
        const key = Object.keys(map).find(
          (k) => id.toLowerCase() === k || id.toLowerCase().includes(k),
        );
        if (key) {
          values[id] = map[key];
          variables.push({
            id,
            value: map[key],
            source: "tokens",
            reason: `The Motion Master ${key} token.`,
          });
        } else {
          values[id] = variable.default;
          variables.push({
            id,
            value: variable.default,
            source: "default",
            reason: "No Motion Master token maps to this colour.",
          });
        }
        break;
      }

      case "string": {
        const brand = isBrandVariable(variable) ? brandFrom(context.brief) : null;
        if (brand) {
          values[id] = brand;
          variables.push({
            id,
            value: brand,
            source: "brief",
            reason: "The brand named in the brief.",
          });
        } else if (isShortVariable(variable)) {
          const short = shortLabelFrom(context.brief);
          values[id] = short;
          variables.push({
            id,
            value: short,
            source: "brief",
            reason: "A short label, so it fits the slot it is set in.",
          });
        } else if (isHeadlineVariable(variable)) {
          values[id] = headline;
          variables.push({
            id,
            value: headline,
            source: "brief",
            reason: "Taken from the brief as the main line.",
          });
        } else {
          const placeholder = isUpstreamPlaceholder(variable.default);
          values[id] = variable.default;
          variables.push({
            id,
            value: variable.default,
            source: "default",
            reason: placeholder
              ? "The upstream placeholder. It must be replaced before the film is shown to anyone."
              : "The brief says nothing this variable can carry.",
          });
          if (placeholder) {
            unresolved.push({
              id,
              reason: "Upstream placeholder content — replace it.",
            });
          } else if (variable.default === null || variable.default === "") {
            unresolved.push({
              id,
              reason: "No content in the brief for this string.",
            });
          }
        }
        break;
      }

      case "number": {
        // A duration variable takes the brief's length when there is one.
        if (/duration|length|seconds|dur/i.test(id) && typeof variable.default === "number") {
          const seconds = parseDuration(context.brief);
          if (seconds !== null) {
            const clamped = Math.min(
              Math.max(seconds, variable.min ?? -Infinity),
              variable.max ?? Infinity,
            );
            values[id] = clamped;
            variables.push({
              id,
              value: clamped,
              source: "brief",
              reason: "The duration stated in the brief.",
            });
            break;
          }
        }
        values[id] = variable.default;
        variables.push({
          id,
          value: variable.default,
          source: "default",
          reason: "The block's own default.",
        });
        break;
      }

      case "image": {
        values[id] = variable.default;
        variables.push({
          id,
          value: variable.default,
          source: "default",
          reason: "An image slot. Supply one to replace the placeholder.",
        });
        unresolved.push({ id, reason: "Image slot — needs a real image." });
        break;
      }

      case "enum": {
        values[id] = variable.default;
        variables.push({
          id,
          value: variable.default,
          source: "default",
          reason: "The block's own default choice.",
        });
        break;
      }

      case "boolean": {
        values[id] = variable.default;
        variables.push({
          id,
          value: variable.default,
          source: "default",
          reason: "The block's own default.",
        });
        break;
      }

      default: {
        values[id] = variable.default;
        variables.push({
          id,
          value: variable.default,
          source: "default",
          reason: "The block's own default.",
        });
      }
    }
  }

  return {
    id: block.id,
    title: block.title,
    tags: block.tags,
    duration: block.duration,
    variables,
    values,
    unresolved,
  };
}

/** Read a duration in seconds out of a brief, if it states one. */
export function parseDuration(brief: string): number | null {
  const match = brief.match(/\b(\d{1,2})\s*(?:-|–|—|to)?\s*\d*\s*(?:s\b|sec\b|secs\b|seconds?\b)/i);
  if (match) return Number(match[1]);
  const long = brief.match(/\b(\d{1,2})\s*seconds?\b/i);
  if (long) return Number(long[1]);
  return null;
}

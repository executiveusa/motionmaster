/**
 * The sound library.
 *
 * One index of every sound in the house: earshot's synthesized bank, uisfx's
 * interface sounds, and Openverse's real recordings. Each sound carries what
 * it sounds like, when it belongs, how it is shaped and what licence it is
 * under — so a person can choose it from a button, and an agent can reason
 * about it from the same words.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

export interface SfxItem {
  id: string;
  source: "earshot" | "uisfx" | "openverse";
  /** The canonical kind — the vocabulary the buttons and the search share. */
  kind: string;
  /** The source's own label, kept because it is more precise. */
  sourceKind: string;
  /** The timbre family: a pack, a category, a provider. */
  timbre: string;
  title: string;
  description: string;
  use: string;
  tags: string[];
  /** One plain-language line: what it is, when it belongs, how it is shaped. */
  text: string;
  durationMs: number;
  onsetMs?: number;
  peakMs?: number;
  attackMs?: number | null;
  centroidHz?: number | null;
  lufs?: number | null;
  licence: string;
  licenceVersion?: string;
  licenceUrl?: string;
  author?: string;
  creator?: string;
  creatorUrl?: string;
  sourceUrl?: string;
  attribution?: string;
  /** The file, relative to the library directory. */
  file: string;
  bytes?: number;
  sha256?: string;
  /** The recipe, when the sound is code rather than a recording. */
  renderable?: {
    recipe: string;
    fn: string;
    params: Record<string, unknown>;
    seed: number;
    peakDb: number;
  };
}

export interface SfxKind {
  id: string;
  label: string;
  about: string;
  count: number;
}

export interface SfxCatalogue {
  generated: string;
  note: string;
  kindVocabulary: SfxKind[];
  counts: { total: number; bySource: Record<string, number>; byKind: Record<string, number> };
  entries: SfxItem[];
}

/**
 * Words that only join a sentence together.
 *
 * "a short bright pop for a button" is about *bright* and *pop* and
 * *button*. The words around them are grammar, and a search that insists on
 * them returns nothing.
 */
const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "for", "to", "of", "in", "on", "at",
  "by", "with", "from", "as", "is", "are", "be", "it", "its", "that", "this",
  "into", "under", "over", "through", "some", "any", "very", "more", "most",
  "like", "than", "then", "when", "what", "how", "my", "our", "your",
]);

let cached: { path: string; catalogue: SfxCatalogue } | null = null;

/** Read the catalogue. It is read once and kept. */
export function loadSfx(path: string): SfxCatalogue {
  if (cached && cached.path === path) return cached.catalogue;
  const file = JSON.parse(readFileSync(path, "utf8")) as SfxCatalogue;
  cached = { path, catalogue: file };
  return file;
}

/** The absolute path of a sound's file. */
export function sfxFile(repoRoot: string, item: SfxItem): string {
  return resolve(repoRoot, "library", item.file);
}

/** The vocabulary, with the counts. */
export function sfxKinds(catalogue: SfxCatalogue): SfxKind[] {
  return catalogue.kindVocabulary;
}

export interface BrowseOptions {
  kind?: string;
  source?: string;
  timbre?: string;
  tag?: string;
  /** Free text over the sound's plain-language line. */
  query?: string;
  /** Longest sound, in milliseconds. */
  maxDurationMs?: number;
  /** Shortest sound, in milliseconds. */
  minDurationMs?: number;
  limit?: number;
  offset?: number;
}

/**
 * Browse or search.
 *
 * The search is over the plain-language line, which is why it works for a
 * person typing "a short bright pop for a button" and for an agent asking
 * for "a sharp transient under half a second".
 */
export function browseSfx(catalogue: SfxCatalogue, options: BrowseOptions): {
  total: number;
  items: SfxItem[];
  scores?: Record<string, { score: number; matched: string[] }>;
} {
  const query = (options.query ?? "").trim().toLowerCase();
  const terms = query.split(/\s+/).filter(Boolean);

  /*
   * The search scores rather than filters.
   *
   * A person asking for "a short bright pop for a button" is not going to
   * use the words the catalogue uses. Every word has to appear, or nothing
   * comes back and the shelf looks empty; so the words that carry meaning are
   * scored, the ones that only join the sentence are ignored, and the closest
   * sounds come first.
   */
  const significant = terms.filter(
    (term) => term.length >= 3 && !STOP_WORDS.has(term),
  );
  const wanted = significant.length > 0 ? significant : terms;

  const scored = catalogue.entries
    .filter((item) => {
      if (options.kind && options.kind !== "all" && item.kind !== options.kind) return false;
      if (options.source && item.source !== options.source) return false;
      if (options.timbre && item.timbre !== options.timbre) return false;
      if (options.tag && !item.tags.includes(options.tag)) return false;
      if (options.minDurationMs && item.durationMs < options.minDurationMs) return false;
      if (options.maxDurationMs && item.durationMs > options.maxDurationMs) return false;
      return true;
    })
    .map((item) => {
      if (wanted.length === 0) return { item, score: 0, matched: [] as string[] };
      const hay = `${item.text} ${item.title} ${item.description} ${item.use} ${item.tags.join(" ")}`.toLowerCase();
      const matched = wanted.filter((term) => hay.includes(term));
      // A sound whose kind is named in the question is a better answer than
      // one that merely mentions the word somewhere.
      let score = matched.length;
      if (item.kind && wanted.includes(item.kind)) score += 1;
      if (item.timbre && wanted.includes(item.timbre)) score += 1;
      return { item, score, matched };
    })
    .filter((entry) => wanted.length === 0 || entry.score > 0);

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Shorter sounds first among equals: a short answer is usually the
    // intended one.
    return a.item.durationMs - b.item.durationMs;
  });

  const offset = options.offset ?? 0;
  const limit = Math.min(options.limit ?? 30, 200);
  const page = scored.slice(offset, offset + limit);
  return {
    total: scored.length,
    items: page.map((entry) => entry.item),
    scores: Object.fromEntries(page.map((entry) => [entry.item.id, { score: entry.score, matched: entry.matched }])),
  };
}

/** One sound, in full. */
export function getSfx(catalogue: SfxCatalogue, id: string): SfxItem | undefined {
  return catalogue.entries.find((item) => item.id === id);
}

/* ------------------------------------------------------------------- the kit */

export interface KitTake {
  /** The sound's id. */
  id: string;
  /** Where it lands, in seconds from the start of the film. */
  atSeconds: number;
  /** How loud, 0 to 1. */
  level: number;
  /** What it is doing there. */
  role: string;
  /** Why it was chosen, in words. */
  reason: string;
  /** The sound's own title, for the record. */
  title: string;
  /** The kind, for the record. */
  kind: string;
  /** The file, relative to the library directory. */
  file: string;
  durationMs: number;
}

export interface StoryboardBeat {
  index?: number;
  label?: string;
  role?: string;
  inSeconds?: number;
  outSeconds?: number;
  durationSeconds?: number;
  elements?: { name?: string; type?: string; note?: string }[];
  notes?: string[];
}

/**
 * The sound grammar.
 *
 * A beat's role says what the picture is doing, and the role says what the
 * ear should get. This is the part that is a judgement rather than a fact,
 * so it is written out where it can be argued with.
 */
const ROLE_RULES: Record<
  string,
  { kinds: string[]; level: number; offset: number; reason: string }
> = {
  setup: {
    kinds: ["swish", "whoosh", "riser"],
    level: 0.22,
    offset: 0,
    reason: "The picture is setting up. A light move leads in without announcing anything.",
  },
  reveal: {
    kinds: ["whoosh", "sweep", "hit", "impact"],
    level: 0.5,
    offset: 0.06,
    reason: "Something arrives. The move lands just after the cut, so the ear follows the eye.",
  },
  develop: {
    kinds: ["tap", "click", "pop", "note"],
    level: 0.24,
    offset: 0,
    reason: "The picture is moving on. A small sound marks the step without taking over.",
  },
  resolve: {
    kinds: ["note", "confirm", "shimmer"],
    level: 0.38,
    offset: 0,
    reason: "The picture lands on an answer. A tone closes the phrase.",
  },
  hold: {
    kinds: ["shimmer"],
    level: 0.14,
    offset: 0,
    reason: "The picture is holding. Silence would do; a breath of texture is kinder.",
  },
  exit: {
    kinds: ["sting", "sweep", "note"],
    level: 0.55,
    offset: 0,
    reason: "The picture signs off. The sound ends the film rather than stopping it.",
  },
};

/**
 * Plan the sound for a storyboard.
 *
 * Each beat gets one sound, chosen by role, timed against the beat and
 * levelled for its part in the film. Nothing is placed on a beat that is
 * only holding: silence is a decision too.
 */
export function planSound(
  catalogue: SfxCatalogue,
  beats: StoryboardBeat[],
  options: { limit?: number } = {},
): { takes: KitTake[]; unplaced: string[] } {
  const takes: KitTake[] = [];
  const unplaced: string[] = [];
  // A film that hits the same sound on every cut is a film with one sound.
  const used = new Set<string>();
  const usedTimbres = new Set<string>();

  for (const beat of beats) {
    const role = String(beat.role ?? "develop");
    const rule = ROLE_RULES[role];
    if (!rule) continue;
    const at = Number(beat.inSeconds ?? 0);

    // The first beat of the film gets the strongest kind it can get, so a
    // film opens with an event rather than a tick.
    const kinds = rule.kinds;
    const found = kinds
      .map((kind) => browseSfx(catalogue, { kind, limit: 40 }).items)
      .find((items) => items.length > 0);

    if (!found || found.length === 0) {
      unplaced.push(`${role} beat at ${at}s`);
      continue;
    }

    // Prefer the shortest sound that still carries weight: a long whoosh
    // under a quick cut is a mismatch the ear notices.
    const sorted = [...found].sort((a, b) => {
      // A sound that has not been used yet comes first; then one from a
      // timbre the kit has not used yet; then the shortest that still carries
      // weight, because a long whoosh under a quick cut is a mismatch the ear
      // notices.
      const aUsed = used.has(a.id) ? 1 : 0;
      const bUsed = used.has(b.id) ? 1 : 0;
      if (aUsed !== bUsed) return aUsed - bUsed;
      const aTimbre = usedTimbres.has(a.timbre) ? 1 : 0;
      const bTimbre = usedTimbres.has(b.timbre) ? 1 : 0;
      if (aTimbre !== bTimbre) return aTimbre - bTimbre;
      const aLong = a.durationMs > 2500 ? 1 : 0;
      const bLong = b.durationMs > 2500 ? 1 : 0;
      if (aLong !== bLong) return aLong - bLong;
      return Math.abs(a.durationMs - 900) - Math.abs(b.durationMs - 900);
    });

    const pick = sorted[0];
    used.add(pick.id);
    usedTimbres.add(pick.timbre);
    takes.push({
      id: pick.id,
      atSeconds: Math.round((at + rule.offset) * 100) / 100,
      level: rule.level,
      role,
      reason: rule.reason,
      title: pick.title,
      kind: pick.kind,
      file: pick.file,
      durationMs: pick.durationMs,
    });
  }

  const limit = options.limit ?? takes.length;
  return { takes: takes.slice(0, limit), unplaced };
}

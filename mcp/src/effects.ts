/**
 * The effect shelf.
 *
 * Motion Master could lay out a frame and time a shot, but it had no shelf of
 * *effects* — the small, reusable pieces of craft that make a frame feel made:
 * a wipe, a dissolve, a hit of light, a counter that ticks.
 *
 * This catalogue is built from pixelfx (MIT), imported into
 * plugins/motion-master/skills/pixelfx. Each effect is one small file of code
 * with no dependencies, so an agent can drop one into a composition and
 * recolour it rather than describe an effect it cannot draw.
 *
 * The catalogue is read from the upstream's own table and source, so the
 * description, the timing and the tags are the upstream's, not ours.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export interface MotionEffect {
  /** "transitions/blinds" — the category plus the effect's own name. */
  id: string;
  /** The category the effect is filed under. */
  category: string;
  /** The effect's name, as the upstream spells it. */
  name: string;
  /** What the effect does, in the upstream's words. */
  description: string;
  /** How long the effect runs, in seconds, when the upstream states it. */
  durationSeconds: number | null;
  /** The frame size the effect is drawn at, as upstream states it. */
  size: string | null;
  /** The upstream's own tags for the effect. */
  tags: string[];
  /** Where the effect's source lives, relative to the skills directory. */
  path: string;
}

export interface EffectCategory {
  id: string;
  /** What the upstream says this category is for. */
  summary: string;
  count: number;
}

let effectCache: MotionEffect[] | null = null;
let effectCacheDir = "";
let categoryCache: EffectCategory[] | null = null;

/** Pull the tags straight out of the effect's own source. */
function tagsFromSource(source: string): string[] {
  const match = source.match(/tags\s*:\s*\[([^\]]*)\]/);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((t) => t.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean)
    .map((t) => t.toLowerCase());
}

/**
 * Read the upstream catalogue table.
 *
 * The table is the upstream's own index of its own effects, so the timings
 * and descriptions are the ones the author published.
 */
export function loadEffects(skillsDir: string): MotionEffect[] {
  if (effectCache && effectCacheDir === skillsDir) return effectCache;
  const root = join(skillsDir, "pixelfx");
  const catalogue = join(root, "docs", "CATALOG.md");
  if (!existsSync(catalogue)) {
    effectCache = [];
    effectCacheDir = skillsDir;
    return effectCache;
  }

  const source = readFileSync(catalogue, "utf8");
  const effects: MotionEffect[] = [];
  let category = "";

  for (const line of source.split(/\r?\n/)) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      category = heading[1].trim();
      continue;
    }
    const row = line.match(
      /^\|\s*(.+?)\s*\|\s*`([a-z0-9-]+)\/([a-z0-9-]+)`\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|$/,
    );
    if (!row) continue;
    const [, name, cat, id, timing, size, description] = row;
    const duration = timing.match(/(\d+(?:\.\d+)?)\s*s\b/);
    const file = join(root, "src", "fx", cat, `${id}.js`);
    effects.push({
      id: `${cat}/${id}`,
      category: cat,
      name,
      description,
      durationSeconds: duration ? Number(duration[1]) : null,
      size: /^\d+×\d+$/.test(size) ? size : null,
      tags: existsSync(file) ? tagsFromSource(readFileSync(file, "utf8")) : [],
      path: existsSync(file) ? relative(skillsDir, file) : "",
    });
  }

  effectCache = effects;
  effectCacheDir = skillsDir;
  return effects;
}

/**
 * The categories, in the upstream's order.
 *
 * The upstream's section headings are written for people ("sci-fi",
 * "spawn & death") while the effect ids are written for machines ("scifi",
 * "spawn"), so the heading is matched to the id prefix by its first word.
 */
export function loadEffectCategories(skillsDir: string): EffectCategory[] {
  if (categoryCache) return categoryCache;
  const root = join(skillsDir, "pixelfx");
  const catalogue = join(root, "docs", "CATALOG.md");
  const out: EffectCategory[] = [];
  if (existsSync(catalogue)) {
    const source = readFileSync(catalogue, "utf8");
    const effects = loadEffects(skillsDir);
    const headings: { id: string; summary: string }[] = [];
    let heading = "";
    let summary = "";
    for (const line of source.split(/\r?\n/)) {
      const match = line.match(/^##\s+(.+)$/);
      if (match) {
        if (heading) headings.push({ id: heading, summary });
        heading = match[1].trim();
        summary = "";
        continue;
      }
      if (!heading) continue;
      if (!summary && line.trim() && !line.startsWith("|") && !line.startsWith("#")) {
        summary = line.trim();
      }
    }
    if (heading) headings.push({ id: heading, summary });

    // Match each heading to the id prefix it covers.
    const used = new Set<string>();
    for (const h of headings) {
      const first = h.id.toLowerCase().split(/[\s&/-]+/)[0].replace(/[^a-z0-9]/g, "");
      const category =
        effects.find((e) => !used.has(e.category) && e.category === first)?.category ??
        effects.find((e) => !used.has(e.category) && e.category.startsWith(first))?.category ??
        first;
      if (used.has(category)) continue;
      used.add(category);
      out.push({ id: category, summary: h.summary, count: 0 });
    }
  }
  const effects = loadEffects(skillsDir);
  for (const entry of out) {
    entry.count = effects.filter((e) => e.category === entry.id).length;
  }
  categoryCache = out;
  return out;
}

/**
 * Rank the effects against a brief.
 *
 * An effect's tags are the best signal, because they are the short words an
 * agent already uses to describe the effect it wants.
 */
export function matchEffects(
  effects: MotionEffect[],
  brief: string,
  options: { limit?: number; categories?: string[] } = {},
): { effect: MotionEffect; score: number; matchedTags: string[] }[] {
  const words = new Set(
    brief
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]+/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );
  const lower = brief.toLowerCase();
  const pool = options.categories
    ? effects.filter((e) => options.categories!.includes(e.category))
    : effects;

  const scored = pool.map((effect) => {
    const matchedTags: string[] = [];
    let score = 0;
    for (const tag of effect.tags) {
      if (words.has(tag) || lower.includes(tag)) {
        matchedTags.push(tag);
        score += 6;
      }
    }
    const slug = effect.name.toLowerCase();
    const prose = effect.description.toLowerCase();
    for (const w of words) {
      if (slug.includes(w)) score += 4;
      else if (prose.includes(w)) score += 1;
    }
    if (effect.category === "transitions") score += 2;
    return { effect, score, matchedTags };
  });

  return scored
    .filter((s) => s.score >= 4)
    .sort((a, b) => b.score - a.score || a.effect.id.localeCompare(b.effect.id))
    .slice(0, options.limit ?? 10);
}

export function getEffect(effects: MotionEffect[], id: string): MotionEffect | undefined {
  return effects.find((e) => e.id === id);
}

/**
 * The effects that can stand between two shots.
 *
 * A transition is a different job from an effect: it is the moment one shot
 * becomes the next, and it has to be able to cover the cut. These are the
 * ones filed under transitions.
 */
export function transitionEffects(effects: MotionEffect[]): MotionEffect[] {
  return effects.filter((e) => e.category === "transitions");
}

/** Count the effect files on disk, so the catalogue and the source agree. */
export function countEffectFiles(skillsDir: string): number {
  const dir = join(skillsDir, "pixelfx", "src", "fx");
  if (!existsSync(dir)) return 0;
  let count = 0;
  // Only the effect files themselves — the shared helpers and the category
  // index in the root of src/fx are not effects.
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (!statSync(full).isDirectory()) continue;
    for (const file of readdirSync(full)) {
      if (file.endsWith(".js") && file !== "_lib.js" && file !== "index.js") count += 1;
    }
  }
  return count;
}

/**
 * The shot vocabulary.
 *
 * Motion Master could pick a *block* — a piece of layout — but it had no way
 * to pick a *shot*: what the camera does, how the words land, where the beat
 * falls. That gap is why the enhancer had to guess a shot plan.
 *
 * The vocabulary now comes from the video-shotcraft shot cards (Apache-2.0,
 * imported into plugins/motion-master/skills/shotcraft). Each card is one
 * authored technique: what it is for, how long it runs, how much energy it
 * spends, and the traps its author already hit.
 *
 * Nothing here invents a shot. Every plan entry cites the card it came from,
 * and the card is the source of truth for the technique.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export type ShotRole =
  | "opening"
  | "typography"
  | "camera"
  | "data"
  | "effects"
  | "interaction"
  | "ui-entrance"
  | "rhythm"
  | "transition"
  | "outro";

export const SHOT_ROLES: ShotRole[] = [
  "opening",
  "typography",
  "camera",
  "data",
  "effects",
  "interaction",
  "ui-entrance",
  "rhythm",
  "transition",
  "outro",
];

/**
 * What a role is for, in our own words.
 *
 * The cards are written in Chinese; the roles are the part an agent routes
 * on, so they get an English gloss. The card text stays verbatim.
 */
export const ROLE_MEANING: Record<ShotRole, string> = {
  opening: "Opens the film. Names the subject before showing it, and spends little energy so the rest has somewhere to climb.",
  typography: "Words as the subject. Title cards, and choreography made of type.",
  camera: "The frame moves; the subject does not. Push, pull, tilt, crane, flyover.",
  data: "A number becomes a story. Charts, gauges, timelines, before-and-after.",
  effects: "The moment something lands. Impacts, light, bloom, feedback.",
  interaction: "The product being used. A thing operated, a choice made.",
  "ui-entrance": "Elements arriving. The interface assembling itself out of order.",
  rhythm: "Cut on the beat. Timing is the structure, not the decoration.",
  transition: "Between two shots. How one becomes the next.",
  outro: "The end. Wordmark, product release, sign-off.",
};

export interface Shot {
  /** "opening/brand-ink-open" — the role plus the card's own name. */
  id: string;
  /** The directory the card lives in. Null for a card filed at the root. */
  role: ShotRole | null;
  /** The card's frontmatter name. */
  name: string;
  /** The card's one-line description, verbatim from upstream. */
  summary: string;
  /** When the author says to reach for this shot, verbatim from upstream. */
  useWhen: string;
  /** The card's duration line, verbatim from upstream. */
  duration: string;
  /** Best-effort seconds, when the duration line states one. */
  durationSeconds: number | null;
  /** The card's energy line, verbatim from upstream. */
  energy: string;
  /** The card's own tags, plus its role. */
  tags: string[];
  /** Where the card lives, relative to the skills directory. */
  path: string;
}

export interface ShotMatch {
  shot: Shot;
  score: number;
  matchedTags: string[];
}

/* --------------------------------------------------------------- loading */

let shotCache: Shot[] | null = null;
let shotCacheDir = "";

function parseFrontmatter(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  const match = body.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return out;
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([^\s:]+)\s*:\s*(.*)$/);
    if (!kv) continue;
    out[kv[1]] = kv[2].trim();
  }
  return out;
}

/**
 * Pull a number of seconds out of a duration line.
 *
 * The lines are written by a person and say things like "约 2.8s（83f）" or
 * "4–5.5s 持续". We take the first plausible number of seconds and treat the
 * whole line as authoritative; the seconds are a convenience, not a contract.
 */
function parseSeconds(duration: string): number | null {
  const seconds = duration.match(/(\d+(?:\.\d+)?)\s*s(?![a-z])/i);
  if (seconds) return Number(seconds[1]);
  const frames = duration.match(/(\d+)\s*f\b/i);
  if (frames) return Math.round((Number(frames[1]) / 30) * 10) / 10;
  return null;
}

/** Split a tag line on the separators the upstream uses. */
function parseTags(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[、,，\s]+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

export function loadShots(skillsDir: string): Shot[] {
  if (shotCache && shotCacheDir === skillsDir) return shotCache;
  const dir = join(skillsDir, "shotcraft", "references", "shots");
  const shots: Shot[] = [];

  const walk = (current: string, role: ShotRole | null) => {
    if (!existsSync(current)) return;
    for (const entry of readdirSync(current)) {
      const full = join(current, entry);
      if (statSync(full).isDirectory()) {
        const nextRole = (SHOT_ROLES as string[]).includes(entry)
          ? (entry as ShotRole)
          : role;
        walk(full, nextRole);
        continue;
      }
      if (!entry.endsWith(".md") || entry === "ATTRIBUTION.md") continue;
      const source = readFileSync(full, "utf8");
      const meta = parseFrontmatter(source);
      if (!meta.name) continue;
      // The role is the directory the card lives in. A card filed loose at the
      // root has no role, and we say so rather than guessing one.
      const resolvedRole: ShotRole | null = role;
      const tags = Array.from(
        new Set([...(resolvedRole ? [resolvedRole] : []), ...parseTags(meta["标签"])]),
      );
      shots.push({
        id: resolvedRole ? `${resolvedRole}/${meta.name}` : meta.name,
        role: resolvedRole,
        name: meta.name,
        summary: meta["一句话"] ?? "",
        useWhen: meta["适用"] ?? "",
        duration: meta["时长"] ?? "",
        durationSeconds: parseSeconds(meta["时长"] ?? ""),
        energy: meta["能量"] ?? "",
        tags,
        path: relative(skillsDir, full),
      });
    }
  };

  walk(dir, null);
  shots.sort((a, b) => a.id.localeCompare(b.id));
  shotCache = shots;
  shotCacheDir = skillsDir;
  return shots;
}

/* -------------------------------------------------------------- matching */

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
 * The score a card needs before it counts as a match.
 *
 * The card's curated fields — its tags and its own name — are worth most,
 * because they are short and deliberate. Its prose is long, and any common
 * word turns up somewhere in it, so a prose hit is worth little on its own.
 */
const MIN_SCORE = 4;

/**
 * Rank the shots against a brief.
 *
 * The role and tags are the strongest signal, because they are the part of the
 * card an agent can reason about. The summary and "use when" line break ties.
 */
export function matchShots(
  shots: Shot[],
  brief: string,
  options: { limit?: number; roles?: ShotRole[] } = {},
): ShotMatch[] {
  const words = new Set(tokenize(brief));
  const lower = brief.toLowerCase();
  const pool = options.roles
    ? shots.filter((s) => s.role !== null && options.roles!.includes(s.role))
    : shots;

  const scored = pool.map((shot) => {
    const matchedTags: string[] = [];
    let score = 0;
    for (const tag of shot.tags) {
      if (words.has(tag) || lower.includes(tag)) {
        matchedTags.push(tag);
        score += 6;
      }
    }
    // The name is deliberate; the prose is long.
    const slug = shot.name.toLowerCase();
    const prose = `${shot.summary} ${shot.useWhen}`.toLowerCase();
    for (const w of words) {
      if (slug.includes(w)) score += 4;
      else if (prose.includes(w)) score += 1;
    }
    return { shot, score, matchedTags };
  });

  return scored
    .filter((m) => m.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score || a.shot.id.localeCompare(b.shot.id))
    .slice(0, options.limit ?? 10);
}

export function getShot(shots: Shot[], id: string): Shot | undefined {
  return shots.find((s) => s.id === id || s.name === id);
}

/* ---------------------------------------------------------------- planning */

/**
 * The order roles appear in a finished film.
 *
 * This is the same grammar the shot cards describe: the opening must spend
 * little, the work climbs, the transition changes gear, the outro lands.
 */
const ROLE_SEQUENCE: ShotRole[] = [
  "opening",
  "typography",
  "camera",
  "data",
  "ui-entrance",
  "interaction",
  "effects",
  "rhythm",
  "transition",
  "outro",
];

function roleRank(role: ShotRole | null): number {
  const index = role ? ROLE_SEQUENCE.indexOf(role) : -1;
  return index === -1 ? ROLE_SEQUENCE.length : index;
}

export interface PlannedShot {
  /** Position in the film, counting from one. */
  order: number;
  /** The card this shot comes from. */
  id: string;
  role: ShotRole | null;
  roleMeaning: string;
  /** The card's own words, so the agent can read the technique. */
  summary: string;
  useWhen: string;
  duration: string;
  durationSeconds: number | null;
  energy: string;
  tags: string[];
  /** Where to read the card. */
  path: string;
  /** Why this shot is in the plan. */
  reason: string;
}

export interface ShotPlan {
  /** The brief the plan was made from. */
  brief: string;
  /** The target length, when one was given. */
  targetSeconds: number | null;
  /** The planned length, summed from the cards. */
  plannedSeconds: number | null;
  shots: PlannedShot[];
  /** The energy curve the cards describe, in order. */
  energyCurve: string[];
  /** The roles the plan covers. */
  roles: (ShotRole | null)[];
  /** What the planner could not decide, said plainly. */
  unresolved: string[];
  /** Where the vocabulary came from. */
  source: {
    skill: string;
    upstream: string;
    licence: string;
    cards: number;
  };
}

/** Roles the brief's own words point at, strongest first. */
const ROLE_HINTS: { role: ShotRole; words: string[] }[] = [
  { role: "data", words: ["data", "chart", "number", "stat", "metric", "graph", "增长", "数据"] },
  { role: "ui-entrance", words: ["ui", "app", "screen", "interface", "dashboard", "panel", "界面"] },
  { role: "interaction", words: ["click", "cursor", "tap", "drag", "type", "user", "操作"] },
  { role: "camera", words: ["camera", "orbit", "push", "pull", "zoom", "pan", "crane", "fly", "镜头"] },
  { role: "rhythm", words: ["beat", "music", "tempo", "sync", "cut", "节奏", "音乐"] },
  { role: "typography", words: ["headline", "title", "word", "type", "text", "letter", "标题", "文字"] },
  { role: "effects", words: ["impact", "glow", "light", "spark", "burn", "explode", "光效"] },
];

/**
 * How much energy a card spends, as a number we can compare.
 *
 * The cards write it as 低 / 低中 / 中 / 中高 / 高, sometimes per variant
 * ("A 中 / B 中高"). We take the first level mentioned.
 */
export function energyRank(energy: string): number {
  if (!energy) return 3;
  if (energy.includes("低中")) return 2;
  if (energy.includes("中高")) return 4;
  if (energy.includes("高")) return 5;
  if (energy.includes("中")) return 3;
  if (energy.includes("低")) return 1;
  return 3;
}

/**
 * The card that best represents a role when the brief names no particular one.
 *
 * The cards are written in Chinese and an English brief often matches none
 * of them by word. A role still has a general card, and a film needs one.
 * We take the cheapest and shortest: the cards themselves insist the opening
 * spend little energy, so that is the general opening.
 */
export function representativeShot(shots: Shot[], role: ShotRole): Shot | undefined {
  const pool = shots.filter((s) => s.role === role);
  if (pool.length === 0) return undefined;
  const named = pool.filter((s) => s.name.toLowerCase().includes(role.toLowerCase()));
  const candidates = named.length ? named : pool;
  return [...candidates].sort((a, b) => {
    const energy = energyRank(a.energy) - energyRank(b.energy);
    if (energy !== 0) return energy;
    const duration = (a.durationSeconds ?? 99) - (b.durationSeconds ?? 99);
    if (duration !== 0) return duration;
    return a.id.localeCompare(b.id);
  })[0];
}

/**
 * Build a shot plan from a brief.
 *
 * The grammar is fixed: an opening, the shots the brief asks for, a
 * transition between them, and an outro. The opening is chosen to spend
 * little energy, because the cards themselves insist the film must climb.
 */
export function planShots(
  shots: Shot[],
  brief: string,
  options: { durationSeconds?: number; maxShots?: number } = {},
): ShotPlan {
  const maxShots = Math.max(3, options.maxShots ?? 6);
  const lower = brief.toLowerCase();
  const unresolved: string[] = [];
  /** A transition we had but had to leave out is not the same as none at all. */
  let transitionDroppedForTime = false;

  const best = (role: ShotRole): ShotMatch | undefined =>
    matchShots(shots, brief, { roles: [role], limit: 1 })[0];

  /**
   * Pick a card for a role.
   *
   * The opening has to be brief-relevant *and* cheap: the cards are explicit
   * that a film which opens on its best trick has nowhere to climb, so among
   * the openings that fit the brief we take the one that spends least. Every
   * other role falls back to that role's general card rather than leaving
   * the film without one, and says so when it does.
   */
  const choose = (
    role: ShotRole,
  ): { match: ShotMatch | undefined; reason: string; fallback: boolean } => {
    if (role === "opening") {
      const ranked = matchShots(shots, brief, { roles: ["opening"], limit: 3 });
      if (ranked.length > 0) {
        const bestScore = ranked[0].score;
        const close = ranked.filter((m) => m.score >= bestScore - 3);
        const pick = close.reduce((a, b) =>
          energyRank(a.shot.energy) <= energyRank(b.shot.energy) ? a : b,
        );
        return {
          match: pick,
          reason: `Opens the film. Energy: ${pick.shot.energy || "unstated"} — the cards want the opening cheap so the rest has room to climb.`,
          fallback: false,
        };
      }
    } else {
      const match = best(role);
      if (match) {
        return {
          match,
          reason: `Matches the brief: ${match.matchedTags.join(", ") || "its wording"}.`,
          fallback: false,
        };
      }
    }
    const rep = representativeShot(shots, role);
    if (!rep) return { match: undefined, reason: "", fallback: true };
    return {
      match: { shot: rep, score: 0, matchedTags: [] },
      reason: `Nothing in the brief matched a ${role} card, so this is the general ${role} card. Read it and decide whether it fits.`,
      fallback: true,
    };
  };

  const openingChoice = choose("opening");
  const opening = openingChoice.match;
  const outroChoice = choose("outro");
  const outro = outroChoice.match;
  const transitionChoice = choose("transition");
  let transition: ShotMatch | undefined = transitionChoice.match;

  // Content roles the brief points at, in the order the brief points at them.
  const hinted: ShotRole[] = [];
  for (const hint of ROLE_HINTS) {
    if (hint.words.some((w) => lower.includes(w))) hinted.push(hint.role);
  }

  const chosen: { shot: Shot; reason: string }[] = [];
  const used = new Set<string>();
  const take = (match: ShotMatch | undefined, reason: string) => {
    if (!match || used.has(match.shot.id)) return false;
    used.add(match.shot.id);
    chosen.push({ shot: match.shot, reason });
    return true;
  };

  // Three slots are spoken for: the opening, the transition and the outro.
  const contentRoom = maxShots - 3;

  // Content shots are collected on their own, so a plan can be trimmed
  // before it is committed rather than after.
  let content: { shot: Shot; reason: string }[] = [];
  const contentUsed = new Set<string>();
  const addContent = (match: ShotMatch | undefined, reason: string) => {
    if (!match || contentUsed.has(match.shot.id)) return false;
    contentUsed.add(match.shot.id);
    content.push({ shot: match.shot, reason });
    return true;
  };

  for (const role of hinted) {
    if (content.length >= contentRoom) break;
    const choice = choose(role);
    if (choice.match) {
      addContent(choice.match, choice.reason);
    }
  }

  // Fill any remaining room with the strongest cards the brief did not name.
  const ranked = matchShots(shots, brief, { limit: 20 });
  for (const match of ranked) {
    if (content.length >= contentRoom) break;
    if (match.shot.role && ["opening", "outro", "transition"].includes(match.shot.role)) continue;
    addContent(match, "Scores highest against the brief.");
  }

  /**
   * Fit the plan to the length the brief asked for.
   *
   * Cards are 4–8 seconds each, so a short film cannot hold all of them.
   * The opening and the outro are the film, so they never go. The
   * transition goes before the content does: cutting straight between two
   * shots is a legitimate choice, a film with no ending is not. Whatever we
   * drop, we say which one and why.
   */
  const secondsOf = (entries: { shot: Shot }[]) =>
    entries
      .map((e) => e.shot.durationSeconds)
      .filter((s): s is number => s !== null)
      .reduce((a, b) => a + b, 0);

  if (options.durationSeconds !== undefined) {
    const fixed = [...(opening ? [opening] : []), ...(outro ? [outro] : [])];
    const fixedSeconds = secondsOf(fixed);
    if (fixedSeconds > options.durationSeconds + 0.6) {
      unresolved.push(
        `The opening and the ending alone run ${fixedSeconds}s, which is longer than the ${options.durationSeconds}s asked for. Use a shorter card, or accept the longer film — do not cut the ending.`,
      );
    }
    let budget = options.durationSeconds - fixedSeconds;
    const kept: { shot: Shot; reason: string }[] = [];

    // Content first, in the order the brief asked for it.
    for (const entry of content) {
      const length = entry.shot.durationSeconds ?? 0;
      if (length <= budget + 0.6) {
        kept.push(entry);
        budget -= length;
      } else {
        unresolved.push(
          `Dropped ${entry.shot.id} (${entry.shot.duration}) — it did not fit in ${options.durationSeconds}s.`,
        );
      }
    }

    // Then the transition, if there is room for it.
    let transitionKept = transition;
    if (transition) {
      const length = transition.shot.durationSeconds ?? 0;
      if (length <= budget + 0.6) {
        budget -= length;
      } else {
        transitionKept = undefined;
        unresolved.push(
          `No transition: ${transition.shot.id} (${transition.shot.duration}) did not fit in ${options.durationSeconds}s. Cut straight instead.`,
        );
      }
    }
    transition = transitionKept;
    content = kept;
    if (!transitionKept) transitionDroppedForTime = true;
  }

  if (opening) {
    take(opening, openingChoice.reason);
  } else {
    unresolved.push("There is no opening card installed; the plan opens without one.");
  }

  for (const entry of content) {
    if (!used.has(entry.shot.id)) {
      used.add(entry.shot.id);
      chosen.push(entry);
    }
  }

  if (transition) {
    take(transition, transitionChoice.reason);
  } else if (!transitionDroppedForTime) {
    unresolved.push("There is no transition card installed.");
  }

  if (outro) {
    take(outro, outroChoice.reason);
  } else {
    unresolved.push("There is no outro card installed.");
  }

  // The order on screen is the film's grammar: open, work, change gear,
  // close. A transition sits between two shots, an outro comes last.
  const sorted = [...chosen].sort((a, b) => roleRank(a.shot.role) - roleRank(b.shot.role));

  const planned = sorted.map((entry, index) => ({
    order: index + 1,
    id: entry.shot.id,
    role: entry.shot.role,
    roleMeaning: entry.shot.role ? ROLE_MEANING[entry.shot.role] : "",
    summary: entry.shot.summary,
    useWhen: entry.shot.useWhen,
    duration: entry.shot.duration,
    durationSeconds: entry.shot.durationSeconds,
    energy: entry.shot.energy,
    tags: entry.shot.tags,
    path: entry.shot.path,
    reason: entry.reason,
  }));

  const seconds = planned.map((p) => p.durationSeconds).filter((s): s is number => s !== null);
  const total = seconds.length ? Math.round(seconds.reduce((a, b) => a + b, 0) * 10) / 10 : null;

  if (options.durationSeconds && total !== null && total < options.durationSeconds - 0.6) {
    unresolved.push(
      `The plan runs ${total}s; the brief asked for ${options.durationSeconds}s. Hold the last shot longer rather than adding a card.`,
    );
  }

  return {
    brief,
    targetSeconds: options.durationSeconds ?? null,
    plannedSeconds: total,
    shots: planned,
    energyCurve: planned.map((p) => p.energy).filter(Boolean),
    roles: planned.map((p) => p.role),
    unresolved,
    source: {
      skill: "shotcraft",
      upstream: "github.com/Vincentwei1021/video-shotcraft",
      licence: "Apache-2.0",
      cards: shots.length,
    },
  };
}

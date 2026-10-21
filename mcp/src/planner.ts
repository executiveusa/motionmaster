/**
 * Motion Master storyboard planner.
 *
 * Turns a plain-language brief into a numbered, timed storyboard. The planner
 * is deterministic: the same brief, the same options and the same tokens always
 * produce byte-identical output. There is no randomness anywhere in this file —
 * every number is derived from the brief, the motion doctrine and the token
 * file.
 *
 * The doctrine it applies (see skills/motion-master/references/motion-tokens.md):
 *   - entrance  = ease-out
 *   - exit      = ease-in
 *   - on-screen = ease-in-out
 *   - total stagger must stay under 500ms
 *   - premium durations, critically damped, no overshoot
 */
import type { MotionTokens } from "./tokens.js";

export type EasingRole = "entrance" | "exit" | "onScreen";
export type BeatRole =
  | "setup"
  | "reveal"
  | "develop"
  | "resolve"
  | "hold"
  | "loop"
  | "exit";

export interface PlanOptions {
  brief: string;
  durationSeconds?: number;
  style?: string;
  fps?: number;
  width?: number;
  height?: number;
  elementCount?: number;
  holdSeconds?: number;
}

export interface PlannedElement {
  name: string;
  type: "text" | "shape" | "clip" | "graphic";
  note?: string;
}

export interface PlannedStagger {
  pattern: string;
  elementCount: number;
  intervalMs: number;
  totalMs: number;
  budgetMs: number;
  withinBudget: boolean;
  clamped: boolean;
  note?: string;
}

export interface PlannedBeat {
  index: number;
  key: string;
  label: string;
  role: BeatRole;
  easingRole: EasingRole;
  easing: { name: string; role: string; cubicBezier: [number, number, number, number] };
  inSeconds: number;
  outSeconds: number;
  inFrame: number;
  outFrame: number;
  durationSeconds: number;
  animationMs: number;
  holdMs: number;
  elements: PlannedElement[];
  stagger: PlannedStagger;
  transition: { type: "cut" | "hold"; easing: string; note: string };
  notes: string[];
}

export interface Storyboard {
  brief: string;
  template: string;
  style: string;
  fps: number;
  width: number;
  height: number;
  duration: { seconds: number; frames: number };
  doctrine: {
    entrance: string;
    exit: string;
    onScreen: string;
    staggerBudgetMs: number;
    note: string;
  };
  beats: PlannedBeat[];
  staggerPlan: {
    budgetMs: number;
    maxTotalMs: number;
    allWithinBudget: boolean;
    groups: { beat: number; pattern: string; intervalMs: number; totalMs: number }[];
  };
  tokensUsed: string[];
  notes: string[];
}

interface BeatTemplate {
  key: string;
  label: string;
  role: BeatRole;
  easingRole: EasingRole;
  weight: number;
  elements: PlannedElement[];
  holdBeat?: boolean;
}

interface Template {
  id: string;
  keywords: string[];
  description: string;
  beats: BeatTemplate[];
}

const TEMPLATES: Template[] = [
  {
    id: "launch-title",
    keywords: ["launch", "announce", "reveal", "logo", "wordmark", "brand film"],
    description: "Hook, wordmark reveal, a readable hold, then a calm exit.",
    beats: [
      {
        key: "establish",
        label: "Establish",
        role: "setup",
        easingRole: "onScreen",
        weight: 1,
        elements: [{ name: "backdrop", type: "shape" }],
      },
      {
        key: "reveal",
        label: "Wordmark reveal",
        role: "reveal",
        easingRole: "entrance",
        weight: 1,
        elements: [{ name: "wordmark", type: "text" }],
      },
      {
        key: "hold",
        label: "Hold",
        role: "hold",
        easingRole: "onScreen",
        weight: 0,
        holdBeat: true,
        elements: [
          { name: "wordmark", type: "text" },
          { name: "tagline", type: "text" },
        ],
      },
      {
        key: "exit",
        label: "Exit",
        role: "exit",
        easingRole: "exit",
        weight: 0.5,
        elements: [
          { name: "wordmark", type: "text" },
          { name: "tagline", type: "text" },
        ],
      },
    ],
  },
  {
    id: "title-sequence",
    keywords: ["title sequence", "titles", "opening", "intro", "opener"],
    description: "Quiet build, title card, hold, cut to black.",
    beats: [
      {
        key: "build",
        label: "Build",
        role: "setup",
        easingRole: "onScreen",
        weight: 1,
        elements: [{ name: "backdrop", type: "shape" }],
      },
      {
        key: "title",
        label: "Title card",
        role: "reveal",
        easingRole: "entrance",
        weight: 1,
        elements: [{ name: "title", type: "text" }],
      },
      {
        key: "hold",
        label: "Hold",
        role: "hold",
        easingRole: "onScreen",
        weight: 0,
        holdBeat: true,
        elements: [
          { name: "title", type: "text" },
          { name: "credit", type: "text" },
        ],
      },
      {
        key: "out",
        label: "Out",
        role: "exit",
        easingRole: "exit",
        weight: 0.5,
        elements: [{ name: "title", type: "text" }],
      },
    ],
  },
  {
    id: "showreel",
    keywords: ["showreel", "show reel", "reel", "portfolio", "sizzle", "montage"],
    description: "Open, three works, close, exit.",
    beats: [
      {
        key: "open",
        label: "Open",
        role: "setup",
        easingRole: "onScreen",
        weight: 0.8,
        elements: [{ name: "mark", type: "text" }],
      },
      {
        key: "work-1",
        label: "Work one",
        role: "develop",
        easingRole: "entrance",
        weight: 1,
        elements: [{ name: "clip-1", type: "clip" }],
      },
      {
        key: "work-2",
        label: "Work two",
        role: "develop",
        easingRole: "entrance",
        weight: 1,
        elements: [{ name: "clip-2", type: "clip" }],
      },
      {
        key: "work-3",
        label: "Work three",
        role: "develop",
        easingRole: "entrance",
        weight: 1,
        elements: [{ name: "clip-3", type: "clip" }],
      },
      {
        key: "close",
        label: "Close",
        role: "resolve",
        easingRole: "entrance",
        weight: 0.6,
        elements: [{ name: "endcard", type: "text" }],
      },
      {
        key: "exit",
        label: "Exit",
        role: "exit",
        easingRole: "exit",
        weight: 0.4,
        elements: [{ name: "endcard", type: "text" }],
      },
    ],
  },
  {
    id: "product-loop",
    keywords: ["loop", "looping", "seamless loop", "product", "dashboard", "chart", "metric"],
    description: "Number, chart, title, back to the start.",
    beats: [
      {
        key: "metric",
        label: "Hero metric",
        role: "develop",
        easingRole: "entrance",
        weight: 1,
        elements: [{ name: "big-number", type: "text" }],
      },
      {
        key: "chart",
        label: "Chart",
        role: "develop",
        easingRole: "entrance",
        weight: 1,
        elements: [
          { name: "bar-1", type: "shape" },
          { name: "bar-2", type: "shape" },
          { name: "bar-3", type: "shape" },
        ],
      },
      {
        key: "title",
        label: "Title card",
        role: "resolve",
        easingRole: "entrance",
        weight: 0.8,
        elements: [{ name: "title", type: "text" }],
      },
      {
        key: "loop-point",
        label: "Loop point",
        role: "loop",
        easingRole: "exit",
        weight: 0.4,
        elements: [{ name: "title", type: "text" }],
      },
    ],
  },
  {
    id: "changelog-clip",
    keywords: ["changelog", "release", "update", "what's new", "whats new", "feature"],
    description: "Release badge, two changes, close, exit.",
    beats: [
      {
        key: "badge",
        label: "Release badge",
        role: "setup",
        easingRole: "onScreen",
        weight: 0.7,
        elements: [{ name: "badge", type: "text" }],
      },
      {
        key: "change-1",
        label: "Change one",
        role: "develop",
        easingRole: "entrance",
        weight: 1,
        elements: [{ name: "change-1", type: "text" }],
      },
      {
        key: "change-2",
        label: "Change two",
        role: "develop",
        easingRole: "entrance",
        weight: 1,
        elements: [{ name: "change-2", type: "text" }],
      },
      {
        key: "close",
        label: "Close",
        role: "resolve",
        easingRole: "entrance",
        weight: 0.6,
        elements: [{ name: "cta", type: "text" }],
      },
      {
        key: "exit",
        label: "Exit",
        role: "exit",
        easingRole: "exit",
        weight: 0.4,
        elements: [{ name: "cta", type: "text" }],
      },
    ],
  },
  {
    id: "social-cutdown",
    keywords: ["social", "cutdown", "reel", "vertical", "tiktok", "shorts", "sting"],
    description: "Hook in the first second, punch, brand, exit.",
    beats: [
      {
        key: "hook",
        label: "Hook",
        role: "reveal",
        easingRole: "entrance",
        weight: 1.2,
        elements: [{ name: "headline", type: "text" }],
      },
      {
        key: "punch",
        label: "Punch",
        role: "develop",
        easingRole: "entrance",
        weight: 1,
        elements: [{ name: "clip", type: "clip" }],
      },
      {
        key: "brand",
        label: "Brand",
        role: "resolve",
        easingRole: "entrance",
        weight: 0.7,
        elements: [{ name: "logo", type: "text" }],
      },
      {
        key: "exit",
        label: "Exit",
        role: "exit",
        easingRole: "exit",
        weight: 0.4,
        elements: [{ name: "logo", type: "text" }],
      },
    ],
  },
  {
    id: "kinetic-type",
    keywords: ["kinetic type", "kinetic", "type sequence", "words"],
    description: "One line at a time, staggered, then a resolved end card.",
    beats: [
      {
        key: "establish",
        label: "Establish",
        role: "setup",
        easingRole: "onScreen",
        weight: 0.8,
        elements: [{ name: "backdrop", type: "shape" }],
      },
      {
        key: "sequence",
        label: "Type sequence",
        role: "develop",
        easingRole: "entrance",
        weight: 1,
        elements: [
          { name: "line-1", type: "text" },
          { name: "line-2", type: "text" },
          { name: "line-3", type: "text" },
        ],
      },
      {
        key: "resolve",
        label: "End card",
        role: "resolve",
        easingRole: "entrance",
        weight: 0.7,
        elements: [{ name: "endcard", type: "text" }],
      },
      {
        key: "exit",
        label: "Exit",
        role: "exit",
        easingRole: "exit",
        weight: 0.4,
        elements: [{ name: "endcard", type: "text" }],
      },
    ],
  },
  {
    id: "generic",
    keywords: [],
    description: "Establish, develop, resolve, exit.",
    beats: [
      {
        key: "establish",
        label: "Establish",
        role: "setup",
        easingRole: "onScreen",
        weight: 1,
        elements: [{ name: "backdrop", type: "shape" }],
      },
      {
        key: "develop",
        label: "Develop",
        role: "develop",
        easingRole: "entrance",
        weight: 1,
        elements: [{ name: "headline", type: "text" }],
      },
      {
        key: "resolve",
        label: "Resolve",
        role: "resolve",
        easingRole: "entrance",
        weight: 0.9,
        elements: [{ name: "payoff", type: "text" }],
      },
      {
        key: "exit",
        label: "Exit",
        role: "exit",
        easingRole: "exit",
        weight: 0.4,
        elements: [{ name: "payoff", type: "text" }],
      },
    ],
  },
];

const DEFAULT_DURATION_BY_KEYWORD: { keywords: string[]; seconds: number }[] = [
  { keywords: ["launch"], seconds: 12 },
  { keywords: ["showreel", "reel", "portfolio"], seconds: 30 },
  { keywords: ["title sequence", "title"], seconds: 8 },
  { keywords: ["loop"], seconds: 20 },
  { keywords: ["changelog", "release"], seconds: 15 },
  { keywords: ["social", "cutdown"], seconds: 10 },
];

function normalise(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Deterministic 32-bit FNV-1a hash — used for stable, repeatable choices. */
export function stableHash(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

export function pickTemplate(brief: string): Template {
  const text = normalise(brief);
  let best: Template | undefined;
  let bestScore = 0;
  for (const template of TEMPLATES) {
    if (template.keywords.length === 0) continue;
    let score = 0;
    for (const keyword of template.keywords) {
      if (text.includes(keyword)) score += keyword.length;
    }
    if (score > bestScore) {
      bestScore = score;
      best = template;
    }
  }
  return best ?? TEMPLATES[TEMPLATES.length - 1];
}

export function pickStyle(brief: string, explicit?: string): string {
  if (explicit) return explicit;
  const text = normalise(brief);
  if (/\b(calm|quiet|serene|gentle|restful|soft)\b/.test(text)) return "calm";
  if (/\b(energetic|punchy|fast|lively|driving)\b/.test(text)) return "energetic";
  if (/\b(snappy|quick|sharp|fast-paced)\b/.test(text)) return "snappy";
  return "premium";
}

export function parseDurationSeconds(brief: string): number | undefined {
  const text = normalise(brief);
  const clock = /\b(\d{1,2}):(\d{2})\b/.exec(text);
  if (clock) {
    const minutes = Number.parseInt(clock[1], 10);
    const seconds = Number.parseInt(clock[2], 10);
    if (Number.isFinite(minutes) && Number.isFinite(seconds)) {
      return minutes * 60 + seconds;
    }
  }
  const match = /(\d+(?:\.\d+)?)\s*(?:s\b|secs?\b|seconds?\b)/.exec(text);
  if (match) {
    const value = Number.parseFloat(match[1]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return undefined;
}

export function parseHoldSeconds(brief: string): number | undefined {
  const text = normalise(brief);
  const match = /hold(?:\s+for)?\s+(\d+(?:\.\d+)?)\s*(?:s\b|secs?\b|seconds?\b)/.exec(text);
  if (match) {
    const value = Number.parseFloat(match[1]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return undefined;
}

export function parseElementCount(brief: string): number | undefined {
  const text = normalise(brief);
  const match = /(\d{1,3})\s+(?:words?|lines?|items?|bars?|steps?|cards?|rows?)\b/.exec(text);
  if (match) {
    const value = Number.parseInt(match[1], 10);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return undefined;
}

function defaultDuration(brief: string, template: Template): number {
  const text = normalise(brief);
  for (const entry of DEFAULT_DURATION_BY_KEYWORD) {
    if (entry.keywords.some((keyword) => text.includes(keyword))) return entry.seconds;
  }
  return template.id === "showreel" ? 30 : 15;
}

function roundTo(value: number, step: number): number {
  return Math.max(step, Math.floor(value / step) * step);
}

/**
 * Plan a storyboard. Pure function: the same input always yields the same
 * output.
 */
export function planVideo(options: PlanOptions, tokens: MotionTokens): Storyboard {
  const brief = options.brief.trim();
  const text = normalise(brief);
  const template = pickTemplate(brief);
  const style = pickStyle(brief, options.style);
  const styleTokens =
    tokens.styleDurations[style] ??
    tokens.styleDurations.premium ?? {
      entrance: 500,
      onScreen: 400,
      exit: 350,
      stagger: "standard",
    };

  const fps = options.fps && options.fps > 0 ? Math.round(options.fps) : 30;
  const width = options.width ?? 1920;
  const height = options.height ?? 1080;

  const requestedDuration =
    options.durationSeconds ?? parseDurationSeconds(brief) ?? defaultDuration(brief, template);
  const requestedHold = options.holdSeconds ?? parseHoldSeconds(brief);
  const requestedElements = options.elementCount ?? parseElementCount(brief);

  const notes: string[] = [];
  const beats = template.beats.map((beat) => ({ ...beat, elements: beat.elements.map((e) => ({ ...e })) }));

  // Apply an explicit element count ("9 words") to the first beat that carries a group.
  if (requestedElements && requestedElements > 1) {
    const groupBeat = beats.find((b) => b.role === "develop" || b.role === "reveal");
    if (groupBeat) {
      const base = groupBeat.elements[0];
      groupBeat.elements = Array.from({ length: requestedElements }, (_, index) => ({
        name: `${base.name}-${index + 1}`,
        type: base.type,
      }));
      notes.push(
        `Element count ${requestedElements} taken from the brief and applied to beat "${groupBeat.key}".`,
      );
    }
  }

  const totalMs = Math.round(requestedDuration * 1000);
  const animationMs = beats.map((beat) => styleTokens[beat.easingRole]);

  // Fixed holds (the readable hold) are reserved before the flexible time.
  const defaultHold = Math.min(2000, Math.round(totalMs * 0.25));
  const holdMs = beats.map((beat) =>
    beat.holdBeat ? Math.round((requestedHold ?? defaultHold) * 1000) : 0,
  );

  const animationTotal = animationMs.reduce((sum, value) => sum + value, 0);
  const holdTotal = holdMs.reduce((sum, value) => sum + value, 0);
  const flexibleMs = totalMs - animationTotal - holdTotal;

  let workingAnimation = [...animationMs];
  let workingHold = [...holdMs];
  let remaining = flexibleMs;

  if (remaining < 0) {
    // Too tight for the doctrine's durations: shed the hold first, then shrink
    // the animation durations proportionally (never below 120ms per beat).
    const deficit = -remaining;
    const holdSlack = workingHold.reduce((sum, value) => sum + value, 0);
    const shed = Math.min(holdSlack, deficit);
    if (shed > 0) {
      const ratio = holdSlack === 0 ? 0 : (holdSlack - shed) / holdSlack;
      workingHold = workingHold.map((value) => Math.round(value * ratio));
      remaining += shed;
      notes.push(
        "The requested length is too short for the doctrine's hold; the hold was shortened to fit.",
      );
    }
    if (remaining < 0) {
      const minTotal = beats.length * 120;
      const scale = Math.max(0.2, (totalMs - holdTotal) / Math.max(1, animationTotal));
      workingAnimation = workingAnimation.map((value) =>
        Math.max(120, Math.round(value * Math.min(1, scale))),
      );
      const newTotal = workingAnimation.reduce((sum, value) => sum + value, 0) + holdTotal;
      if (newTotal > totalMs) {
        notes.push(
          "The brief is shorter than the minimum viable storyboard; the plan was compressed to the shortest legal length.",
        );
        const overflow = newTotal - totalMs;
        const shrink = Math.max(0, 1 - overflow / Math.max(1, newTotal));
        workingAnimation = workingAnimation.map((value) =>
          Math.max(100, Math.round(value * shrink)),
        );
      }
      remaining = totalMs - workingAnimation.reduce((s, v) => s + v, 0) - workingHold.reduce((s, v) => s + v, 0);
    }
  }

  // Distribute the flexible time over the content beats by weight.
  const weightTotal = beats.reduce(
    (sum, beat, index) => sum + (beat.holdBeat ? 0 : beat.weight),
    0,
  );
  const extra = beats.map((beat, index) => {
    if (beat.holdBeat) return 0;
    if (weightTotal <= 0) return 0;
    return Math.round((remaining * beat.weight) / weightTotal);
  });

  // Rounding leftovers go to the first content beat so the total is exact.
  const computedTotal =
    workingAnimation.reduce((s, v) => s + v, 0) +
    workingHold.reduce((s, v) => s + v, 0) +
    extra.reduce((s, v) => s + v, 0);
  const drift = totalMs - computedTotal;
  if (drift !== 0) {
    const firstContent = extra.findIndex((value) => value >= 0);
    if (firstContent >= 0) extra[firstContent] = Math.max(0, extra[firstContent] + drift);
  }

  const staggerPattern = tokens.stagger.patterns[styleTokens.stagger] ?? {
    intervalMs: 80,
    budgetMs: 400,
  };

  let cursorMs = 0;
  const plannedBeats: PlannedBeat[] = [];
  const staggerGroups: Storyboard["staggerPlan"]["groups"] = [];

  beats.forEach((beat, index) => {
    const durationMs = workingAnimation[index] + workingHold[index] + extra[index];
    const inSeconds = cursorMs / 1000;
    const outMs = cursorMs + durationMs;
    cursorMs = outMs;

    const elementCount = beat.elements.length;
    let intervalMs = staggerPattern.intervalMs;
    let clamped = false;
    if (elementCount > 1) {
      const budget = tokens.stagger.budgetMs;
      const total = (elementCount - 1) * intervalMs;
      if (total >= budget) {
        intervalMs = roundTo(budget / (elementCount - 1), 10);
        clamped = true;
        if (intervalMs < 10) intervalMs = 10;
      }
    }
    const staggerTotal = elementCount > 1 ? (elementCount - 1) * intervalMs : 0;
    const withinBudget = staggerTotal < tokens.stagger.budgetMs;

    const easing = tokens.easing[beat.easingRole];
    const inFrame = Math.round(inSeconds * fps);
    const outFrame = index === beats.length - 1
      ? Math.round((cursorMs / 1000) * fps)
      : Math.round((outMs / 1000) * fps);

    const beatNotes: string[] = [];
    if (clamped) {
      beatNotes.push(
        `Stagger interval shortened to ${intervalMs}ms so the group stays under the ${tokens.stagger.budgetMs}ms budget.`,
      );
    }
    if (beat.holdBeat) {
      beatNotes.push(
        `Hold of ${(workingHold[index] / 1000).toFixed(2)}s — long enough to read the line, then it leaves.`,
      );
    }

    const planned: PlannedBeat = {
      index: index + 1,
      key: beat.key,
      label: beat.label,
      role: beat.role,
      easingRole: beat.easingRole,
      easing: {
        name: easing.name,
        role: easing.role,
        cubicBezier: easing.cubicBezier,
      },
      inSeconds: Number(inSeconds.toFixed(3)),
      outSeconds: Number((outMs / 1000).toFixed(3)),
      inFrame,
      outFrame,
      durationSeconds: Number((durationMs / 1000).toFixed(3)),
      animationMs: workingAnimation[index],
      holdMs: workingHold[index],
      elements: beat.elements,
      stagger: {
        pattern: styleTokens.stagger,
        elementCount,
        intervalMs,
        totalMs: staggerTotal,
        budgetMs: tokens.stagger.budgetMs,
        withinBudget,
        clamped,
        note:
          elementCount > 1
            ? undefined
            : "Single element — no stagger to budget.",
      },
      transition: {
        type: beat.holdBeat ? "hold" : "cut",
        easing: easing.name,
        note:
          beat.easingRole === "entrance"
            ? "Enters on the emphasized ease-out curve."
            : beat.easingRole === "exit"
              ? "Leaves on the accelerate ease-in curve."
              : "Stays on screen on the standard ease-in-out curve.",
      },
      notes: beatNotes,
    };

    if (elementCount > 1) {
      staggerGroups.push({
        beat: planned.index,
        pattern: styleTokens.stagger,
        intervalMs,
        totalMs: staggerTotal,
      });
    }

    plannedBeats.push(planned);
  });

  const maxTotalMs = staggerGroups.reduce((max, group) => Math.max(max, group.totalMs), 0);

  return {
    brief,
    template: template.id,
    style,
    fps,
    width,
    height,
    duration: {
      seconds: Number((cursorMs / 1000).toFixed(3)),
      frames: Math.round((cursorMs / 1000) * fps),
    },
    doctrine: {
      entrance: tokens.easing.entrance.role,
      exit: tokens.easing.exit.role,
      onScreen: tokens.easing.onScreen.role,
      staggerBudgetMs: tokens.stagger.budgetMs,
      note: tokens.stagger.rule,
    },
    beats: plannedBeats,
    staggerPlan: {
      budgetMs: tokens.stagger.budgetMs,
      maxTotalMs,
      allWithinBudget: staggerGroups.every((group) => group.totalMs < tokens.stagger.budgetMs),
      groups: staggerGroups,
    },
    tokensUsed: [
      `easing.entrance (${tokens.easing.entrance.name})`,
      `easing.exit (${tokens.easing.exit.name})`,
      `easing.onScreen (${tokens.easing.onScreen.name})`,
      `styleDurations.${style}`,
      `stagger.${styleTokens.stagger}`,
      `stagger.budgetMs (${tokens.stagger.budgetMs})`,
    ],
    notes,
  };
}

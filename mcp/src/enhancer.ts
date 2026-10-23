/**
 * The prompt enhancer.
 *
 * A weak motion prompt is weak in a predictable way: it names a subject and
 * nothing else. It has no format, no duration, no camera, no timing, no
 * palette, no typography, no sound, and no negative constraints — so whatever
 * comes back is a lottery.
 *
 * The enhancer is deterministic. It does not call a model and it does not
 * invent facts about the subject. It diagnoses which parts of a motion brief
 * are missing, then rebuilds the prompt as a complete brief using:
 *
 *   - the Motion Master motion tokens (easing, duration, stagger, palette),
 *   - a style recipe matched out of the library, when one fits,
 *   - the craft rules the library corpus actually uses.
 *
 * Everything it adds is reported back, and anything it had to assume is
 * flagged as an assumption rather than passed off as a fact.
 */
import { matchStyles, type LibraryCatalogue, type LibraryItem } from "./library.js";

export interface TokenShape {
  easing: Record<string, { role: string; name: string; note: string }>;
  duration: Record<string, number>;
  stagger?: { budgetMs?: number; stepMs?: number };
  palette: Record<string, string>;
  typography: Record<string, unknown>;
  paletteUsage?: Record<string, string>;
}

export interface EnhanceOptions {
  /** Seconds. Defaults to 8 when the prompt does not state one. */
  durationSeconds?: number;
  /** Aspect ratio. Defaults to 16:9. */
  aspect?: string;
  /** Resolution. Defaults to 1920x1080. */
  resolution?: string;
  /** Frames per second. Defaults to 30. */
  fps?: number;
  /** Force a named style instead of matching one. */
  style?: string;
  /** The collection to draw style recipes from. Defaults to any. */
  styleCollection?: string;
  /** Extra constraint lines to append verbatim. */
  extraConstraints?: string[];
  /** Return this many alternative style recipes. */
  alternatives?: number;
}

export interface Check {
  id: string;
  label: string;
  present: boolean;
  note: string;
  remedy?: string;
}

export interface Enhancement {
  original: string;
  enhanced: string;
  verdict: "weak" | "workable" | "strong";
  score: { before: number; after: number };
  checks: Check[];
  diagnosis: string[];
  added: { section: string; text: string; why: string }[];
  assumptions: string[];
  references: { id: string; title: string; collection: string; license: string; excerpt: string }[];
  alternatives: { id: string; title: string; collection: string; license: string; recipe: string }[];
}

const RE = {
  duration: /\b\d{1,2}\s*(?:-|–|—|to)?\s*\d*\s*(?:s\b|sec\b|secs\b|seconds?\b|minutes?\b)|时长|秒/i,
  aspect: /\b(16:9|9:16|1:1|4:5|3:4|21:9|2\.39:1)\b|\b\d{3,4}\s*[x×]\s*\d{3,4}\b|\b\d{3,4}p\b|画幅|分辨率/i,
  camera: /\b(camera|cinematic|dolly|truck|pan\b|tilt\b|orbit|zoom|framing|shot type|depth of field|composition|angle|lens|镜头|运镜|机位)/i,
  type: /\b(typeface|typography|font\b|lettering|wordmark|headline|caption|subtitle|kerning|tracking|字体|排版|文案|字幕)/i,
  palette: /\b(palette|colou?r scheme|monochrom|#[0-9A-Fa-f]{6}\b|muted|saturated|desaturat|palette|配色|色板|颜色)/i,
  motion: /\b(easing|ease-in|ease-out|cubic-bezier|spring|overshoot|stagger|anticipation|follow-through|timing|rhythm|缓动|节奏|时间轴)/i,
  audio: /\b(audio|sound|sfx|music|beat\b|sound design|whoosh|riser|音|音乐|音效|节奏点)/i,
  negative: /\b(no text|do not|don't|avoid|without|no ui|no logo|no watermark|must not|不要|避免|禁止|无文字)/i,
  subject: /\b(subject|scene|content|footage|clip about|a video of|a shot of|主题|主体|内容)/i,
  render: /\b(render|frame|canvas|svg|gsap|remotion|hyperframes|three\.js|fps|code-drawn|deterministic|渲染|帧|代码)/i,
  style: /\b(style|look|aesthetic|visual style|genre|风格|质感|视觉)/i,
};

const has = (text: string, rx: RegExp) => rx.test(text);

export function assess(prompt: string): Check[] {
  const t = prompt || "";
  return [
    {
      id: "subject",
      label: "Names a subject",
      present: has(t, RE.subject) || t.length > 40,
      note: "What the piece is about.",
    },
    {
      id: "format",
      label: "States format and resolution",
      present: has(t, RE.aspect),
      note: "Aspect ratio, pixel size and frame rate. Without these the renderer guesses.",
      remedy: "1920x1080, 16:9, 30fps.",
    },
    {
      id: "duration",
      label: "States a duration",
      present: has(t, RE.duration),
      note: "Length in seconds. Timing is the difference between a demo and a film.",
      remedy: "8 seconds.",
    },
    {
      id: "style",
      label: "Names a visual style",
      present: has(t, RE.style),
      note: "A named look, so the render is repeatable rather than accidental.",
      remedy: "A style recipe matched from the library.",
    },
    {
      id: "camera",
      label: "Describes the camera",
      present: has(t, RE.camera),
      note: "Shot size and movement. A moving camera sells depth that flat animation cannot.",
      remedy: "A single locked-off wide shot with a slow push in.",
    },
    {
      id: "motion",
      label: "Describes timing and easing",
      present: has(t, RE.motion),
      note: "How things move and when. The single biggest difference between amateur and professional.",
      remedy: "Easing per role, with a stagger budget across entrances.",
    },
    {
      id: "type",
      label: "Specifies typography",
      present: has(t, RE.type),
      note: "Family, size, tracking and what the words actually are.",
      remedy: "One display face, tight tracking, and the real headline text.",
    },
    {
      id: "palette",
      label: "Specifies a palette",
      present: has(t, RE.palette),
      note: "Named colours or hex values, so the render is not whatever the default is.",
      remedy: "A limited palette with one accent.",
    },
    {
      id: "audio",
      label: "Plans the sound",
      present: has(t, RE.audio),
      note: "Music, sound effects and where they land.",
      remedy: "A bed, one impact, and silence where the words need room.",
    },
    {
      id: "negative",
      label: "States what to avoid",
      present: has(t, RE.negative),
      note: "Explicit exclusions beat hope. This is the cheapest way to raise the hit rate.",
      remedy: "No instrumentation, no placeholder text, no watermark, no logo.",
    },
    {
      id: "render",
      label: "Says how it is produced",
      present: has(t, RE.render),
      note: "Deterministic, code-drawn. It fixes the renderer's freedom to improvise.",
      remedy: "Every frame drawn in code, deterministic, no video model.",
    },
  ];
}

function scoreOf(checks: Check[]): number {
  const total = checks.length;
  const passed = checks.filter((c) => c.present).length;
  return Math.round((passed / total) * 100);
}

export function enhance(
  prompt: string,
  catalogue: LibraryCatalogue,
  tokens: TokenShape,
  options: EnhanceOptions = {},
): Enhancement {
  const original = (prompt || "").trim();
  const checks = assess(original);
  const before = scoreOf(checks);
  const missing = checks.filter((c) => !c.present);

  const duration = options.durationSeconds ?? 8;
  const aspect = options.aspect ?? "16:9";
  const resolution = options.resolution ?? "1920x1080";
  const fps = options.fps ?? 30;

  /* ---- style: use the caller's, else match one out of the library -------- */
  const stylePool = catalogue.items.filter(
    (i) => i.kind === "style" && (!options.styleCollection || i.collection === options.styleCollection),
  );
  const forcedStyle = options.style?.toLowerCase();
  const matched = forcedStyle
    ? stylePool.find(
        (i) =>
          i.id === options.style ||
          i.title.toLowerCase() === forcedStyle ||
          i.tags.some((t) => t === forcedStyle),
      )
    : matchStyles(catalogue, original, 1)[0]?.item;

  const referenceItems: LibraryItem[] = matched ? [matched] : [];
  const alts = options.style
    ? []
    : matchStyles(
        catalogue,
        original,
        (options.alternatives ?? 3) + 1,
      )
        .map((r) => r.item)
        .filter((i) => !matched || i.id !== matched.id)
        .slice(0, options.alternatives ?? 3);

  /* ---- build the brief --------------------------------------------------- */
  const added: Enhancement["added"] = [];
  const assumptions: string[] = [];
  const sections: string[] = [];

  const push = (name: string, text: string, why: string) => {
    sections.push(`${name}\n${text}`);
    added.push({ section: name, text, why });
  };

  // The original brief is never lost. Whatever the user wrote is the subject,
  // carried through verbatim so the enhancer adds craft without rewriting intent.
  push(
    "BRIEF",
    original.length ? original : "<<describe the subject here>>",
    original.length
      ? "Your brief, carried through verbatim."
      : "The brief was empty — replace this before rendering.",
  );
  if (!original.length) {
    assumptions.push("Subject is a placeholder — replace it before rendering.");
  }

  if (!has(original, RE.style)) {
    if (matched) {
      // Prefer the recipe itself; fall back to the summary, and never repeat
      // the title when the summary is just the title again.
      const recipe = matched.prompt || matched.summary || "";
      const summary = matched.summary && matched.summary !== matched.title ? matched.summary : "";
      const body = [summary, recipe].filter(Boolean).join("\n").trim();
      push(
        "STYLE",
        body,
        `No style was named. "${matched.title}" was matched from the ${matched.collection} collection (${matched.license}).`,
      );
      assumptions.push(
        `Style "${matched.title}" was matched from the library, not chosen by you. Alternatives are listed below.`,
      );
    } else {
      push("STYLE", "A restrained, high-contrast look with one accent colour.", "No style was named and none matched.");
      assumptions.push("Style is a generic default — set one explicitly for a repeatable result.");
    }
  }

  if (!has(original, RE.camera)) {
    push(
      "CAMERA",
      "One locked-off wide shot with a slow push in across the whole clip. No cuts. The camera moves at most once.",
      "A prompt with no camera gets a slideshow. A single move sells depth.",
    );
  }

  if (!has(original, RE.motion)) {
    const ent = tokens.easing.entrance;
    const on = tokens.easing.onScreen;
    const exit = tokens.easing.exit;
    const budget = tokens.stagger?.budgetMs;
    push(
      "MOTION",
      [
        `Everything entering the frame decelerates (${ent.name}, ${ent.role}).`,
        `Anything leaving accelerates away (${exit.name}, ${exit.role}), at about 70% of the matching entrance duration.`,
        `Anything that stays on screen and changes state uses the symmetric curve (${on.name}, ${on.role}).`,
        budget
          ? `Entrances are staggered by ${tokens.stagger?.stepMs ?? 60}ms, inside a ${budget}ms budget for the whole sequence.`
          : "Entrances are staggered by a consistent 60ms step, never all at once.",
        "Nothing moves linearly except things the viewer must read as a measurement.",
        "The last frame holds for at least 8 frames so the clip does not cut off mid-move.",
      ].join("\n"),
      "Timing is the largest difference between amateur and professional motion. It was missing.",
    );
  }

  if (!has(original, RE.type)) {
    const fam = (tokens.typography.families as Record<string, string>)?.sans ?? "a grotesque sans";
    push(
      "TYPOGRAPHY",
      `One display face only — ${fam}, weight 700, tracking -0.02em, set tight. The headline is the actual copy, not a placeholder. No body copy. No lorem ipsum.`,
      "Typography was unspecified, so the renderer picks something arbitrary.",
    );
  }

  if (!has(original, RE.palette)) {
    const p = tokens.palette;
    push(
      "PALETTE",
      `A limited palette: ${p.canvas} canvas, ${p.ink} ink, ${p.mutedInk} for anything secondary, ${p.hairline} for rules, and ${p.accent} as the only accent — used for one mark, never as a background.`,
      "No palette was given, so the default is whatever the framework ships with.",
    );
  }

  if (!has(original, RE.audio)) {
    push(
      "AUDIO",
      "A single low bed under the whole clip. One impact on the moment the subject lands. Silence where the words need room — no music under a headline.",
      "Sound was unplanned. A silent clip reads as a screen recording.",
    );
  }

  if (!has(original, RE.duration)) {
    push("DURATION", `${duration} seconds.`, "No duration was given, so the length would be arbitrary.");
    assumptions.push(`Duration set to ${duration}s — change it if you have a slot in mind.`);
  }

  if (!has(original, RE.render)) {
    push(
      "PRODUCTION",
      "Every frame is drawn in code and the render is deterministic: the same brief produces the same frames every time, with no dropped frames and no video model in the loop.",
      "Nothing said how the piece is produced, so the renderer was free to improvise.",
    );
  }

  if (!has(original, RE.negative)) {
    push(
      "CONSTRAINTS",
      [
        "- No on-screen instrumentation: no corner labels, counters, timecodes, progress bars, kickers, header or footer bars.",
        "- No placeholder text, no lorem ipsum, no stock UI, no watermark, no logo unless one was supplied.",
        "- No effect that is not named above. If a beat is not in the brief, it is not in the film.",
        "- Nothing enters or exits on the same frame as something else.",
      ].join("\n"),
      "The prompt had no exclusions. Explicit negatives are the cheapest way to raise the hit rate.",
    );
  }

  if (options.extraConstraints?.length) {
    push(
      "CONSTRAINTS (added)",
      options.extraConstraints.map((c) => `- ${c}`).join("\n"),
      "Constraints supplied by the caller.",
    );
  }

  const header = `Create a ${resolution}, ${aspect}, ${fps}fps motion graphics clip.`;
  const enhanced = [header, ...sections].join("\n\n");

  const after = assess(enhanced);
  const afterScore = scoreOf(after);

  const verdict: Enhancement["verdict"] =
    before >= 80 ? "strong" : before >= 45 ? "workable" : "weak";

  return {
    original,
    enhanced,
    verdict,
    score: { before, after: afterScore },
    checks,
    diagnosis: missing.map((c) => `${c.label} — ${c.note}`),
    added,
    assumptions,
    references: referenceItems.map((i) => ({
      id: i.id,
      title: i.title,
      collection: i.collection,
      license: i.license,
      excerpt: (i.prompt || i.summary).slice(0, 320),
    })),
    alternatives: alts.map((i) => ({
      id: i.id,
      title: i.title,
      collection: i.collection,
      license: i.license,
      recipe: i.prompt || i.summary,
    })),
  };
}

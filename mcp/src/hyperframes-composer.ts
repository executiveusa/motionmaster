/**
 * HyperFrames composition generator.
 *
 * Emits a complete, runnable HyperFrames project for a storyboard. HyperFrames
 * is the Apache-2.0 HTML-to-video renderer from heygen-com: an HTML document
 * with a seekable GSAP timeline, captured frame by frame in headless Chrome and
 * encoded with ffmpeg. The render is deterministic — the same composition
 * produces the same frames every time.
 *
 * The output is a project directory, not a snippet: index.html, the project
 * manifest, and the local GSAP copy the composition loads. Nothing is fetched
 * from a CDN at render time.
 */
import type { Storyboard, PlannedBeat } from "./planner.js";
import type { MotionTokens } from "./tokens.js";

export interface HyperFramesResult {
  directory: string;
  files: { path: string; contents: string }[];
  composition: { id: string; width: number; height: number; fps: number; durationInFrames: number };
  commands: string[];
  notes: string[];
}

const esc = (s: string) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** The GSAP build HyperFrames projects use, pinned. */
export const GSAP_VERSION = "3.14.2";
export const GSAP_FILE = `gsap-${GSAP_VERSION}.min.js`;

/**
 * A HyperFrames clip element carries data-start and data-duration in seconds.
 * The timeline is seeked to the current time before every capture, so the
 * timeline itself is the single source of truth for the picture.
 */
function clipFor(beat: PlannedBeat, index: number, tokens: MotionTokens): string {
  const easing = beat.easing.name;
  const elements = beat.elements
    .map((el) => {
      const id = `b${index}-${el.type}-${slug(el.name)}`;
      return `      <div class="clip beat" id="${id}" data-start="${beat.inSeconds}" data-duration="${beat.durationSeconds}" data-track-index="${index}">
        <span class="beat__label">${esc(el.name)}</span>
      </div>`;
    })
    .join("\n");
  void easing;
  void tokens;
  return elements;
}

function slug(s: string): string {
  const out = s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return out || "x";
}

/** Motion Master easing names mapped to GSAP eases. */
const GSAP_EASE: Record<string, string> = {
  emphasized: "power4.out",
  accelerate: "power3.in",
  standard: "power2.inOut",
  sine: "sine.inOut",
  linear: "none",
  "expo-out": "expo.out",
  "back-out": "back.out(1.7)",
  "elastic-out": "elastic.out(1, 0.5)",
};

export function buildHyperFramesProject(
  storyboard: Storyboard,
  tokens: MotionTokens,
  options: { projectName?: string; gsapSource?: string } = {},
): HyperFramesResult {
  const name = options.projectName ?? "composition";
  const { width, height, fps } = storyboard;
  const total = storyboard.duration.seconds;
  const p = tokens.palette;
  const family = (tokens.typography.families as Record<string, string>)?.sans ?? "sans-serif";
  const display = (tokens.typography.display ?? {}) as Record<string, unknown>;
  const displaySize = (display.size as string) ?? "clamp(48px, 7.2vw, 104px)";
  const displayWeight = (display.weight as number) ?? 700;
  const displayTracking = (display.tracking as string) ?? "-0.03em";
  const displayLine = (display.lineHeight as number) ?? 0.95;

  const clips = storyboard.beats
    .map((beat, i) => clipFor(beat, i, tokens))
    .filter(Boolean)
    .join("\n");

  const timeline = storyboard.beats
    .map((beat, i) => {
      const ease = GSAP_EASE[beat.easing.name] ?? "power2.out";
      const enter = beat.durationSeconds * 0.38;
      const stag = beat.stagger.intervalMs / 1000;
      return [
        `    // beat ${i + 1}: ${beat.label} — ${beat.role}, ${beat.easing.name}`,
        `    tl.fromTo("#b${i} .beat__label", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: ${round(enter)}, ease: "${ease}", stagger: ${round(stag)} }, ${round(beat.inSeconds)});`,
        `    if (${round(beat.outSeconds)} < ${round(total)}) {`,
        `      tl.to("#b${i} .beat__label", { opacity: 0, y: -18, duration: ${round(Math.min(0.28, beat.durationSeconds * 0.3))}, ease: "${GSAP_EASE.accelerate}" }, ${round(beat.outSeconds - Math.min(0.28, beat.durationSeconds * 0.3))});`,
        `    }`,
      ].join("\n");
    })
    .join("\n");

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" width=${width}, height=${height} />
    <script src="./${GSAP_FILE}"></script>
    <style>
      :root {
        --canvas: ${p.canvas};
        --ink: ${p.ink};
        --muted: ${p.mutedInk};
        --hairline: ${p.hairline};
        --accent: ${p.accent};
        --font-display: ${family};
      }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body {
        margin: 0;
        width: ${width}px;
        height: ${height}px;
        overflow: hidden;
        background: var(--canvas);
      }
      #root {
        position: relative;
        width: 100%;
        height: 100%;
        font-family: var(--font-display);
        color: var(--ink);
      }
      .beat {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
      }
      .beat__label {
        font-size: ${displaySize};
        font-weight: ${displayWeight};
        letter-spacing: ${displayTracking};
        line-height: ${displayLine};
        text-align: center;
        padding: 0 8vw;
      }
    </style>
  </head>
  <body>
    <div
      id="root"
      data-composition-id="main"
      data-start="0"
      data-duration="${total}"
      data-width="${width}"
      data-height="${height}"
    >
${clips}
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
${timeline}
      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;

  const manifest = `${JSON.stringify(
    {
      $schema: "https://hyperframes.heygen.com/schema/hyperframes.json",
      registry: "https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry",
      paths: { blocks: "compositions", components: "compositions/components", assets: "assets" },
      media: { autoProxy: false },
    },
    null,
    2,
  )}\n`;

  const pkg = `${JSON.stringify(
    {
      name,
      private: true,
      type: "module",
      scripts: {
        check: "npx --yes hyperframes@0.8.186 check",
        render: "npx --yes hyperframes@0.8.186 render",
        dev: "npx --yes hyperframes@0.8.186 preview",
      },
    },
    null,
    2,
  )}\n`;

  const commands = [
    `npx hyperframes@0.8.186 check ${name}`,
    `npx hyperframes@0.8.186 render ${name} --output ${name}.mp4 -f ${fps} -q delivery`,
  ];

  const notes = [
    "The composition is deterministic: the same file renders the same frames every time.",
    `Motion Master easing names map to GSAP eases here; entrances use ${storyboard.doctrine.entrance}, exits ${storyboard.doctrine.exit}.`,
    `Stagger budget for the whole sequence is ${storyboard.staggerPlan.budgetMs}ms.`,
    "GSAP is loaded from a local file. The render never touches a CDN.",
    "Run `hyperframes check` before rendering — it catches layout and timing mistakes a render would not.",
  ];

  return {
    directory: name,
    files: [
      { path: `${name}/index.html`, contents: html },
      { path: `${name}/hyperframes.json`, contents: manifest },
      { path: `${name}/package.json`, contents: pkg },
      { path: `${name}/${GSAP_FILE}`, contents: options.gsapSource ?? "" },
    ],
    composition: {
      id: "main",
      width,
      height,
      fps,
      durationInFrames: storyboard.duration.frames,
    },
    commands,
    notes,
  };
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

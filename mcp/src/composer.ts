/**
 * Motion Master composition generator.
 *
 * Emits a self-contained, runnable Remotion composition for a storyboard. The
 * generated TSX carries the Motion Master tokens inline (palette, type, easing,
 * durations, springs, stagger budget) so the file runs on its own, and it
 * registers a real <Composition> with <Composition id=... component=... />.
 */
import type { MotionTokens } from "./tokens.js";
import type { Storyboard } from "./planner.js";

export interface CompositionResult {
  filename: string;
  tsx: string;
  composition: {
    id: string;
    width: number;
    height: number;
    fps: number;
    durationInFrames: number;
  };
  dependencies: string[];
  commands: string[];
  notes: string[];
}

function json(value: unknown, indent = 2): string {
  return JSON.stringify(value, null, indent);
}

function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : "motion-master";
}

/**
 * Accept a storyboard that came back from a client (possibly partial) and
 * return a complete one. Throws when there is nothing to build from.
 */
export function normalizeStoryboard(input: Partial<Storyboard>): Storyboard {
  const beats = input.beats ?? [];
  if (beats.length === 0) {
    throw new Error("The storyboard has no beats, so there is nothing to compose.");
  }
  const fps = input.fps && input.fps > 0 ? input.fps : 30;
  const lastBeat = beats[beats.length - 1];
  const frames = input.duration?.frames ?? lastBeat.outFrame ?? Math.round(fps * 10);
  const seconds = input.duration?.seconds ?? Number((frames / fps).toFixed(3));

  return {
    brief: input.brief ?? "",
    template: input.template ?? "custom",
    style: input.style ?? "premium",
    fps,
    width: input.width ?? 1920,
    height: input.height ?? 1080,
    duration: { seconds, frames },
    doctrine: input.doctrine ?? {
      entrance: "ease-out",
      exit: "ease-in",
      onScreen: "ease-in-out",
      staggerBudgetMs: 500,
      note: "Total stagger must stay under 500ms.",
    },
    beats,
    staggerPlan: input.staggerPlan ?? {
      budgetMs: 500,
      maxTotalMs: 0,
      allWithinBudget: true,
      groups: [],
    },
    tokensUsed: input.tokensUsed ?? [],
    notes: input.notes ?? [],
  };
}

export function buildComposition(
  storyboard: Storyboard,
  tokens: MotionTokens,
  options: { id?: string; filename?: string } = {},
): CompositionResult {  const id = options.id ?? slugify(storyboard.template);
  const filename = options.filename ?? "src/index.tsx";

  const tokenBlock = {
    palette: tokens.palette,
    typography: tokens.typography,
    easing: tokens.easing,
    duration: tokens.duration,
    spring: tokens.spring,
    stagger: tokens.stagger,
  };

  const beatBlock = storyboard.beats.map((beat) => ({
    index: beat.index,
    key: beat.key,
    label: beat.label,
    role: beat.role,
    easingRole: beat.easingRole,
    cubicBezier: beat.easing.cubicBezier,
    inFrame: beat.inFrame,
    outFrame: beat.outFrame,
    elements: beat.elements,
    staggerIntervalMs: beat.stagger.intervalMs,
  }));

  const tsx = `/**
 * Motion Master — generated composition "${id}"
 *
 * Template : ${storyboard.template}
 * Style    : ${storyboard.style}
 * Duration : ${storyboard.duration.seconds}s (${storyboard.duration.frames} frames @ ${storyboard.fps}fps)
 *
 * The tokens below are copied verbatim from
 * plugins/motion-master/assets/motion-tokens.json — the single source of truth.
 * Edit that file, re-run the generator, and the composition follows.
 *
 * Render:
 *   npx remotion render ${filename} ${id} out/${id}.mp4
 */
import React from "react";
import {
  AbsoluteFill,
  Composition,
  Easing,
  interpolate,
  registerRoot,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/* ------------------------------------------------------------------ tokens */
const TOKENS = ${json(tokenBlock, 2)};

const PALETTE = TOKENS.palette;
const TYPE = TOKENS.typography;

/** Doctrine curves: entrance eases out, exit eases in, on-screen eases in-out. */
const EASINGS: Record<string, (t: number) => number> = {
  entrance: Easing.bezier(
    TOKENS.easing.entrance.cubicBezier[0],
    TOKENS.easing.entrance.cubicBezier[1],
    TOKENS.easing.entrance.cubicBezier[2],
    TOKENS.easing.entrance.cubicBezier[3],
  ),
  exit: Easing.bezier(
    TOKENS.easing.exit.cubicBezier[0],
    TOKENS.easing.exit.cubicBezier[1],
    TOKENS.easing.exit.cubicBezier[2],
    TOKENS.easing.exit.cubicBezier[3],
  ),
  onScreen: Easing.bezier(
    TOKENS.easing.onScreen.cubicBezier[0],
    TOKENS.easing.onScreen.cubicBezier[1],
    TOKENS.easing.onScreen.cubicBezier[2],
    TOKENS.easing.onScreen.cubicBezier[3],
  ),
};

type Element = { name: string; type: "text" | "shape" | "clip" | "graphic" };
type Beat = {
  index: number;
  key: string;
  label: string;
  role: string;
  easingRole: "entrance" | "exit" | "onScreen";
  cubicBezier: [number, number, number, number];
  inFrame: number;
  outFrame: number;
  elements: Element[];
  staggerIntervalMs: number;
};

const BEATS: Beat[] = ${json(beatBlock, 2)};

/* ------------------------------------------------------------- components */
const BeatScene: React.FC<{ beat: Beat }> = ({ beat }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const local = frame - beat.inFrame;
  const span = Math.max(1, beat.outFrame - beat.inFrame);
  const clamp = {
    extrapolateLeft: "clamp" as const,
    extrapolateRight: "clamp" as const,
  };

  const progress = interpolate(local, [0, span], [0, 1], {
    ...clamp,
    easing: EASINGS[beat.easingRole],
  });

  const fadeIn = interpolate(local, [0, Math.min(12, span)], [0, 1], {
    ...clamp,
    easing: EASINGS.entrance,
  });
  const fadeOut = interpolate(local, [Math.floor(span * 0.55), span], [1, 0], {
    ...clamp,
    easing: EASINGS.exit,
  });

  const isEntrance = beat.easingRole === "entrance";
  const isExit = beat.easingRole === "exit";
  const opacity = isExit ? fadeOut : fadeIn;
  const offsetY = isEntrance
    ? interpolate(progress, [0, 1], [24, 0])
    : isExit
      ? interpolate(progress, [0, 1], [0, -16])
      : 0;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: PALETTE.canvas,
        color: PALETTE.ink,
        fontFamily: TYPE.families.sans,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          opacity,
          transform: \`translateY(\${offsetY}px)\`,
        }}
      >
        {beat.elements.map((element, elementIndex) => {
          const delayFrames = Math.round(
            (elementIndex * beat.staggerIntervalMs * fps) / 1000,
          );
          const elementProgress = interpolate(
            local - delayFrames,
            [0, Math.min(18, span)],
            [0, 1],
            { ...clamp, easing: EASINGS.entrance },
          );
          const elementOpacity = interpolate(
            local - delayFrames,
            [0, Math.min(12, span)],
            [0, 1],
            { ...clamp, easing: EASINGS.entrance },
          );

          if (element.type === "shape") {
            return (
              <div
                key={element.name}
                style={{
                  width: 240,
                  height: 2,
                  backgroundColor: PALETTE.hairline,
                  opacity: elementOpacity,
                  transform: \`scaleX(\${elementProgress})\`,
                  transformOrigin: "left center",
                }}
              />
            );
          }

          return (
            <div
              key={element.name}
              style={{
                fontSize: element.type === "text" ? TYPE.display.size : 32,
                fontWeight: element.type === "text" ? TYPE.display.weight : 500,
                letterSpacing: TYPE.display.tracking,
                lineHeight: TYPE.display.lineHeight,
                opacity: elementOpacity,
                transform: \`translateY(\${(1 - elementProgress) * 16}px)\`,
                maxWidth: "80%",
                textAlign: "center",
              }}
            >
              {element.name}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const MotionMasterScene: React.FC = () => {
  const frame = useCurrentFrame();
  const active = BEATS.find(
    (beat) => frame >= beat.inFrame && frame < beat.outFrame,
  );
  if (!active) {
    return <AbsoluteFill style={{ backgroundColor: PALETTE.canvas }} />;
  }
  return <BeatScene beat={active} />;
};

export const MotionMasterRoot: React.FC = () => {
  return (
    <Composition
      id="${id}"
      component={MotionMasterScene}
      durationInFrames={${storyboard.duration.frames}}
      fps={${storyboard.fps}}
      width={${storyboard.width}}
      height={${storyboard.height}}
    />
  );
};

registerRoot(MotionMasterRoot);
`;

  return {
    filename,
    tsx,
    composition: {
      id,
      width: storyboard.width,
      height: storyboard.height,
      fps: storyboard.fps,
      durationInFrames: storyboard.duration.frames,
    },
    dependencies: ["remotion", "@remotion/cli", "react", "react-dom"],
    commands: [
      `npm install remotion @remotion/cli react react-dom`,
      `npx remotion studio ${filename} ${id}`,
      `npx remotion render ${filename} ${id} out/${id}.mp4`,
    ],
    notes: [
      `Composition "${id}" is registered with <Composition> and registered with registerRoot().`,
      "The tokens in the file are a verbatim copy of plugins/motion-master/assets/motion-tokens.json.",
      "Copy the file into a Remotion project as src/index.tsx, then run the commands above.",
    ],
  };
}

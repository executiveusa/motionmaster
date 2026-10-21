/**
 * Motion Master — generated composition "launch-title"
 *
 * Template : launch-title
 * Style    : calm
 * Duration : 15s (450 frames @ 30fps)
 *
 * The tokens below are copied verbatim from
 * plugins/motion-master/assets/motion-tokens.json — the single source of truth.
 * Edit that file, re-run the generator, and the composition follows.
 *
 * Render:
 *   npx remotion render src/index.tsx launch-title out/launch-title.mp4
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
const TOKENS = {
  "palette": {
    "canvas": "#F4F4F2",
    "surface": "#FFFFFF",
    "ink": "#111113",
    "mutedInk": "#6B6B70",
    "hairline": "#DDDEDA",
    "accent": "#FF4A1C",
    "accentDark": "#D63A12",
    "playerZone": "#0E0E10"
  },
  "typography": {
    "families": {
      "sans": "IBM Plex Sans",
      "mono": "IBM Plex Mono"
    },
    "weights": {
      "sans": [
        400,
        500,
        600,
        700
      ],
      "mono": [
        400,
        500
      ]
    },
    "display": {
      "family": "sans",
      "size": "clamp(48px, 7.2vw, 104px)",
      "weight": 700,
      "tracking": "-0.03em",
      "lineHeight": 0.95
    },
    "h2": {
      "family": "sans",
      "size": "clamp(32px, 4vw, 52px)",
      "weight": 600,
      "tracking": "-0.02em",
      "lineHeight": 1.05
    },
    "body": {
      "family": "sans",
      "size": "17px",
      "lineHeight": 1.6,
      "tracking": "0em",
      "mobileSize": "16px"
    },
    "label": {
      "family": "mono",
      "size": "12px",
      "weight": 500,
      "transform": "uppercase",
      "tracking": "0.12em"
    },
    "meta": {
      "family": "mono",
      "size": "13px",
      "weight": 400
    }
  },
  "easing": {
    "entrance": {
      "role": "ease-out",
      "name": "emphasized",
      "cubicBezier": [
        0.05,
        0.7,
        0.1,
        1
      ],
      "note": "Anything entering the frame decelerates. This is the Motion Master entrance curve."
    },
    "exit": {
      "role": "ease-in",
      "name": "accelerate",
      "cubicBezier": [
        0.3,
        0,
        1,
        1
      ],
      "note": "Anything leaving the frame accelerates away. Exit is 65-75% of the matching entrance duration."
    },
    "onScreen": {
      "role": "ease-in-out",
      "name": "standard",
      "cubicBezier": [
        0.2,
        0,
        0,
        1
      ],
      "note": "Anything that stays on screen and changes state uses the symmetric curve."
    },
    "loop": {
      "role": "sine",
      "name": "sine",
      "cubicBezier": [
        0.37,
        0,
        0.63,
        1
      ],
      "note": "Ambient and continuous loops."
    },
    "linear": {
      "role": "linear",
      "name": "linear",
      "cubicBezier": [
        0,
        0,
        1,
        1
      ],
      "note": "Progress bars, counters, anything the viewer must read as a measurement."
    }
  },
  "duration": {
    "microFeedback": 100,
    "tooltip": 100,
    "button": 150,
    "icon": 200,
    "card": 275,
    "modal": 350,
    "pageTransition": 500,
    "dramaticReveal": 900,
    "ambient": 6000
  },
  "spring": {
    "standard": {
      "stiffness": 260,
      "damping": 22,
      "mass": 1
    },
    "stiff": {
      "stiffness": 400,
      "damping": 28,
      "mass": 1
    },
    "gentle": {
      "stiffness": 120,
      "damping": 22,
      "mass": 1
    },
    "noBounce": {
      "stiffness": 170,
      "damping": 26,
      "mass": 1,
      "note": "Critical damping for premium work: no overshoot, no bounce."
    }
  },
  "stagger": {
    "budgetMs": 500,
    "rule": "Total stagger MUST stay under 500ms. When a group is too large, shorten the interval rather than exceed the budget.",
    "patterns": {
      "microCascade": {
        "intervalMs": 30,
        "budgetMs": 200
      },
      "standard": {
        "intervalMs": 80,
        "budgetMs": 400
      },
      "dramatic": {
        "intervalMs": 140,
        "budgetMs": 500
      },
      "wave": {
        "intervalMs": 45,
        "budgetMs": 500
      }
    }
  }
};

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

const BEATS: Beat[] = [
  {
    "index": 1,
    "key": "establish",
    "label": "Establish",
    "role": "setup",
    "easingRole": "onScreen",
    "cubicBezier": [
      0.2,
      0,
      0,
      1
    ],
    "inFrame": 0,
    "outFrame": 147,
    "elements": [
      {
        "name": "backdrop",
        "type": "shape"
      }
    ],
    "staggerIntervalMs": 45
  },
  {
    "index": 2,
    "key": "reveal",
    "label": "Wordmark reveal",
    "role": "reveal",
    "easingRole": "entrance",
    "cubicBezier": [
      0.05,
      0.7,
      0.1,
      1
    ],
    "inFrame": 147,
    "outFrame": 297,
    "elements": [
      {
        "name": "wordmark",
        "type": "text"
      }
    ],
    "staggerIntervalMs": 45
  },
  {
    "index": 3,
    "key": "hold",
    "label": "Hold",
    "role": "hold",
    "easingRole": "onScreen",
    "cubicBezier": [
      0.2,
      0,
      0,
      1
    ],
    "inFrame": 297,
    "outFrame": 372,
    "elements": [
      {
        "name": "wordmark",
        "type": "text"
      },
      {
        "name": "tagline",
        "type": "text"
      }
    ],
    "staggerIntervalMs": 45
  },
  {
    "index": 4,
    "key": "exit",
    "label": "Exit",
    "role": "exit",
    "easingRole": "exit",
    "cubicBezier": [
      0.3,
      0,
      1,
      1
    ],
    "inFrame": 372,
    "outFrame": 450,
    "elements": [
      {
        "name": "wordmark",
        "type": "text"
      },
      {
        "name": "tagline",
        "type": "text"
      }
    ],
    "staggerIntervalMs": 45
  }
];

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
          transform: `translateY(${offsetY}px)`,
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
                  transform: `scaleX(${elementProgress})`,
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
                transform: `translateY(${(1 - elementProgress) * 16}px)`,
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
      id="launch-title"
      component={MotionMasterScene}
      durationInFrames={450}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};

registerRoot(MotionMasterRoot);

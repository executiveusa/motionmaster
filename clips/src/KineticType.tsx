import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLOR, MOTION, TYPE, timecode } from "./tokens";

/**
 * CLIP 2 — "Kinetic type" · 0:09 · gsap-style timeline in Remotion
 * Six words arrive one at a time, then exit in reverse.
 * Stagger 90ms — inside the standard 50-100ms band, total stagger well under 500ms.
 */
const LINES = [
  { text: "DESCRIBE", accent: false },
  { text: "IT.", accent: true },
  { text: "WATCH", accent: false },
  { text: "IT.", accent: true },
  { text: "OWN", accent: false },
  { text: "IT.", accent: true },
];

const STAGGER = 3; // frames @30fps = 90ms
const WORD_DUR = 14; // frames @30fps = 466ms

export const KineticType: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const exitFrom = durationInFrames - 26;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLOR.player,
        fontFamily: TYPE.sans,
        justifyContent: "center",
        padding: "0 170px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {LINES.map((line, i) => {
          const from = 10 + i * STAGGER;
          const inP = interpolate(frame, [from, from + WORD_DUR], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(...MOTION.easeEnter),
          });

          // Exit in reverse order, ease-in.
          const exitFromForWord = exitFrom + (LINES.length - 1 - i) * 2;
          const outP = interpolate(
            frame,
            [exitFromForWord, exitFromForWord + 16],
            [0, 1],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(...MOTION.easeExit),
            },
          );

          const y = (1 - inP) * 70 - outP * 60;
          const opacity = inP * (1 - outP);

          return (
            <div key={i} style={{ overflow: "hidden", height: 138 }}>
              <span
                style={{
                  display: "inline-block",
                  fontSize: 132,
                  fontWeight: 700,
                  letterSpacing: -5,
                  lineHeight: 1.05,
                  color: line.accent ? COLOR.accent : COLOR.canvas,
                  transform: `translateY(${y}px)`,
                  opacity,
                }}
              >
                {line.text}
              </span>
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: "absolute",
          right: 170,
          bottom: 56,
          fontFamily: TYPE.mono,
          fontSize: 18,
          color: "#55555C",
          letterSpacing: 2,
        }}
      >
        {timecode(frame, fps)}
      </div>
      <div
        style={{
          position: "absolute",
          left: 170,
          bottom: 56,
          fontFamily: TYPE.mono,
          fontSize: 18,
          color: "#55555C",
          letterSpacing: 2,
        }}
      >
        TIMELINE · CUBIC-BEZIER(0.05, 0.7, 0.1, 1)
      </div>
    </AbsoluteFill>
  );
};

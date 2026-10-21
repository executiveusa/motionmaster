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
 * CLIP 3 — "Product loop" · 0:21 · remotion + ffmpeg
 * Three beats that mirror the real pipeline: storyboard → choreograph → code → encode,
 * then the finished frame, then the title card.
 *
 * Every number on screen is a fact about THIS render (duration, resolution, frame rate)
 * or the real stage names. No invented business statistics.
 */

const STAGES = [
  { key: "storyboard", label: "STORYBOARD" },
  { key: "choreograph", label: "CHOREOGRAPH" },
  { key: "code", label: "CODE" },
  { key: "encode", label: "ENCODE" },
];

const BEAT1_END = 240; // 8s
const BEAT2_END = 480; // 16s

export const ProductLoop: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const exit = interpolate(frame, [durationInFrames - 28, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...MOTION.easeExit),
  });

  const stageStart = 20;
  const stageGap = 3; // 90ms stagger
  const stageDur = 18; // 600ms

  const bars = STAGES.map((_, i) => {
    const from = stageStart + i * stageGap;
    const fill = interpolate(frame, [from, from + stageDur], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(...MOTION.easeEnter),
    });
    const rowIn = interpolate(frame, [from, from + 10], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(...MOTION.easeEnter),
    });
    return { fill, rowIn, key: STAGES[i].key, label: STAGES[i].label };
  });

  // Beat 2 — the finished frame.
  const doneFrom = BEAT1_END + 10;
  const done = interpolate(frame, [doneFrom, doneFrom + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...MOTION.easeEnter),
  });
  const doneScale = interpolate(frame, [doneFrom, doneFrom + 20], [0.96, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...MOTION.easeEnter),
    output: "perceptual-scale",
  });

  // Beat 3 — title card.
  const titleFrom = BEAT2_END + 10;
  const title = interpolate(frame, [titleFrom, titleFrom + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...MOTION.easeEnter),
  });

  const beat = frame < BEAT1_END ? 1 : frame < BEAT2_END ? 2 : 3;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLOR.canvas,
        fontFamily: TYPE.sans,
        justifyContent: "center",
        padding: "0 170px",
        opacity: 1 - exit,
        transform: `translateY(${exit * -18}px)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 170,
          top: 120,
          fontFamily: TYPE.mono,
          fontSize: 18,
          letterSpacing: 2,
          color: COLOR.muted,
        }}
      >
        {timecode(frame, fps)} · 1280×720 · 30FPS
      </div>

      {beat === 1 && (
        <div style={{ maxWidth: 1180 }}>
          <div
            style={{
              fontFamily: TYPE.mono,
              fontSize: 20,
              letterSpacing: 5,
              color: COLOR.muted,
              textTransform: "uppercase",
              marginBottom: 54,
            }}
          >
            One brief, four stages
          </div>
          {bars.map((b) => (
            <div
              key={b.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 34,
                marginBottom: 34,
                opacity: b.rowIn,
                transform: `translateX(${(1 - b.rowIn) * -24}px)`,
              }}
            >
              <div
                style={{
                  width: 250,
                  fontFamily: TYPE.mono,
                  fontSize: 22,
                  letterSpacing: 3,
                  color: COLOR.ink,
                }}
              >
                {b.label}
              </div>
              <div
                style={{
                  flex: 1,
                  height: 12,
                  backgroundColor: COLOR.hairline,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundColor: COLOR.accent,
                    transform: `scaleX(${b.fill})`,
                    transformOrigin: "left center",
                  }}
                />
              </div>
              <div
                style={{
                  width: 96,
                  textAlign: "right",
                  fontFamily: TYPE.mono,
                  fontSize: 20,
                  color: COLOR.muted,
                }}
              >
                {b.fill >= 1 ? "done" : `${Math.round(b.fill * 100)}%`}
              </div>
            </div>
          ))}
        </div>
      )}

      {beat === 2 && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 90,
            opacity: done,
            transform: `scale(${doneScale})`,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 132,
                fontWeight: 700,
                letterSpacing: -5,
                color: COLOR.ink,
                lineHeight: 1,
              }}
            >
              Four stages.
            </div>
            <div
              style={{
                fontSize: 132,
                fontWeight: 700,
                letterSpacing: -5,
                color: COLOR.accent,
                lineHeight: 1,
              }}
            >
              One file.
            </div>
          </div>
          <div style={{ paddingTop: 26, maxWidth: 620 }}>
            <div
              style={{
                fontFamily: TYPE.mono,
                fontSize: 22,
                letterSpacing: 2,
                color: COLOR.muted,
                lineHeight: 2.1,
              }}
            >
              MP4 · H.264 · 1280×720
              <br />
              30 FPS · 00:00:21:00
              <br />
              SOURCE PROJECT INCLUDED
            </div>
          </div>
        </div>
      )}

      {beat === 3 && (
        <div style={{ opacity: title }}>
          <div
            style={{
              fontSize: 150,
              fontWeight: 700,
              letterSpacing: -6,
              lineHeight: 0.98,
              color: COLOR.ink,
            }}
          >
            One prompt.
          </div>
          <div
            style={{
              fontSize: 150,
              fontWeight: 700,
              letterSpacing: -6,
              lineHeight: 0.98,
              color: COLOR.accent,
            }}
          >
            One file.
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

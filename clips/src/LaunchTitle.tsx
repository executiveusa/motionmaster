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
 * CLIP 1 — "Launch title" · 0:14 · remotion
 * A wordmark reveals, holds for two seconds, then a calm exit.
 * Entrance ease-out, exit ease-in. Hold is the point.
 */
export const LaunchTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const enter = (from: number, durFrames: number) =>
    interpolate(frame, [from, from + durFrames], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(...MOTION.easeEnter),
    });

  // Exit: 65-75% of entrance duration, ease-in.
  const exitFrom = durationInFrames - 30;
  const exit = interpolate(frame, [exitFrom, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...MOTION.easeExit),
  });

  const eyebrow = enter(12, 18);
  const wordmark = enter(26, 22);
  const rule = interpolate(frame, [48, 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...MOTION.easeScreen),
  });

  const contentOpacity = 1 - exit;
  const contentY = exit * -22;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLOR.canvas,
        fontFamily: TYPE.sans,
        justifyContent: "center",
        padding: "0 160px",
      }}
    >
      {/* ground rule: a single hairline, the contact-sheet motif */}
      <div
        style={{
          position: "absolute",
          left: 160,
          right: 160,
          top: 150,
          height: 1,
          backgroundColor: COLOR.hairline,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 160,
          right: 160,
          bottom: 150,
          height: 1,
          backgroundColor: COLOR.hairline,
        }}
      />

      <div style={{ opacity: contentOpacity, transform: `translateY(${contentY}px)` }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontFamily: TYPE.mono,
            fontSize: 20,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: COLOR.muted,
            opacity: eyebrow,
            transform: `translateY(${(1 - eyebrow) * 14}px)`,
            marginBottom: 34,
          }}
        >
          <span
            style={{
              width: 40,
              height: 3,
              backgroundColor: COLOR.accent,
              display: "inline-block",
            }}
          />
          Motion Master
        </div>

        <div
          style={{
            fontSize: 186,
            fontWeight: 700,
            letterSpacing: -7,
            lineHeight: 0.92,
            color: COLOR.ink,
            overflow: "hidden",
          }}
        >
          <span
            style={{
              display: "inline-block",
              transform: `translateY(${(1 - wordmark) * 100}%)`,
              opacity: wordmark,
            }}
          >
            Make the film
          </span>
        </div>

        <div
          style={{
            marginTop: 40,
            height: 4,
            width: 520,
            backgroundColor: COLOR.accent,
            transform: `scaleX(${rule})`,
            transformOrigin: "left center",
          }}
        />
        <div
          style={{
            marginTop: 26,
            fontFamily: TYPE.mono,
            fontSize: 24,
            color: COLOR.muted,
            letterSpacing: 1,
            opacity: rule,
          }}
        >
          storyboard · choreograph · render
        </div>
      </div>

      {/* frame-accurate label — the lab-report motif, present in every clip */}
      <div
        style={{
          position: "absolute",
          right: 160,
          bottom: 60,
          fontFamily: TYPE.mono,
          fontSize: 18,
          color: COLOR.muted,
          letterSpacing: 2,
        }}
      >
        {timecode(frame, fps)} · 1280×720
      </div>
      <div
        style={{
          position: "absolute",
          left: 160,
          bottom: 60,
          fontFamily: TYPE.mono,
          fontSize: 18,
          color: COLOR.muted,
          letterSpacing: 2,
        }}
      >
        RENDERED BY MOTION MASTER
      </div>
    </AbsoluteFill>
  );
};

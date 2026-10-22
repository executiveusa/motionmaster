import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLOR, MOTION, TYPE } from "./tokens";

/**
 * CLIP 4 — "Footage + title" · 0:16 · remotion + montage bridge
 *
 * Demonstrates the exact cut/overlay model the Montage bridge speaks:
 *   cut 1 : source, in 0.0s, out 3.0s            (no overlay)
 *   cut 2 : source, in 3.0s, out 14.0s           (hero_title + section_title overlay)
 *   tail  : fade out 14.0s -> 16.0s
 *
 * The source is public/source.mp4, rendered by the SourceClip composition.
 */
export const FootageTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const CUT1_END = 90; // 3.0s
  const CUT2_END = 420; // 14.0s
  const TOTAL = 480; // 16.0s

  const titleIn = interpolate(frame, [CUT1_END, CUT1_END + 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...MOTION.easeEnter),
  });
  const titleY = (1 - titleIn) * 46;

  const labelIn = interpolate(frame, [CUT1_END + 14, CUT1_END + 32], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...MOTION.easeEnter),
  });

  const fade = interpolate(frame, [CUT2_END, TOTAL], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...MOTION.easeExit),
  });

  const src = staticFile("source.mp4");

  return (
    <AbsoluteFill style={{ backgroundColor: "#0E0E10" }}>
      {frame < CUT1_END ? (
        // cut 1 — source in 0.0s, out 3.0s
        <OffthreadVideo src={src} startFrom={0} endAt={CUT1_END} />
      ) : (
        // cut 2 — source in 3.0s, out 14.0s
        <OffthreadVideo src={src} startFrom={CUT1_END} endAt={CUT2_END} />
      )}

      <AbsoluteFill style={{ opacity: fade }}>
        {frame >= CUT1_END && (
          <>
            {/* overlay: section_title */}
            <div
              style={{
                position: "absolute",
                left: 120,
                top: 120,
                display: "flex",
                alignItems: "center",
                gap: 14,
                opacity: labelIn,
                transform: `translateY(${(1 - labelIn) * 12}px)`,
              }}
            >
              <span
                style={{
                  width: 34,
                  height: 3,
                  backgroundColor: COLOR.accent,
                  display: "inline-block",
                }}
              />
            </div>

            {/* overlay: hero_title */}
            <div
              style={{
                position: "absolute",
                left: 120,
                bottom: 150,
                opacity: titleIn,
                transform: `translateY(${titleY}px)`,
              }}
            >
              <div
                style={{
                  fontSize: 122,
                  fontWeight: 700,
                  letterSpacing: -5,
                  lineHeight: 1,
                  color: COLOR.canvas,
                }}
              >
                Cut it. Title it.
              </div>
            </div>
          </>
        )}

      </AbsoluteFill>
    </AbsoluteFill>
  );
};

import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";


/**
 * SOURCE CLIP — a stand-in for real footage. Rendered to public/source.mp4, then cut and
 * overlaid by FootageTitle using the same cut/overlay model the Montage bridge speaks.
 *
 * It is an abstract graphic shot, not a photograph. It exists so the compositing path
 * (cut in/out points + a motion-graphics overlay on top) can be demonstrated honestly.
 */
export const SourceClip: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = frame / durationInFrames;

  // A slow diagonal band travelling across the frame.
  const bandX = -40 + t * 120;
  const bandY = 120 - t * 40;

  return (
    <AbsoluteFill style={{ backgroundColor: "#141418" }}>
      {/* faint horizontal rule grid */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: i * 140 + ((frame * 0.2) % 140),
            height: 1,
            backgroundColor: "rgba(244,244,242,0.06)",
          }}
        />
      ))}

      {/* travelling band */}
      <div
        style={{
          position: "absolute",
          left: `${bandX}%`,
          top: `${bandY}%`,
          width: 1000,
          height: 1000,
          transform: "rotate(-28deg)",
          background:
            "radial-gradient(closest-side, rgba(244,244,242,0.20) 0%, rgba(244,244,242,0.07) 42%, rgba(244,244,242,0) 78%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: `${bandX - 52}%`,
          top: `${bandY + 34}%`,
          width: 620,
          height: 620,
          transform: "rotate(-28deg)",
          background:
            "radial-gradient(closest-side, rgba(255,74,28,0.26) 0%, rgba(255,74,28,0.07) 46%, rgba(255,74,28,0) 80%)",
        }}
      />

      {/* vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 34%, rgba(0,0,0,0.62) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

import React from "react";
import { COLOR, TYPE } from "../tokens";

/**
 * Paper.
 *
 * The collage look comes from cut-out shapes with hand-torn edges, not from a
 * texture alone. A torn edge is a polyline with a little noise on it — the
 * same trick a paper-tearing machine plays on straight edges.
 *
 * The palette is ours: ink paper, canvas type, and the accent used for one
 * thing at a time. A colour block behind a headline is the signature of the
 * style, and ink on canvas does that job without spending the accent.
 */

const rand = (seed: number): number => {
  // A tiny deterministic noise, so a torn edge is the same edge every render.
  const x = Math.sin(seed * 127.1) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * A rectangle with a torn edge.
 *
 * `roughness` is how far the tear wanders from the straight line, in pixels.
 */
export const tornRect = (
  width: number,
  height: number,
  seed = 1,
  roughness = 7,
): string => {
  const step = 26;
  const top: string[] = [];
  for (let x = 0; x <= width; x += step) {
    const wobble = (rand(seed * 1000 + x) - 0.5) * roughness;
    top.push(`${x} ${(wobble + roughness / 2).toFixed(1)}`);
  }
  const bottom: string[] = [];
  for (let x = width; x >= 0; x -= step) {
    const wobble = (rand(seed * 2000 + x) - 0.5) * roughness;
    bottom.push(`${x} ${(height - wobble - roughness / 2).toFixed(1)}`);
  }
  return `M0 ${top[0].split(" ")[1]} L${top.join(" L")} L${bottom.join(" L")} Z`;
};

export interface PaperStripProps {
  width: number;
  height: number;
  seed?: number;
  roughness?: number;
  color?: string;
  /** The rotation, in degrees. */
  rotate?: number;
  /** What is printed on the paper. */
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

/**
 * A torn strip of paper, with a shadow under it, and whatever is printed
 * on it. The type is positioned over the strip by the caller, so the cut
 * and the copy can disagree by a few pixels — which is what a hand-cut
 * collage looks like.
 */
export const PaperStrip: React.FC<PaperStripProps> = ({
  width,
  height,
  seed = 1,
  roughness = 7,
  color = COLOR.ink,
  rotate = 0,
  children,
  style,
}) => (
  <div style={{ position: "relative", width, height, ...style }}>
    <svg
      width={width + 40}
      height={height + 60}
      viewBox={`0 0 ${width + 40} ${height + 60}`}
      style={{ position: "absolute", inset: "-30px -20px auto -20px", overflow: "visible" }}
      aria-hidden
    >
      <g transform={`rotate(${rotate} ${width / 2 + 20} ${height / 2 + 30})`}>
        <path
          d={tornRect(width, height, seed, roughness)}
          transform="translate(20 30)"
          fill="#000000"
          opacity={0.16}
          filter="blur(6px)"
        />
        <path
          d={tornRect(width, height, seed, roughness)}
          transform="translate(20 30)"
          fill={color}
        />
      </g>
    </svg>
    <div style={{ position: "absolute", inset: 0 }}>{children}</div>
  </div>
);

export interface HeadlineProps {
  children: React.ReactNode;
  size?: number;
  color?: string;
  /** The letter-spacing, in pixels. */
  tracking?: number;
  align?: "left" | "center";
  style?: React.CSSProperties;
}

/**
 * The cut-out headline.
 *
 * Tight, heavy, all caps, and set in the brand sans. The tracking is
 * negative because display type wants to be set tight — this is the one
 * place the site would otherwise look like a document.
 */
export const Headline: React.FC<HeadlineProps> = ({
  children,
  size = 132,
  color = COLOR.canvas,
  tracking = -5,
  align = "left",
  style,
}) => (
  <div
    style={{
      fontFamily: TYPE.sans,
      fontSize: size,
      fontWeight: 700,
      letterSpacing: tracking,
      lineHeight: 1.02,
      color,
      textAlign: align,
      textTransform: "uppercase",
      ...style,
    }}
  >
    {children}
  </div>
);

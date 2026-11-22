import React, { useId } from "react";
import { AbsoluteFill } from "remotion";

/**
 * The analog layer.
 *
 * Two separate jobs, and keeping them separate is the whole trick:
 *
 *   1. **Posterise** the graphic layer — quantise the colour so the smooth
 *      digital gradient becomes a handful of flat steps. This is applied to
 *      the *graphics*, never to the base: the reference technique stutters
 *      the overlay and leaves the base smooth, because stuttering everything
 *      reads as dropped frames rather than as style.
 *
 *   2. **Texture** the whole frame — paper grain, a halftone dot screen, a
 *      vignette and a hot edge. This is what makes a clean vector frame feel
 *      like something printed and shot, rather than rendered.
 *
 * Both are filters, not assets, so they cost nothing to ship and nothing to
 * keep licensed.
 */

/**
 * The grain tile.
 *
 * One 220×220 patch of fractal noise, rasterised once by the browser and then
 * repeated. Running feTurbulence across a whole 1920×1080 frame every frame
 * would cost minutes of render time; a tile costs milliseconds.
 */
const GRAIN_TILE = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220"><filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="3" stitchTiles="stitch" seed="11"/><feColorMatrix type="saturate" values="0"/></filter><rect width="220" height="220" filter="url(%23g)" opacity="0.5"/></svg>`;

export interface PosterizeProps {
  children: React.ReactNode;
  /**
   * How many steps each colour channel gets. Six is the useful range: four
   * is flat enough to lose the accent, twelve is smooth enough to stop
   * reading as print.
   */
  levels?: number;
  style?: React.CSSProperties;
}

/**
 * Quantise the colour of everything inside it.
 *
 * The filter lives in one hidden SVG at the top of the document; a CSS
 * `filter` on a wrapper then applies it to that wrapper's whole subtree.
 */
export const Posterize: React.FC<PosterizeProps> = ({
  children,
  levels = 6,
  style,
}) => {
  const id = useId().replace(/:/g, "");
  const table = Array.from({ length: levels }, (_, i) => i / (levels - 1));
  return (
    <>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
        <defs>
          <filter id={`posterize-${id}`} colorInterpolationFilters="sRGB">
            <feComponentTransfer>
              <feFuncR type="discrete" tableValues={table.join(" ")} />
              <feFuncG type="discrete" tableValues={table.join(" ")} />
              <feFuncB type="discrete" tableValues={table.join(" ")} />
            </feComponentTransfer>
          </filter>
        </defs>
      </svg>
      <AbsoluteFill
        style={{
          filter: `url(#posterize-${id})`,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          ...style,
        }}
      >
        {children}
      </AbsoluteFill>
    </>
  );
};

export interface AnalogTextureProps {
  /** How strong the paper grain is, 0 to 1. */
  grain?: number;
  /** How strong the halftone dot screen is, 0 to 1. */
  halftone?: number;
  /** How strong the vignette is, 0 to 1. */
  vignette?: number;
  /** The colour the halftone dots take. */
  ink?: string;
  /** The frame's background, used to decide how the grain multiplies. */
  canvas?: string;
  style?: React.CSSProperties;
}

/**
 * The paper.
 *
 * Grain, a halftone screen and a vignette, over the top of everything.
 * All three are cheap: a repeating background, a repeating gradient and a
 * radial gradient.
 */
export const AnalogTexture: React.FC<AnalogTextureProps> = ({
  grain = 0.32,
  halftone = 0.1,
  vignette = 0.55,
  ink = "#111113",
  canvas = "#F4F4F2",
  style,
}) => (
  <AbsoluteFill
    style={{ pointerEvents: "none", mixBlendMode: "multiply", ...style }}
    aria-hidden
  >
    {/* paper grain */}
    {grain > 0 ? (
      <AbsoluteFill
        style={{
          backgroundImage: `url("${GRAIN_TILE}")`,
          backgroundRepeat: "repeat",
          backgroundSize: "220px 220px",
          opacity: grain,
        }}
      />
    ) : null}

    {/* halftone dot screen — a coarse print screen, not a moire */}
    {halftone > 0 ? (
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(${ink} 1.15px, transparent 1.2px)`,
          backgroundSize: "6px 6px",
          opacity: halftone * 0.55,
        }}
      />
    ) : null}

    {/* vignette — the frame is lit from the middle */}
    {vignette > 0 ? (
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 78% 74% at 50% 46%, ${canvas}00 42%, ${ink}2e 100%)`,
          opacity: vignette * 0.5,
        }}
      />
    ) : null}
  </AbsoluteFill>
);

/**
 * MOTION MASTER — design tokens
 * Mirrors docs/03-DESIGN-LOCK.md. Single source of truth for every clip.
 *
 * Token roles are binding:
 *   - accent is for emphasis and the active state ONLY. Never a surface, never a fill.
 *   - player (#0E0E10) is the only dark surface, and it is a real frame.
 *   - There is no violet in this system. There is no gradient in UI chrome.
 */

export const COLOR = {
  canvas: "#F4F4F2",
  surface: "#FFFFFF",
  ink: "#111113",
  muted: "#6B6B70",
  hairline: "#DDDEDA",
  accent: "#FF4A1C",
  accentDark: "#D63A12",
  player: "#0E0E10",
} as const;

/** Motion doctrine — LottieFiles motion-design skill, timing & easing tables. */
export const MOTION = {
  /** Entrance = ease-out. */
  easeEnter: [0.05, 0.7, 0.1, 1] as const,
  /** Exit = ease-in. */
  easeExit: [0.3, 0, 1, 1] as const,
  /** On-screen = ease-in-out. */
  easeScreen: [0.2, 0, 0, 1] as const,
  /** Premium personality: standard entrance 500ms, dramatic reveal 600-1200ms. */
  entranceMs: 500,
  dramaticMs: 700,
  /** Standard stagger 50-100ms; total stagger MUST stay under 500ms. */
  staggerMs: 90,
} as const;

// IBM Plex Sans ships as a variable font (one request).
// IBM Plex Mono does not — it is static, so ask for the two weights we use.
import { loadVariableFont } from "@remotion/google-fonts/IBMPlexSans";
import { loadFont as loadStaticFont } from "@remotion/google-fonts/IBMPlexMono";

const sans = loadVariableFont("normal", { subsets: ["latin"] });
const mono = loadStaticFont("normal", {
  weights: ["400", "500"],
  subsets: ["latin"],
});

export const TYPE = {
  sans: `${sans.fontFamily}, system-ui, sans-serif`,
  mono: `${mono.fontFamily}, ui-monospace, monospace`,
} as const;

/** Frames -> "00:00:00:00" style timecode, used as a frame-accurate label. */
export const timecode = (frame: number, fps = 30): string => {
  const total = Math.max(0, Math.floor(frame));
  const ff = total % fps;
  const ss = Math.floor(total / fps) % 60;
  const mm = Math.floor(total / (fps * 60));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(mm)}:${pad(ss)}:${pad(ff)}`;
};

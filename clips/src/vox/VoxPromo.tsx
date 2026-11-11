import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLOR, TYPE } from "../tokens";
import { AnalogTexture, Posterize } from "./AnalogTexture";
import { Headline, PaperStrip } from "./Paper";
import { WordCaptions } from "./WordCaptions";
import { VectorMap, cameraAt, project, WORLD_CAMERA } from "./VectorMap";
import { BEATS, CALLOUT, CAPTION_LINES, CUES, ROUTE } from "./script";
import { boil, stutterFrame, stutterProgress } from "./stutter";

/**
 * THE FILM — "Motion Master, in twenty seconds".
 *
 * Twenty seconds, 24fps, in the Vox editorial style: cut-out type on torn
 * paper, a code panel, a strip of shot cards, a vector map with a route and a
 * callout, and the close.
 *
 * The mechanics, and where they came from:
 *
 *   - The **12fps stutter** on the graphic layer: the frame is quantised
 *     before any value is computed, so the type and the map step while the
 *     base stays smooth. From the map-animation skill (iart-ai, MIT).
 *   - The **boil**: the paper breathes on a slow sine, so it never sits
 *     perfectly still. From the vox-director keyframe engine (MIT).
 *   - The **word-synced captions**: each word lights up on its own clock.
 *   - The **posterised colour** and the **paper grain**: the analog layer.
 */

/**
 * The opacity of a beat at a given moment.
 *
 * Each beat owns the screen for a window and fades in and out of it, so only
 * one thing is ever on screen. Without this the whole film renders on top of
 * itself — the map paints over the opening.
 */
const windowOpacity = (
  gf: number,
  fps: number,
  from: number,
  to: number,
  fade = 0.4,
): number => {
  const inP = interpolate(gf, [(from - fade) * fps, from * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const outP = interpolate(gf, [to * fps, (to + fade) * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return inP * (1 - outP);
};

const CODE_LINES = [
  "const plan = planShots(cards, brief);",
  "const film = build(plan, { fps: 24 });",
  "await render(film, out);",
];

/** The shot cards, as a strip. The roles are the vocabulary's own. */
const CARD_ROLES = ["opening", "typography", "camera", "data", "ui-entrance", "outro"];

export const VoxPromo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;

  // The graphic layer reads the quantised frame; the base reads the real one.
  const gf = stutterFrame(frame, fps, 12);

  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.canvas, fontFamily: TYPE.sans }}>
      {/* ───────────────────────── the base: the paper ───────────────────────── */}
      <AbsoluteFill style={{ backgroundColor: COLOR.canvas }} />

      {/* ───────────────────────── beat 1 — the hook ─────────────────────────── */}
      <Hook gf={gf} fps={fps} />

      {/* ───────────────────────── beat 2 — the code ─────────────────────────── */}
      <CodePanel gf={gf} fps={fps} />

      {/* ───────────────────────── beat 3 — the shot cards ──────────────────── */}
      <ShotCards gf={gf} fps={fps} />

      {/* ───────────────────────── beat 4 — the map ──────────────────────────── */}
      <MapBeat gf={gf} fps={fps} />

      {/* ───────────────────────── beat 5 — the close ────────────────────────── */}
      <Close gf={gf} fps={fps} />

      {/* ───────────────────────── the words, and the sound ──────────────────── */}
      <WordCaptions lines={CAPTION_LINES} time={time} />

      {CUES.map((cue) => (
        <Sequence
          key={`${cue.file}-${cue.at}`}
          from={Math.round(cue.at * fps)}
          durationInFrames={Math.round(2 * fps)}
          name={`sfx ${cue.file}`}
        >
          <Audio src={staticFile(cue.file)} volume={cue.volume} />
        </Sequence>
      ))}

      {/* The analog layer sits over everything, un-postprocessed. */}
      <AnalogTexture grain={0.34} halftone={0.11} vignette={0.6} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ hook */

const Hook: React.FC<{ gf: number; fps: number }> = ({ gf, fps }) => {
  const beat = BEATS[0];
  const inP = stutterProgress(gf, fps, beat.from * fps, (beat.from + 0.5) * fps);
  const opacity = windowOpacity(gf, fps, beat.from, 3.9, 0.35);
  const { scale } = boil(gf / fps, { pulse: 0.004 });
  if (opacity <= 0.001) return null;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: "center" }}>
      <Posterize levels={6}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 30,
            alignItems: "flex-start",
            transform: `translateX(${(1 - inP) * -120}px) scale(${scale})`,
          }}
        >
          <PaperStrip width={790} height={248} seed={7} rotate={-1.4} color={COLOR.ink}>
            <div style={{ padding: "54px 62px 60px" }}>
              <Headline size={136} color={COLOR.canvas}>
                A FILM,
              </Headline>
            </div>
          </PaperStrip>
          <div style={{ marginLeft: 96 }}>
            <Headline size={112} color={COLOR.ink}>
              ONE SENTENCE.
            </Headline>
          </div>
        </div>
      </Posterize>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ code */

const CodePanel: React.FC<{ gf: number; fps: number }> = ({ gf, fps }) => {
  const beat = BEATS[1];
  const inP = stutterProgress(gf, fps, beat.from * fps, (beat.from + 0.55) * fps);
  const opacity = windowOpacity(gf, fps, beat.from, 8.1, 0.35);
  const panel = interpolate(gf, [beat.from * fps, (beat.from + 0.55) * fps], [60, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.05, 0.7, 0.1, 1),
  });

  if (opacity <= 0.001) return null;

  return (
    <AbsoluteFill style={{ opacity }}>
      <div
        style={{
          position: "absolute",
          left: 150,
          top: 250,
          width: 1620,
          backgroundColor: COLOR.player,
          borderRadius: 18,
          padding: "54px 62px",
          transform: `translateY(${panel}px)`,
          boxShadow: "0 40px 90px rgba(17,17,19,0.22)",
          opacity: inP,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 34,
            alignItems: "center",
          }}
        >
          <div style={{ width: 16, height: 16, borderRadius: 8, background: COLOR.accent }} />
          <div
            style={{
              fontFamily: TYPE.mono,
              fontSize: 26,
              color: COLOR.muted,
              letterSpacing: 1,
            }}
          >
            motion-master / compose.tsx
          </div>
        </div>
        {CODE_LINES.map((line, i) => {
          // The code types in, one line at a time, on the stepped clock.
          const lineFrom = (beat.from + 0.35 + i * 0.55) * fps;
          const p = stutterProgress(gf, fps, lineFrom, lineFrom + 0.4 * fps);
          const shown = line.slice(0, Math.ceil(line.length * p));
          return (
            <div
              key={line}
              style={{
                fontFamily: TYPE.mono,
                fontSize: 38,
                lineHeight: 1.65,
                color: COLOR.canvas,
                opacity: p > 0 ? 1 : 0,
                whiteSpace: "pre",
              }}
            >
              <span style={{ color: COLOR.muted }}>{"  "}</span>
              {shown}
              {p > 0 && p < 1 ? <span style={{ color: COLOR.accent }}>▌</span> : null}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------- shot cards */

const ShotCards: React.FC<{ gf: number; fps: number }> = ({ gf, fps }) => {
  const beat = BEATS[2];
  const inP = stutterProgress(gf, fps, beat.from * fps, (beat.from + 0.5) * fps);
  const opacity = windowOpacity(gf, fps, beat.from, 10.9, 0.35);
  if (opacity <= 0.001) return null;

  return (
    <AbsoluteFill style={{ opacity }}>
      <Posterize levels={6}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 52,
            transform: `translateY(${(1 - inP) * 90}px)`,
          }}
        >
          <Headline size={116} color={COLOR.ink} align="center">
            124 SHOTS.
          </Headline>
          <div
          style={{
            display: "flex",
            gap: 22,
          }}
        >
          {CARD_ROLES.map((role, i) => {
            // Each card arrives on its own stepped beat, with a little boil.
            const cardFrom = (beat.from + 0.15 + i * 0.09) * fps;
            const p = stutterProgress(gf, fps, cardFrom, cardFrom + 0.45 * fps);
            const { rotation } = boil(gf / fps + i, { sway: 0.55 });
            return (
              <div
                key={role}
                style={{
                  width: 284,
                  height: 300,
                  backgroundColor: i === 0 ? COLOR.ink : COLOR.surface,
                  border: i === 0 ? "none" : `3px solid ${COLOR.ink}`,
                  borderRadius: 12,
                  padding: "30px 26px",
                  opacity: p,
                  transform: `translateY(${(1 - p) * 60}px) rotate(${rotation}deg)`,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "0 22px 40px rgba(17,17,19,0.14)",
                }}
              >
                <div
                  style={{
                    fontFamily: TYPE.mono,
                    fontSize: 22,
                    color: i === 0 ? COLOR.accent : COLOR.accent,
                    letterSpacing: 1,
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div
                  style={{
                    fontFamily: TYPE.sans,
                    fontSize: 34,
                    fontWeight: 700,
                    letterSpacing: -1.2,
                    lineHeight: 1.12,
                    textTransform: "uppercase",
                    color: i === 0 ? COLOR.canvas : COLOR.ink,
                  }}
                >
                  {role.replace("-", " ")}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      </Posterize>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------- map */

const MapBeat: React.FC<{ gf: number; fps: number }> = ({ gf, fps }) => {
  const beat = BEATS[3];
  const from = beat.from * fps;

  // The camera flies from the whole world down to the route.
  const cameraP = interpolate(gf, [from, from + 2.4 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  });
  const target = project(ROUTE[1].at);
  const camera = {
    scale: WORLD_CAMERA.scale + (2.5 - WORLD_CAMERA.scale) * cameraP,
    x: WORLD_CAMERA.x + (target.x - WORLD_CAMERA.x) * cameraP,
    y: WORLD_CAMERA.y + (target.y - WORLD_CAMERA.y) * cameraP,
  };

  // The route draws itself, then the pin drops, then the callout arrives.
  const routeP = interpolate(gf, [from + 0.5 * fps, from + 2.5 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.2, 0, 0, 1),
  });
  const pinP = interpolate(gf, [from + 2.45 * fps, from + 2.85 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.05, 0.7, 0.1, 1),
  });
  const calloutP = interpolate(gf, [from + 2.8 * fps, from + 3.3 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = windowOpacity(gf, fps, beat.from, 16.3, 0.4);
  if (opacity <= 0.001) return null;

  return (
    <AbsoluteFill style={{ opacity }}>
      <Posterize levels={7}>
        <VectorMap
          camera={camera}
          route={ROUTE}
          routeProgress={routeP}
          pin={{ at: CALLOUT.at, progress: pinP }}
          callout={{
            at: CALLOUT.at,
            label: CALLOUT.label,
            labelAt: CALLOUT.labelAt,
            progress: calloutP,
          }}
          highlight={{ at: CALLOUT.at, radius: 150, progress: pinP }}
        />
      </Posterize>
    </AbsoluteFill>
  );
};

/* ----------------------------------------------------------------- close */

const Close: React.FC<{ gf: number; fps: number }> = ({ gf, fps }) => {
  const beat = BEATS[4];
  const inP = stutterProgress(gf, fps, beat.from * fps, (beat.from + 0.45) * fps);
  const opacity = windowOpacity(gf, fps, beat.from, 19.6, 0.35);
  const { rotation } = boil(gf / fps, { sway: 0.35 });
  if (opacity <= 0.001) return null;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: "center" }}>
      <Posterize levels={6}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 34,
            transform: `scale(${0.97 + 0.03 * inP}) rotate(${rotation * 0.4}deg)`,
            opacity: inP,
          }}
        >
          <PaperStrip width={1240} height={232} seed={19} rotate={1.1} color={COLOR.ink}>
            <div style={{ padding: "54px 70px 58px", textAlign: "center" }}>
              <Headline size={124} color={COLOR.canvas} align="center">
                THE FILE IS YOURS.
              </Headline>
            </div>
          </PaperStrip>
        </div>
      </Posterize>
    </AbsoluteFill>
  );
};

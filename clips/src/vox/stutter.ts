/**
 * The 12fps stutter.
 *
 * The signature cadence of editorial "Vox" motion: the comp renders at 24fps
 * but the *graphic layer* steps at 12, so motion reads as hand-built and
 * graphic rather than soft and photographic.
 *
 * The step is derived from the composition's own fps rather than hardcoded,
 * so it survives a change of frame rate. And the base layer — the camera, the
 * footage — stays on the raw frame. Stuttering everything looks like dropped
 * frames, not like style.
 *
 * From the map-animation skill (iart-ai, MIT): the whole trick is to snap the
 * frame *before* computing any animated value.
 */

/** How many frames one stepped value is held for. */
export const stutterStep = (fps: number, target = 12): number =>
  Math.max(1, Math.round(fps / target));

/** The frame a graphic layer should read at, so its values hold still. */
export const stutterFrame = (frame: number, fps: number, target = 12): number => {
  const step = stutterStep(fps, target);
  return Math.floor(frame / step) * step;
};

/**
 * Quantise a 0..1 progress to the stepped clock.
 *
 * Progress that is computed from a smooth clock still reads smooth when the
 * thing it drives jumps — a scale that grows by a hair every frame looks
 * like a dissolve. Quantising the progress itself is what makes the movement
 * look like it was drawn on twos.
 */
export const stutterProgress = (
  frame: number,
  fps: number,
  from: number,
  to: number,
  target = 12,
): number => {
  const step = stutterStep(fps, target);
  const f = Math.floor(frame / step) * step;
  if (to === from) return f >= to ? 1 : 0;
  const p = Math.min(1, Math.max(0, (f - from) / (to - from)));
  return p;
};

/**
 * The boiling paper.
 *
 * A collage element that sits perfectly still looks like a PNG. Real paper on
 * a real desk is never perfectly still, so the elements breathe: a slow
 * rotation and a slow scale, both on a sine.
 *
 * From the vox-director keyframe engine (MIT): the sway and the pulse are
 * added to the element's own state every frame, on top of its keyframes.
 */
export const boil = (
  timeSeconds: number,
  options: { sway?: number; pulse?: number } = {},
): { rotation: number; scale: number } => {
  const sway = options.sway ?? 0;
  const pulse = options.pulse ?? 0;
  return {
    rotation: sway * Math.sin(timeSeconds * 1.3),
    scale: 1 + pulse * Math.sin(timeSeconds * 2.1),
  };
};

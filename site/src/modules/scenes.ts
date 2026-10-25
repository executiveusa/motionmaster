/*
 * scenes.ts — the two scroll scenes.
 *
 * Both are built on the shared stage, and both are finished compositions
 * before they are live layouts: reduced motion, no JavaScript and a phone
 * get the same content, laid out to read.
 *
 * Scene one is the signature move: the four rendered clips fly through the
 * stage, one at a time, the way a film strip passes a projector lamp.
 *
 * Scene two is the mechanism: the clip grows from a window to the whole
 * screen while the source that made it slides in beside it.
 */

import { Stage, type SceneCtx } from './stage';

const registry: Record<string, (root: HTMLElement, opts: any) => unknown> = {};

/** Scene one — the four clips, flying through. */
registry.reel = (root, opts = {}) => {
  const hold = opts.hold ?? 3;

  return Stage.scene(root, {
    hold,
    scrub: 0.55,
    phone: 'rest',
    build(tl, ctx: SceneCtx) {
      const frames = ctx.q('.scene__frame');
      const strip = ctx.q('.scene__strip')[0];
      const title = ctx.q('.scene__title')[0];
      const caption = ctx.q('.scene__caption')[0];

      if (!strip || !frames.length) return;

      // The strip starts off the right edge and travels left, past the
      // camera. Each frame is lit as it crosses the middle of the stage.
      // The first film opens centred; the rest arrive from the right and
      // leave to the left, one at a time, like a reel running.
      tl.fromTo(
        strip,
        { xPercent: 10, scale: 0.94 },
        { xPercent: -95, scale: 1.04, duration: 1, ease: 'none' },
        0
      );

      // The first frame is lit when the scene opens: the scene has to read at
      // progress 0, not only once the visitor has scrolled into it.
      const step = 0.78 / frames.length;
      frames.forEach((frame, i) => {
        const at = i * step;
        if (i > 0) {
          tl.fromTo(frame, { autoAlpha: 0 }, { autoAlpha: 1, duration: step * 0.45, ease: 'none' }, at - step * 0.45);
        }
        tl.to(frame, { autoAlpha: 0, duration: step * 0.45, ease: 'none' }, at + step * 0.5);
      });

      // The statement holds while the work passes behind it, and leaves last.
      if (title) {
        tl.fromTo(title, { autoAlpha: 1, y: 0 }, { autoAlpha: 1, y: 0, duration: 0.2, ease: 'none' }, 0);
        tl.to(title, { autoAlpha: 0, y: -16, duration: 0.14, ease: 'none' }, 0.8);
      }
      if (caption) {
        tl.fromTo(caption, { autoAlpha: 1 }, { autoAlpha: 1, duration: 0.1, ease: 'none' }, 0);
        tl.to(caption, { autoAlpha: 0, duration: 0.12, ease: 'none' }, 0.82);
      }
    },
  });
};

/** Scene two — the clip grows, the source slides in. */
registry.source = (root, opts = {}) => {
  const hold = opts.hold ?? 2;

  return Stage.scene(root, {
    hold,
    scrub: 0.55,
    phone: 'rest',
    build(tl, ctx: SceneCtx) {
      const stage = ctx.stage;
      const film = ctx.q('.scene__film')[0];
      const code = ctx.q('.scene__code')[0];
      const title = ctx.q('.scene__title')[0];
      const lines = ctx.q('.scene__code-line');

      if (!film || !stage) return;

      // The picture opens as a window in the middle of the stage and grows
      // until it is the whole screen.
      tl.fromTo(
        film,
        { clipPath: 'inset(18% 22% 18% 22%)', scale: 0.92 },
        { clipPath: 'inset(0% 0% 0% 0%)', scale: 1, duration: 0.62, ease: 'none' },
        0
      );

      if (title) {
        tl.fromTo(title, { autoAlpha: 1 }, { autoAlpha: 1, duration: 0.1, ease: 'none' }, 0);
        tl.to(title, { autoAlpha: 0, duration: 0.1, ease: 'none' }, 0.56);
      }

      if (code) {
        // The code is there from the first frame, dimmed, and comes forward
        // as the picture grows. A section that reads as empty at rest is a
        // section nobody can place.
        tl.fromTo(code, { xPercent: 10, autoAlpha: 0.45 }, { xPercent: 0, autoAlpha: 1, duration: 0.26, ease: 'none' }, 0.26);
        // The source reads itself in, a line at a time.
        if (lines.length) {
          tl.fromTo(
            lines,
            { autoAlpha: 0.16, x: 0 },
            { autoAlpha: 1, x: 0, duration: 0.22, ease: 'none', stagger: { each: 0.34 / lines.length } },
            0.38
          );
        }
      }
    },
  });
};

window.Scenes = registry;

/**
 * Start every scene on the page. Called once, after the DOM is ready.
 * If GSAP is missing, the stage puts each scene into its finished
 * composition and nothing is lost.
 */
export function initScenes(): void {
  Stage.init();
  void Stage.ready();
}

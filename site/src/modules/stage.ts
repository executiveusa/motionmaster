/*
 * stage.ts — the scroll-scene stage.
 *
 * A scene is a tall section whose stage holds still while the page scrolls
 * past it; a GSAP timeline is scrubbed from 0 to 1 by that scroll. The page
 * always scrolls natively — the scrollbar tells the truth, the keyboard works,
 * the trackpad works — and the scene ends.
 *
 * Adapted from the taste-skill scene stage (Leon Lin, MIT) with Lenis and
 * SplitText removed: smooth scrolling is off on touch anyway, and splitting
 * text is a tell we do not want.
 *
 * The finished composition is what reduced motion, no JavaScript and a phone
 * all show. Nothing waits on a script to be readable.
 */

import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export type SceneCtx = {
  root: HTMLElement;
  stage: HTMLElement;
  phone: boolean;
  q: (sel: string) => HTMLElement[];
};

export type ScenePlan = {
  hold?: number;
  scrub?: true | number;
  build?: (tl: gsap.core.Timeline, ctx: SceneCtx) => void;
  phone?: 'same' | 'rest' | { hold?: number; build?: ScenePlan['build'] };
  rest?: (ctx: SceneCtx) => void;
  beats?: number;
};

export type SceneFactory = (root: HTMLElement, opts: ScenePlan) => unknown;

const mq = (q: string) => window.matchMedia(q).matches;

export const Stage = {
  reduced: mq('(prefers-reduced-motion: reduce)'),
  phone: mq('(max-width: 767px)'),
  scenes: [] as gsap.MatchMedia[],

  /** One scroll scene. */
  scene(root: HTMLElement, opts: ScenePlan = {}) {
    const { hold = 2, scrub = true, build, phone = 'same', rest, beats = 0 } = opts;
    const stage = root.querySelector<HTMLElement>(':scope > .scene-stage') ?? root.firstElementChild as HTMLElement;
    const q = (sel: string) => [...root.querySelectorAll<HTMLElement>(sel)];

    const toRest = (ctx: SceneCtx) => {
      root.classList.remove('is-live');
      root.classList.add('is-rest');
      root.style.removeProperty('--hold');
      rest?.(ctx);
    };

    const mm = gsap.matchMedia();

    mm.add(
      { motion: '(prefers-reduced-motion: no-preference)', phone: '(max-width: 767px)' },
      (c) => {
        const conditions = c.conditions ?? {};
        const isPhone = !!conditions.phone;
        const ctx: SceneCtx = { root, stage, phone: isPhone, q };
        const plan =
          isPhone
            ? phone === 'rest'
              ? null
              : phone === 'same'
                ? { hold, build }
                : { hold: phone.hold ?? hold, build: phone.build ?? build }
            : { hold, build };

        if (!conditions.motion || !plan || !plan.build) {
          toRest(ctx);
          return () => root.classList.remove('is-rest');
        }

        root.classList.remove('is-rest');
        root.classList.add('is-live');
        root.style.setProperty('--hold', String(plan.hold));

        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: root,
            start: 'top top',
            end: 'bottom bottom',
            scrub,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              root.style.setProperty('--p', self.progress.toFixed(4));
              if (beats) root.dataset.beat = String(Math.min(beats - 1, Math.floor(self.progress * beats)));
            },
          },
        });

        plan.build(tl, ctx);
        // Pad the timeline to exactly 1 so positions in build() read as
        // fractions of the hold.
        if (tl.duration() < 1) tl.to({}, { duration: 1 - tl.duration() }, tl.duration());

        return () => {
          root.classList.remove('is-live');
          root.style.removeProperty('--hold');
          root.style.removeProperty('--p');
        };
      }
    );

    Stage.scenes.push(mm);
    return mm;
  },

  /** Fonts and the scenes' pictures decide every height a trigger measures. */
  ready() {
    const imgs = [...document.querySelectorAll<HTMLImageElement>('.scene img')]
      .filter((i) => !i.complete)
      .map((i) => i.decode().catch(() => {}));
    return Promise.all([document.fonts ? document.fonts.ready : null, ...imgs]).then(() => {
      ScrollTrigger.refresh();
    });
  },

  /** Every <section class="scene" data-scene="<id>"> on the page. */
  init() {
    const registry = (window as unknown as { Scenes?: Record<string, SceneFactory> }).Scenes ?? {};
    for (const el of document.querySelectorAll<HTMLElement>('.scene[data-scene]')) {
      if ((el as unknown as { __scene?: unknown }).__scene) continue;
      const make = registry[el.dataset.scene as string];
      if (!make) continue;
      let o: ScenePlan = {};
      try {
        o = JSON.parse(el.dataset.options || '{}');
      } catch {
        /* a bad options attribute is not worth failing the page over */
      }
      (el as unknown as { __scene?: unknown }).__scene = make(el, o) || true;
    }
  },
};

declare global {
  interface Window {
    Scenes?: Record<string, SceneFactory>;
    Stage?: typeof Stage;
  }
}

window.Stage = Stage;

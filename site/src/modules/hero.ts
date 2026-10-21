import { gsap } from 'gsap';
import { qs, qsa, prefersReducedMotion } from '../lib/dom';

/** 24fps timecode, HH:MM:SS:FF. */
function formatTimecode(seconds: number): string {
  const fps = 24;
  const totalFrames = Math.max(0, Math.floor(seconds * fps));
  const frames = totalFrames % fps;
  const totalSeconds = Math.floor(totalFrames / fps);
  const s = totalSeconds % 60;
  const m = Math.floor(totalSeconds / 60) % 60;
  const h = Math.floor(totalSeconds / 3600);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(frames)}`;
}

const DURATION = 10; // one loop of the composition, in seconds

/**
 * The live hero canvas: a typographic composition built with GSAP and running
 * in the browser. It is not a video file.
 *
 * - reduced motion: the composition is never built, the markup keeps its final
 *   frame and the timecode stays on a static frame number.
 * - off screen: the timeline is paused, and it is paused again in a hidden tab.
 */
export function initHero(): void {
  const stage = qs<HTMLElement>('[data-hero-stage]');
  if (!stage) return;

  const timeTargets = qsa<HTMLElement>('[data-hero-time], [data-rail-time]');
  const setTimecode = (value: string) => {
    for (const el of timeTargets) el.textContent = value;
  };

  const line = qs<HTMLElement>('[data-beat="line"]', stage);
  const list = qs<HTMLElement>('[data-beat="list"]', stage);
  const out = qs<HTMLElement>('[data-beat="out"]', stage);
  if (!line || !list || !out) return;

  const words = (root: HTMLElement) => qsa<HTMLElement>('.stage__word > i', root);
  const rows = qsa<HTMLElement>('.stage__beats li', list);
  const bars = qsa<HTMLElement>('.stage__bar > i', out);
  const file = qs<HTMLElement>('.stage__file', out);

  const mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const tl = gsap.timeline({
      repeat: -1,
      repeatDelay: 0.6,
      defaults: { ease: 'power3.out' },
      onUpdate: () => setTimecode(formatTimecode(tl.time())),
    });

    tl.set(line, { autoAlpha: 1, y: 0 })
      .set(list, { autoAlpha: 0, y: 12 })
      .set(out, { autoAlpha: 0, y: 12 });

    tl.from(words(line), { yPercent: 110, duration: 0.55, stagger: 0.08 }, 0);

    tl.to(line, { autoAlpha: 0, y: -12, duration: 0.28, ease: 'power2.in' }, 2.6);
    tl.to(list, { autoAlpha: 1, y: 0, duration: 0.3 }, 2.9)
      .from(words(list), { yPercent: 110, duration: 0.5, stagger: 0.07 }, 2.9)
      .from(rows, { autoAlpha: 0, x: -12, duration: 0.4, stagger: 0.12 }, 3.1);

    tl.to(list, { autoAlpha: 0, y: -12, duration: 0.28, ease: 'power2.in' }, 6.2);
    tl.to(out, { autoAlpha: 1, y: 0, duration: 0.3 }, 6.5)
      .from(words(out), { yPercent: 110, duration: 0.5, stagger: 0.07 }, 6.5)
      .from(bars, { xPercent: -100, duration: 0.45, stagger: 0.07 }, 6.9)
      .from(file, { autoAlpha: 0, duration: 0.4 }, 7.9);

    // hold the final frame to the end of the loop
    tl.to({}, { duration: DURATION - 7.9 }, 7.9);

    let visible = true;
    const sync = () => {
      if (document.hidden || !visible) {
        tl.pause();
      } else {
        tl.play();
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
        sync();
      },
      { threshold: 0.05 },
    );
    observer.observe(stage);

    const onVisibility = () => sync();
    document.addEventListener('visibilitychange', onVisibility);

    setTimecode(formatTimecode(0));

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      tl.kill();
    };
  });

  if (prefersReducedMotion()) {
    // The composition is not built under reduced motion: the markup keeps the
    // final frame and the timecode reports that static frame.
    setTimecode(formatTimecode(DURATION));
  }
}

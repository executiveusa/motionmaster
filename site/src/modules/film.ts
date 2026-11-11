import { prefersReducedMotion, qs, qsa } from '../lib/dom';

/**
 * The hero film.
 *
 * It is a rendered video, so it plays, loops and can be paused. Two things
 * matter: a visitor who asked for reduced motion must not get a moving
 * picture, and a film that is off screen must not keep decoding frames.
 */
export function initFilm(): void {
  const videos = qsa<HTMLVideoElement>('[data-film], [data-reel-film]');
  if (!videos.length) return;

  for (const video of videos) {
    if (prefersReducedMotion()) {
      video.removeAttribute('autoplay');
      video.pause();
      continue;
    }

    // Browsers may still refuse to play; the poster is already showing.
    const attempt = video.play();
    if (attempt && typeof attempt.catch === 'function') {
      attempt.catch(() => {
        /* the poster stays. nothing to fix. */
      });
    }
  }

  // The three films in the reel are the moving picture of the scene, so they
  // play, muted, with no browser controls over the picture. The gallery
  // clips keep their own play buttons, because there the visitor is reading
  // the prompt beside them.
  for (const video of qsa<HTMLVideoElement>('[data-reel-film]')) {
    video.autoplay = true;
    video.controls = false;
    video.muted = true;
    video.loop = true;
    video.preload = 'auto';
    video.play().catch(() => {
      /* the poster stays. nothing to fix. */
    });
  }

  // Stop decoding when the film is off screen.
  if (!('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const video = entry.target as HTMLVideoElement;
        if (entry.isIntersecting) {
          if (!prefersReducedMotion()) video.play().catch(() => {});
        } else {
          video.pause();
        }
      }
    },
    { threshold: 0.05 },
  );
  for (const video of videos) observer.observe(video);
}

/**
 * The sound on the engine film.
 *
 * The film is mixed — paper, a riser, a drop, a punch — so it plays
 * muted by default and the visitor decides whether to let it speak. The
 * film's own caption line runs along the bottom of the frame, which is
 * why there is no stock control bar on it.
 */
export function initFilmSound(): void {
  const buttons = qsa<HTMLButtonElement>('[data-film-sound]');
  if (!buttons.length) return;

  for (const button of buttons) {
    const frame = button.closest('.showcase__frame');
    const video = frame?.querySelector<HTMLVideoElement>('video');
    if (!video) continue;
    const label = button.querySelector<HTMLElement>('[data-film-sound-label]');

    button.addEventListener('click', () => {
      const on = button.getAttribute('aria-pressed') !== 'true';
      button.setAttribute('aria-pressed', String(on));
      video.muted = !on;
      if (label) {
        const spanish = document.documentElement.lang === 'es-MX';
        label.textContent = on
          ? (spanish ? 'Sonido activado' : 'Sound on')
          : (spanish ? 'Sonido' : 'Sound');
      }
      // A muted video that has never been played may be blocked from
      // starting; the click is a user gesture, so it can start now.
      if (on && video.paused) video.play().catch(() => {});
    });
  }
}

/**
 * The hero collage.
 *
 * The cards carry the real renders, not stills — the poster is a frame of
 * the film, so the picture is right before anything plays. The card under
 * the pointer runs its footage; move away and it stops and rewinds. One
 * video decodes at a time.
 *
 * The cards sit behind the headline, so the pointer never reaches them —
 * the hero listens instead and works out which card the pointer is over.
 * On a touch device there is no hover: the collage stays as its frames and
 * the film below it carries the motion.
 */
export function initHeroFilms(): void {
  const cards = qsa<HTMLVideoElement>('[data-hero-film]');
  if (!cards.length) return;
  if (prefersReducedMotion()) return;

  const hero = qs<HTMLElement>('.hero--brand') ?? qs<HTMLElement>('#top');
  if (!hero) return;

  let current: HTMLVideoElement | null = null;

  const wake = (video: HTMLVideoElement | null) => {
    if (current === video) return;
    if (current) {
      current.pause();
      current.currentTime = 0;
    }
    current = video;
    if (video) {
      video.play().catch(() => {
        /* the poster stays. nothing to fix. */
      });
    }
  };

  hero.addEventListener('pointermove', (event) => {
    const { clientX: x, clientY: y } = event;
    const hit =
      cards.find((video) => {
        const box = video.getBoundingClientRect();
        return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
      }) ?? null;
    wake(hit);
  });

  hero.addEventListener('pointerleave', () => wake(null));
}

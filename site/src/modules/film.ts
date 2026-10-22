import { prefersReducedMotion, qsa } from '../lib/dom';

/**
 * The hero film.
 *
 * It is a rendered video, so it plays, loops and can be paused. Two things
 * matter: a visitor who asked for reduced motion must not get a moving
 * picture, and a film that is off screen must not keep decoding frames.
 */
export function initFilm(): void {
  const videos = qsa<HTMLVideoElement>('[data-film], [data-demo]');
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

  // The three demo films do not autoplay. They are proof, not atmosphere:
  // the visitor presses play, and nothing starts moving on its own.
  for (const video of qsa<HTMLVideoElement>('[data-demo]')) {
    video.autoplay = false;
    video.controls = true;
    video.preload = 'none';
  }

  // Stop decoding when the film is off screen.
  if (!('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const video = entry.target as HTMLVideoElement;
        if (entry.isIntersecting) {
          if (!prefersReducedMotion() && !video.hasAttribute('data-demo')) video.play().catch(() => {});
        } else {
          video.pause();
        }
      }
    },
    { threshold: 0.05 },
  );
  for (const video of videos) observer.observe(video);
}

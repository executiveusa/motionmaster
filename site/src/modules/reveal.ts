import { prefersReducedMotion, qsa } from '../lib/dom';

const SELECTOR = '.clip, .step, .tier, .qa__item, .mix__step, .section__head';

/**
 * Scroll reveals: opacity and a 12px offset, cut on the beat. Under reduced
 * motion nothing is hidden and nothing moves.
 */
export function initReveals(): void {
  const items = qsa<HTMLElement>(SELECTOR);
  if (items.length === 0) return;

  if (prefersReducedMotion()) {
    document.documentElement.classList.remove('motion-ok');
    return;
  }

  document.documentElement.classList.add('motion-ok');
  for (const item of items) item.setAttribute('data-reveal', '');

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
  );

  for (const item of items) observer.observe(item);

  // Safety net: never leave content hidden if the observer misses an item.
  window.setTimeout(() => {
    for (const item of items) item.classList.add('is-visible');
  }, 2500);
}

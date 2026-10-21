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

  // The class goes on LAST, and only after the observer and the safety net
  // exist. Everything above happens in one task, so the browser never paints
  // the hidden state — and if any of it had thrown, the content would have
  // stayed visible instead of being hidden with nothing to bring it back.
  document.documentElement.classList.add('motion-ok');
}

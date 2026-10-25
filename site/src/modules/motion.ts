/*
 * motion.ts — the quiet layer.
 *
 * The scenes are the loud moments. Everything else is restrained: a heading
 * arrives, then the text under it, then the picture, staggered, once, and
 * never again. Transform and opacity only.
 *
 * Under reduced motion, or without JavaScript, nothing is hidden at all —
 * the class that hides content is added last, and only after the tweens
 * exist, so a failure leaves the page readable rather than blank.
 */

import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from '../lib/dom';

gsap.registerPlugin(ScrollTrigger);

/**
 * Groups of parts that arrive together. A section head is a group of two —
 * the heading, then the line under it. A card is a group of one.
 */
const GROUPS: { selector: string; parts: string[] }[] = [
  { selector: '.section__head', parts: ['.h2', '.section__lede'] },
  { selector: '.clip', parts: [] },
  { selector: '.step', parts: [] },
  { selector: '.tier', parts: [] },
  { selector: '.faq__item', parts: [] },
  { selector: '.library__stat', parts: [] },
  { selector: '.install__item', parts: [] },
  { selector: '.mix__step', parts: [] },
];

function partsOf(group: Element, selectors: string[]): Element[] {
  if (!selectors.length) return [group];
  const out: Element[] = [];
  for (const sel of selectors) {
    const found = group.querySelector(sel);
    if (found) out.push(found);
  }
  return out.length ? out : [group];
}

export function initMotion(): void {
  const groups: Element[] = [];
  const seen = new Set<Element>();
  for (const g of GROUPS) {
    for (const el of document.querySelectorAll(g.selector)) {
      if (seen.has(el)) continue;
      seen.add(el);
      groups.push(el);
    }
  }
  if (!groups.length) return;

  if (prefersReducedMotion()) {
    document.documentElement.classList.remove('motion-ok');
    return;
  }

  const animated: Element[] = [];

  for (const group of groups) {
    const parts = partsOf(group, GROUPS.find((g) => group.matches(g.selector))?.parts ?? []);
    for (const part of parts) animated.push(part);
  }

  for (const el of animated) {
    gsap.set(el, { autoAlpha: 0, y: 22 });
  }

  for (const group of groups) {
    const parts = partsOf(group, GROUPS.find((g) => group.matches(g.selector))?.parts ?? []);
    gsap.to(parts, {
      autoAlpha: 1,
      y: 0,
      duration: 0.62,
      ease: 'power2.out',
      stagger: 0.07,
      overwrite: 'auto',
      scrollTrigger: {
        trigger: group,
        start: 'top 88%',
        once: true,
      },
    });
  }

  // Safety net: if a trigger never fires, the content still shows. This runs
  // once, after the page has settled.
  window.setTimeout(() => {
    for (const el of animated) {
      if (Number(gsap.getProperty(el, 'opacity')) < 1) {
        gsap.set(el, { autoAlpha: 1, y: 0 });
      }
    }
  }, 6000);

  document.documentElement.classList.add('motion-ok');
}

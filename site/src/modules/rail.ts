import { qs, qsa } from '../lib/dom';

const STAMPS: Record<string, string> = {
  top: '00 HERO',
  proof: '01 PROOF',
  mechanism: '02 MECHANISM',
  box: '03 BOX',
  footage: '04 FOOTAGE',
  objections: '05 ANSWERS',
  pricing: '06 PRICE',
  faq: '07 FAQ',
};

/** The rail stamps the section you are reading; the top line shows progress. */
export function initRail(): void {
  const stamp = qs<HTMLElement>('[data-rail-stamp]');
  const sections = qsa<HTMLElement>('main section[id]');

  if (stamp && sections.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const id = entry.target.id;
          const label = STAMPS[id];
          if (label) stamp.textContent = label;
        }
      },
      { rootMargin: '-50% 0px -50% 0px', threshold: 0 },
    );
    for (const section of sections) observer.observe(section);
  }

  const fill = qs<HTMLElement>('[data-progress-fill]');
  if (!fill) return;

  let ticking = false;
  const update = () => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    fill.style.width = `${(ratio * 100).toFixed(2)}%`;
    ticking = false;
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();
}

import { qs, qsa } from '../lib/dom';

/** Mobile navigation panel: full height, focus trapped, Escape closes. */
export function initMenu(): void {
  const toggle = qs<HTMLButtonElement>('[data-menu-toggle]');
  const found = qs<HTMLElement>('[data-menu-panel]');
  if (!toggle || !found) return;
  const panel: HTMLElement = found;

  const focusable = () =>
    qsa<HTMLElement>('a[href], button:not([disabled])', panel).filter(
      (el) => el.offsetParent !== null,
    );

  let opener: HTMLElement | null = null;

  const open = () => {
    opener = document.activeElement as HTMLElement | null;
    panel.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeydown, true);
    const first = focusable()[0];
    if (first) first.focus();
  };

  const close = () => {
    if (panel.hidden) return;
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKeydown, true);
    (opener ?? toggle).focus();
  };

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const items = focusable();
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (event.shiftKey && (active === first || !panel.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  toggle.addEventListener('click', () => {
    if (panel.hidden) {
      open();
    } else {
      close();
    }
  });

  for (const link of qsa<HTMLElement>('a[href]', panel)) {
    link.addEventListener('click', () => close());
  }

  window.addEventListener('resize', () => {
    if (window.innerWidth >= 1024 && !panel.hidden) close();
  });
}

/** Sticky mobile bar: appears once the hero has passed. */
export function initMobileBar(): void {
  const bar = qs<HTMLElement>('[data-mobile-bar]');
  const hero = qs<HTMLElement>('.hero');
  if (!bar || !hero) return;

  const observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (!entry) return;
      const passed = entry.boundingClientRect.top < 0;
      bar.hidden = !passed;
    },
    { threshold: 0 },
  );
  observer.observe(hero);
}

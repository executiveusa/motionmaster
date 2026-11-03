const q = <T extends Element>(selector: string, root: ParentNode = document) => root.querySelector<T>(selector);

export function initProductShell(): void {
  const cards = [...document.querySelectorAll<HTMLElement>('[data-example-tags]')];
  const search = q<HTMLInputElement>('[data-example-search]');
  const filters = [...document.querySelectorAll<HTMLButtonElement>('[data-example-filter]')];
  const status = q<HTMLElement>('[data-example-status]');
  let active = 'all';

  const apply = () => {
    const term = search?.value.trim().toLowerCase() ?? '';
    let shown = 0;
    for (const card of cards) {
      const haystack = (card.textContent ?? '').toLowerCase();
      const tags = (card.dataset.exampleTags ?? '').split(/\s+/);
      const matchesFilter = active === 'all' || tags.includes(active);
      const matchesSearch = !term || haystack.includes(term) || tags.some((tag) => tag.includes(term));
      card.hidden = !(matchesFilter && matchesSearch);
      if (!card.hidden) shown++;
    }
    if (status) status.textContent = document.documentElement.lang === 'es-MX'
      ? `${shown} ejemplos`
      : `${shown} examples`;
  };

  search?.addEventListener('input', apply);
  for (const button of filters) {
    button.addEventListener('click', () => {
      active = button.dataset.exampleFilter ?? 'all';
      for (const peer of filters) {
        const on = peer === button;
        peer.classList.toggle('is-active', on);
        peer.setAttribute('aria-pressed', String(on));
      }
      apply();
    });
  }

  q<HTMLButtonElement>('[data-watch-demo]')?.addEventListener('click', () => {
    const first = cards.find((card) => !card.hidden) ?? cards[0];
    if (!first) return;
    first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const toggle = q<HTMLButtonElement>('[data-clip-toggle]', first);
    if (toggle?.getAttribute('aria-pressed') !== 'true') toggle?.click();
  });

  q<HTMLElement>('[data-focus-signin]')?.addEventListener('click', () => {
    window.setTimeout(() => q<HTMLButtonElement>('[data-console-signin]')?.focus({ preventScroll: true }), 350);
  });

  q<HTMLButtonElement>('[data-copy-agent]')?.addEventListener('click', async (event) => {
    const button = event.currentTarget as HTMLButtonElement;
    const endpoint = q<HTMLElement>('[data-agent-endpoint]')?.textContent?.trim() ?? '';
    if (!endpoint) return;
    try {
      await navigator.clipboard.writeText(endpoint);
      const original = button.textContent;
      button.textContent = document.documentElement.lang === 'es-MX' ? 'Copiado' : 'Copied';
      window.setTimeout(() => { button.textContent = original; }, 1400);
    } catch {
      q<HTMLElement>('[data-agent-endpoint]')?.focus?.();
    }
  });

  document.querySelector<HTMLSelectElement>('[data-locale]')?.addEventListener('change', apply);
  apply();
}

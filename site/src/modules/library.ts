/**
 * The library browser.
 *
 * The same index the MCP server serves, in the page. Categories on the left,
 * items on the right, and the full prompt of whatever you pick — with a copy
 * button, because the point of a prompt library is that you leave with a
 * prompt.
 *
 * The payload is 1 MB, so it is fetched the first time someone touches the
 * section rather than on page load. The page ships no more JavaScript than
 * it did before this existed.
 */
import { copyText, qsa, qs } from '../lib/dom';

interface LibraryItem {
  id: string;
  c: string;
  k: 'prompt' | 'style' | 'skill' | 'case';
  t: string;
  s: string;
  p: string;
  x: 0 | 1;
  g: string[];
  a: string;
  u: string;
  l: string;
}

interface LibraryPayload {
  counts: { items: number; byKind: Record<string, number>; blocks: number; categories: number };
  collections: { id: string; title: string; repo: string; license: string; count: number }[];
  categories: { slug: string; count: number }[];
  items: LibraryItem[];
}

const KIND_LABEL: Record<string, string> = {
  style: 'Style recipe',
  prompt: 'Production prompt',
  case: 'Case study',
  skill: 'Skill',
};

const PAGE = 40;

let payload: LibraryPayload | null = null;
let loading = false;
let activeKind = 'all';
let activeCollection = 'all';
let activeCategory = '';
let query = '';
let shown = PAGE;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function matches(item: LibraryItem): boolean {
  if (activeKind !== 'all' && item.k !== activeKind) return false;
  if (activeCollection !== 'all' && item.c !== activeCollection) return false;
  if (activeCategory && !item.g.includes(activeCategory)) return false;
  if (query) {
    const hay = `${item.t} ${item.s} ${item.p} ${item.g.join(' ')}`.toLowerCase();
    if (!hay.includes(query)) return false;
  }
  return true;
}

function currentItems(): LibraryItem[] {
  if (!payload) return [];
  return payload.items.filter(matches);
}

function countFor(category: string): number {
  if (!payload) return 0;
  return payload.items.filter(
    (i) =>
      i.g.includes(category) &&
      (activeKind === 'all' || i.k === activeKind) &&
      (activeCollection === 'all' || i.c === activeCollection),
  ).length;
}

function renderCategories(): void {
  const list = qs<HTMLElement>('[data-library-categories]');
  if (!list || !payload) return;

  const all = el('button', 'library__category');
  all.type = 'button';
  all.textContent = `All`;
  const allCount = el('span', 'library__count', String(payload.items.length));
  all.appendChild(allCount);
  all.setAttribute('aria-pressed', activeCategory === '' ? 'true' : 'false');
  if (!activeCategory) all.classList.add('is-active');
  all.addEventListener('click', () => {
    activeCategory = '';
    shown = PAGE;
    renderCategories();
    renderItems();
  });
  list.replaceChildren(all);

  for (const cat of payload.categories) {
    const n = countFor(cat.slug);
    if (n === 0) continue;
    const button = el('button', 'library__category');
    button.type = 'button';
    button.appendChild(document.createTextNode(cat.slug.replace(/-/g, ' ')));
    button.appendChild(el('span', 'library__count', String(n)));
    button.setAttribute('aria-pressed', activeCategory === cat.slug ? 'true' : 'false');
    if (activeCategory === cat.slug) button.classList.add('is-active');
    button.addEventListener('click', () => {
      activeCategory = activeCategory === cat.slug ? '' : cat.slug;
      shown = PAGE;
      renderCategories();
      renderItems();
    });
    list.appendChild(button);
  }
}

function renderItems(): void {
  const list = qs<HTMLElement>('[data-library-items]');
  const count = qs<HTMLElement>('[data-library-count]');
  if (!list || !payload) return;

  const found = currentItems();
  if (count) {
    count.textContent = `${found.length} of ${payload.items.length} items`;
  }

  if (found.length === 0) {
    const empty = el('p', 'library__empty', 'Nothing matches that. Clear the search or pick another category.');
    list.replaceChildren(empty);
    return;
  }

  const slice = found.slice(0, shown);
  const nodes: HTMLElement[] = [];

  for (const item of slice) {
    const row = el('article', 'library__item');
    row.dataset.id = item.id;

    const head = el('div', 'library__item-head');
    const title = el('h3', 'library__item-title', item.t);
    head.appendChild(title);

    const meta = el('div', 'library__item-meta');
    meta.appendChild(el('span', 'library__tag', KIND_LABEL[item.k] ?? item.k));
    meta.appendChild(el('span', 'library__tag library__tag--ghost', item.c));
    if (item.x === 1) {
      meta.appendChild(el('span', 'library__tag library__tag--warn', 'partial'));
    }
    head.appendChild(meta);
    row.appendChild(head);

    if (item.s && item.s !== item.t) {
      row.appendChild(el('p', 'library__item-summary', item.s));
    }

    if (item.p) {
      const prompt = el('pre', 'library__prompt');
      prompt.textContent = item.p;
      const foot = el('div', 'library__item-foot');
      const copy = el('button', 'library__copy', 'Copy prompt');
      copy.type = 'button';
      copy.addEventListener('click', async (event) => {
        event.stopPropagation();
        const ok = await copyText(item.p);
        copy.textContent = ok ? 'Copied' : 'Copy failed';
        window.setTimeout(() => {
          copy.textContent = 'Copy prompt';
        }, 1600);
      });
      foot.appendChild(copy);
      if (item.u) {
        const source = el('a', 'library__source', 'Source');
        source.href = item.u;
        source.target = '_blank';
        source.rel = 'noreferrer noopener';
        source.addEventListener('click', (event) => event.stopPropagation());
        foot.appendChild(source);
      }
      foot.appendChild(el('span', 'library__licence', item.l));
      row.appendChild(prompt);
      row.appendChild(foot);
    }

    nodes.push(row);
  }

  list.replaceChildren(...nodes);

  if (found.length > shown) {
    const more = el('button', 'library__more', `Show ${Math.min(PAGE, found.length - shown)} more`);
    more.type = 'button';
    more.addEventListener('click', () => {
      shown += PAGE;
      renderItems();
    });
    list.appendChild(more);
  }
}

function renderStats(): void {
  if (!payload) return;
  // A stat can appear in more than one place (the lede repeats the numbers),
  // so every match is written, not just the first.
  const set = (selector: string, value: string): void => {
    for (const node of qsa<HTMLElement>(selector)) node.textContent = value;
  };
  set('[data-library-stat-items]', String(payload.counts.items));
  set('[data-library-stat-collections]', String(payload.collections.length));
  set('[data-library-stat-categories]', String(payload.counts.categories));
  set('[data-library-stat-blocks]', String(payload.counts.blocks));

  // The collection picker is built from the payload so it can never drift
  // from what the index actually holds.
  const select = qs<HTMLSelectElement>('[data-library-collection]');
  if (select && select.options.length <= 1) {
    for (const collection of payload.collections) {
      const option = el('option');
      option.value = collection.id;
      option.textContent = `${collection.title} (${collection.count})`;
      select.appendChild(option);
    }
  }
}

function paint(): void {
  renderStats();
  renderCategories();
  renderItems();
}

async function load(): Promise<void> {
  if (payload || loading) return;
  loading = true;
  const status = qs<HTMLElement>('[data-library-status]');
  if (status) status.textContent = 'Loading the index…';
  try {
    const response = await fetch('/library.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    payload = (await response.json()) as LibraryPayload;
    const status2 = qs<HTMLElement>('[data-library-status]');
    if (status2) status2.textContent = '';
    paint();
  } catch (error) {
    const status3 = qs<HTMLElement>('[data-library-status]');
    if (status3) status3.textContent = 'The library index could not be loaded.';
    console.error('library: load failed', error);
  } finally {
    loading = false;
  }
}

export function initLibrary(): void {
  const root = qs<HTMLElement>('[data-library]');
  if (!root) return;

  // The index is 1 MB, so it is not part of the initial page. It is fetched
  // the first time the section is anywhere near the viewport, which means a
  // reader who scrolls to it never sees an empty panel.
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            observer.disconnect();
            void load();
          }
        }
      },
      { rootMargin: '600px 0px' },
    );
    observer.observe(root);
  } else {
    void load();
  }

  // Any interaction with the section also loads it.
  root.addEventListener('pointerdown', () => void load(), { once: true });
  root.addEventListener('focusin', () => void load(), { once: true });

  const search = qs<HTMLInputElement>('[data-library-search]');
  if (search) {
    let timer = 0;
    search.addEventListener('input', () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        query = search.value.trim().toLowerCase();
        shown = PAGE;
        void load().then(paint);
      }, 140);
    });
  }

  for (const chip of qsa<HTMLButtonElement>('[data-library-kind]')) {
    chip.addEventListener('click', () => {
      activeKind = chip.dataset.libraryKind ?? 'all';
      for (const other of qsa<HTMLButtonElement>('[data-library-kind]')) {
        other.setAttribute('aria-pressed', other === chip ? 'true' : 'false');
      }
      shown = PAGE;
      void load().then(paint);
    });
  }

  for (const option of qsa<HTMLSelectElement>('[data-library-collection]')) {
    option.addEventListener('change', () => {
      activeCollection = option.value;
      shown = PAGE;
      void load().then(paint);
    });
  }
}

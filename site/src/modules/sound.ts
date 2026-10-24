/**
 * The sound library, in the page.
 *
 * The same index the agent searches, in a form a person can use: a row of
 * buttons for the kinds, a family for the timbre, a box for the words, and
 * one row per sound with a play button, its shape, its licence and a copy
 * button.
 *
 * The buttons are the vocabulary — whoosh, hit, confirm, error — so the
 * person clicking and the agent asking for "a deep hit for the big reveal"
 * are looking at the same shelf.
 *
 * The audio is fetched when a sound is played, never before. The index is a
 * few hundred kilobytes and is fetched when the section comes near the
 * viewport; the sound files are fetched one at a time, by a human's hand.
 */
import { copyText, qsa, qs } from '../lib/dom';

interface SoundRow {
  i: string;
  k: string;
  s: string;
  t: string;
  n: string;
  d: string;
  u: string;
  g: string[];
  ms: number;
  at: number | null;
  hz: number | null;
  l: string;
  a: string;
  p: string;
  f: string;
  r: 0 | 1;
}

interface SfxPayload {
  counts: { total: number; bySource: Record<string, number>; byKind: Record<string, number> };
  kinds: { id: string; label: string; about: string; count: number }[];
  sounds: SoundRow[];
}

const PAGE = 48;

let payload: SfxPayload | null = null;
let loading = false;
let activeKind = 'all';
let activeSource = 'all';
let query = '';
let shown = PAGE;
let playing: HTMLAudioElement | null = null;

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const SOURCE_LABEL: Record<string, string> = {
  earshot: 'made in code',
  uisfx: 'interface',
  openverse: 'recorded',
};

function matches(sound: SoundRow): boolean {
  if (activeKind !== 'all' && sound.k !== activeKind) return false;
  if (activeSource !== 'all' && sound.s !== activeSource) return false;
  if (!query) return true;
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const hay = `${sound.n} ${sound.d} ${sound.u} ${sound.g.join(' ')} ${sound.k} ${sound.t}`.toLowerCase();
  return terms.every((term) => hay.includes(term));
}

function shape(sound: SoundRow): string {
  const parts: string[] = [];
  parts.push(`${(sound.ms / 1000).toFixed(2)}s`);
  if (sound.at !== null && sound.at !== undefined) parts.push(`attack ${Math.round(sound.at)}ms`);
  if (sound.hz) parts.push(`${Math.round(sound.hz)}Hz`);
  return parts.join(' · ');
}

function play(sound: SoundRow, button: HTMLButtonElement): void {
  if (playing) {
    playing.pause();
    playing = null;
  }
  for (const other of qsa<HTMLButtonElement>('[data-sfx-play]')) {
    other.classList.remove('sfx__play--on');
    other.setAttribute('aria-pressed', 'false');
  }
  if (button.classList.contains('sfx__play--on')) {
    button.classList.remove('sfx__play--on');
    button.setAttribute('aria-pressed', 'false');
    return;
  }
  const audio = new Audio(`/${sound.f}`);
  audio.addEventListener('ended', () => {
    button.classList.remove('sfx__play--on');
    button.setAttribute('aria-pressed', 'false');
    playing = null;
  });
  void audio.play().catch(() => {
    button.classList.remove('sfx__play--on');
    button.setAttribute('aria-pressed', 'false');
  });
  playing = audio;
  button.classList.add('sfx__play--on');
  button.setAttribute('aria-pressed', 'true');
}

function render(): void {
  const list = qs<HTMLElement>('[data-sfx-list]');
  if (!list || !payload) return;

  const filtered = payload.sounds.filter(matches);
  const count = qs<HTMLElement>('[data-sfx-count]');
  if (count) {
    count.textContent = `${filtered.length} of ${payload.sounds.length} sounds`;
  }

  list.replaceChildren();

  const page = filtered.slice(0, shown);
  for (const sound of page) {
    const row = el('article', 'sfx');

    const head = el('div', 'sfx__head');
    const playButton = el('button', 'sfx__play', '▶');
    playButton.type = 'button';
    playButton.setAttribute('aria-pressed', 'false');
    playButton.setAttribute('aria-label', `Play ${sound.n}`);
    playButton.dataset.sfxPlay = '';
    playButton.addEventListener('click', () => play(sound, playButton));
    head.appendChild(playButton);

    const name = el('div', 'sfx__name');
    name.appendChild(el('span', 'sfx__title', sound.n));
    const meta = el('span', 'sfx__meta');
    meta.appendChild(el('span', 'sfx__kind', sound.k));
    meta.appendChild(el('span', 'sfx__shape', shape(sound)));
    meta.appendChild(el('span', 'sfx__source', SOURCE_LABEL[sound.s] ?? sound.s));
    name.appendChild(meta);
    head.appendChild(name);

    const copy = el('button', 'sfx__copy', 'copy');
    copy.type = 'button';
    copy.setAttribute('aria-label', `Copy the id of ${sound.n}`);
    copy.addEventListener('click', async () => {
      await copyText(sound.i);
      copy.textContent = 'copied';
      window.setTimeout(() => {
        copy.textContent = 'copy';
      }, 1400);
    });
    head.appendChild(copy);

    row.appendChild(head);

    if (sound.d || sound.u) {
      const note = el('p', 'sfx__note');
      note.textContent = sound.u ? `${sound.d} — ${sound.u}` : sound.d;
      row.appendChild(note);
    }

    const licence = el('p', 'sfx__licence');
    licence.textContent = `${sound.l}${sound.a ? ` · ${sound.a}` : ''}`;
    row.appendChild(licence);

    list.appendChild(row);
  }

  const more = qs<HTMLButtonElement>('[data-sfx-more]');
  if (more) {
    more.hidden = filtered.length <= shown;
    more.textContent = `Show ${Math.min(PAGE, filtered.length - shown)} more`;
  }
}

function renderKinds(): void {
  const rail = qs<HTMLElement>('[data-sfx-kinds]');
  if (!rail || !payload) return;
  rail.replaceChildren();

  const all = el('button', 'sfx__kind-button');
  all.type = 'button';
  all.textContent = `everything · ${payload.sounds.length}`;
  all.classList.toggle('sfx__kind-button--on', activeKind === 'all');
  all.addEventListener('click', () => {
    activeKind = 'all';
    shown = PAGE;
    renderKinds();
    render();
  });
  rail.appendChild(all);

  for (const kind of payload.kinds) {
    const button = el('button', 'sfx__kind-button');
    button.type = 'button';
    button.textContent = `${kind.label} · ${kind.count}`;
    button.title = kind.about;
    button.classList.toggle('sfx__kind-button--on', activeKind === kind.id);
    button.addEventListener('click', () => {
      activeKind = kind.id;
      shown = PAGE;
      renderKinds();
      render();
    });
    rail.appendChild(button);
  }
}

async function load(): Promise<void> {
  if (payload || loading) return;
  loading = true;
  try {
    const response = await fetch('/sfx.json');
    if (!response.ok) throw new Error(String(response.status));
    payload = (await response.json()) as SfxPayload;
    renderKinds();
    render();
  } catch (error) {
    const note = qs<HTMLElement>('[data-sfx-note]');
    if (note) note.textContent = `The sound library could not be loaded: ${(error as Error).message}`;
  } finally {
    loading = false;
  }
}

export function initSound(): void {
  const root = qs<HTMLElement>('[data-sound]');
  if (!root) return;

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
  root.addEventListener('pointerdown', () => void load(), { once: true });

  const search = qs<HTMLInputElement>('[data-sfx-search]');
  search?.addEventListener('input', (event) => {
    query = (event.target as HTMLInputElement).value.trim();
    shown = PAGE;
    render();
  });

  const source = qs<HTMLSelectElement>('[data-sfx-source]');
  source?.addEventListener('change', (event) => {
    activeSource = (event.target as HTMLSelectElement).value;
    shown = PAGE;
    render();
  });

  qs<HTMLButtonElement>('[data-sfx-more]')?.addEventListener('click', () => {
    shown += PAGE;
    render();
  });
}

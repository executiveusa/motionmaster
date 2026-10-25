import clipManifest from '../data/clip-manifest.json';
import clipSource from '../clips.json';
import { copyText, qs, qsa } from '../lib/dom';

interface ManifestEntry {
  video: boolean;
  poster: boolean;
  videoSrc: string;
  posterSrc: string;
}

interface Manifest {
  clips?: Record<string, ManifestEntry>;
}

interface ClipSource {
  id: string;
  title: string;
  duration: string;
  stack: string;
  alt: string;
  prompt: string;
}

const manifest = clipManifest as Manifest;
const source = (clipSource as { clips: ClipSource[] }).clips;
const byId = new Map(source.map((clip) => [clip.id, clip]));

const live = (): HTMLElement | null => qs<HTMLElement>('[data-live-region]');

function announce(message: string): void {
  const region = live();
  if (region) region.textContent = message;
}

function setUnavailable(clip: HTMLElement): void {
  const video = qs<HTMLVideoElement>('[data-clip-video]', clip);
  const state = qs<HTMLElement>('[data-clip-state]', clip);
  const toggle = qs<HTMLButtonElement>('[data-clip-toggle]', clip);
  if (video) video.hidden = true;
  if (state) state.hidden = false;
  if (toggle) {
    toggle.disabled = true;
    toggle.setAttribute('aria-disabled', 'true');
    const label = qs<HTMLElement>('.clip__toggle-label', toggle);
    if (label) label.textContent = 'Not available';
  }
}

function wirePlayer(clip: HTMLElement): void {
  const video = qs<HTMLVideoElement>('[data-clip-video]', clip);
  const toggle = qs<HTMLButtonElement>('[data-clip-toggle]', clip);
  if (!video || !toggle) return;

  const label = qs<HTMLElement>('.clip__toggle-label', toggle);
  const setPressed = (playing: boolean) => {
    toggle.setAttribute('aria-pressed', playing ? 'true' : 'false');
    if (label) label.textContent = playing ? 'Pause clip' : 'Play clip';
  };

  video.addEventListener('play', () => setPressed(true));
  video.addEventListener('pause', () => setPressed(false));
  video.addEventListener('error', () => setUnavailable(clip));

  toggle.addEventListener('click', () => {
    if (video.paused) {
      const attempt = video.play();
      if (attempt && typeof attempt.catch === 'function') {
        attempt.catch(() => setUnavailable(clip));
      }
    } else {
      video.pause();
    }
  });
}

function wireCopy(clip: HTMLElement): void {
  const code = qs<HTMLElement>('.prompt__text code', clip);
  const text = code ? (code.textContent ?? '').trim() : '';
  if (!text) return;

  for (const button of qsa<HTMLButtonElement>('[data-copy-prompt], [data-start-prompt]', clip)) {
    const original = button.textContent ?? '';
    button.addEventListener('click', async () => {
      if (button.hasAttribute('data-start-prompt')) {
        // Clicking "start" must lead into the actual product, not merely copy text.
        const composer = qs<HTMLTextAreaElement>('[data-console-input]');
        const consoleSection = qs<HTMLElement>('#console');
        if (composer && consoleSection) {
          composer.value = text;
          composer.dispatchEvent(new Event('input', { bubbles: true }));
          consoleSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Focus even when the live agent is not connected; do not send a request
          // until the user explicitly clicks Create.
          if (!composer.hidden && composer.offsetParent !== null) {
            composer.focus({ preventScroll: true });
          }
          announce('Example loaded into the video brief. Connect your agent if prompted, then create.');
          return;
        }
        announce('The creation console is not available. Copy the prompt instead.');
      }
      const ok = await copyText(text);
      if (!ok) {
        announce('Copy failed — select the prompt text and copy it manually.');
        return;
      }
      button.textContent = 'Copied';
      window.setTimeout(() => { button.textContent = original; }, 1800);
      announce('Prompt copied to the clipboard.');
    });
  }
}

/**
 * Puts the manifest text on the page: the title, the duration + stack line,
 * the prompt and the video's accessible name all come from src/clips.json.
 * The markup carries the same strings as a no-JS fallback — this keeps the
 * two from drifting apart, and it means the prompt you copy is the prompt
 * the manifest records.
 */
function applySourceText(clip: HTMLElement): void {
  const id = clip.dataset.clip ?? '';
  const record = byId.get(id);
  if (!record) return;

  const title = qs<HTMLElement>('.clip__title', clip);
  if (title) title.textContent = record.title;

  const sub = qs<HTMLElement>('.clip__sub', clip);
  if (sub) {
    // The accent mark is decorative; the text after it is the real content.
    const mark = sub.querySelector('.mark');
    sub.textContent = '';
    if (mark) sub.appendChild(mark);
    sub.appendChild(document.createTextNode(`${record.duration} · ${record.stack}`));
  }

  const code = qs<HTMLElement>('.prompt__text code', clip);
  if (code) code.textContent = record.prompt;

  const video = qs<HTMLVideoElement>('[data-clip-video]', clip);
  if (video) video.setAttribute('aria-label', record.alt);
}

/**
 * Wires the gallery. The clips themselves are real rendered files; when a file
 * is missing the block shows its poster (if there is one) and an explicit
 * "not yet rendered" state instead of a broken player.
 */
export function initClips(): void {
  for (const clip of qsa<HTMLElement>('[data-clip]')) {
    const id = clip.dataset.clip ?? '';
    const entry = manifest.clips?.[id];
    const video = qs<HTMLVideoElement>('[data-clip-video]', clip);
    const state = qs<HTMLElement>('[data-clip-state]', clip);

    applySourceText(clip);

    if (entry && entry.video && video) {
      video.src = entry.videoSrc;
      if (entry.poster) {
        video.poster = entry.posterSrc;
      } else if (state) {
        state.style.backgroundImage = '';
      }
      wirePlayer(clip);
    } else {
      if (state && entry && entry.poster) {
        state.style.backgroundImage = `url("${entry.posterSrc}")`;
        state.style.backgroundColor = 'var(--player)';
      }
      setUnavailable(clip);
    }

    wireCopy(clip);
  }
}

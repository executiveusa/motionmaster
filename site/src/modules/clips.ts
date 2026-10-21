import clipManifest from '../data/clip-manifest.json';
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

const manifest = clipManifest as Manifest;

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

  const buttons = qsa<HTMLButtonElement>('[data-copy-prompt], [data-start-prompt]', clip);
  for (const button of buttons) {
    const original = button.textContent ?? '';
    button.addEventListener('click', async () => {
      const ok = await copyText(text);
      if (!ok) {
        announce('Copy failed — select the prompt text and copy it manually.');
        return;
      }
      button.textContent = 'Copied';
      window.setTimeout(() => {
        button.textContent = original;
      }, 1800);
      if (button.hasAttribute('data-start-prompt')) {
        announce('Prompt copied. Paste it into ChatGPT, Codex or Claude to start from here.');
      } else {
        announce('Prompt copied to the clipboard.');
      }
    });
  }
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

export const qs = <T extends Element = HTMLElement>(
  selector: string,
  scope: ParentNode = document,
): T | null => scope.querySelector<T>(selector);

export const qsa = <T extends Element = HTMLElement>(
  selector: string,
  scope: ParentNode = document,
): T[] => Array.from(scope.querySelectorAll<T>(selector));

export const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Copy text to the clipboard, with a fallback for browsers without the async API. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }

  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '-1000px';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

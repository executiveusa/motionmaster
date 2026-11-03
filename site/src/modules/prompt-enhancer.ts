/**
 * Review-first prompt improvement. No implicit submission, model download,
 * billing or mutation of the user's original brief.
 * Reuses Motion Master's existing MCP enhancer through its HTTP adapter.
 */
import { agentBase } from './chat';

type Suggestion = {
  original: string;
  enhanced: string;
  provider: string;
  assumptions?: string[];
  applied: boolean;
  warning?: string;
};
const node = <T extends Element>(q: string) => document.querySelector<T>(q);
let pending: AbortController | null = null;

export function initPromptEnhancer(): void {
  const input = node<HTMLTextAreaElement>('[data-console-input]');
  const button = node<HTMLButtonElement>('[data-enhance-brief]');
  const panel = node<HTMLElement>('[data-enhance-review]');
  const output = node<HTMLTextAreaElement>('[data-enhance-output]');
  const apply = node<HTMLButtonElement>('[data-enhance-apply]');
  const dismiss = node<HTMLButtonElement>('[data-enhance-dismiss]');
  const note = node<HTMLElement>('[data-enhance-assumptions]');
  const provider = node<HTMLElement>('[data-enhance-provider]');
  const choice = node<HTMLSelectElement>('[data-enhance-choice]');
  if (!input || !button || !panel || !output || !apply || !dismiss || !note || !provider) return;

  let original = '';
  let suggestion: Suggestion | null = null;
  const locale = () => document.documentElement.lang === 'es-MX';
  const hide = () => { panel.hidden = true; suggestion = null; };
  const status = (text: string) => { note.textContent = text; };

  button.addEventListener('click', async () => {
    if (pending) return;
    const prompt = input.value.trim();
    if (!prompt) {
      panel.hidden = false;
      output.value = '';
      apply.disabled = true;
      status(locale() ? 'Escribe primero una descripción.' : 'Write a brief first.');
      return;
    }
    original = input.value;
    suggestion = null;
    apply.disabled = true;
    panel.hidden = false;
    output.value = '';
    provider.textContent = '';
    status(locale() ? 'Mejorando la descripción…' : 'Improving the brief…');
    pending = new AbortController();
    button.disabled = true;
    try {
      const response = await fetch(`${agentBase()}/api/v1/prompts/enhance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, provider: choice?.value === "hunyuan" ? "hunyuan" : "motion-master" }),
        signal: pending.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json() as Suggestion;
      if (typeof data.enhanced !== 'string' || !data.enhanced.trim() || data.original !== prompt || data.applied !== false) {
        throw new Error('Invalid enhancement response');
      }
      suggestion = data;
      output.value = data.enhanced;
      provider.textContent = data.provider === 'motion-master' ? 'Motion Master' : data.provider;
      const providerWarning = typeof data.warning === 'string' ? data.warning : '';
      const assumptions = Array.isArray(data.assumptions) ? data.assumptions : [];
      const reviewNote = assumptions.length
        ? (locale() ? 'Suposiciones (revísalas): ' : 'Assumptions (review these): ') + assumptions.join(' · ')
        : (locale() ? 'Sin suposiciones adicionales.' : 'No additional assumptions.');
      status([providerWarning, reviewNote].filter(Boolean).join(' · '));
      apply.disabled = false;
    } catch {
      // Honest failure: original remains in the composer and rendering never starts.
      status(locale()
        ? 'No se pudo mejorar. Revisa la conexión con el agente; se conserva tu texto original.'
        : 'Could not improve the brief. Check your agent connection; the original is unchanged.');
    } finally {
      pending = null;
      button.disabled = false;
    }
  });

  apply.addEventListener('click', () => {
    if (!suggestion || apply.disabled || !output.value.trim()) return;
    // If the user changed the brief while a preview was open, never overwrite it.
    if (input.value !== original) {
      status(locale()
        ? 'La descripción cambió. Vuelve a mejorarla para evitar sobrescribir tu trabajo.'
        : 'The brief changed. Improve it again rather than overwriting your edits.');
      return;
    }
    input.value = output.value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    hide();
    input.focus();
  });
  dismiss.addEventListener('click', () => { pending?.abort(); hide(); });
  input.addEventListener('input', () => { if (suggestion) apply.disabled = input.value !== original; });
}

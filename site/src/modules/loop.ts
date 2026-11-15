/**
 * The loop panel.
 *
 * The console is a conversation with an agent. This is the other half: the
 * studio running by itself, and a way to put work into it.
 *
 * It is a lab instrument, not a dashboard. There are no cards, no grid of
 * statistics and no cheerful green tick. There is:
 *
 *   - **the queue** — how many briefs are waiting, how many films are done
 *   - **the last few lines of the ledger** — what the studio actually did
 *   - **one box** — a brief, and a button that puts it in the inbox
 *
 * Every number here is read from the studio's own ledger. None of them are
 * invented, and none of them are computed on the page.
 *
 * The panel is honest when it cannot reach the studio: it says so, and it
 * says how to start it. A panel that shows zeroes when it cannot connect is
 * worse than no panel.
 */
import { agentBase } from './chat';

const qs = <T extends Element>(selector: string): T | null =>
  document.querySelector<T>(selector);

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

/** The agent address may carry a key, for a studio with tenants. */
function headers(): Record<string, string> {
  const key = localStorage.getItem('motion-master-api-key');
  return key ? { authorization: `Bearer ${key}` } : {};
}

function renderState(root: HTMLElement, status: Record<string, unknown>, metrics: Record<string, unknown>): void {
  const queue = (status.queue ?? {}) as { queued?: number; interrupted?: number };
  const events = (metrics.events ?? {}) as { total?: number };
  const published = (metrics.published ?? {}) as { total?: number };
  const findings = (metrics.findings ?? {}) as { total?: number };
  const repairs = (metrics.repairs ?? {}) as { total?: number };
  const repeated = metrics.repeatedFailure as { code?: string; count?: number } | null;

  const figures = root.querySelector('[data-loop-figures]');
  if (!figures) return;
  figures.replaceChildren();

  const rows: [string, string][] = [
    ['waiting', String(queue.queued ?? 0)],
    ['films', String(published.total ?? 0)],
    ['events', String(events.total ?? 0)],
    ['findings', String(findings.total ?? 0)],
    ['repaired', String(repairs.total ?? 0)],
  ];

  for (const [label, value] of rows) {
    const cell = el('div', 'loop__figure');
    cell.appendChild(el('span', 'loop__figure-value', value));
    cell.appendChild(el('span', 'loop__figure-label', label));
    figures.appendChild(cell);
  }

  /* The one number that says the loop needs a person. */
  const note = root.querySelector('[data-loop-note]');
  if (note) {
    note.textContent = repeated?.code
      ? `"${repeated.code}" has failed ${repeated.count} times in a row. That is a repair rule that does not work yet.`
      : '';
    note.classList.toggle('loop__note--warn', Boolean(repeated?.code));
  }
}

function renderLedger(root: HTMLElement, events: Record<string, unknown>[]): void {
  const list = root.querySelector('[data-loop-events]');
  if (!list) return;
  list.replaceChildren();

  const recent = events.slice(-8).reverse();
  if (recent.length === 0) {
    list.appendChild(el('p', 'loop__empty', 'Nothing yet. Put a brief in and the studio will start.'));
    return;
  }

  for (const entry of recent) {
    const row = el('div', 'loop__event');
    row.appendChild(el('span', 'loop__event-when', String(entry.at ?? '').slice(11, 19)));
    row.appendChild(el('span', 'loop__event-what', String(entry.event ?? '')));
    const findings = Array.isArray(entry.findings) ? (entry.findings as string[]) : [];
    const detail = String(entry.detail ?? findings[0] ?? entry.artifact ?? '');
    if (detail) row.appendChild(el('span', 'loop__event-detail', detail));
    list.appendChild(row);
  }
}

async function refresh(root: HTMLElement): Promise<void> {
  const statusNote = root.querySelector('[data-loop-status]');
  try {
    const base = agentBase();
    const [statusResponse, metricsResponse] = await Promise.all([
      fetch(`${base}/api/v1/supervisor/status`, { headers: headers() }),
      fetch(`${base}/api/v1/supervisor/metrics`, { headers: headers() }),
    ]);
    if (!statusResponse.ok || !metricsResponse.ok) throw new Error(`status ${statusResponse.status}`);
    const status = (await statusResponse.json()) as Record<string, unknown>;
    const metrics = (await metricsResponse.json()) as Record<string, unknown>;
    renderState(root, status, metrics);
    renderLedger(root, (metrics.events ?? []) as Record<string, unknown>[]);
    if (statusNote) {
      statusNote.textContent = '';
      statusNote.classList.remove('loop__status--off');
    }
  } catch {
    if (statusNote) {
      statusNote.textContent = `The studio is not running. Start it with: cd mcp && npm start`;
      statusNote.classList.add('loop__status--off');
    }
    const list = root.querySelector('[data-loop-events]');
    if (list) {
      list.replaceChildren(
        el('p', 'loop__empty', 'The studio is not running, so there is nothing to show. That is not an empty queue — it is no studio.'),
      );
    }
  }
}

export function initLoop(): void {
  const root = qs<HTMLElement>('[data-loop]');
  if (!root) return;

  const form = root.querySelector<HTMLFormElement>('[data-loop-form]');
  const title = root.querySelector<HTMLInputElement>('[data-loop-title]');
  const brief = root.querySelector<HTMLTextAreaElement>('[data-loop-brief]');
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!title?.value.trim() || !brief?.value.trim()) return;
    const note = root.querySelector('[data-loop-sent]');
    if (note) note.textContent = 'Queueing…';
    fetch(`${agentBase()}/api/v1/supervisor/brief`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers() },
      body: JSON.stringify({ title: title.value.trim(), brief: brief.value.trim() }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`status ${response.status}`);
        title.value = '';
        brief.value = '';
        if (note) note.textContent = 'In the queue. The studio will take it on its next tick.';
        await refresh(root);
      })
      .catch(() => {
        if (note) note.textContent = 'The studio did not take it. Is it running?';
      });
  });

  void refresh(root);
  /* The studio works on a clock; the panel should not pretend otherwise. */
  window.setInterval(() => void refresh(root), 10_000);
}

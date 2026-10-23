/**
 * The console.
 *
 * A lab instrument, not a chat column. The conversation is a narrow rail; the
 * artifact is the page. Every machine value — a block id, a timecode, a
 * variable, a path — is set in mono, because a reader should be able to tell
 * what the machine said without reading it.
 *
 * Three ideas carry it:
 *
 *   1. **Click, then chat.** The console opens with a row of starting points
 *      taken from the real library. Clicking one seeds the brief, so nobody
 *      has to remember what a "kinetic type" prompt looks like.
 *   2. **The artifact is the answer.** When a tool returns something, the
 *      server emits an artifact built from that real result. The console
 *      renders it beside the conversation. The model never describes a
 *      result; it shows it.
 *   3. **Your material.** The user drops in their own footage, logo or still
 *      and the agent works with it.
 *
 * The stream is the AI SDK's UI message protocol, parsed here so the page
 * keeps zero runtime dependencies.
 */
import {
  clearApiKey,
  completeOAuthIfPending,
  getApiKey,
  initiateOAuth,
  onAuthChange,
} from '../lib/openrouter-auth';

interface Turn {
  role: 'user' | 'agent';
  text?: string;
  /** A tool the agent called, shown as a mono line. */
  tool?: string;
  state?: 'running' | 'done' | 'error';
}

interface Artifact {
  kind: string;
  tool: string;
  title: string;
  payload: unknown;
  node: HTMLElement;
}

const turns: Turn[] = [];
const artifacts: Artifact[] = [];
let busy = false;
let controller: AbortController | null = null;
let attachments: { name: string; url: string; path: string }[] = [];

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

const qs = <T extends Element = HTMLElement>(
  selector: string,
  scope: ParentNode = document,
): T | null => scope.querySelector<T>(selector);

/*
 * Where the agent is.
 *
 * The page is static and the agent runs on a machine, so the address is a
 * setting rather than a constant. It is kept in this browser, it is shown in
 * the console, and the console says plainly when nothing is listening.
 */
const AGENT_KEY = 'motion-master:agent';

/** The address the page ships with. */
const defaultEndpoint = (): string =>
  qs<HTMLElement>('[data-console]')?.dataset.consoleEndpoint?.trim() || '/chat';

/** The agent's root address, without the route. */
export function agentBase(): string {
  const stored = localStorage.getItem(AGENT_KEY);
  if (stored) return stored.replace(/\/+$/, '');
  return defaultEndpoint().replace(/\/chat$/, '').replace(/\/+$/, '');
}

const endpoint = (): string => `${agentBase()}/chat`;
const filesEndpoint = (): string => `${agentBase()}/files`;

/* ------------------------------------------------------------------ render */

function renderTurns(): void {
  const rail = qs<HTMLElement>('[data-console-rail]');
  if (!rail) return;
  rail.replaceChildren();

  if (turns.length === 0) {
    const empty = el('p', 'console__empty');
    empty.textContent =
      'Click a starting point, or ask for a film. The tools are the product.';
    rail.appendChild(empty);
    return;
  }

  for (const turn of turns) {
    const node = el('div', `console__turn console__turn--${turn.role}`);
    node.appendChild(el('span', 'console__who', turn.role === 'user' ? 'you' : 'agent'));
    const body = el('div', 'console__body');
    if (turn.tool) {
      const line = el('span', 'console__tool', turn.tool);
      line.dataset.state = turn.state ?? 'done';
      body.appendChild(line);
    }
    if (turn.text) {
      const text = el('div', 'console__text');
      text.textContent = turn.text;
      body.appendChild(text);
    }
    node.appendChild(body);
    rail.appendChild(node);
  }
  rail.scrollTop = rail.scrollHeight;
}

function renderState(): void {
  const status = qs<HTMLElement>('[data-console-status]');
  if (status) {
    status.textContent = busy ? 'working' : '';
    if (busy) status.dataset.state = 'busy';
    else delete status.dataset.state;
  }
  const send = qs<HTMLButtonElement>('[data-console-send]');
  if (send) send.disabled = busy;
  const cancel = qs<HTMLButtonElement>('[data-console-cancel]');
  if (cancel) cancel.hidden = !busy;
  const signOut = qs<HTMLButtonElement>('[data-console-signout]');
  if (signOut) signOut.hidden = !getApiKey();
  const starters = qs<HTMLElement>('[data-console-starters]');
  if (starters) starters.setAttribute('aria-busy', String(busy));
}

function renderAuth(): void {
  const gate = qs<HTMLElement>('[data-console-gate]');
  const form = qs<HTMLElement>('[data-console-form]');
  const hasKey = Boolean(getApiKey());
  if (gate) gate.hidden = hasKey;
  if (form) form.hidden = !hasKey;
  renderState();
}

/* ---------------------------------------------------------------- artifacts */

/** The label a tool call shows. Mono, and true. */
function toolLabel(name: string): string {
  const labels: Record<string, string> = {
    browse_library: 'browse_library',
    list_library_categories: 'list_library_categories',
    list_library_collections: 'list_library_collections',
    get_library_item: 'get_library_item',
    list_motion_blocks: 'list_motion_blocks',
    enhance_prompt: 'enhance_prompt',
    fill_block: 'fill_block',
    compose_film: 'compose_film',
    plan_video: 'plan_video',
    build_composition: 'build_composition',
    build_hyperframes_composition: 'build_hyperframes_composition',
    mix_footage: 'mix_footage',
    list_clips: 'list_clips',
    get_clip_prompt: 'get_clip_prompt',
    list_skills: 'list_skills',
    get_motion_tokens: 'get_motion_tokens',
  };
  return labels[name] ?? name;
}

function artifactNode(kind: string, tool: string, payload: unknown): HTMLElement {
  const card = el('article', `artifact artifact--${kind}`);

  const head = el('header', 'artifact__head');
  head.appendChild(el('span', 'artifact__kind', kind));
  head.appendChild(el('span', 'artifact__tool', toolLabel(tool)));
  card.appendChild(head);

  const body = el('div', 'artifact__body');

  const data = payload as Record<string, unknown> | null;

  if (kind === 'shotlist' && data && Array.isArray(data.shots)) {
    const table = el('table', 'artifact__table');
    const headRow = el('tr');
    for (const label of ['#', 'shot', 'length', 'notes']) {
      headRow.appendChild(el('th', undefined, label));
    }
    table.appendChild(headRow);
    (data.shots as Record<string, unknown>[]).forEach((shot, index) => {
      const row = el('tr');
      row.appendChild(el('td', 'artifact__num', String(index + 1)));
      const id = el('td', 'artifact__id', String(shot.id ?? shot.title ?? '—'));
      id.title = String(shot.title ?? '');
      row.appendChild(id);
      row.appendChild(el('td', undefined, shot.duration ? `${shot.duration}s` : '—'));
      const notes = (shot.matchedTags as string[] | undefined)?.join(' · ') ?? '';
      row.appendChild(el('td', 'artifact__notes', notes));
      table.appendChild(row);
    });
    body.appendChild(table);
    if (data.headline) {
      const headline = el('p', 'artifact__headline');
      headline.textContent = `“${String(data.headline)}”`;
      body.appendChild(headline);
    }
  } else if (kind === 'brief' && data && typeof data.enhanced === 'string') {
    const pre = el('pre', 'artifact__pre');
    pre.textContent = data.enhanced;
    body.appendChild(pre);
    const score = el('p', 'artifact__meta');
    const scores = (data.score ?? {}) as { before?: number; after?: number };
    score.textContent = `weak ${scores.before ?? 0} → strong ${scores.after ?? 0}`;
    body.appendChild(score);
  } else if (kind === 'code' && data && Array.isArray(data.files)) {
    for (const file of data.files as { path: string; contents?: string }[]) {
      const label = el('p', 'artifact__path', file.path);
      body.appendChild(label);
      if (file.contents) {
        const pre = el('pre', 'artifact__pre');
        pre.textContent = file.contents.slice(0, 4000);
        body.appendChild(pre);
      }
    }
  } else if (kind === 'film' && data) {
    body.appendChild(filmNode(data as Record<string, unknown>));
  } else if (kind === 'library' && data && Array.isArray(data.items)) {
    const list = el('ul', 'artifact__list');
    for (const item of (data.items as Record<string, unknown>[]).slice(0, 8)) {
      const entry = el('li');
      entry.appendChild(el('span', 'artifact__id', String(item.id ?? '')));
      if (item.title) entry.appendChild(el('span', 'artifact__title', String(item.title)));
      list.appendChild(entry);
    }
    body.appendChild(list);
  } else {
    const pre = el('pre', 'artifact__pre');
    pre.textContent = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2) ?? '';
    body.appendChild(pre);
  }

  card.appendChild(body);
  return card;
}

/* --------------------------------------------------------------------- film */

/**
 * A film, and the state of its render.
 *
 * The render takes a minute or two, so the card says what is happening and
 * then polls the agent until the file is there. It never claims a file
 * exists before it does.
 */
function filmNode(data: Record<string, unknown>): HTMLElement {
  const card = el('div', 'film');
  const id = String(data.id ?? '');
  const status = String(data.status ?? '');

  const head = el('div', 'film__head');
  head.appendChild(el('span', 'film__title', String(data.title ?? id ?? 'film')));
  const badge = el('span', 'film__status', statusLabel(status));
  head.appendChild(badge);
  card.appendChild(head);

  const shots = Array.isArray(data.shots) ? (data.shots as Record<string, unknown>[]) : [];
  if (shots.length > 0) {
    const list = el('ol', 'film__shots');
    for (const shot of shots) {
      const item = el('li', 'film__shot');
      item.appendChild(el('span', 'film__shot-id', String(shot.id ?? '')));
      item.appendChild(el('span', 'film__shot-title', String(shot.title ?? '')));
      item.appendChild(el('span', 'film__shot-length', `${shot.duration ?? '—'}s`));
      list.appendChild(item);
    }
    card.appendChild(list);
  }

  const dropped = Array.isArray(data.dropped) ? (data.dropped as Record<string, unknown>[]) : [];
  if (dropped.length > 0) {
    const note = el('p', 'film__note');
    const names = dropped.map((d) => String(d.id ?? '')).join(', ');
    note.textContent = `The gate dropped ${names}. They are recorded so they are not used again.`;
    card.appendChild(note);
  }

  const error = data.error ? String(data.error) : '';
  if (error) {
    card.appendChild(el('p', 'film__note film__note--error', error));
  }

  const stage = el('div', 'film__stage');
  card.appendChild(stage);

  if (status === 'ready') {
    showFilm(stage, id, data);
  } else if (status === 'failed') {
    stage.appendChild(el('p', 'film__note film__note--error', 'The render did not finish.'));
  } else {
    stage.appendChild(el('p', 'film__note', 'Rendering on the machine. This takes a minute or two.'));
    if (id) pollFilm(stage, id);
  }

  return card;
}

function statusLabel(status: string): string {
  if (status === 'ready') return 'ready';
  if (status === 'failed') return 'failed';
  if (status === 'rendering') return 'rendering';
  return status || '—';
}

/** Put the file in the card. */
function showFilm(
  stage: HTMLElement,
  id: string,
  data: Record<string, unknown>,
): void {
  stage.replaceChildren();
  const video = el('video', 'film__video');
  video.controls = true;
  video.preload = 'metadata';
  video.playsInline = true;
  const poster = data.posterUrl as string | undefined;
  if (poster) video.poster = poster;
  const source = el('source');
  source.src = `${agentBase()}/films/${id}/video`;
  source.type = 'video/mp4';
  video.appendChild(source);
  stage.appendChild(video);

  const link = el('a', 'film__download', 'Download the MP4');
  link.href = `${agentBase()}/films/${id}/video`;
  link.download = `${id}.mp4`;
  stage.appendChild(link);
}

/**
 * Watch the render.
 *
 * The agent's own file route is the authority: if the file is there, it is
 * there. The poll stops on its own after a while, and says so.
 */
function pollFilm(stage: HTMLElement, id: string): void {
  let tries = 0;
  const tick = async (): Promise<void> => {
    tries += 1;
    if (tries > 120) {
      stage.replaceChildren();
      stage.appendChild(
        el('p', 'film__note', 'Still rendering. Ask for the film again in a minute.'),
      );
      return;
    }
    try {
      const response = await fetch(`${agentBase()}/films/${id}`, { cache: 'no-store' });
      if (!response.ok) {
        window.setTimeout(() => void tick(), 4000);
        return;
      }
      const body = (await response.json()) as {
        status?: string;
        error?: string;
        videoUrl?: string;
        posterUrl?: string;
        sheetUrl?: string;
      };
      if (body.status === 'ready') {
        showFilm(stage, id, {
          posterUrl: body.posterUrl,
        });
        return;
      }
      if (body.status === 'failed') {
        stage.replaceChildren();
        stage.appendChild(
          el('p', 'film__note film__note--error', body.error ?? 'The render did not finish.'),
        );
        return;
      }
    } catch {
      /* the agent may be busy; try again */
    }
    window.setTimeout(() => void tick(), 4000);
  };
  window.setTimeout(() => void tick(), 2500);
}

/* -------------------------------------------------------------------- send */

async function send(text: string): Promise<void> {
  const key = getApiKey();
  if (!key) {
    await initiateOAuth();
    return;
  }

  const withFiles = attachments.length
    ? `${text}\n\nAttached: ${attachments.map((f) => f.path).join(', ')}`
    : text;

  turns.push({ role: 'user', text: withFiles });
  busy = true;
  controller = new AbortController();
  renderTurns();
  renderState();

  const agentTurn: Turn = { role: 'agent', text: '' };
  turns.push(agentTurn);
  renderTurns();

  try {
    const response = await fetch(endpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: turns
          .filter((t) => !t.tool && t.text)
          .map((t) => ({ role: t.role, content: t.text })),
        apiKey: key,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const problem = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(problem.error ?? `The agent returned ${response.status}.`);
    }

    await readStream(response, agentTurn);
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      agentTurn.text = agentTurn.text || 'Stopped.';
    } else {
      agentTurn.text = `The agent failed: ${(error as Error).message}`;
    }
  } finally {
    busy = false;
    controller = null;
    attachments = [];
    renderAttachments();
    renderTurns();
    renderState();
  }
}

/**
 * Read the UI message stream. Each part is `data: {json}\n\n`, and the stream
 * ends with `data: [DONE]`.
 */
async function readStream(response: Response, agentTurn: Turn): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('The agent returned no stream.');

  const decoder = new TextDecoder();
  let buffer = '';
  const toolTurns = new Map<string, Turn>();

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let boundary = buffer.indexOf('\n\n');
    while (boundary !== -1) {
      const chunk = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      handlePart(chunk, agentTurn, toolTurns);
      boundary = buffer.indexOf('\n\n');
    }
  }
  if (buffer.trim()) handlePart(buffer, agentTurn, toolTurns);
}

function handlePart(chunk: string, agentTurn: Turn, toolTurns: Map<string, Turn>): void {
  const dataLine = chunk
    .split('\n')
    .find((line) => line.startsWith('data:'));
  if (!dataLine) return;
  const payload = dataLine.slice(5).trim();
  if (!payload || payload === '[DONE]') return;

  let part: { type?: string; [key: string]: unknown };
  try {
    part = JSON.parse(payload);
  } catch {
    return;
  }

  switch (part.type) {
    case 'text-delta': {
      const delta = String(part.delta ?? '');
      if (delta) {
        agentTurn.text += delta;
        renderTurns();
      }
      break;
    }
    case 'tool-input-start':
    case 'tool-input-available': {
      const id = String(part.toolCallId ?? '');
      const name = String(part.toolName ?? '');
      if (id && name && !toolTurns.has(id)) {
        const turn: Turn = { role: 'agent', tool: toolLabel(name), state: 'running' };
        toolTurns.set(id, turn);
        turns.splice(turns.indexOf(agentTurn), 0, turn);
        renderTurns();
      }
      break;
    }
    case 'tool-output-available':
    case 'tool-output-error': {
      const id = String(part.toolCallId ?? '');
      const turn = toolTurns.get(id);
      if (turn) {
        turn.state = part.type === 'tool-output-error' ? 'error' : 'done';
        renderTurns();
      }
      break;
    }
    case 'data-artifact': {
      const data = part.data as { kind: string; tool: string; title: string; payload: unknown };
      if (!data) break;
      const node = artifactNode(data.kind, data.tool, data.payload);
      artifacts.push({ kind: data.kind, tool: data.tool, title: data.title, payload: data.payload, node });
      const column = qs<HTMLElement>('[data-console-artifacts]');
      if (column) column.appendChild(node);
      break;
    }
    case 'error': {
      agentTurn.text = String(part.errorText ?? 'The agent failed.');
      renderTurns();
      break;
    }
    default:
      break;
  }
}

/* -------------------------------------------------------------- attachments */

function renderAttachments(): void {
  const list = qs<HTMLElement>('[data-console-files]');
  if (!list) return;
  list.replaceChildren();
  for (const file of attachments) {
    const chip = el('span', 'console__file', file.name);
    chip.title = file.path;
    list.appendChild(chip);
  }
  const input = qs<HTMLInputElement>('[data-console-file]');
  if (input) input.value = '';
}

async function uploadFiles(files: FileList): Promise<void> {
  for (const file of Array.from(files)) {
    const body = new FormData();
    body.append('file', file, file.name);
    try {
      const response = await fetch(filesEndpoint(), { method: 'POST', body });
      const result = (await response.json()) as { file?: { name: string; url: string; relativePath: string } };
      if (result.file) {
        attachments.push({
          name: result.file.name,
          url: result.file.url,
          path: result.file.relativePath,
        });
      }
    } catch {
      const chip = el('span', 'console__file console__file--error', `${file.name} failed`);
      qs<HTMLElement>('[data-console-files]')?.appendChild(chip);
    }
  }
  renderAttachments();
}

/* -------------------------------------------------------------------- agent */

/**
 * Is an agent listening?
 *
 * The page is static; the agent is not. Rather than fail with a stack of
 * network noise, the console says what it can see and what to do about it.
 */
async function checkAgent(): Promise<void> {
  const dot = qs<HTMLElement>('[data-console-agent-dot]');
  const state = qs<HTMLElement>('[data-console-agent-state]');
  const input = qs<HTMLInputElement>('[data-console-agent-input]');
  if (input && !input.value) input.value = agentBase();

  if (!dot || !state) return;
  dot.classList.remove('console__agent-dot--on', 'console__agent-dot--off');
  state.textContent = 'checking the agent…';

  try {
    const response = await fetch(`${agentBase()}/health`, { cache: 'no-store' });
    if (!response.ok) throw new Error(String(response.status));
    const health = (await response.json()) as { tools?: string[]; skills?: number };
    dot.classList.add('console__agent-dot--on');
    const tools = Array.isArray(health.tools) ? health.tools.length : 0;
    state.textContent = `agent connected · ${tools} tools`;
  } catch {
    dot.classList.add('console__agent-dot--off');
    state.textContent = 'no agent here — start it with: cd mcp && npm start';
  }
}

function saveAgent(): void {
  const input = qs<HTMLInputElement>('[data-console-agent-input]');
  const value = input?.value.trim() ?? '';
  if (!value) return;
  localStorage.setItem(AGENT_KEY, value.replace(/\/+$/, ''));
  void checkAgent();
}

/* -------------------------------------------------------------------- init */

export function initConsole(): void {
  const root = qs<HTMLElement>('[data-console]');
  if (!root) return;

  void completeOAuthIfPending()
    .then(() => renderAuth())
    .catch((error) => {
      const gate = qs<HTMLElement>('[data-console-gate]');
      if (gate) {
        gate.hidden = false;
        const note = qs<HTMLElement>('[data-console-gate-note]');
        if (note) note.textContent = (error as Error).message;
      }
    });

  onAuthChange(renderAuth);
  renderAuth();
  renderTurns();
  renderState();
  void checkAgent();

  qs<HTMLButtonElement>('[data-console-agent-save]')?.addEventListener('click', (event) => {
    event.preventDefault();
    saveAgent();
  });
  qs<HTMLInputElement>('[data-console-agent-input]')?.addEventListener('keydown', (event) => {
    if ((event as KeyboardEvent).key !== 'Enter') return;
    event.preventDefault();
    saveAgent();
  });

  const form = qs<HTMLFormElement>('[data-console-form]');
  const input = qs<HTMLTextAreaElement>('[data-console-input]');

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = input?.value.trim() ?? '';
    if (!value || busy) return;
    if (input) input.value = '';
    void send(value);
  });

  // Click a starter and the brief is written for you.
  for (const starter of Array.from(
    document.querySelectorAll<HTMLButtonElement>('[data-console-starter]'),
  )) {
    starter.addEventListener('click', () => {
      const brief = starter.dataset.consoleStarter ?? '';
      if (input) {
        input.value = brief;
        input.focus();
      }
    });
  }

  qs<HTMLButtonElement>('[data-console-cancel]')?.addEventListener('click', () => {
    controller?.abort();
  });

  qs<HTMLButtonElement>('[data-console-signin]')?.addEventListener('click', (event) => {
    event.preventDefault();
    void initiateOAuth();
  });

  qs<HTMLButtonElement>('[data-console-signout]')?.addEventListener('click', () => {
    clearApiKey();
  });

  qs<HTMLInputElement>('[data-console-file]')?.addEventListener('change', (event) => {
    const target = event.target as HTMLInputElement;
    if (target.files?.length) void uploadFiles(target.files);
  });
}

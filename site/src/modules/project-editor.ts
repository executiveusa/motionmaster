/**
 * MM-08 private project editor. One disclosed template and one simple workflow:
 * connect -> create/open -> edit text/colour/duration -> save -> render -> download.
 * The static gallery stays the homepage. Never persist a private API key.
 */
type Shot = { id: string; title: string; duration: number; values?: Record<string, string> };
type Revision = { number: number; title: string; brief: string; shots: Shot[] };
type Project = { id: string; title: string; currentRevision: number };
type OpenProject = { project: Project; revision: Revision };
type Job = { id: string; status: string; revision: number; error?: string };
type Variable = { id: string; type: string; label: string; default?: unknown };
type Block = { id: string; duration: number | null; variables: Variable[] };
const TEMPLATE = 'lt-neon-border';
const q = <T extends Element>(root: ParentNode, selector: string): T | null => root.querySelector<T>(selector);
const localHost = (name: string): boolean => ['localhost', '127.0.0.1', '[::1]'].includes(name);
function safeEndpoint(input: string): string {
  const url = new URL(input);
  if (url.username || url.password || url.search || url.hash ||
      (url.protocol !== 'https:' && !(url.protocol === 'http:' && localHost(url.hostname)))) {
    throw new Error('Use HTTPS, or HTTP on your own loopback machine.');
  }
  if (url.pathname !== '/' && url.pathname !== '') throw new Error('Enter the server origin, without a path.');
  return url.origin;
}
function status(root: ParentNode, key: string): void {
  const node = q<HTMLElement>(root, '[data-project-status]');
  if (!node) return;
  node.dataset.i18n = key;
  node.textContent = ({
    editorReady: 'Connected to private workspace.',
    editorOffline: 'Cannot connect. Check the address, key and server CORS settings.',
    editorChoose: 'Select a saved project or create a lower-third video.',
    editorLoaded: 'Project reopened. Edit the fields below.',
    editorCreated: 'Project created. Save or render when ready.',
    editorSaved: 'Changes saved as a new revision.',
    editorConflict: 'This project changed elsewhere. Reopen before editing.',
    editorQueued: 'Render queued. The private worker must be running.',
    editorWorking: 'Rendering your video…',
    editorComplete: 'Video ready. Watch or download it.',
    editorFailed: 'The render failed. Reopen the project to retry.',
    editorCancelled: 'Render cancelled. Your saved project is unchanged.',
    editorNoShots: 'This project has no editable shots. Create a lower-third to begin.',
    editorError: 'The request failed. Check your connection and permissions.',
  } as Record<string, string>)[key] ?? key;
}
export function initProjectEditor(): void {
  const consoleRoot = document.querySelector<HTMLElement>('[data-console]');
  const section = consoleRoot?.closest('section');
  if (!section) return;
  const root = document.createElement('section');
  root.id = 'project-editor';
  root.className = 'section project-editor';
  root.dataset.projectEditor = '';
  root.innerHTML = [
    '<div class="shell"><details class="project-editor__details">',
    '<summary data-i18n="editorSummary">Edit a saved video</summary>',
    '<div class="project-editor__body">',
    '<p data-i18n="editorIntro">Private workspace. Connect your own running agent to create, edit and export a video. Nothing is published.</p>',
    '<form data-project-connect class="project-editor__connect">',
    '<label><span data-i18n="editorServer">Private agent address</span><input data-project-server type="url" inputmode="url" autocomplete="off" placeholder="https://your-private-agent.example" required></label>',
    '<label><span data-i18n="editorKey">Private access key (kept only until this page closes)</span><input data-project-key type="password" autocomplete="off" spellcheck="false"></label>',
    '<button class="btn btn--ghost" type="submit" data-i18n="editorConnect">Open workspace</button>',
    '</form>',
    '<p data-project-status role="status" aria-live="polite"></p>',
    '<div data-project-workspace hidden>',
    '<div class="project-editor__toolbar">',
    '<label><span data-i18n="editorProjects">Saved projects</span><select data-project-list aria-label="Saved projects"></select></label>',
    '<button type="button" class="btn btn--ghost" data-project-open data-i18n="editorOpen">Open project</button>',
    '<button type="button" class="btn btn--ghost" data-project-refresh data-i18n="editorRefresh">Refresh</button>',
    '</div>',
    '<form data-project-create class="project-editor__form">',
    '<h3 data-i18n="editorNew">New lower-third video</h3>',
    '<label><span data-i18n="editorTitle">Project title</span><input data-project-new-title maxlength="120" required value="My lower-third"></label>',
    '<label><span data-i18n="editorBrief">Video brief</span><textarea data-project-new-brief maxlength="4000" rows="2" required>A clean lower-third introduction</textarea></label>',
    '<label><span data-i18n="editorText">On-screen text</span><input data-project-new-text maxlength="200" required placeholder="Your name"></label>',
    '<button type="submit" class="btn btn--primary" data-i18n="editorCreate">Create editable video</button>',
    '</form>',
    '<form data-project-edit class="project-editor__form" hidden>',
    '<h3 data-i18n="editorEdit">Edit this video</h3>',
    '<label><span data-i18n="editorTitle">Project title</span><input data-project-title maxlength="120" required></label>',
    '<label><span data-i18n="editorBrief">Video brief</span><textarea data-project-brief maxlength="4000" rows="2" required></textarea></label>',
    '<div data-project-shots></div>',
    '<div class="project-editor__actions">',
    '<button type="submit" class="btn btn--primary" data-i18n="editorSave">Save changes</button>',
    '<button type="button" class="btn btn--ghost" data-project-render data-i18n="editorRender">Render saved version</button>',
    '<button type="button" class="btn btn--ghost" data-project-cancel data-i18n="editorCancel" hidden>Cancel render</button>',
    '</div></form>',
    '<div data-project-result hidden>',
    '<video data-project-video controls playsinline preload="metadata" aria-label="Your rendered video"></video>',
    '<div class="project-editor__actions">',
    '<button type="button" class="btn btn--ghost" data-project-download data-i18n="editorDownload">Download MP4</button>',
    '<button type="button" class="btn btn--ghost" data-project-source data-i18n="editorSource">Export editable source</button>',
    '</div></div>',
    '</div></div></details></div>',
  ].join('');
  section.after(root);

  let base = '';
  let key = '';
  let current: OpenProject | null = null;
  let job: Job | null = null;
  let videoUrl: string | null = null;
  let busy = false;
  const blocks = new Map<string, Block>();
  const workspace = q<HTMLElement>(root, '[data-project-workspace]')!;
  const editForm = q<HTMLFormElement>(root, '[data-project-edit]')!;
  const result = q<HTMLElement>(root, '[data-project-result]')!;
  const video = q<HTMLVideoElement>(root, '[data-project-video]')!;
  const shotRoot = q<HTMLElement>(root, '[data-project-shots]')!;
  const cancelButton = q<HTMLButtonElement>(root, '[data-project-cancel]')!;
  const server = q<HTMLInputElement>(root, '[data-project-server]')!;
  if (localHost(location.hostname)) server.value = location.origin;

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    if (key) headers.set('Authorization', 'Bearer ' + key);
    if (init.body && typeof init.body === 'string') headers.set('Content-Type', 'application/json');
    const response = await fetch(base + '/api/v1' + path, { ...init, headers, cache: 'no-store' });
    if (!response.ok) {
      const error = new Error('HTTP ' + response.status);
      (error as Error & { status: number }).status = response.status;
      throw error;
    }
    return response.json() as Promise<T>;
  }
  function clearVideo(): void {
    video.pause();
    video.removeAttribute('src');
    video.load();
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    videoUrl = null;
    result.hidden = true;
  }
  function setBusy(value: boolean): void {
    busy = value;
    for (const button of root.querySelectorAll<HTMLButtonElement>('button')) button.disabled = value;
  }
  function failed(error: unknown): void {
    status(root, (error as { status?: number })?.status === 409 ? 'editorConflict' : 'editorError');
  }
  async function getBlock(id: string): Promise<Block> {
    const existing = blocks.get(id);
    if (existing) return existing;
    const block = await request<Block>('/blocks/' + encodeURIComponent(id));
    blocks.set(id, block);
    return block;
  }
  async function refresh(): Promise<void> {
    const list = await request<Project[]>('/projects');
    const select = q<HTMLSelectElement>(root, '[data-project-list]')!;
    const previous = current?.project.id ?? select.value;
    select.replaceChildren();
    for (const item of list) {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.title;
      select.append(option);
    }
    if (list.some((item) => item.id === previous)) select.value = previous;
  }
  async function openProject(id: string): Promise<void> {
    const opened = await request<OpenProject>('/projects/' + encodeURIComponent(id));
    current = opened;
    job = null;
    cancelButton.hidden = true;
    clearVideo();
    q<HTMLInputElement>(root, '[data-project-title]')!.value = opened.revision.title;
    q<HTMLTextAreaElement>(root, '[data-project-brief]')!.value = opened.revision.brief;
    shotRoot.replaceChildren();
    for (const [index, shot] of opened.revision.shots.entries()) {
      const block = await getBlock(shot.id);
      const group = document.createElement('fieldset');
      group.dataset.shotIndex = String(index);
      const legend = document.createElement('legend');
      legend.textContent = shot.title || block.id;
      group.append(legend);
      const durationLabel = document.createElement('label');
      const durationText = document.createElement('span');
      durationText.dataset.i18n = 'editorDuration';
      durationText.textContent = 'Duration (seconds)';
      const duration = document.createElement('input');
      duration.type = 'number';
      duration.step = '0.1';
      duration.min = '0.1';
      duration.max = String(block.duration ?? shot.duration);
      duration.required = true;
      duration.dataset.shotDuration = '';
      duration.value = String(shot.duration);
      durationLabel.append(durationText, duration);
      group.append(durationLabel);
      for (const variable of block.variables.filter((v) => v.type === 'string' || v.type === 'color')) {
        const label = document.createElement('label');
        const caption = document.createElement('span');
        caption.dataset.i18n = variable.type === 'color' ? 'editorColor' : 'editorText';
        caption.textContent = variable.type === 'color' ? 'Color' : 'On-screen text';
        const variableId = document.createElement('small');
        variableId.textContent = ' · ' + variable.id;
        caption.append(variableId);
        const input = document.createElement('input');
        input.dataset.shotVariable = variable.id;
        input.type = variable.type === 'color' ? 'color' : 'text';
        input.maxLength = 200;
        const original = shot.values?.[variable.id] ?? variable.default;
        input.value = typeof original === 'string' && (variable.type !== 'color' || /^#[0-9a-f]{6}$/i.test(original))
          ? original : variable.type === 'color' ? '#ffffff' : '';
        label.append(caption, input);
        group.append(label);
      }
      shotRoot.append(group);
    }
    editForm.hidden = opened.revision.shots.length === 0;
    if (!opened.revision.shots.length) status(root, 'editorNoShots');
    else status(root, 'editorLoaded');
    q<HTMLSelectElement>(root, '[data-project-list]')!.value = id;
  }
  function editedShots(): Shot[] {
    if (!current) throw new Error('No project open');
    return current.revision.shots.map((shot, index) => {
      const fieldset = q<HTMLFieldSetElement>(shotRoot, '[data-shot-index="' + index + '"]')!;
      const duration = Number(q<HTMLInputElement>(fieldset, '[data-shot-duration]')!.value);
      if (!Number.isFinite(duration) || duration <= 0) throw new Error('Invalid duration');
      const values: Record<string, string> = {};
      for (const input of fieldset.querySelectorAll<HTMLInputElement>('[data-shot-variable]')) {
        values[input.dataset.shotVariable!] = input.value;
      }
      return { ...shot, duration, values };
    });
  }
  async function save(): Promise<void> {
    if (!current) return;
    const saved = await request<OpenProject>('/projects/' + encodeURIComponent(current.project.id) + '/revisions', {
      method: 'POST',
      body: JSON.stringify({
        expectedRevision: current.revision.number,
        title: q<HTMLInputElement>(root, '[data-project-title]')!.value.trim(),
        brief: q<HTMLTextAreaElement>(root, '[data-project-brief]')!.value.trim(),
        shots: editedShots(),
      }),
    });
    current = saved;
    job = null;
    cancelButton.hidden = true;
    clearVideo();
    status(root, 'editorSaved');
    await refresh();
  }
  async function render(): Promise<void> {
    if (!current || (job && ['queued', 'rendering'].includes(job.status))) return;
    clearVideo();
    const projectId = current.project.id;
    const queued = await request<Job>('/projects/' + encodeURIComponent(projectId) + '/jobs', {
      method: 'POST', body: JSON.stringify({ revision: current.revision.number }),
    });
    job = queued;
    cancelButton.hidden = false;
    status(root, 'editorQueued');
    // Do not lock the editor while a render is running. Users can cancel.
    void watch(projectId, queued.id);
  }
  async function watch(projectId: string, jobId: string): Promise<void> {
    try {
      for (let attempt = 0; attempt < 80; attempt++) {
        if (attempt) await new Promise((resolve) => setTimeout(resolve, 1500));
        if (!job || job.id !== jobId || current?.project.id !== projectId) return;
        const next = await request<Job>('/projects/' + encodeURIComponent(projectId) + '/jobs/' + encodeURIComponent(jobId));
        if (!job || job.id !== jobId) return;
        job = next;
        if (next.status === 'ready') {
          cancelButton.hidden = true;
          const response = await authenticatedFile('/projects/' + encodeURIComponent(projectId) + '/jobs/' + encodeURIComponent(jobId) + '/artifact');
          if (job?.id !== jobId) return;
          videoUrl = URL.createObjectURL(await response.blob());
          video.src = videoUrl;
          result.hidden = false;
          status(root, 'editorComplete');
          return;
        }
        if (next.status === 'failed' || next.status === 'cancelled') {
          cancelButton.hidden = true;
          status(root, next.status === 'cancelled' ? 'editorCancelled' : 'editorFailed');
          return;
        }
        if (next.status === 'rendering') status(root, 'editorWorking');
      }
      status(root, 'editorQueued');
    } catch (error) {
      failed(error);
    }
  }
  async function cancel(): Promise<void> {
    if (!current || !job || !['queued', 'rendering'].includes(job.status)) return;
    const projectId = current.project.id;
    const cancelled = await request<Job>('/projects/' + encodeURIComponent(projectId) + '/jobs/' + encodeURIComponent(job.id) + '/cancel', { method: 'POST' });
    job = cancelled;
    cancelButton.hidden = true;
    status(root, 'editorCancelled');
  }
  async function authenticatedFile(path: string): Promise<Response> {
    const headers = new Headers();
    if (key) headers.set('Authorization', 'Bearer ' + key);
    const response = await fetch(base + '/api/v1' + path, { headers, cache: 'no-store' });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return response;
  }
  async function download(source: boolean): Promise<void> {
    if (!current || !job || job.status !== 'ready') return;
    const path = '/projects/' + encodeURIComponent(current.project.id) + '/jobs/' + encodeURIComponent(job.id) +
      (source ? '/source' : '/artifact');
    const response = await authenticatedFile(path);
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = 'motion-master-' + current.project.id + (source ? '.json.gz' : '.mp4');
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  async function action(run: () => Promise<void>): Promise<void> {
    if (busy) return;
    setBusy(true);
    try { await run(); } catch (error) { failed(error); }
    finally { setBusy(false); }
  }
  q<HTMLFormElement>(root, '[data-project-connect]')!.addEventListener('submit', (event) => {
    event.preventDefault();
    void action(async () => {
      const proposed = safeEndpoint(server.value.trim());
      const entered = q<HTMLInputElement>(root, '[data-project-key]')!;
      workspace.hidden = true;
      current = null;
      job = null;
      cancelButton.hidden = true;
      editForm.hidden = true;
      clearVideo();
      base = proposed;
      key = entered.value;
      entered.value = '';
      await refresh();
      workspace.hidden = false;
      status(root, 'editorReady');
    });
  });
  q<HTMLButtonElement>(root, '[data-project-refresh]')!.addEventListener('click', () => void action(refresh));
  q<HTMLButtonElement>(root, '[data-project-open]')!.addEventListener('click', () => void action(async () => {
    const id = q<HTMLSelectElement>(root, '[data-project-list]')!.value;
    if (id) await openProject(id);
    else status(root, 'editorChoose');
  }));
  q<HTMLFormElement>(root, '[data-project-create]')!.addEventListener('submit', (event) => {
    event.preventDefault();
    void action(async () => {
      const block = await getBlock(TEMPLATE);
      const variable = block.variables.find((entry) => entry.type === 'string');
      if (!variable) throw new Error('The verified template is unavailable.');
      const title = q<HTMLInputElement>(root, '[data-project-new-title]')!.value.trim();
      const brief = q<HTMLTextAreaElement>(root, '[data-project-new-brief]')!.value.trim();
      const text = q<HTMLInputElement>(root, '[data-project-new-text]')!.value.trim();
      const created = await request<OpenProject>('/projects', {
        method: 'POST',
        body: JSON.stringify({ title, brief, shots: [{ id: TEMPLATE, title: 'Lower-third', duration: 3.5, values: { [variable.id]: text } }] }),
      });
      await refresh();
      await openProject(created.project.id);
      status(root, 'editorCreated');
    });
  });
  editForm.addEventListener('submit', (event) => {
    event.preventDefault();
    void action(save);
  });
  q<HTMLButtonElement>(root, '[data-project-render]')!.addEventListener('click', () => void action(render));
  cancelButton.addEventListener('click', () => void action(cancel));
  q<HTMLButtonElement>(root, '[data-project-download]')!.addEventListener('click', () => void action(() => download(false)));
  q<HTMLButtonElement>(root, '[data-project-source]')!.addEventListener('click', () => void action(() => download(true)));
}

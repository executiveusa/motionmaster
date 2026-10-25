/**
 * Private v1 durable project store (schema 1).
 *
 * Projects and immutable revisions live outside the served site. Writes use a
 * same-directory temporary file and rename so readers never see partial JSON.
 * Legacy workspace/films data is imported explicitly and never modified.
 *
 * This is a local, single-writer store, NOT a hosted multi-tenant database.
 * Do not expose it on the public Internet until authorization and concurrency
 * control are implemented (MM-05/MM-06).
 */
import { randomUUID } from 'node:crypto';
import {
  existsSync, lstatSync, mkdirSync, readFileSync, readdirSync,
  renameSync, rmSync, writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';

export const PROJECT_SCHEMA_VERSION = 1 as const;
const SAFE_ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/;

export interface ProjectRecord {
  schemaVersion: 1;
  id: string;
  title: string;
  brief: string;
  createdAt: string;
  updatedAt: string;
  currentRevision: number;
  /** Existing film folder name, if imported from workspace/films. */
  sourceFilmId?: string;
}

export interface ProjectRevision {
  schemaVersion: 1;
  projectId: string;
  number: number;
  createdAt: string;
  title: string;
  brief: string;
  /** The editable shot list; the render adapter is wired in MM-05/MM-08. */
  shots: { id: string; title: string; duration: number }[];
}

export type JobState = 'queued' | 'rendering' | 'ready' | 'failed' | 'cancelled';
export interface ProjectJob {
  schemaVersion: 1;
  id: string;
  projectId: string;
  revision: number;
  status: JobState;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
  /** A relative artifact path, not an authorization to download it. */
  artifact?: string;
  /** Count of started attempts, retained across manual retries. */
  attempts?: number;
}

export function projectsRoot(repoRoot: string): string {
  return resolve(repoRoot, 'workspace', 'projects');
}

function assertId(id: string): void {
  if (!SAFE_ID.test(id) || id === '.' || id === '..') {
    throw new Error('Invalid project or job id.');
  }
}

function projectDir(repoRoot: string, id: string): string {
  assertId(id);
  return join(projectsRoot(repoRoot), id);
}

function revisionPath(repoRoot: string, id: string, number: number): string {
  if (!Number.isSafeInteger(number) || number < 1) throw new Error('Invalid revision.');
  return join(projectDir(repoRoot, id), 'revisions', `${number}.json`);
}

function readJson(path: string): unknown {
  // Fail closed on corrupt or missing state; never silently create a new record.
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}

function atomicJson(path: string, data: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temp, `${JSON.stringify(data, null, 2)}\n`, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    renameSync(temp, path);
  } finally {
    rmSync(temp, { force: true });
  }
}

function asProject(data: unknown, id: string): ProjectRecord {
  const p = data as Partial<ProjectRecord> | null;
  if (!p || p.schemaVersion !== 1 || p.id !== id ||
      typeof p.title !== 'string' || typeof p.brief !== 'string' ||
      typeof p.createdAt !== 'string' || typeof p.updatedAt !== 'string' ||
      !Number.isSafeInteger(p.currentRevision) || (p.currentRevision ?? 0) < 1) {
    throw new Error(`Invalid project record: ${id}`);
  }
  return p as ProjectRecord;
}

function validShots(value: unknown): value is ProjectRevision['shots'] {
  return Array.isArray(value) && value.length <= 100 && value.every((shot) =>
    shot !== null && typeof shot === 'object' &&
    typeof shot.id === 'string' && shot.id.length > 0 && shot.id.length <= 100 &&
    typeof shot.title === 'string' && shot.title.length <= 300 &&
    typeof shot.duration === 'number' && Number.isFinite(shot.duration) &&
    shot.duration > 0 && shot.duration <= 3600);
}

function validCopy(title: string, brief: string): boolean {
  return title.trim().length > 0 && title.length <= 300 &&
    brief.trim().length > 0 && brief.length <= 20_000;
}

function asRevision(data: unknown, id: string, number: number): ProjectRevision {
  const r = data as Partial<ProjectRevision> | null;
  if (!r || r.schemaVersion !== 1 || r.projectId !== id || r.number !== number ||
      typeof r.title !== 'string' || typeof r.brief !== 'string' ||
      typeof r.createdAt !== 'string' || !validShots(r.shots)) {
    throw new Error(`Invalid project revision: ${id}/${number}`);
  }
  return r as ProjectRevision;
}

export function createProject(
  repoRoot: string,
  input: { id?: string; title: string; brief: string; shots?: ProjectRevision['shots']; sourceFilmId?: string },
): { project: ProjectRecord; revision: ProjectRevision } {
  const id = input.id ?? `p_${randomUUID()}`;
  assertId(id);
  if (!validCopy(input.title, input.brief) || !validShots(input.shots ?? [])) throw new Error('Invalid project content.');
  if (input.sourceFilmId) assertId(input.sourceFilmId);
  const dir = projectDir(repoRoot, id);
  mkdirSync(projectsRoot(repoRoot), { recursive: true });
  // Exclusive directory creation: duplicate IDs cannot overwrite a project.
  mkdirSync(dir);
  const now = new Date().toISOString();
  const project: ProjectRecord = {
    schemaVersion: 1, id, title: input.title, brief: input.brief,
    createdAt: now, updatedAt: now, currentRevision: 1,
    ...(input.sourceFilmId ? { sourceFilmId: input.sourceFilmId } : {}),
  };
  const revision: ProjectRevision = {
    schemaVersion: 1, projectId: id, number: 1, createdAt: now,
    title: input.title, brief: input.brief, shots: input.shots ?? [],
  };
  atomicJson(revisionPath(repoRoot, id, 1), revision);
  atomicJson(join(dir, 'project.json'), project);
  return { project, revision };
}

export function readProject(repoRoot: string, id: string): { project: ProjectRecord; revision: ProjectRevision } | undefined {
  const dir = projectDir(repoRoot, id);
  const path = join(dir, 'project.json');
  if (!existsSync(path)) return undefined;
  const project = asProject(readJson(path), id);
  const revision = asRevision(readJson(revisionPath(repoRoot, id, project.currentRevision)), id, project.currentRevision);
  return { project, revision };
}

export function listProjects(repoRoot: string): ProjectRecord[] {
  const root = projectsRoot(repoRoot);
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && SAFE_ID.test(entry.name))
    .map((entry) => readProject(repoRoot, entry.name)?.project)
    .filter((project): project is ProjectRecord => project !== undefined)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Optimistic revision check prevents a stale editor from silently overwriting work. */
export function saveRevision(
  repoRoot: string,
  id: string,
  expectedRevision: number,
  input: { title: string; brief: string; shots: ProjectRevision['shots'] },
): { project: ProjectRecord; revision: ProjectRevision } {
  const current = readProject(repoRoot, id);
  if (!current) throw new Error('Project not found.');
  if (current.project.currentRevision !== expectedRevision) throw new Error('Revision conflict. Reload before editing.');
  if (!validCopy(input.title, input.brief) || !validShots(input.shots)) throw new Error('Invalid revision content.');
  const now = new Date().toISOString();
  const number = expectedRevision + 1;
  const revision: ProjectRevision = {
    schemaVersion: 1, projectId: id, number, createdAt: now,
    title: input.title, brief: input.brief, shots: input.shots,
  };
  // Write the immutable revision first. A crash cannot point at a missing revision.
  const path = revisionPath(repoRoot, id, number);
  if (existsSync(path)) throw new Error('Revision already exists.');
  atomicJson(path, revision);
  const project: ProjectRecord = {
    ...current.project, title: input.title, brief: input.brief,
    currentRevision: number, updatedAt: now,
  };
  atomicJson(join(projectDir(repoRoot, id), 'project.json'), project);
  return { project, revision };
}

export function readRevision(repoRoot: string, id: string, number: number): ProjectRevision | undefined {
  const path = revisionPath(repoRoot, id, number);
  return existsSync(path) ? asRevision(readJson(path), id, number) : undefined;
}

export function createProjectJob(repoRoot: string, projectId: string, revision: number): ProjectJob {
  const project = readProject(repoRoot, projectId);
  if (!project || !readRevision(repoRoot, projectId, revision)) throw new Error('Project revision not found.');
  const now = new Date().toISOString();
  const job: ProjectJob = {
    schemaVersion: 1, id: `j_${randomUUID()}`, projectId, revision,
    status: 'queued', createdAt: now, updatedAt: now,
  };
  const path = join(projectDir(repoRoot, projectId), 'jobs', `${job.id}.json`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(job, null, 2)}\n`, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  return job;
}

export function readProjectJob(repoRoot: string, projectId: string, jobId: string): ProjectJob | undefined {
  assertId(jobId);
  const path = join(projectDir(repoRoot, projectId), 'jobs', `${jobId}.json`);
  if (!existsSync(path)) return undefined;
  const job = readJson(path) as Partial<ProjectJob> | null;
  if (!job || job.schemaVersion !== 1 || job.id !== jobId || job.projectId !== projectId ||
      !Number.isSafeInteger(job.revision) || !['queued', 'rendering', 'ready', 'failed', 'cancelled'].includes(job.status ?? '')) {
    throw new Error('Invalid job record.');
  }
  return job as ProjectJob;
}

/**
 * MM-05: durable, single-writer job state machine. These transitions record
 * lifecycle facts; they do NOT claim a render succeeded without an artifact.
 * The worker, not the browser, is allowed to mark a job ready.
 */
export type JobEvent = 'start' | 'complete' | 'fail' | 'cancel' | 'retry';

export function listProjectJobs(repoRoot: string, projectId: string): ProjectJob[] {
  const dir = join(projectDir(repoRoot, projectId), 'jobs');
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^j_[a-zA-Z0-9_-]+\\.json$/.test(entry.name))
    .map((entry) => readProjectJob(repoRoot, projectId, entry.name.slice(0, -5))!)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function transitionProjectJob(
  repoRoot: string,
  projectId: string,
  jobId: string,
  event: JobEvent,
  options: { artifact?: string; error?: string } = {},
): ProjectJob {
  const current = readProjectJob(repoRoot, projectId, jobId);
  if (!current) throw new Error('Project job not found.');
  const target: Record<JobEvent, JobState> = {
    start: 'rendering', complete: 'ready', fail: 'failed',
    cancel: 'cancelled', retry: 'queued',
  };
  const permitted: Record<JobEvent, JobState[]> = {
    start: ['queued'], complete: ['rendering'], fail: ['rendering'],
    cancel: ['queued', 'rendering'], retry: ['failed'],
  };
  // Retried requests must not advance attempts or rewrite timestamps.
  if (current.status === target[event]) return current;
  if (!permitted[event].includes(current.status)) {
    throw new Error(`Invalid job transition: ${current.status} -> ${target[event]}.`);
  }

  let artifact: string | undefined;
  if (event === 'complete') {
    artifact = options.artifact;
    // Only a local, regular, nonempty MP4 under this project's artifact
    // directory can be recorded as complete. No URL or path traversal.
    if (!artifact || !/^artifacts\\/[a-zA-Z0-9][a-zA-Z0-9._-]{0,180}\\.mp4$/.test(artifact)) {
      throw new Error('A project-local MP4 artifact is required.');
    }
    const path = join(projectDir(repoRoot, projectId), artifact);
    if (!existsSync(path) || !lstatSync(path).isFile() || lstatSync(path).isSymbolicLink() ||
        lstatSync(path).size === 0) {
      throw new Error('The render artifact is missing or invalid.');
    }
  }
  const now = new Date().toISOString();
  const next: ProjectJob = {
    ...current,
    status: target[event],
    updatedAt: now,
    ...(event === 'start' ? { startedAt: now, attempts: (current.attempts ?? 0) + 1 } : {}),
    ...(event === 'complete' ? { artifact, finishedAt: now } : {}),
    ...(event === 'fail' || event === 'cancel' ? { finishedAt: now } : {}),
    ...(event === 'fail' ? { error: (options.error ?? 'Render failed.').slice(0, 2000) } : {}),
  };
  if (event === 'retry') {
    delete next.startedAt;
    delete next.finishedAt;
    delete next.error;
    delete next.artifact;
  }
  atomicJson(join(projectDir(repoRoot, projectId), 'jobs', `${jobId}.json`), next);
  return next;
}

/**
 * Call once before a single-writer service starts accepting requests.
 * A process death leaves rendering jobs stranded; mark them failed instead
 * of pretending they are running or re-executing untrusted work on restart.
 */
export function recoverInterruptedProjectJobs(repoRoot: string): number {
  let recovered = 0;
  for (const project of listProjects(repoRoot)) {
    for (const job of listProjectJobs(repoRoot, project.id)) {
      if (job.status !== 'rendering') continue;
      transitionProjectJob(repoRoot, project.id, job.id, 'fail', {
        error: 'Render interrupted by process restart. Retry to queue a new attempt.',
      });
      recovered++;
    }
  }
  return recovered;
}

/** Explicit, non-destructive import of legacy film metadata and job states. */
export function migrateLegacyFilms(repoRoot: string): { imported: number; skipped: number } {
  const root = resolve(repoRoot, 'workspace', 'films');
  if (!existsSync(root)) return { imported: 0, skipped: 0 };
  let imported = 0;
  let skipped = 0;
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || !SAFE_ID.test(entry.name)) { skipped++; continue; }
    const dir = join(root, entry.name);
    const filmPath = join(dir, 'film.json');
    if (!existsSync(filmPath) || !lstatSync(filmPath).isFile()) { skipped++; continue; }
    const id = `legacy_${entry.name}`;
    if (id.length > 80 || readProject(repoRoot, id)) { skipped++; continue; }
    try {
      const film = readJson(filmPath) as { title?: unknown; brief?: unknown } | null;
      if (!film || typeof film.title !== 'string' || typeof film.brief !== 'string' || !film.brief.trim()) {
        skipped++; continue;
      }
      const jobPath = join(dir, 'job.json');
      let shots: ProjectRevision['shots'] = [];
      if (existsSync(jobPath) && lstatSync(jobPath).isFile()) {
        const job = readJson(jobPath) as { shots?: unknown } | null;
        if (job && Array.isArray(job.shots)) {
          shots = job.shots.filter((s): s is ProjectRevision['shots'][number] =>
            !!s && typeof s.id === 'string' && typeof s.title === 'string' &&
            typeof s.duration === 'number' && Number.isFinite(s.duration));
        }
      }
      createProject(repoRoot, { id, title: film.title, brief: film.brief, shots, sourceFilmId: entry.name });
      imported++;
    } catch {
      // Corrupt legacy data is never deleted or replaced; inspect manually.
      skipped++;
    }
  }
  return { imported, skipped };
}

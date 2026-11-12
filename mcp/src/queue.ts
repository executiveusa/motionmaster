/**
 * The render queue.
 *
 * Agents fire renders at once. On a two-core box that is how you lose the
 * box: five agents each start a headless browser, a Node render server and a
 * ffmpeg, and the machine stops being able to answer anything.
 *
 * The queue fixes three things:
 *
 *   - **One job at a time** by default. `MOTION_MASTER_RENDER_CONCURRENCY`
 *     raises it when the machine can take it.
 *   - **The same request renders once.** A job is keyed by a content hash of
 *     the brief, the brand kit, the scenes and the render options. Asking for
 *     the same film twice returns the film that already exists instead of
 *     rendering it again.
 *   - **A render can run somewhere else.** `target: "remote"` posts the
 *     request to another instance's `/api/v1/films`, so the heavy work can
 *     go to a box with a GPU while this one stays responsive.
 *
 * The queue sits in front of `renderProject()`, which is where the gate
 * already lives. A job that fails the gate is a failed job: it is never
 * published as a finished film.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { filmsDir, jobPath, readJob, writeJob, type RenderJob } from "./render.js";

export type QueueTarget = "local" | "remote";

export interface QueueRequest {
  brief: string;
  brandKit?: string;
  scenes?: string[];
  title?: string;
  tags?: string[];
  count?: number;
  fps?: number;
  target?: QueueTarget;
}

export interface QueueState {
  concurrency: number;
  active: number;
  waiting: number;
  target: QueueTarget;
  films: number;
  cached: number;
}

/* ---- the key ------------------------------------------------------------ */

/**
 * The content hash of a request.
 *
 * Two requests with the same key are the same film, and the second one gets
 * the file the first one made. The key covers everything that changes what
 * comes out: the brief, the brand kit, the scenes, the title, the tags and
 * the frame rate. It does not cover the time of day, so asking twice really
 * does mean the same film.
 */
export function queueKey(request: QueueRequest): string {
  const material = JSON.stringify({
    brief: (request.brief ?? "").trim(),
    brandKit: request.brandKit ?? "",
    scenes: [...(request.scenes ?? [])].sort(),
    title: request.title ?? "",
    tags: [...(request.tags ?? [])].sort(),
    count: request.count ?? 0,
    fps: request.fps ?? 30,
  });
  return createHash("sha256").update(material).digest("hex").slice(0, 16);
}

/** The directory a film's job lives in. The key is part of the name. */
export function queueDirectoryName(slug: string, key: string): string {
  return `${slug}-${key.slice(0, 8)}`;
}

/* ---- the semaphore ------------------------------------------------------ */

let active = 0;
const waiters: Array<() => void> = [];

/** How many renders are running right now. */
export function queueActive(): number {
  return active;
}

/** How many renders are waiting for a slot. */
export function queueWaiting(): number {
  return waiters.length;
}

/**
 * Take a slot, or wait for one.
 *
 * The slot is handed over rather than released and taken, so a caller that
 * arrives in the gap cannot jump the queue.
 */
export async function acquireSlot(limit: number): Promise<void> {
  if (active < limit) {
    active += 1;
    return;
  }
  await new Promise<void>((resolve) => {
    waiters.push(resolve);
  });
}

/** Give a slot to whoever is next, or to nobody. */
export function releaseSlot(): void {
  const next = waiters.shift();
  if (next) {
    next();
    return;
  }
  active -= 1;
}

/* ---- the cache ---------------------------------------------------------- */

/** The finished film for a job, when there is one. */
export function cachedFilm(repoRoot: string, directoryName: string): { path: string; bytes: number } | undefined {
  const path = join(filmsDir(repoRoot), directoryName, "film.mp4");
  if (!existsSync(path)) return undefined;
  const job = readJob(repoRoot, directoryName);
  if (!job || job.status !== "ready") return undefined;
  return { path, bytes: statSync(path).size };
}

/**
 * Reconcile the jobs on disk with the jobs that are really running.
 *
 * A job marked "rendering" whose process died is not rendering. Leaving it
 * that way means the film looks busy forever and nobody re-runs it, so it is
 * marked failed with the truth: it was interrupted.
 */
export function reconcileJobs(repoRoot: string): { id: string; reason: string }[] {
  const root = filmsDir(repoRoot);
  if (!existsSync(root)) return [];
  const interrupted: { id: string; reason: string }[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const job = readJob(repoRoot, entry.name);
    if (!job || job.status !== "rendering") continue;
    const finished = writeInterrupted(repoRoot, entry.name, job);
    if (finished) interrupted.push({ id: entry.name, reason: finished });
  }
  return interrupted;
}

function writeInterrupted(repoRoot: string, id: string, job: RenderJob): string | undefined {
  /* If the process is still alive it owns this job. A lock file with the
     pid is what tells the two apart. */
  const lockPath = join(filmsDir(repoRoot), id, "render.lock");
  if (existsSync(lockPath)) {
    const pid = Number(readFileSync(lockPath, "utf8").trim());
    if (Number.isFinite(pid) && pid > 0 && isAlive(pid)) return undefined;
  }
  writeJob(repoRoot, {
    ...job,
    status: "failed",
    finishedAt: new Date().toISOString(),
    error: "The render was interrupted before it finished. Run it again.",
  });
  return "interrupted";
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/* ---- the state ---------------------------------------------------------- */

export interface QueueOptions {
  concurrency: number;
  target: QueueTarget;
  remoteUrl?: string;
}

/** The queue's state, for the API and for the operator. */
export function queueState(repoRoot: string, options: QueueOptions): QueueState {
  const root = filmsDir(repoRoot);
  let films = 0;
  let cached = 0;
  if (existsSync(root)) {
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      films += 1;
      const job = readJob(repoRoot, entry.name);
      if (job?.status === "ready") cached += 1;
    }
  }
  return {
    concurrency: options.concurrency,
    active: queueActive(),
    waiting: queueWaiting(),
    target: options.target,
    films,
    cached,
  };
}

/* ---- the remote target -------------------------------------------------- */

/**
 * Run a render on another instance.
 *
 * The other instance is another Motion Master server with its own queue and
 * its own gate. It is asked over the same HTTP API a script would use, so
 * the two instances do not have to know anything about each other beyond a
 * URL.
 *
 * The job is not finished when the request is accepted — it is finished when
 * the other instance says so. So this polls, and it stops when the caller
 * gives up.
 */
export async function renderRemotely(options: {
  remoteUrl: string;
  request: { brief: string; shots?: number; tags?: string[]; title?: string; sound?: boolean };
  timeoutMs?: number;
  pollMs?: number;
  signal?: AbortSignal;
}): Promise<
  | { ok: true; id: string; statusUrl: string; videoUrl: string }
  | { ok: false; error: string }
> {
  const base = options.remoteUrl.replace(/\/+$/, "");
  const timeoutMs = options.timeoutMs ?? 900_000;
  const pollMs = options.pollMs ?? 2000;
  const deadline = Date.now() + timeoutMs;

  let accepted: { job?: { id?: string; status?: string }; statusUrl?: string; videoUrl?: string };
  try {
    const response = await fetch(`${base}/api/v1/films`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(options.request),
      signal: options.signal,
    });
    accepted = (await response.json()) as typeof accepted;
    if (!response.ok) {
      const detail = (accepted as { error?: string })?.error ?? `HTTP ${response.status}`;
      return { ok: false, error: `The remote instance refused the render: ${detail}` };
    }
  } catch (error) {
    return {
      ok: false,
      error: `The remote instance could not be reached: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  const id = accepted?.job?.id ?? "";
  const statusUrl = accepted?.statusUrl ?? `${base}/api/v1/films/${id}`;
  const videoUrl = accepted?.videoUrl ?? `/films/${id}/video`;
  if (!id) return { ok: false, error: "The remote instance did not return a job id." };

  while (Date.now() < deadline) {
    if (options.signal?.aborted) return { ok: false, error: "The remote render was cancelled." };
    try {
      const response = await fetch(statusUrl, { signal: options.signal });
      const status = (await response.json()) as { job?: { status?: string; error?: string } };
      const state = status?.job?.status;
      if (state === "ready") {
        return { ok: true, id, statusUrl, videoUrl: `${base}${videoUrl}` };
      }
      if (state === "failed") {
        return { ok: false, error: status?.job?.error ?? "The remote render failed." };
      }
    } catch (error) {
      return {
        ok: false,
        error: `The remote instance stopped answering: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }

  return { ok: false, error: "The remote render did not finish in time." };
}

/**
 * MM-05: opt-in, single-process adapter from durable project jobs to the
 * existing HyperFrames film pipeline. This is NOT a distributed job queue.
 * Set MOTION_MASTER_RENDER_WORKER=1 only on the owner-controlled worker.
 */
import { copyFileSync, existsSync, mkdirSync, renameSync, rmSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type { Config } from "./config.js";
import { loadBlocks } from "./library.js";
import { loadTokens } from "./tokens.js";
import { loadVerdicts } from "./verdicts.js";
import { buildFilmProject, planFilm } from "./film.js";
import { renderProject } from "./render.js";
import {
  listProjectJobs, listProjects, projectsRoot, readProjectJob, readRevision,
  transitionProjectJob, type ProjectRevision,
} from "./projects.js";

export type RevisionRenderer = (
  config: Config, revision: ProjectRevision, outputDir: string, signal?: AbortSignal,
) => Promise<string>;

const active = new Map<string, Promise<void>>();
const runningControllers = new Map<string, AbortController>();

function jobKey(repoRoot: string, projectId: string, jobId: string): string {
  return `${resolve(repoRoot)}:${projectId}:${jobId}`;
}

/** Abort an active render after its durable state has been marked cancelled. */
export function cancelRunningProjectJob(repoRoot: string, projectId: string, jobId: string): boolean {
  const controller = runningControllers.get(jobKey(repoRoot, projectId, jobId));
  if (!controller) return false;
  controller.abort();
  return true;
}

/** Use the shipped, gated HyperFrames renderer, not a mock or a remote vendor. */
export const renderProjectRevision: RevisionRenderer = async (config, revision, outputDir, signal) => {
  if (signal?.aborted) throw new Error("Render cancelled.");
  const blocks = loadBlocks(config.blocksPath);
  const tokens = loadTokens(config.tokensPath) as never;
  const verdicts = loadVerdicts(config.repoRoot);
  const edits = revision.shots;
  const plan = planFilm(revision.brief, {
    blocks, tokens, count: edits.length || 3,
    exclude: Object.entries(verdicts).filter(([, verdict]) => !verdict.ok).map(([id]) => id),
    ...(edits.length > 0 ? { selectedIds: edits.map((shot) => shot.id) } : {}),
  });
  if (plan.shots.length === 0) throw new Error("No eligible motion blocks match this brief.");
  if (edits.length > 0) {
    // Apply only variables declared by the selected upstream composition.
    // Never trust arbitrary HTML, JS, file paths or undeclared variables from
    // an HTTP client or imported project. Keep the source block untouched.
    plan.shots = plan.shots.map((shot, index) => {
      const overrides = edits[index].values ?? {};
      const block = blocks.blocks.find((entry) => entry.id === shot.id);
      if (!block) throw new Error("Selected motion block is missing.");
      for (const [id, value] of Object.entries(overrides)) {
        const variable = block.variables.find((entry) => entry.id === id);
        if (!variable || !["string", "color"].includes(variable.type)) {
          throw new Error(`Shot variable is not editable: ${id}`);
        }
        if (variable.type === "color" && !/^#[0-9a-fA-F]{6}$/.test(value)) {
          throw new Error(`Shot color must be a six-digit hex value: ${id}`);
        }
      }
      const values = { ...shot.values, ...overrides };
      const ground = ["background", "bg", "ground"]
        .map((id) => block.variables.find((entry) => entry.id === id && entry.type === "color"))
        .map((entry) => entry && values[entry.id])
        .find((value): value is string => typeof value === "string") ?? shot.ground;
      return {
        ...shot, index, title: edits[index].title,
        requestedDuration: edits[index].duration, values, ground,
      };
    });
  }
  const built = buildFilmProject(config.repoRoot, outputDir, plan, tokens);
  // Registry installation is currently synchronous; do not start the gate or
  // video render if cancellation arrived during installation.
  if (signal?.aborted) throw new Error("Render cancelled.");
  if (built.plan.shots.length === 0) throw new Error("No renderable shots survived installation.");
  // An explicit edit is all-or-nothing: never quietly drop a chosen shot.
  if (edits.length > 0 && built.plan.shots.length !== edits.length) {
    throw new Error("An edited motion block could not be installed; render was not published.");
  }
  const result = await renderProject(config.repoRoot, outputDir, { signal });
  if (!result.ok || !result.video) {
    throw new Error((result.log || "HyperFrames render failed.").slice(-1800));
  }
  return result.video.path;
};

/**
 * Execute exactly one queued job. An injected renderer makes the durable
 * transitions testable with a real ffmpeg MP4 without a registry download.
 */
export async function runProjectJob(
  config: Config, projectId: string, jobId: string,
  renderer: RevisionRenderer = renderProjectRevision,
): Promise<void> {
  const current = readProjectJob(config.repoRoot, projectId, jobId);
  if (!current || current.status !== "queued") return;
  const revision = readRevision(config.repoRoot, projectId, current.revision);
  if (!revision) {
    transitionProjectJob(config.repoRoot, projectId, jobId, "start");
    transitionProjectJob(config.repoRoot, projectId, jobId, "fail", { error: "Project revision is missing." });
    return;
  }
  transitionProjectJob(config.repoRoot, projectId, jobId, "start");
  const controller = new AbortController();
  const key = jobKey(config.repoRoot, projectId, jobId);
  runningControllers.set(key, controller);
  const projectPath = join(projectsRoot(config.repoRoot), projectId);
  const outputDir = join(projectPath, "renders", jobId);
  try {
    // Do not reuse a previous attempt's source or film. Each attempt begins
    // clean; immutable revisions remain untouched.
    rmSync(outputDir, { recursive: true, force: true });
    mkdirSync(outputDir, { recursive: true });
    const source = resolve(await renderer(config, revision, outputDir, controller.signal));
    // Only a film produced inside this job's own output directory is eligible.
    if (source !== resolve(outputDir, "film.mp4") ||
        !existsSync(source) || !statSync(source).isFile()) {
      throw new Error("Renderer did not produce its expected job-local MP4.");
    }
    // A client may cancel while HyperFrames runs. Never publish that output
    // or change a cancelled job to ready.
    if (readProjectJob(config.repoRoot, projectId, jobId)?.status !== "rendering") return;
    const artifact = `artifacts/${jobId}.mp4`;
    const destination = join(projectPath, artifact);
    mkdirSync(dirname(destination), { recursive: true });
    const temp = `${destination}.${randomUUID()}.tmp`;
    try {
      copyFileSync(source, temp);
      if (readProjectJob(config.repoRoot, projectId, jobId)?.status !== "rendering") return;
      renameSync(temp, destination);
      transitionProjectJob(config.repoRoot, projectId, jobId, "complete", { artifact });
    } finally {
      rmSync(temp, { force: true });
    }
  } catch (error) {
    if (readProjectJob(config.repoRoot, projectId, jobId)?.status === "rendering") {
      transitionProjectJob(config.repoRoot, projectId, jobId, "fail", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  } finally {
    if (runningControllers.get(key) === controller) runningControllers.delete(key);
  }
}

/**
 * A single in-process drain for the local JSON store. Queued jobs survive a
 * restart; in-flight jobs are marked failed by startup recovery and need retry.
 */
export function processProjectQueue(config: Config, renderer: RevisionRenderer = renderProjectRevision): Promise<void> {
  const key = resolve(config.repoRoot);
  const running = active.get(key);
  if (running) return running;
  const work = (async () => {
    for (;;) {
      const next = listProjects(config.repoRoot)
        .flatMap((project) => listProjectJobs(config.repoRoot, project.id))
        .filter((job) => job.status === "queued")
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
      if (!next) return;
      await runProjectJob(config, next.projectId, next.id, renderer);
    }
  })();
  active.set(key, work);
  const release = () => { if (active.get(key) === work) active.delete(key); };
  void work.then(release, release);
  return work;
}

export function projectWorkerEnabled(): boolean {
  return process.env.MOTION_MASTER_RENDER_WORKER === "1";
}

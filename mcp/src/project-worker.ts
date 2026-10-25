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
  config: Config, revision: ProjectRevision, outputDir: string,
) => Promise<string>;

const active = new Map<string, Promise<void>>();

/** Use the shipped, gated HyperFrames renderer, not a mock or a remote vendor. */
export const renderProjectRevision: RevisionRenderer = async (config, revision, outputDir) => {
  const blocks = loadBlocks(config.blocksPath);
  const tokens = loadTokens(config.tokensPath) as never;
  const verdicts = loadVerdicts(config.repoRoot);
  const plan = planFilm(revision.brief, {
    blocks, tokens, count: revision.shots.length || 3,
    exclude: Object.entries(verdicts).filter(([, verdict]) => !verdict.ok).map(([id]) => id),
  });
  if (plan.shots.length === 0) throw new Error("No eligible motion blocks match this brief.");
  // Do not silently discard manual shot edits. A separate MM-08 slice must
  // resolve shot IDs, variable overrides and durations into editable renders.
  if (revision.shots.length > 0) {
    throw new Error("Manual shot edits are not renderable yet. Use a brief-only revision.");
  }
  const built = buildFilmProject(config.repoRoot, outputDir, plan, tokens);
  if (built.plan.shots.length === 0) throw new Error("No renderable shots survived installation.");
  const result = await renderProject(config.repoRoot, outputDir);
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
  const projectPath = join(projectsRoot(config.repoRoot), projectId);
  const outputDir = join(projectPath, "renders", jobId);
  try {
    // Do not reuse a previous attempt's source or film. Each attempt begins
    // clean; immutable revisions remain untouched.
    rmSync(outputDir, { recursive: true, force: true });
    mkdirSync(outputDir, { recursive: true });
    const source = resolve(await renderer(config, revision, outputDir));
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
  }
}

/**
 * A single in-process drain for the local JSON store. Queued jobs survive a
 * restart; in-flight jobs are marked failed by startup recovery and need retry.
 */
export function processProjectQueue(config: Config): Promise<void> {
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
      await runProjectJob(config, next.projectId, next.id);
    }
  })();
  active.set(key, work);
  void work.finally(() => { if (active.get(key) === work) active.delete(key); });
  return work;
}

export function projectWorkerEnabled(): boolean {
  return process.env.MOTION_MASTER_RENDER_WORKER === "1";
}

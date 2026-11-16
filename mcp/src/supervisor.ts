/**
 * The supervisor — the loop that runs itself.
 *
 * Everything else in this studio is a pipeline: a person starts it, it does
 * its work, it stops. That is a tool. A product is a loop: work arrives, the
 * studio picks it up, checks it, and either ships it or says clearly why it
 * did not.
 *
 * This is that loop. It is deliberately small and deliberately dull. It does
 * three things and refuses to do a fourth:
 *
 *   1. **Decide order.** Take the oldest queued job. That is the whole
 *      scheduling policy, and it is the right one: the queue is short, and
 *      anything cleverer would be a liability.
 *   2. **Decide retry.** A gate failure is a finding, not a crash. Repair
 *      it, re-gate, and try again — inside a budget.
 *   3. **Decide escalation.** When the budget is spent, stop and report.
 *
 * It does **not** decide taste. The gate decides pass or fail. The
 * supervisor only moves work along, and it never publishes anything the
 * gate has not passed.
 *
 * Two properties matter more than the rest:
 *
 *   - **Claim before work.** The job file is written before any rendering
 *     begins, so a supervisor that dies mid-job leaves a trace and the next
 *     one can reconcile it. A job that vanishes is worse than a job that
 *     failed.
 *   - **The ledger is append-only.** Every event is one line of JSON. It is
 *     the studio's memory: without it there is no history, no answer to
 *     "why did this fail", and no way to tell a bad brief from a bad
 *     composition.
 */

import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  listProjects,
  projectDir,
  readProjectJob,
  transitionProjectJob,
  type JobState,
  type ProjectJob,
} from "./projects.js";
import { applyRemediation, planRemediation, type GateFinding } from "./remediations.js";
import { buildRevisionComposition } from "./project-worker.js";
import { readRevision } from "./projects.js";
import { takeBriefs, inboxDir } from "./inbox.js";
import { dataDir, ledgerPath } from "./datadir.js";
import { gateProject, renderProject } from "./render.js";

/* ---------------------------------------------------------------- ledger -- */

export type LedgerEvent =
  | "claimed"
  | "gate_failed"
  | "repaired"
  | "gate_passed"
  | "rendered"
  | "published"
  | "failed"
  | "escalated"
  | "reconciled"
  | "no_work";

export interface LedgerEntry {
  at: string;
  event: LedgerEvent;
  jobId: string;
  projectId: string;
  attempt: number;
  detail?: string;
  findings?: string[];
  artifact?: string;
  durationMs?: number;
}

/** Where the ledger lives. It must not be inside a directory a redeploy wipes. */
export function defaultLedgerPath(repoRoot: string, tenantId?: string): string {
  return ledgerPath(repoRoot, tenantId);
}

/**
 * Append one line to the ledger.
 *
 * Append-only, and it never throws: a ledger that cannot be written must not
 * take the render down with it. The failure is reported on stderr instead.
 */
export function writeLedger(path: string, entry: LedgerEntry): void {
  try {
    mkdirSync(dirname(path), { recursive: true });
    appendFileSync(path, `${JSON.stringify(entry)}\n`, "utf8");
  } catch (error) {
    process.stderr.write(
      `The ledger could not be written (${path}): ${error instanceof Error ? error.message : String(error)}\n`,
    );
  }
}

export function readLedger(path: string): LedgerEntry[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      try {
        return JSON.parse(line) as LedgerEntry;
      } catch {
        return null;
      }
    })
    .filter((entry): entry is LedgerEntry => entry !== null);
}

/* ----------------------------------------------------------------- runner -- */

export interface RunOutcome {
  ok: boolean;
  /** The finished file, when there is one. */
  artifact?: string;
  /** Why it failed, in words a person can act on. */
  error?: string;
  /** The findings that could not be repaired. */
  findings?: string[];
  /** How many gate rounds it took. */
  rounds?: number;
}

export interface RunContext {
  repoRoot: string;
  job: ProjectJob;
  /** The directory the work happens in. */
  workDir: string;
  signal?: AbortSignal;
  /** How many gate rounds this job may spend before it escalates. */
  budget?: number;
  /** The tenant this job belongs to. */
  tenantId?: string;
  /** Called after each gate round, so the ledger can record it. */
  onEvent?: (event: Omit<LedgerEntry, "at" | "jobId" | "projectId" | "attempt">) => void;
}

export type JobRunner = (ctx: RunContext) => Promise<RunOutcome>;

/**
 * The real runner: gate, repair, re-gate, render.
 *
 * The repair loop is the whole point. A gate failure is a finding with a
 * known shape, and the remediation table knows how to fix a good number of
 * them. So the loop repairs, re-gates, and tries again — up to the budget.
 * When the budget is spent, the findings that survived are reported by name.
 */
export const renderRunner: JobRunner = async (ctx) => {
  const { repoRoot, workDir, onEvent } = ctx;
  const budget = ctx.budget ?? 3;

  let gate = await gateProject(repoRoot, workDir, 240_000, ctx.signal);
  let rounds = 0;

  while (!gate.ok && rounds < budget) {
    rounds += 1;
    const findings = gate.findings;
    onEvent?.({
      event: "gate_failed",
      detail: `${findings.length} finding(s)`,
      findings: findings.map((f) => f.code),
    });

    const plan = planRemediation(findings);
    if (plan.repairable.length === 0) {
      const reasons = plan.unrepairable.map((u) => u.reason);
      onEvent?.({ event: "escalated", detail: reasons[0] ?? "Nothing here can be repaired." });
      return {
        ok: false,
        error: reasons[0] ?? "The gate failed and nothing here can be repaired.",
        findings: findings.map((f) => f.code),
        rounds,
      };
    }

    let changed = 0;
    for (const finding of plan.repairable) {
      const repair = applyRemediation(workDir, finding);
      if (repair.applied) {
        changed += 1;
        onEvent?.({ event: "repaired", detail: `${finding.code}: ${repair.change}` });
      }
    }

    if (changed === 0) {
      return {
        ok: false,
        error: "The gate failed and the repairs found nothing to change.",
        findings: findings.map((f) => f.code),
        rounds,
      };
    }

    gate = await gateProject(repoRoot, workDir, 240_000, ctx.signal);
  }

  if (!gate.ok) {
    const survivors = gate.findings.map((f) => f.code);
    onEvent?.({ event: "escalated", detail: `The budget of ${budget} rounds is spent.` });
    return {
      ok: false,
      error: `The gate is still failing after ${rounds} repair rounds: ${survivors.join(", ")}`,
      findings: survivors,
      rounds,
    };
  }

  onEvent?.({ event: "gate_passed", detail: `after ${rounds} repair round(s)` });

  const rendered = await renderProject(repoRoot, workDir, {
    skipGate: true,
    timeoutMs: 900_000,
    signal: ctx.signal,
  });
  if (!rendered.ok || !rendered.video) {
    onEvent?.({ event: "failed", detail: "The render did not produce a file." });
    return { ok: false, error: "The render did not produce a file.", rounds };
  }

  /* The job record names the artifact, and it only accepts a project-local
     `artifacts/<name>.mp4` that ffprobe says holds a video stream. So the
     finished film is moved into the project's artifact directory and the
     job is told the relative name. */
  const artifacts = join(projectDir(repoRoot, ctx.job.projectId, ctx.tenantId), "artifacts");
  mkdirSync(artifacts, { recursive: true });
  const name = "film.mp4";
  const relative = `artifacts/${name}`;
  copyFileSync(rendered.video.path, join(artifacts, name));

  onEvent?.({ event: "rendered", detail: relative, artifact: relative });
  return { ok: true, artifact: relative, rounds };
};

/**
 * The runner for a real project.
 *
 * It builds the composition, and then it does what the studio is for: gates
 * it, repairs what the gate can repair, gates it again, renders it, and
 * copies the film into the project's artifact directory where the job record
 * can name it.
 */
export const projectRunner: JobRunner = async (ctx) => {
  const { repoRoot, job, workDir } = ctx;
  const revision = readRevision(repoRoot, job.projectId, job.revision, ctx.tenantId);
  if (!revision) {
    return { ok: false, error: `The revision ${job.revision} of ${job.projectId} could not be read.` };
  }

  try {
    buildRevisionComposition(
      {
        repoRoot,
        blocksPath: join(repoRoot, "library", "blocks.json"),
        tokensPath: join(repoRoot, "plugins", "motion-master", "assets", "motion-tokens.json"),
        blockRolesPath: join(repoRoot, "library", "block-roles.json"),
      },
      revision,
      workDir,
    );
  } catch (error) {
    return {
      ok: false,
      error: `The composition could not be built: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  return renderRunner(ctx);
};

/* ------------------------------------------------------------- supervisor -- */

export interface SupervisorOptions {
  repoRoot: string;
  ledgerPath?: string;
  /** Gate rounds per job before the job escalates. */
  budget?: number;
  /** Do everything except publish. For a proof, and for a rehearsal. */
  dryRun?: boolean;
  /** The work a job does. Injectable so the loop can be proved without a browser. */
  runner?: JobRunner;
  /** Where a job's working directory is. */
  workDirFor?: (job: ProjectJob) => string;
  /** The tenant this supervisor works for. One studio, unless there are more. */
  tenantId?: string;
  now?: () => Date;
}

export interface TickResult {
  /** What the tick did. */
  action: "worked" | "idle" | "reconciled";
  jobId?: string;
  outcome?: RunOutcome;
  /** The state the job ended in. */
  state?: JobState;
}

export class Supervisor {
  private readonly repoRoot: string;
  private readonly ledgerPath: string;
  private readonly budget: number;
  private readonly dryRun: boolean;
  private readonly runner: JobRunner;
  private readonly workDirFor: (job: ProjectJob) => string;
  private readonly tenantId?: string;
  private readonly now: () => Date;

  constructor(options: SupervisorOptions) {
    this.repoRoot = options.repoRoot;
    this.ledgerPath = options.ledgerPath ?? defaultLedgerPath(options.repoRoot, options.tenantId);
    this.budget = options.budget ?? 3;
    this.dryRun = options.dryRun ?? false;
    this.runner = options.runner ?? projectRunner;
    this.tenantId = options.tenantId;
    this.workDirFor =
      options.workDirFor ??
      ((job) => join(dataDir(this.repoRoot, this.tenantId), "projects", job.projectId, "work"));
    this.now = options.now ?? (() => new Date());
    /* The loop owns its inbox. A brief has to have somewhere to arrive
       before the first one does. */
    mkdirSync(inboxDir(this.repoRoot, this.tenantId), { recursive: true });
  }

  /** Every queued job, oldest first. */
  queuedJobs(): ProjectJob[] {
    const jobs: ProjectJob[] = [];
    for (const project of listProjects(this.repoRoot, this.tenantId)) {
      const dir = join(dataDir(this.repoRoot, this.tenantId), "projects", project.id, "jobs");
      if (!existsSync(dir)) continue;
      for (const name of readdirSync(dir).sort()) {
        if (!name.endsWith(".json")) continue;
        const job = readProjectJob(this.repoRoot, project.id, name.replace(/\.json$/, ""), this.tenantId);
        if (job && job.status === "queued") jobs.push(job);
      }
    }
    /* Oldest first. The id breaks a tie, because two jobs created in the
       same millisecond are otherwise ordered by whatever order the
       filesystem listed them in — which is not an order, it is a mood. */
    return jobs.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  }

  /** Jobs left mid-flight by a supervisor that died. They are reconciled, not lost. */
  interruptedJobs(): ProjectJob[] {
    const jobs: ProjectJob[] = [];
    for (const project of listProjects(this.repoRoot, this.tenantId)) {
      const dir = join(dataDir(this.repoRoot, this.tenantId), "projects", project.id, "jobs");
      if (!existsSync(dir)) continue;
      for (const name of readdirSync(dir).sort()) {
        if (!name.endsWith(".json")) continue;
        const job = readProjectJob(this.repoRoot, project.id, name.replace(/\.json$/, ""), this.tenantId);
        if (job && job.status === "rendering") jobs.push(job);
      }
    }
    return jobs;
  }

  /**
   * One pass.
   *
   * Reconcile anything a dead supervisor left behind, then take the oldest
   * queued job and run it to completion. One job per tick: the queue exists
   * so that three agents firing at once do not take the machine with them.
   */
  async tick(): Promise<TickResult> {
    /* First: take any brief that has arrived. Work has to arrive on its own,
       or the loop is a tool with a very good keyboard. */
    const inbox = takeBriefs(this.repoRoot, this.tenantId);
    if (inbox.created.length > 0) {
      for (const taken of inbox.created) {
        writeLedger(this.ledgerPath, {
          at: this.now().toISOString(),
          event: "claimed",
          jobId: taken.job.id,
          projectId: taken.job.projectId,
          attempt: 0,
          detail: `A brief arrived: ${taken.source}`,
        });
      }
    }
    for (const rejected of inbox.rejected) {
      writeLedger(this.ledgerPath, {
        at: this.now().toISOString(),
        event: "failed",
        jobId: "-",
        projectId: "-",
        attempt: 0,
        detail: `A brief was refused: ${rejected.error}`,
      });
    }

    /* Second: reconcile. A job that says 'rendering' but has no live process
       is a job whose supervisor died. It has to be marked, or it sits there
       forever and the queue stops. */
    const interrupted = this.interruptedJobs();
    for (const job of interrupted) {
      try {
        transitionProjectJob(this.repoRoot, job.projectId, job.id, "fail", {
          error: "Interrupted: the supervisor that owned this job stopped.",
        }, this.tenantId);
        writeLedger(this.ledgerPath, {
          at: this.now().toISOString(),
          event: "reconciled",
          jobId: job.id,
          projectId: job.projectId,
          attempt: 0,
          detail: "The supervisor that owned this job stopped. It was marked failed, not lost.",
        });
      } catch {
        /* A job that cannot be transitioned is already in a state that needs
           no reconciliation. */
      }
    }
    if (interrupted.length > 0) return { action: "reconciled" };

    const queued = this.queuedJobs();
    if (queued.length === 0) {
      writeLedger(this.ledgerPath, {
        at: this.now().toISOString(),
        event: "no_work",
        jobId: "-",
        projectId: "-",
        attempt: 0,
      });
      return { action: "idle" };
    }

    const job = queued[0];
    return this.run(job);
  }

  /** Claim a job, run it, and record what happened. */
  async run(job: ProjectJob): Promise<TickResult> {
    const started = this.now();

    /* Claim before work. The job file is written before anything is
       rendered, so a crash leaves a trace. */
    let claimed: ProjectJob;
    try {
      transitionProjectJob(this.repoRoot, job.projectId, job.id, "start", {}, this.tenantId);
      claimed = readProjectJob(this.repoRoot, job.projectId, job.id, this.tenantId) ?? job;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      writeLedger(this.ledgerPath, {
        at: this.now().toISOString(),
        event: "failed",
        jobId: job.id,
        projectId: job.projectId,
        attempt: 0,
        detail: `The job could not be claimed: ${message}`,
      });
      return { action: "worked", jobId: job.id, state: job.status, outcome: { ok: false, error: message } };
    }

    writeLedger(this.ledgerPath, {
      at: this.now().toISOString(),
      event: "claimed",
      jobId: job.id,
      projectId: job.projectId,
      attempt: 1,
    });

    let outcome: RunOutcome;
    try {
      outcome = await this.runner({
        repoRoot: this.repoRoot,
        job: claimed,
        workDir: this.workDirFor(claimed),
        budget: this.budget,
        tenantId: this.tenantId,
        onEvent: (event) =>
          writeLedger(this.ledgerPath, {
            at: this.now().toISOString(),
            jobId: job.id,
            projectId: job.projectId,
            attempt: 1,
            ...event,
          }),
      });
    } catch (error) {
      outcome = {
        ok: false,
        error: error instanceof Error ? (error.stack ?? error.message) : String(error),
      };
    }

    const durationMs = this.now().getTime() - started.getTime();

    if (outcome.ok) {
      let published = false;
      try {
        transitionProjectJob(this.repoRoot, job.projectId, job.id, "complete", {
          artifact: outcome.artifact,
        }, this.tenantId);
        published = true;
      } catch (error) {
        /* This must not be swallowed. A job that ran to success and could
           not be marked ready is left in `rendering`, where the next tick
           reconciles it as failed — and the reason is lost. It goes in the
           ledger instead. */
        const message = error instanceof Error ? error.message : String(error);
        writeLedger(this.ledgerPath, {
          at: this.now().toISOString(),
          event: "failed",
          jobId: job.id,
          projectId: job.projectId,
          attempt: 1,
          detail: `The work finished but the job could not be marked ready: ${message}`,
        });
      }
      if (published) {
        writeLedger(this.ledgerPath, {
          at: this.now().toISOString(),
          event: this.dryRun ? "rendered" : "published",
          jobId: job.id,
          projectId: job.projectId,
          attempt: 1,
          artifact: outcome.artifact,
          detail: this.dryRun ? "Dry run: the file was rendered but not published." : undefined,
          durationMs,
        });
      }
      return { action: "worked", jobId: job.id, state: published ? "ready" : "failed", outcome };
    }

    try {
      transitionProjectJob(this.repoRoot, job.projectId, job.id, "fail", { error: outcome.error }, this.tenantId);
    } catch {
      /* Already cancelled. */
    }
    writeLedger(this.ledgerPath, {
      at: this.now().toISOString(),
      event: "failed",
      jobId: job.id,
      projectId: job.projectId,
      attempt: 1,
      detail: outcome.error,
      findings: outcome.findings,
      durationMs,
    });
    return { action: "worked", jobId: job.id, state: "failed", outcome };
  }
}


/* ---------------------------------------------------------------- daemon -- */

/**
 * Run the loop on a clock.
 *
 * This is the whole "persistent" part. It is off unless
 * MOTION_MASTER_SUPERVISOR is set, because a loop that starts by accident
 * is a loop that renders films nobody asked for.
 */
export async function supervisorMain(options: {
  repoRoot: string;
  tickMs?: number;
  ledgerPath?: string;
  budget?: number;
  dryRun?: boolean;
  signal?: AbortSignal;
}): Promise<void> {
  const tickMs = options.tickMs ?? 30_000;
  const supervisor = new Supervisor({
    repoRoot: options.repoRoot,
    ledgerPath: options.ledgerPath,
    budget: options.budget,
    dryRun: options.dryRun,
  });

  process.stdout.write(
    [
      `Motion Master supervisor, one tick every ${Math.round(tickMs / 1000)}s`,
      `  ledger   : ${options.ledgerPath ?? defaultLedgerPath(options.repoRoot)}`,
      `  budget   : ${options.budget ?? 3} gate rounds per job`,
      `  dry run  : ${options.dryRun ? "yes — nothing is published" : "no"}`,
      "",
    ].join("\n"),
  );

  let stopping = false;
  const stop = (): void => {
    stopping = true;
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  while (!stopping) {
    try {
      const result = await supervisor.tick();
      if (result.action === "worked" && result.outcome) {
        process.stdout.write(
          `  ${result.state === "ready" ? "ready  " : "failed "} ${result.jobId}\n`,
        );
      }
    } catch (error) {
      /* A tick that throws must not kill the loop. It is logged and the
         next tick tries again — that is the whole point of a loop. */
      process.stderr.write(
        `The tick failed: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
      );
    }
    if (options.signal?.aborted) break;
    await new Promise((resolveTick) => setTimeout(resolveTick, tickMs));
  }
}

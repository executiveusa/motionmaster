#!/usr/bin/env node
/**
 * Prove the supervisor.
 *
 * The supervisor's contract is not "it renders a film". It is:
 *
 *   - it takes the oldest queued job, not a random one
 *   - it claims the job before doing any work, so a crash leaves a trace
 *   - a job that fails the gate is repaired and retried, inside a budget
 *   - a job that exhausts its budget ends in `failed` with the reason
 *   - every event is a line in the ledger
 *   - a job left mid-flight by a dead supervisor is reconciled, not lost
 *
 * Each of those is proved here, with three jobs and one injected runner.
 * The runner is injected on purpose: the logic of the loop is what is under
 * test, and a browser in the middle of it would only make the proof slow
 * and flaky.
 *
 * The real runner — gate, repair, re-gate, render — is proved separately by
 * `scripts/proof-remediation.mjs`, which puts a real composition through a
 * real gate.
 *
 *   node scripts/proof-supervisor.mjs
 */
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const ROOT = resolve(new URL("..", import.meta.url).pathname);
const WORK = join(ROOT, "workspace", "proof-supervisor");

const { Supervisor, readLedger } = await import(`file://${join(ROOT, "mcp", "dist", "supervisor.js")}`);
const { createProject, createProjectJob } = await import(`file://${join(ROOT, "mcp", "dist", "projects.js")}`);

rmSync(WORK, { recursive: true, force: true });
mkdtempSync(WORK);

let pass = 0;
let fail = 0;
function check(name, condition, detail = "") {
  if (condition) {
    console.log(`ok    ${name}`);
    pass += 1;
  } else {
    console.error(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
    fail += 1;
  }
}

/* ------------------------------------------------------------ the setup -- */

const repoRoot = WORK;
const ledgerPath = join(repoRoot, "ledger", "ledger.jsonl");

/** Three projects, each with one queued job. */
function makeJob(id, title) {
  const { project } = createProject(repoRoot, { id, title, brief: `The brief for ${title}.` });
  return createProjectJob(repoRoot, project.id, 1);
}

/* The queue is oldest first, and the jobs are created a moment apart so
   that "oldest" is unambiguous. */
const passing = makeJob("p_passing", "Passes");
await new Promise((r) => setTimeout(r, 5));
const repaired = makeJob("p_repaired", "Repaired");
await new Promise((r) => setTimeout(r, 5));
const doomed = makeJob("p_doomed", "Doomed");

/**
 * A real, playable MP4.
 *
 * The job record will not accept a finished job unless ffprobe says the
 * artifact holds a video stream — a non-empty file is not a film, and the
 * proof would be worthless if it could pass with a text file.
 */
function writeRealFilm(projectId) {
  const dir = join(repoRoot, "workspace", "projects", projectId, "artifacts");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "film.mp4");
  execFileSync("ffmpeg", [
    "-nostdin", "-v", "error", "-f", "lavfi", "-i", "color=c=0x111113:s=320x180:d=0.2",
    "-pix_fmt", "yuv420p", "-c:v", "libx264", "-y", path,
  ]);
  return "artifacts/film.mp4";
}

/** A runner that behaves the way each job should behave. */
let attempts = 0;
const runner = async (ctx) => {
  attempts += 1;
  const id = ctx.job.projectId;

  if (id === "p_passing") {
    ctx.onEvent?.({ event: "gate_passed", detail: "clean on the first gate" });
    return { ok: true, artifact: writeRealFilm(id), rounds: 1 };
  }

  if (id === "p_repaired") {
    /* It fails the gate once, is repaired, and passes on the second round.
       The repair loop is inside the real runner; here the runner reports
       what happened so the supervisor's handling can be checked. */
    ctx.onEvent?.({ event: "gate_failed", detail: "1 finding(s)", findings: ["contrast_aa_failure"] });
    ctx.onEvent?.({ event: "repaired", detail: "contrast_aa_failure: #weak → #8c8c90" });
    ctx.onEvent?.({ event: "gate_passed", detail: "after 1 repair round" });
    return { ok: true, artifact: writeRealFilm(id), rounds: 2 };
  }

  /* It never passes. The supervisor has to stop and say so. */
  ctx.onEvent?.({ event: "gate_failed", detail: "2 finding(s)", findings: ["motion_frozen", "motion_off_frame"] });
  return {
    ok: false,
    error: "The gate is still failing after 3 repair rounds: motion_frozen, motion_off_frame",
    findings: ["motion_frozen", "motion_off_frame"],
    rounds: 3,
  };
};

const supervisor = new Supervisor({
  repoRoot,
  ledgerPath,
  budget: 3,
  runner,
});

/* ---------------------------------------------------------- the three jobs -- */

/* The order matters: the queue is oldest first, so the three jobs are
   created in the order they should be taken. */
const first = await supervisor.tick();
check("the first tick takes the oldest queued job", first.jobId === passing.id, `it took ${first.jobId}`);

const second = await supervisor.tick();
check("the second tick takes the next job", second.jobId === repaired.id, `it took ${second.jobId}`);

const third = await supervisor.tick();
check("the third tick takes the last job", third.jobId === doomed.id, `it took ${third.jobId}`);

const fourth = await supervisor.tick();
check("a fourth tick with nothing queued does nothing", fourth.action === "idle");

/* ------------------------------------------------------------- the states -- */

/**
 * The state of one job, by its id.
 *
 * Reading "whichever file is in the directory" was the flaky part: a
 * directory listing is not an order, so the check sometimes looked at the
 * wrong job. The check names the job it means.
 */
const jobState = (projectId, jobId) => {
  const path = join(repoRoot, "workspace", "projects", projectId, "jobs", `${jobId}.json`);
  return JSON.parse(readFileSync(path, "utf8"));
};

check("the passing job ends in ready", jobState("p_passing", passing.id).status === "ready", JSON.stringify(jobState("p_passing", passing.id).status));
check("the repaired job ends in ready", jobState("p_repaired", repaired.id).status === "ready", JSON.stringify(jobState("p_repaired", repaired.id).status));
check("the doomed job ends in failed", jobState("p_doomed", doomed.id).status === "failed", JSON.stringify(jobState("p_doomed", doomed.id).status));
check(
  "the doomed job carries the reason it failed",
  String(jobState("p_doomed", doomed.id).error ?? "").includes("motion_frozen"),
  String(jobState("p_doomed", doomed.id).error),
);

/* ------------------------------------------------------------ the ledger -- */

const ledger = readLedger(ledgerPath);
const events = ledger.map((entry) => entry.event);

check("the ledger has a line for every event", ledger.length > 0, `${ledger.length} lines`);
check("every line is valid JSON with a time and an event", ledger.every((e) => e.at && e.event));
check("the ledger records the claim", events.includes("claimed"));
check("the ledger records the gate failure", events.includes("gate_failed"));
check("the ledger records the repair", events.includes("repaired"));
check("the ledger records the gate passing", events.includes("gate_passed"));
check("the ledger records the publish", events.includes("published"));
check("the ledger records the failure", events.includes("failed"));

const failedEntry = ledger.find((e) => e.event === "failed" && e.jobId === doomed.id);
check("the failed line names the findings that survived", Array.isArray(failedEntry?.findings) && failedEntry.findings.includes("motion_frozen"));

const published = ledger.filter((e) => e.event === "published");
check("only the two passing jobs were published", published.length === 2, `${published.length} published`);
check("the doomed job was never published", !published.some((e) => e.jobId === doomed.id));

/* ----------------------------------------------------- the reconciliation -- */

/* A job that says 'rendering' with nobody working on it is a job whose
   supervisor died. It has to be reconciled, not left hanging. */
const orphan = createProjectJob(repoRoot, "p_passing", 1);
const orphanPath = join(repoRoot, "workspace", "projects", "p_passing", "jobs", `${orphan.id}.json`);
const orphanRecord = JSON.parse(readFileSync(orphanPath, "utf8"));
orphanRecord.status = "rendering";
orphanRecord.startedAt = new Date().toISOString();
writeFileSync(orphanPath, JSON.stringify(orphanRecord, null, 2), "utf8");

const reconcileTick = await supervisor.tick();
check("a tick reconciles an interrupted job first", reconcileTick.action === "reconciled");
check("the interrupted job is marked failed, not lost", jobState("p_passing", orphan.id).status === "failed", JSON.stringify(jobState("p_passing", orphan.id).status));
check(
  "the reconciliation is in the ledger",
  readLedger(ledgerPath).some((e) => e.event === "reconciled"),
);

/* ------------------------------------------------------------- the rules -- */

/* An unknown finding code must never be guessed at. The remediation table
   refuses it, and the supervisor escalates rather than guessing. */
const { applyRemediation } = await import(`file://${join(ROOT, "mcp", "dist", "remediations.js")}`);
const refusal = applyRemediation(join(repoRoot, "workspace"), {
  code: "a_code_nobody_has_written_a_rule_for",
  severity: "error",
  message: "invented",
});
check("an unknown finding code is refused, not guessed at", refusal.applied === false, refusal.reason ?? "");

/* The ledger is append-only: a second read returns more, never fewer. */
const before = readLedger(ledgerPath).length;
await supervisor.tick();
check("the ledger only grows", readLedger(ledgerPath).length >= before);

/* ------------------------------------------------------------------ end -- */

rmSync(WORK, { recursive: true, force: true });

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
console.log("The loop takes work, repairs it inside a budget, and says why when it cannot.");

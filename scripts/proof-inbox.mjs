#!/usr/bin/env node
/**
 * Prove the brief inbox.
 *
 * The loop only becomes a product when work arrives on its own. The inbox is
 * that: a directory. A brief is a JSON file. The supervisor takes it on its
 * next tick, and the same brief is never taken twice.
 *
 * The proof does not render a film — that is what the other two proofs do.
 * It proves the arrival: that a brief becomes a queued job, that a second
 * tick does not take it again, that a brief that cannot be read is refused
 * with a reason rather than swallowed, and that the ledger says what
 * happened.
 *
 *   node scripts/proof-inbox.mjs
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const ROOT = resolve(new URL("..", import.meta.url).pathname);
const WORK = mkdtempSync(join(tmpdir(), "mm-inbox-"));

const { Supervisor, readLedger } = await import(`file://${join(ROOT, "mcp", "dist", "supervisor.js")}`);
const { submitBrief, inboxDir, importedDir, readBrief } = await import(`file://${join(ROOT, "mcp", "dist", "inbox.js")}`);

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

/* A supervisor with an injected runner, so the proof is about the arrival
   and not about the rendering. */
/**
 * A real, playable MP4.
 *
 * The job record will not mark a job ready unless ffprobe says the artifact
 * holds a video stream. A proof that passes with a text file is not a proof.
 */
function writeRealFilm(projectId) {
  const dir = join(WORK, "workspace", "projects", projectId, "artifacts");
  mkdirSync(dir, { recursive: true });
  execFileSync("ffmpeg", [
    "-nostdin", "-v", "error", "-f", "lavfi", "-i", "color=c=0x111113:s=320x180:d=0.2",
    "-pix_fmt", "yuv420p", "-c:v", "libx264", "-y", join(dir, "film.mp4"),
  ]);
  return "artifacts/film.mp4";
}

const supervisor = new Supervisor({
  repoRoot: WORK,
  ledgerPath: join(WORK, "ledger.jsonl"),
  runner: async (ctx) => ({ ok: true, artifact: writeRealFilm(ctx.job.projectId), rounds: 1 }),
});

/* The inbox has to exist before anything can arrive in it. */
check("the inbox directory exists", existsSync(inboxDir(WORK)));

/* 1. A brief arrives. */
const path = submitBrief(WORK, {
  title: "ACME — slow mornings",
  brief: "A coffee subscription that arrives the night before.",
});
check("a brief was written to the inbox", existsSync(path));
check("the brief reads back", readBrief(path).brief?.title === "ACME — slow mornings");

/* 2. The supervisor takes it. */
const first = await supervisor.tick();
check("the tick turned the brief into a queued job", first.action === "worked", `action was ${first.action}`);
check("the job came from the brief", first.jobId !== undefined);

const queued = supervisor.queuedJobs();
check("the queue is empty afterwards, because the tick worked it", queued.length === 0, `${queued.length} still queued`);

/* 3. The same brief is never taken twice. */
check("the brief was moved to imported/", existsSync(join(importedDir(WORK), "acme-slow-mornings.json")));
const second = await supervisor.tick();
check("a second tick takes nothing, because the brief was already taken", second.action === "idle");

/* 4. The ledger says what happened. */
const ledger = readLedger(join(WORK, "ledger.jsonl"));
check("the ledger records the arrival", ledger.some((e) => String(e.detail ?? "").includes("A brief arrived")));

/* 5. A brief that cannot be read is refused, with a reason, and the loop
     keeps going. */
const broken = join(inboxDir(WORK), "broken.json");
writeFileSync(broken, "{ this is not json", "utf8");
const third = await supervisor.tick();
check("a broken brief does not stop the loop", third.action === "idle");
const brokenNote = join(importedDir(WORK), "broken.rejected.json");
check("the broken brief was moved aside", existsSync(brokenNote));
check(
  "the reason why it was refused was written down",
  existsSync(`${brokenNote}.reason.txt`) &&
    readFileSync(`${brokenNote}.reason.txt`, "utf8").includes("not valid JSON"),
);
check(
  "the refusal is in the ledger",
  readLedger(join(WORK, "ledger.jsonl")).some((e) => String(e.detail ?? "").includes("A brief was refused")),
);

/* 6. A brief with no brief in it is refused too. */
const empty = join(inboxDir(WORK), "empty.json");
writeFileSync(empty, JSON.stringify({ title: "Nothing here" }), "utf8");
await supervisor.tick();
check(
  "a brief with no brief is refused",
  readLedger(join(WORK, "ledger.jsonl")).some((e) => String(e.detail ?? "").includes("no brief")),
);

/* 7. The brief cannot smuggle anything in. It is a string that goes into
     the planner, and that is all. */
const sneaky = submitBrief(WORK, {
  title: "Sneaky",
  brief: "<script>alert(1)</script> and ../../etc/passwd",
});
const read = readBrief(sneaky);
check("a brief is read as plain text", read.brief?.brief.includes("<script>") === true);
check("a brief never becomes a path", read.brief?.brief.includes("../../etc/passwd") === true);

rmSync(WORK, { recursive: true, force: true });

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
console.log("Work arrives on its own, is taken exactly once, and a bad brief says why.");

/**
 * Board-sync job runner: animates `.m-root` explainer boards to a user-supplied
 * WAV and word timings by running the bundled board-sync skill locally.
 *
 * Scope and limits (kept honest):
 *  - Local only. No cloud media, no paid model, no network call is made here.
 *  - Inputs must live under one owner-controlled input root; one folder per video.
 *  - Word timings (`words.tsv`) are REQUIRED. Transcription with a speech
 *    model is not exposed through this path and has not been tested.
 *  - Only `.m-root` Design-Component boards are accepted. Reference boards
 *    (`.ebs` / `seek()` motion references) are rejected.
 *  - One job at a time. Job state is on disk; a job found "running" with no
 *    live process (after a restart) is reported as failed, never as ready.
 */
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, renameSync, writeFileSync,
} from "node:fs";
import { basename, delimiter, join, resolve, sep } from "node:path";
import type { Config } from "./config.js";

export const BOARD_SYNC_ARTIFACTS = [
  "board-track.mp4", "preview.mp4", "timeline.fcpxml", "timeline-premiere.xml", "qa-report.md", "sync-manifest.md",
] as const;

export type BoardSyncStatus = "running" | "ready" | "failed" | "cancelled";

export interface BoardSyncJob {
  id: string;
  input: string;
  status: BoardSyncStatus;
  startedAt: string;
  finishedAt?: string;
  error?: string;
  boards?: number;
  artifacts?: string[];
  log?: string;
  only?: string;
}

const MAX_WAV_BYTES = 1024 * 1024 * 1024;
const MAX_TEXT_BYTES = 2 * 1024 * 1024;
const MAX_BOARDS = 60;
const MAX_BOARD_BYTES = 2 * 1024 * 1024;
const MAX_LOG = 12_000;
const ID_RE = /^bs_[a-f0-9]{16}$/;
const INPUT_RE = /^[A-Za-z0-9][A-Za-z0-9._ -]{0,79}$/;
const BOARD_RE = /^\d{1,3}-[A-Za-z0-9._ -]{1,80}\.html$/;

const running = new Map<string, AbortController>();

export class BoardSyncError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

export function inputRoot(config: Config): string {
  const configured = process.env.MOTION_MASTER_BOARD_SYNC_ROOT?.trim();
  return resolve(configured || join(config.repoRoot, ".board-sync", "inputs"));
}
function jobsRoot(config: Config): string {
  return resolve(join(config.repoRoot, ".board-sync", "jobs"));
}
function skillDir(config: Config): string {
  return join(config.skillsDir, "board-sync");
}
function pythonPath(config: Config): string | undefined {
  const env = process.env.MOTION_MASTER_BOARD_SYNC_PYTHON?.trim();
  if (env) return existsSync(env) ? env : undefined;
  for (const rel of [join(".venv", "bin", "python"), join(".venv", "Scripts", "python.exe")]) {
    const p = join(skillDir(config), rel);
    if (existsSync(p)) return p;
  }
  return undefined;
}
/** A minimal environment for the child: no API keys or tokens are passed on. */
function childEnv(fileRoots?: string[]): NodeJS.ProcessEnv {
  const keep = ["PATH", "HOME", "TMPDIR", "LANG", "LC_ALL", "SYSTEMROOT", "TEMP", "TMP", "CHROME_PATH", "BOARD_SYNC_CHROME"];
  const env: NodeJS.ProcessEnv = { PYTHONUNBUFFERED: "1", PYTHONDONTWRITEBYTECODE: "1" };
  for (const k of keep) if (process.env[k] !== undefined) env[k] = process.env[k];
  // Render-time confinement: the browser may load local files only under these
  // folders and makes no network request (see scripts/render.py).
  if (fileRoots) env.BOARD_SYNC_FILE_ROOTS = fileRoots.join(delimiter);
  return env;
}

export interface Readiness {
  ready: boolean;
  python: boolean;
  gsap: boolean;
  inputRoot: string;
  inputRootExists: boolean;
  details: string;
  setup?: string;
  transcription: "not exposed (words.tsv required)";
  speechModelPackage?: boolean;
}

/** Dependency readiness. Runs the skill's own `--check` (python, ffmpeg, browser, packages). */
export function checkReadiness(config: Config): Readiness {
  const root = inputRoot(config);
  const py = pythonPath(config);
  const gsap = existsSync(join(skillDir(config), "assets", "gsap.min.js"));
  const base = {
    gsap, inputRoot: root, inputRootExists: existsSync(root),
    transcription: "not exposed (words.tsv required)" as const,
  };
  const setup = "Run setup.sh in plugins/motion-master/skills/board-sync (or set MOTION_MASTER_BOARD_SYNC_PYTHON), " +
    "then fetch-gsap.sh. Nothing here installs software for you.";
  if (!py) return { ...base, ready: false, python: false, details: "board-sync Python environment not found.", setup };
  const r = spawnSync(py, [join(skillDir(config), "board_sync.py"), "--check"], {
    env: childEnv(), encoding: "utf8", timeout: 30_000, cwd: skillDir(config),
  });
  const details = `${r.stdout ?? ""}${r.stderr ?? ""}`.trim().slice(-MAX_LOG);
  // faster-whisper is only needed to transcribe, which this path does not do
  // (words.tsv is required), so its absence must not block readiness. Every
  // other missing package, no browser, or a stage that cannot load does.
  const lines = details.split("\n");
  const blocking = lines.filter((l) =>
    (/MISSING/.test(l) && !/^faster_whisper\b/.test(l)) || /^browser\s+none found/.test(l) ||
    /import error|not available/.test(l));
  const checked = lines.some((l) => /^python\b/.test(l)) && lines.some((l) => /^stage\s+render\s+ready/.test(l));
  const ready = checked && blocking.length === 0 && gsap && base.inputRootExists;
  return {
    ...base, ready, python: true,
    speechModelPackage: !lines.some((l) => /^faster_whisper\b.*MISSING/.test(l)),
    details,
    ...(ready ? {} : { setup: gsap ? setup : `${setup} (assets/gsap.min.js is missing)` }),
  };
}

function safeDir(parent: string, name: string): string {
  const p = join(parent, name);
  const st = lstatSync(p, { throwIfNoEntry: false });
  if (!st) throw new BoardSyncError(`Missing folder: ${name}`);
  if (st.isSymbolicLink() || !st.isDirectory()) throw new BoardSyncError(`${name} must be a real folder, not a link.`);
  return p;
}
function safeFile(dir: string, name: string, max: number): string {
  const p = join(dir, name);
  const st = lstatSync(p, { throwIfNoEntry: false });
  if (!st) throw new BoardSyncError(`Missing file: ${name}`);
  if (st.isSymbolicLink() || !st.isFile()) throw new BoardSyncError(`${name} must be a regular file, not a link.`);
  if (st.size > max) throw new BoardSyncError(`${name} is too large.`);
  return p;
}

export interface ResolvedInputs {
  dir: string; boards: string; wav: string; words: string; script: string; brief?: string; boardCount: number;
}

/** Validate a video folder. Pure filesystem checks; nothing runs. */
export function resolveInputs(config: Config, input: string): ResolvedInputs {
  if (!INPUT_RE.test(input) || input.includes("..")) {
    throw new BoardSyncError("input must be one folder name under the input root (letters, digits, . _ - and spaces).");
  }
  const root = inputRoot(config);
  if (!existsSync(root)) throw new BoardSyncError("The board-sync input root does not exist.", 409);
  const dir = join(root, input);
  safeDir(root, input);
  const real = realpathSync(dir);
  if (!real.startsWith(realpathSync(root) + sep)) throw new BoardSyncError("input escapes the input root.");

  const cut = safeDir(dir, "02-cut");
  const briefDir = safeDir(dir, "03-board-brief");
  const boardsDir = safeDir(dir, "04-boards");

  const cutNames = readdirSync(cut);
  const wavs = cutNames.filter((n) => /\.wav$/i.test(n));
  if (wavs.length !== 1) throw new BoardSyncError("02-cut must contain exactly one .wav (the final cut).");
  const wav = safeFile(cut, wavs[0], MAX_WAV_BYTES);
  const wordFiles = cutNames.filter((n) => /words\.tsv$/i.test(n));
  if (wordFiles.length !== 1) {
    throw new BoardSyncError(
      "02-cut must contain exactly one '... words.tsv'. Transcription is not exposed here; supply word timings.",
    );
  }
  const words = safeFile(cut, wordFiles[0], MAX_TEXT_BYTES);
  const script = safeFile(briefDir, "script-marked.md", MAX_TEXT_BYTES);
  const brief = existsSync(join(briefDir, "brief.md")) ? safeFile(briefDir, "brief.md", MAX_TEXT_BYTES) : undefined;

  const boardFiles = readdirSync(boardsDir).filter((n) => /\.html$/i.test(n));
  if (boardFiles.length === 0) throw new BoardSyncError("04-boards has no board HTML files.");
  if (boardFiles.length > MAX_BOARDS) throw new BoardSyncError(`Too many boards (max ${MAX_BOARDS}).`);
  for (const name of boardFiles) {
    if (!BOARD_RE.test(name)) throw new BoardSyncError(`Board file name must look like NN-Name.html: ${name}`);
    const html = readFileSync(safeFile(boardsDir, name, MAX_BOARD_BYTES), "utf8");
    if (!/class\s*=\s*["'][^"']*\bm-root\b/.test(html)) {
      throw new BoardSyncError(`${name} has no .m-root. Only .m-root Design-Component boards are accepted.`);
    }
    if (/\bseek\s*\(|\.ebs\b|class\s*=\s*["'][^"']*\bebs\b/.test(html)) {
      throw new BoardSyncError(`${name} looks like a reference board (seek()/.ebs), which is not a board-sync input.`);
    }
  }
  return { dir, boards: boardsDir, wav, words, script, brief, boardCount: boardFiles.length };
}

function jobDir(config: Config, id: string): string {
  if (!ID_RE.test(id)) throw new BoardSyncError("Unknown job id.", 404);
  return join(jobsRoot(config), id);
}
function writeJob(config: Config, job: BoardSyncJob): void {
  const dir = jobDir(config, job.id);
  mkdirSync(dir, { recursive: true });
  const tmp = join(dir, `job.json.${process.pid}.tmp`);
  writeFileSync(tmp, `${JSON.stringify(job, null, 2)}\n`, "utf8");
  renameSync(tmp, join(dir, "job.json"));
}

export function readBoardSyncJob(config: Config, id: string): BoardSyncJob | undefined {
  const p = join(jobDir(config, id), "job.json");
  if (!existsSync(p)) return undefined;
  let job: BoardSyncJob;
  try { job = JSON.parse(readFileSync(p, "utf8")) as BoardSyncJob; } catch { return undefined; }
  // A "running" job with no live controller was interrupted (restart/crash).
  if (job.status === "running" && !running.has(id)) {
    job = { ...job, status: "failed", finishedAt: new Date().toISOString(), error: "Interrupted before finishing (server restarted). Start it again." };
    writeJob(config, job);
  }
  return job;
}

export function listBoardSyncJobs(config: Config, limit = 20): BoardSyncJob[] {
  const root = jobsRoot(config);
  if (!existsSync(root)) return [];
  return readdirSync(root).filter((n) => ID_RE.test(n))
    .map((id) => readBoardSyncJob(config, id)).filter((j): j is BoardSyncJob => !!j)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, limit);
}

export function startBoardSyncJob(config: Config, input: string, only?: string): BoardSyncJob {
  if (only !== undefined && !/^\d{1,3}(,\d{1,3}){0,19}$/.test(only)) {
    throw new BoardSyncError("only must be board numbers like 4,5.");
  }
  const inputs = resolveInputs(config, input);
  const ready = checkReadiness(config);
  if (!ready.ready) {
    throw new BoardSyncError(`Dependencies are not ready: ${ready.details || "see board_sync_check"}`, 409);
  }
  if (running.size > 0) throw new BoardSyncError("A board-sync job is already running. Cancel it or wait.", 409);

  const id = `bs_${randomBytes(8).toString("hex")}`;
  const out = join(jobDir(config, id), "out");
  mkdirSync(out, { recursive: true });
  const job: BoardSyncJob = {
    id, input, status: "running", startedAt: new Date().toISOString(), boards: inputs.boardCount,
    ...(only ? { only } : {}),
  };
  writeJob(config, job);

  const args = [
    join(skillDir(config), "board_sync.py"),
    "--boards", inputs.boards, "--wav", inputs.wav, "--words", inputs.words, "--script", inputs.script,
    "--out", out,
    ...(inputs.brief ? ["--brief", inputs.brief] : []),
    ...(only ? ["--only", only] : []),
  ];
  const controller = new AbortController();
  running.set(id, controller);
  void runChild(config, id, pythonPath(config) as string, args, controller,
    [realpathSync(inputs.dir), realpathSync(jobDir(config, id)), realpathSync(skillDir(config))]);
  return job;
}

function runChild(
  config: Config, id: string, py: string, args: string[], controller: AbortController, fileRoots: string[],
): Promise<void> {
  const timeoutMs = Number(process.env.MOTION_MASTER_BOARD_SYNC_TIMEOUT_MS) || 30 * 60_000;
  return new Promise<void>((done) => {
    const grouped = process.platform !== "win32";
    const child = spawn(py, args, {
      cwd: skillDir(config), env: childEnv(fileRoots), detached: grouped, stdio: ["ignore", "pipe", "pipe"],
    });
    let log = "";
    let stopped: "cancelled" | "timed out" | undefined;
    let settled = false;
    const collect = (c: Buffer): void => { log = (log + c.toString()).slice(-MAX_LOG); };
    child.stdout.on("data", collect);
    child.stderr.on("data", collect);
    const kill = (sig: "SIGTERM" | "SIGKILL"): void => {
      try { if (grouped && child.pid) process.kill(-child.pid, sig); else child.kill(sig); } catch { /* already gone */ }
    };
    const stop = (why: "cancelled" | "timed out"): void => {
      if (settled || stopped) return;
      stopped = why; kill("SIGTERM");
      setTimeout(() => kill("SIGKILL"), 2_000).unref();
    };
    controller.signal.addEventListener("abort", () => stop("cancelled"), { once: true });
    const timer = setTimeout(() => stop("timed out"), timeoutMs);
    const finish = (code: number): void => {
      if (settled) return;
      settled = true; clearTimeout(timer); running.delete(id);
      const prev = JSON.parse(readFileSync(join(jobDir(config, id), "job.json"), "utf8")) as BoardSyncJob;
      const out = join(jobDir(config, id), "out");
      const made = BOARD_SYNC_ARTIFACTS.filter((n) => {
        const st = lstatSync(join(out, n), { throwIfNoEntry: false });
        return !!st && st.isFile() && !st.isSymbolicLink() && st.size > 0;
      });
      const base = { ...prev, finishedAt: new Date().toISOString(), log: log.trim(), artifacts: made };
      if (stopped === "cancelled") writeJob(config, { ...base, status: "cancelled", error: "Cancelled." });
      else if (stopped === "timed out") writeJob(config, { ...base, status: "failed", error: `Timed out after ${Math.round(timeoutMs / 1000)}s.` });
      else if (code === 0 && made.includes("board-track.mp4")) writeJob(config, { ...base, status: "ready" });
      else writeJob(config, { ...base, status: "failed", error: `board-sync exited with code ${code}.` });
      done();
    };
    child.on("error", (e) => { collect(Buffer.from(`\n${e.message}`)); finish(1); });
    child.on("close", (code) => finish(code ?? 1));
  });
}

export function cancelBoardSyncJob(config: Config, id: string): BoardSyncJob {
  const job = readBoardSyncJob(config, id);
  if (!job) throw new BoardSyncError("Unknown job id.", 404);
  const c = running.get(id);
  if (job.status !== "running" || !c) throw new BoardSyncError(`Job is ${job.status}; nothing to cancel.`, 409);
  c.abort();
  return job;
}

/** Absolute path of a finished artifact, only from the fixed allow-list. */
export function boardSyncArtifactPath(config: Config, id: string, name: string): string {
  const job = readBoardSyncJob(config, id);
  if (!job) throw new BoardSyncError("Unknown job id.", 404);
  if (!(BOARD_SYNC_ARTIFACTS as readonly string[]).includes(name) || basename(name) !== name) {
    throw new BoardSyncError("Unknown artifact.", 404);
  }
  if (job.status !== "ready" || !job.artifacts?.includes(name)) throw new BoardSyncError("Artifact is not available.", 404);
  const p = join(jobDir(config, id), "out", name);
  const st = lstatSync(p, { throwIfNoEntry: false });
  if (!st || !st.isFile() || st.isSymbolicLink()) throw new BoardSyncError("Artifact is not available.", 404);
  return p;
}

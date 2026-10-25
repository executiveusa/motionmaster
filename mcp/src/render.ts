/**
 * Render a film, and keep the file.
 *
 * The chat is only worth having if it ends in a real file. This module takes a
 * HyperFrames project on disk, runs the gate, renders the MP4, captures stills,
 * and hands back the paths. Nothing here is mocked: a render either produced
 * a file or it did not.
 */
import { execFileSync, spawn } from "node:child_process";
import { constants, closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";

export interface FilmFile {
  /** The file's name, e.g. "acme.mp4". */
  name: string;
  /** The absolute path on disk. */
  path: string;
  /** Bytes on disk. */
  bytes: number;
}

export interface GateFinding {
  /** The check that failed: clipped_text, contrast_aa_failure, and so on. */
  code: string;
  severity: "error" | "warning" | "info";
  message: string;
  /** The file the finding came from, relative to the project. */
  sourceFile?: string;
}

export interface GateResult {
  ok: boolean;
  /** The number of errors the gate reported. */
  errors: number;
  /** The tail of the gate's output, for the record. */
  output: string;
  /** The findings, with the file each one came from. */
  findings: GateFinding[];
}

export interface FilmRecord {
  id: string;
  title: string;
  brief: string;
  createdAt: string;
  /** The project directory, absolute. */
  directory: string;
  /** The rendered video, if there is one. */
  video?: FilmFile;
  /** The poster still, if there is one. */
  poster?: FilmFile;
  /** The contact sheet, if there is one. */
  sheet?: FilmFile;
  seconds?: number;
  gate?: GateResult;
  /** The last render's log tail. */
  log?: string;
}

/** The directory every rendered film lives in. */
export function filmsDir(repoRoot: string): string {
  return resolve(repoRoot, "workspace", "films");
}

/** A safe, readable folder name from a title. */
export function filmSlug(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "film";
}

/** The script that knows how to run HyperFrames here. */
function hfScript(repoRoot: string): string {
  return join(repoRoot, "generator", "hf.sh");
}

interface RunResult {
  ok: boolean;
  code: number;
  output: string;
}

/**
 * Run a HyperFrames subcommand and collect its output.
 *
 * The output is kept whatever happens — a failed render is exactly when the
 * log matters most.
 */
function runHyperFrames(
  repoRoot: string,
  args: string[],
  timeoutMs: number,
): Promise<RunResult> {
  return new Promise((resolvePromise) => {
    const child = spawn("bash", [hfScript(repoRoot), ...args], {
      cwd: repoRoot,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";
    const collect = (chunk: Buffer): void => {
      output += chunk.toString();
      // Keep the tail. A render log can be enormous and the useful part is
      // always at the end.
      if (output.length > 40_000) output = output.slice(-40_000);
    };
    child.stdout.on("data", collect);
    child.stderr.on("data", collect);

    let settled = false;
    const finish = (ok: boolean, code: number): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolvePromise({ ok, code, output: output.trim() });
    };

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      output += `\nThe command was stopped after ${Math.round(timeoutMs / 1000)}s.`;
      finish(false, 124);
    }, timeoutMs);

    child.on("error", (error) => {
      output += `\n${error instanceof Error ? error.message : String(error)}`;
      finish(false, 1);
    });
    child.on("close", (code) => finish(code === 0, code ?? 1));
  });
}

/** Count the errors the gate reported in its output. */
function countGateErrors(output: string): number {
  const matches = output.match(/\berrors?\b\D{0,20}(\d+)/gi) ?? [];
  let worst = 0;
  for (const match of matches) {
    const n = Number(match.match(/(\d+)/)?.[1] ?? "0");
    if (Number.isFinite(n) && n > worst) worst = n;
  }
  return worst;
}

/**
 * Run the gate. This is the step that catches what a render cannot — a
 * silent film, a text below the contrast floor, a stretched frame.
 */
export async function gateProject(
  repoRoot: string,
  projectDir: string,
  timeoutMs = 180_000,
): Promise<GateResult> {
  const result = await runHyperFrames(repoRoot, ["check", projectDir], timeoutMs);
  return {
    ok: result.ok,
    errors: result.ok ? 0 : Math.max(1, countGateErrors(result.output)),
    output: result.output.slice(-6000),
    findings: result.ok ? [] : readGateFindings(projectDir),
  };
}

/**
 * Read the gate's own report.
 *
 * The report is structured and names the file each finding came from, which
 * is the difference between "the film failed" and "this block failed". The
 * text output cannot say that.
 */
export function readGateFindings(projectDir: string): GateFinding[] {
  const dir = join(projectDir, ".hyperframes", "artifacts", "checks");
  if (!existsSync(dir)) return [];
  const reports = readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => join(dir, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  if (reports.length === 0) return [];

  try {
    const report = JSON.parse(readFileSync(reports[0], "utf8")) as Record<string, unknown>;
    const findings: GateFinding[] = [];
    for (const section of ["lint", "runtime", "layout", "motion", "contrast", "craft"]) {
      const block = report[section] as { findings?: unknown[] } | undefined;
      if (!block || !Array.isArray(block.findings)) continue;
      for (const finding of block.findings) {
        const f = finding as {
          code?: string;
          severity?: string;
          message?: string;
          sourceFile?: string;
        };
        if (f.severity !== "error") continue;
        findings.push({
          code: f.code ?? "unknown",
          severity: "error",
          message: f.message ?? "",
          sourceFile: f.sourceFile,
        });
      }
    }
    return findings;
  } catch {
    return [];
  }
}

/** Write a project's files to disk. */
export function writeProject(
  projectDir: string,
  files: { path: string; contents: string }[],
): string[] {
  mkdirSync(projectDir, { recursive: true });
  const root = realpathSync(projectDir);
  const inside = (target: string): boolean => {
    const rel = relative(root, target);
    return rel !== "" && rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
  };
  const written: string[] = [];
  for (const file of files) {
    // A string prefix is not a containment check: /film-evil starts with /film.
    // Refuse traversal and absolute paths, rather than silently dropping files.
    if (!file.path || isAbsolute(file.path)) {
      throw new Error(`Invalid project file path: ${file.path}`);
    }
    const target = resolve(root, file.path);
    if (!inside(target)) throw new Error(`Project file escapes root: ${file.path}`);
    mkdirSync(dirname(target), { recursive: true });
    // Parent symlinks can redirect a seemingly contained path outside root.
    const realParent = realpathSync(dirname(target));
    if (realParent !== root && !inside(realParent)) {
      throw new Error(`Project file parent escapes root: ${file.path}`);
    }
    // O_NOFOLLOW also refuses a final-component symlink. Do not truncate the
    // symlink's target even when the target exists outside the project.
    const fd = openSync(target, constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | constants.O_NOFOLLOW, 0o600);
    try {
      writeFileSync(fd, file.contents, "utf8");
    } finally {
      closeSync(fd);
    }
    written.push(target);
  }
  return written;
}

/** The contact sheet, if the snapshot made one. */
function contactSheet(dir: string): FilmFile | undefined {
  if (!existsSync(dir)) return undefined;
  const sheet = readdirSync(dir).find((name) => /sheet|contact/i.test(name));
  if (!sheet) return undefined;
  const path = join(dir, sheet);
  return { name: sheet, path, bytes: statSync(path).size };
}

/** Find the newest file in a directory with one of the given extensions. */
function newestWith(dir: string, extensions: string[]): string | undefined {
  if (!existsSync(dir)) return undefined;
  const candidates: { path: string; mtime: number }[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (!extensions.includes(extname(entry.name).toLowerCase())) continue;
    const path = join(dir, entry.name);
    candidates.push({ path, mtime: statSync(path).mtimeMs });
  }
  candidates.sort((a, b) => b.mtime - a.mtime);
  return candidates[0]?.path;
}

/**
 * Render a project to an MP4 and capture stills.
 *
 * The gate runs first. If it finds errors the render is not attempted: a file
 * that is wrong in a way the gate can see should not exist.
 */
export async function renderProject(
  repoRoot: string,
  projectDir: string,
  options: { fps?: number; timeoutMs?: number; skipGate?: boolean } = {},
): Promise<{
  video?: FilmFile;
  poster?: FilmFile;
  sheet?: FilmFile;
  gate?: GateResult;
  log: string;
  ok: boolean;
}> {
  const timeoutMs = options.timeoutMs ?? 900_000;

  let gate: GateResult | undefined;
  if (!options.skipGate) {
    gate = await gateProject(repoRoot, projectDir, Math.min(timeoutMs, 240_000));
    if (!gate.ok) {
      return { gate, log: gate.output, ok: false };
    }
  }

  const output = join(projectDir, "film.mp4");
  const render = await runHyperFrames(
    repoRoot,
    ["render", projectDir, "--output", output, ...(options.fps ? ["-f", String(options.fps)] : [])],
    timeoutMs,
  );
  if (!render.ok || !existsSync(output)) {
    return { gate, log: render.output, ok: false };
  }

  // Stills: a contact sheet for the proof, and one poster frame.
  const stills = join(projectDir, "stills");
  mkdirSync(stills, { recursive: true });
  const snapshot = await runHyperFrames(
    repoRoot,
    ["snapshot", projectDir, "--output", stills, "--frames", "5"],
    Math.min(timeoutMs, 240_000),
  );

  const posterPath = newestWith(stills, [".png", ".jpg", ".jpeg"]);
  const video: FilmFile = {
    name: basename(output),
    path: output,
    bytes: statSync(output).size,
  };

  return {
    video,
    poster: posterPath
      ? { name: basename(posterPath), path: posterPath, bytes: statSync(posterPath).size }
      : undefined,
    sheet: contactSheet(stills),
    gate,
    log: render.output.slice(-6000),
    ok: true,
  };
}

/** Read the duration of a video, in seconds, with ffprobe when it is there. */
export function videoSeconds(path: string): number | undefined {
  const probe = [
    "ffprobe",
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=nw=1:nk=1",
    path,
  ];
  try {
    const out = execFileSync(probe[0], probe.slice(1), { encoding: "utf8" }).trim();
    const seconds = Number(out);
    return Number.isFinite(seconds) ? Math.round(seconds * 10) / 10 : undefined;
  } catch {
    return undefined;
  }
}

/** Every film on disk, newest first. */
export function listFilms(repoRoot: string): FilmRecord[] {
  const root = filmsDir(repoRoot);
  if (!existsSync(root)) return [];
  const records: FilmRecord[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const directory = join(root, entry.name);
    const metaPath = join(directory, "film.json");
    let meta: Partial<FilmRecord> = {};
    if (existsSync(metaPath)) {
      try {
        meta = JSON.parse(readFileSync(metaPath, "utf8")) as Partial<FilmRecord>;
      } catch {
        meta = {};
      }
    }
    const videoPath = join(directory, "film.mp4");
    const posterPath = newestWith(join(directory, "stills"), [".png", ".jpg", ".jpeg"]);
    records.push({
      id: entry.name,
      title: meta.title ?? entry.name,
      brief: meta.brief ?? "",
      createdAt: meta.createdAt ?? statSync(directory).mtime.toISOString(),
      directory,
      video: existsSync(videoPath)
        ? { name: basename(videoPath), path: videoPath, bytes: statSync(videoPath).size }
        : undefined,
      poster: posterPath
        ? { name: basename(posterPath), path: posterPath, bytes: statSync(posterPath).size }
        : undefined,
      seconds: meta.seconds,
      gate: meta.gate,
    });
  }
  records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return records;
}


/* ------------------------------------------------------------------ jobs */

/**
 * A render in progress.
 *
 * A render takes minutes, and an MCP call times out at a minute. So the
 * render runs on its own and the tool answers at once. The console polls for
 * the file. The job's state is on disk, so it survives a restart and can be
 * read over HTTP.
 */
export interface RenderJob {
  id: string;
  status: "rendering" | "ready" | "failed";
  startedAt: string;
  finishedAt?: string;
  /** Why it failed, when it failed. */
  error?: string;
  /** The blocks the gate blamed, with the reasons. */
  dropped?: { id: string; reasons: string[] }[];
  /** The shots that made it into the film. */
  shots?: { id: string; title: string; duration: number }[];
  seconds?: number;
}

/** Where a film's job state lives. */
export function jobPath(repoRoot: string, id: string): string {
  return join(filmsDir(repoRoot), id, "job.json");
}

/** Read a job's state. */
export function readJob(repoRoot: string, id: string): RenderJob | undefined {
  const path = jobPath(repoRoot, id);
  if (!existsSync(path)) return undefined;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as RenderJob;
  } catch {
    return undefined;
  }
}

/** Write a job's state. */
export function writeJob(repoRoot: string, job: RenderJob): void {
  const path = jobPath(repoRoot, job.id);
  mkdirSync(join(filmsDir(repoRoot), job.id), { recursive: true });
  writeFileSync(path, `${JSON.stringify(job, null, 2)}\n`, "utf8");
}

/** Remember a film, so the list can name it. */
export function writeFilmMeta(directory: string, record: Partial<FilmRecord>): void {
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, "film.json"), JSON.stringify(record, null, 2), "utf8");
}

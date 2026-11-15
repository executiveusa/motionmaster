/**
 * The brief inbox.
 *
 * The loop needs work to arrive on its own. Until now the only way in was
 * for a person or an agent to create a project and a job by hand — which
 * makes the loop a tool with a very good keyboard.
 *
 * The inbox is a directory. A brief is a JSON file. The supervisor looks at
 * the directory on every tick, and any brief it has not seen becomes a
 * project and a queued job. The file is then moved to `imported/`, so the
 * same brief is never taken twice.
 *
 * The brief format is the one the ICM workspace already uses, so a brief
 * written by a person and a brief written by a model are the same thing:
 *
 * ```json
 * {
 *   "title": "ACME — slow mornings",
 *   "brief": "A coffee subscription that arrives the night before.",
 *   "shots": []
 * }
 * ```
 *
 * The brief is **not** trusted. It is a string that goes into the planner,
 * which decides what to build from it. A brief cannot smuggle in a file
 * path, a script or a URL — the planner only ever reads it as text.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createProject, createProjectJob, type ProjectJob } from "./projects.js";

/** Where briefs arrive. */
export function inboxDir(repoRoot: string): string {
  return join(repoRoot, "workspace", "briefs");
}

/** Where briefs go once they have been taken. */
export function importedDir(repoRoot: string): string {
  return join(inboxDir(repoRoot), "imported");
}

export interface Brief {
  title: string;
  brief: string;
  shots?: unknown[];
}

/**
 * Read a brief file.
 *
 * A brief that cannot be read is not a brief. It is moved aside with the
 * reason, so a person can see what happened, and the loop keeps going.
 */
export function readBrief(path: string): { brief?: Brief; error?: string } {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (error) {
    return { error: `The brief could not be read: ${error instanceof Error ? error.message : String(error)}` };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return { error: `The brief is not valid JSON: ${error instanceof Error ? error.message : String(error)}` };
  }
  if (!parsed || typeof parsed !== "object") return { error: "The brief is not an object." };
  const record = parsed as Record<string, unknown>;
  const title = typeof record.title === "string" ? record.title.trim() : "";
  const brief = typeof record.brief === "string" ? record.brief.trim() : "";
  if (!title) return { error: "The brief has no title." };
  if (!brief) return { error: "The brief has no brief." };
  return { brief: { title, brief, shots: Array.isArray(record.shots) ? record.shots : [] } };
}

export interface InboxResult {
  /** The jobs that were created. */
  created: { job: ProjectJob; source: string }[];
  /** The briefs that could not be read, and why. */
  rejected: { source: string; error: string }[];
  /** The directory that was read. */
  dir: string;
}

/**
 * Take every new brief in the inbox and turn it into a queued job.
 *
 * Called on every supervisor tick. It is safe to call twice: a brief is only
 * taken once, because the file is moved as soon as it has been taken.
 */
export function takeBriefs(repoRoot: string): InboxResult {
  const dir = inboxDir(repoRoot);
  const imported = importedDir(repoRoot);
  const result: InboxResult = { created: [], rejected: [], dir };

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    mkdirSync(imported, { recursive: true });
    return result;
  }
  mkdirSync(imported, { recursive: true });

  /* Sorted, so two briefs taken in the same tick are taken in a known
     order rather than the order the filesystem listed them in. */
  const files = readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .sort();

  for (const name of files) {
    const source = join(dir, name);
    const { brief, error } = readBrief(source);
    if (!brief) {
      result.rejected.push({ source, error: error ?? "The brief could not be read." });
      /* Move it aside so the inbox is not stuck on it forever. The reason
         goes in the name, so nobody has to open the file to find out. */
      const aside = join(imported, `${name.replace(/\.json$/, "")}.rejected.json`);
      try {
        renameSync(source, aside);
        writeFileSync(`${aside}.reason.txt`, result.rejected[result.rejected.length - 1].error, "utf8");
      } catch {
        /* If it cannot be moved, it stays and is reported again next tick. */
      }
      continue;
    }

    try {
      const project = createProject(repoRoot, {
        title: brief.title,
        brief: brief.brief,
        shots: [],
      });
      const job = createProjectJob(repoRoot, project.project.id, 1);
      renameSync(source, join(imported, name));
      result.created.push({ job, source });
    } catch (caught) {
      result.rejected.push({
        source,
        error: caught instanceof Error ? caught.message : String(caught),
      });
    }
  }

  return result;
}

/** Write a brief into the inbox. What a person or another model would do. */
export function submitBrief(repoRoot: string, brief: Brief, name?: string): string {
  const dir = inboxDir(repoRoot);
  mkdirSync(dir, { recursive: true });
  const slug =
    (name ?? brief.title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "brief";
  const path = resolve(dir, `${slug}.json`);
  writeFileSync(path, `${JSON.stringify({ title: brief.title, brief: brief.brief, shots: brief.shots ?? [] }, null, 2)}\n`, "utf8");
  return path;
}

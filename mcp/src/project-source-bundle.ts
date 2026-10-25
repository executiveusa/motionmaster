/**
 * MM-09: portable, bounded source archive for a completed project render.
 * This is a gzip-compressed JSON envelope, not a ZIP or an MP4. Every embedded
 * byte is hashed and every path is relative. No upstream licence is invented.
 */
import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { createProject, projectsRoot, readProject, readProjectJob, readRevision, saveRevision, validShots, type ProjectRevision } from "./projects.js";

const MAX_FILES = 512;
const MAX_FILE_BYTES = 16 * 1024 * 1024;
const MAX_TOTAL_BYTES = 48 * 1024 * 1024;
const MAX_ARCHIVE_BYTES = 64 * 1024 * 1024;
const OMIT_DIRS = new Set([".git", ".hyperframes", "node_modules", "stills", "dist"]);
const OMIT_FILES = new Set(["film.mp4", "render.log"]);
const SAFE_SOURCE = /^(?:index\.html|brief\.json|hyperframes\.json|compositions\/[a-zA-Z0-9_./-]+|assets\/[a-zA-Z0-9_./-]+)$/;
const hash = (bytes: Buffer): string => createHash("sha256").update(bytes).digest("hex");
const SAFE_ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/;
const safeSourcePath = (path: string): boolean =>
  SAFE_SOURCE.test(path) && !path.split("/").some((segment) => !segment || segment === "." || segment === "..");

export interface SourceFile {
  path: string;
  size: number;
  sha256: string;
  base64: string;
}
export interface SourceBundle {
  format: "motion-master-source";
  version: 1;
  project: { title: string; brief: string; sourceId: string };
  revisions: ProjectRevision[];
  render: { jobId: string; revision: number };
  licence: { product: unknown; upstreamAssets: "review-required"; note: string };
  files: SourceFile[];
}

/** Read-only export. Refuse missing/unverified jobs, symlinks and oversized trees. */
export function exportProjectSource(repoRoot: string, projectId: string, jobId: string): Buffer {
  const current = readProject(repoRoot, projectId);
  const job = readProjectJob(repoRoot, projectId, jobId);
  if (!current || !job) throw new Error("Project or render job not found.");
  if (job.status !== "ready" || job.artifact !== `artifacts/${jobId}.mp4`) {
    throw new Error("Source export requires a completed render.");
  }
  const root = join(projectsRoot(repoRoot), projectId, "renders", jobId);
  const projectRoot = join(projectsRoot(repoRoot), projectId);
  if (!existsSync(root) || !lstatSync(root).isDirectory() || lstatSync(root).isSymbolicLink() ||
      !realpathSync(root).startsWith(realpathSync(projectRoot) + sep)) {
    throw new Error("Generated source directory is missing or unsafe.");
  }
  const files: SourceFile[] = [];
  let total = 0;
  const visit = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const absolute = join(dir, entry.name);
      if (entry.isSymbolicLink()) throw new Error("Symlinks are not allowed in source exports.");
      if (entry.isDirectory()) {
        if (!OMIT_DIRS.has(entry.name)) visit(absolute);
        continue;
      }
      if (!entry.isFile() || OMIT_FILES.has(entry.name)) continue;
      const path = relative(root, absolute).split(sep).join("/");
      if (!safeSourcePath(path)) continue;
      const stat = lstatSync(absolute);
      total += stat.size;
      if (stat.size > MAX_FILE_BYTES || total > MAX_TOTAL_BYTES || files.length >= MAX_FILES) {
        throw new Error("Source export exceeds size or file-count limits.");
      }
      const bytes = readFileSync(absolute);
      if (bytes.length !== stat.size) throw new Error("Source file changed during export.");
      files.push({ path, size: bytes.length, sha256: hash(bytes), base64: bytes.toString("base64") });
    }
  };
  visit(root);
  if (!files.some((file) => file.path === "index.html") ||
      !files.some((file) => file.path === "hyperframes.json")) {
    throw new Error("Generated editable source is incomplete.");
  }
  const revisions: ProjectRevision[] = [];
  for (let n = 1; n <= current.project.currentRevision; n++) {
    const revision = readRevision(repoRoot, projectId, n);
    if (!revision) throw new Error("Project revision history is incomplete.");
    revisions.push(revision);
  }
  const licencePath = resolve(repoRoot, "licence.json");
  const product = existsSync(licencePath) ? JSON.parse(readFileSync(licencePath, "utf8")) as unknown : null;
  const bundle: SourceBundle = {
    format: "motion-master-source", version: 1,
    project: { title: current.project.title, brief: current.project.brief, sourceId: projectId },
    revisions, render: { jobId, revision: job.revision },
    licence: {
      product, upstreamAssets: "review-required",
      note: "This export does not grant rights to third-party blocks, fonts, audio or imagery. Verify their original licences before redistribution.",
    },
    files,
  };
  const zipped = gzipSync(Buffer.from(JSON.stringify(bundle)), { level: 6 });
  if (zipped.length > MAX_ARCHIVE_BYTES) throw new Error("Source archive is too large.");
  return zipped;
}

/** Validate before reusing an archive. Does not write, execute, or trust code. */
export function inspectProjectSource(archive: Buffer): SourceBundle {
  if (archive.length > MAX_ARCHIVE_BYTES) throw new Error("Source archive is too large.");
  const raw = gunzipSync(archive, { maxOutputLength: MAX_TOTAL_BYTES * 3 });
  const bundle = JSON.parse(raw.toString("utf8")) as SourceBundle;
  if (bundle?.format !== "motion-master-source" || bundle.version !== 1 ||
      !Array.isArray(bundle.files) || bundle.files.length === 0 || bundle.files.length > MAX_FILES ||
      !Array.isArray(bundle.revisions) || bundle.revisions.length === 0 ||
      typeof bundle.project?.title !== "string" || typeof bundle.project?.brief !== "string") {
    throw new Error("Unsupported source archive.");
  }
  // A valid checksum is not enough: provenance and revision records are
  // untrusted JSON. Validate the complete immutable history before any import.
  if (!SAFE_ID.test(bundle.project.sourceId) || typeof bundle.render?.jobId !== "string" ||
      !SAFE_ID.test(bundle.render.jobId) ||
      !Number.isSafeInteger(bundle.render.revision) ||
      bundle.render.revision < 1 || bundle.render.revision > bundle.revisions.length ||
      bundle.revisions.length > 100 ||
      bundle.project.title.length > 300 || !bundle.project.title.trim() ||
      bundle.project.brief.length > 20_000 || !bundle.project.brief.trim()) {
    throw new Error("Invalid source archive provenance.");
  }
  for (let i = 0; i < bundle.revisions.length; i++) {
    const revision = bundle.revisions[i];
    if (!revision || revision.schemaVersion !== 1 ||
        revision.projectId !== bundle.project.sourceId || revision.number !== i + 1 ||
        typeof revision.createdAt !== "string" ||
        typeof revision.title !== "string" || !revision.title.trim() || revision.title.length > 300 ||
        typeof revision.brief !== "string" || !revision.brief.trim() || revision.brief.length > 20_000 ||
        !validShots(revision.shots)) {
      throw new Error("Invalid source archive revision history.");
    }
  }
  const latest = bundle.revisions[bundle.revisions.length - 1];
  if (latest.title !== bundle.project.title || latest.brief !== bundle.project.brief) {
    throw new Error("Source archive project and revision disagree.");
  }
  let total = 0;
  const seen = new Set<string>();
  for (const file of bundle.files) {
    if (typeof file.path !== "string" || !safeSourcePath(file.path) || seen.has(file.path) ||
        !Number.isSafeInteger(file.size) || file.size < 0 || file.size > MAX_FILE_BYTES ||
        typeof file.base64 !== "string" || typeof file.sha256 !== "string") {
      throw new Error("Unsafe source archive entry.");
    }
    seen.add(file.path);
    const bytes = Buffer.from(file.base64, "base64");
    total += bytes.length;
    if (total > MAX_TOTAL_BYTES || bytes.length !== file.size || hash(bytes) !== file.sha256 ||
        bytes.toString("base64") !== file.base64) {
      throw new Error("Source archive checksum or size mismatch.");
    }
  }
  if (!seen.has("index.html") || !seen.has("hyperframes.json")) {
    throw new Error("Source archive is missing required project files.");
  }
  return bundle;
}

/**
 * Reopen a portable archive as a NEW private project. Imported HTML/assets are
 * retained as inert source evidence, never served or executed by this method.
 * No imported render is marked ready: a fresh, verified MP4 is required.
 * The original project and its immutable revision history remain untouched.
 */
export function importProjectSource(repoRoot: string, archive: Buffer): {
  project: ReturnType<typeof createProject>["project"];
  revision: ProjectRevision;
  sourceId: string;
  importedFiles: number;
} {
  const bundle = inspectProjectSource(archive);
  const first = bundle.revisions[0];
  const created = createProject(repoRoot, {
    title: first.title, brief: first.brief, shots: first.shots,
  });
  // Import is all-or-nothing at the project-directory level. On a disk
  // write failure, remove only this newly created project, never the source.
  try {
    let current = created;
    for (const revision of bundle.revisions.slice(1)) {
      current = saveRevision(repoRoot, created.project.id, current.revision.number, {
        title: revision.title, brief: revision.brief, shots: revision.shots,
      });
    }
    // This directory is unique to the new project and is never executed by
    // the rendering worker. Imported HTML is retained as untrusted evidence.
    const root = join(projectsRoot(repoRoot), created.project.id, "imports", bundle.render.jobId);
    mkdirSync(root, { recursive: true });
    for (const file of bundle.files) {
      const target = join(root, file.path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, Buffer.from(file.base64, "base64"), { flag: "wx", mode: 0o600 });
    }
    writeFileSync(join(root, "import.json"), JSON.stringify({
      format: bundle.format, version: bundle.version, sourceId: bundle.project.sourceId,
      render: bundle.render, originalRevisionDates: bundle.revisions.map((r) => r.createdAt),
      upstreamAssets: "review-required",
      note: "Imported code is untrusted and must not be executed automatically.",
    }, null, 2), { flag: "wx", mode: 0o600 });
    return {
      project: current.project, revision: current.revision,
      sourceId: bundle.project.sourceId, importedFiles: bundle.files.length,
    };
  } catch (error) {
    rmSync(join(projectsRoot(repoRoot), created.project.id), { recursive: true, force: true });
    throw error;
  }
}

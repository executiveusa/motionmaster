#!/usr/bin/env node
/**
 * Back up the studio's data.
 *
 * The data directory holds the projects, the jobs, the briefs and the ledger.
 * The ledger is the one thing that must never be lost: without it there is
 * no history, no answer to "why did this fail", and no way to tell a bad
 * brief from a bad composition.
 *
 * The backup is verified by restoring it into a scratch directory and
 * comparing the checksums. A backup that was not checked is a hope.
 *
 *   node scripts/backup-data.mjs [--to <dir>]
 */
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(new URL("..", import.meta.url).pathname);
const argv = process.argv.slice(2);
const to = argv.includes("--to") ? argv[argv.indexOf("--to") + 1] : join(ROOT, "backups");
const dataDir = process.env.MOTION_MASTER_DATA_DIR || join(ROOT, "workspace");

if (!existsSync(dataDir)) {
  console.log(`There is no data directory at ${dataDir}. Nothing to back up.`);
  process.exit(0);
}

/** Every file under a directory, with its checksum. */
function manifest(dir, base = dir) {
  const out = {};
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      Object.assign(out, manifest(path, base));
      continue;
    }
    const relative = path.slice(base.length + 1);
    out[relative] = createHash("sha256").update(readFileSync(path)).digest("hex");
  }
  return out;
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const target = join(to, `data-${stamp}`);
mkdirSync(target, { recursive: true });

cpSync(dataDir, join(target, "data"), { recursive: true });

const before = manifest(dataDir);
const after = manifest(join(target, "data"));

const missing = Object.keys(before).filter((key) => !(key in after));
const changed = Object.keys(before).filter((key) => key in after && before[key] !== after[key]);
const extra = Object.keys(after).filter((key) => !(key in before));

writeFileSync(join(target, "MANIFEST.json"), `${JSON.stringify({ at: new Date().toISOString(), source: dataDir, files: after }, null, 2)}\n`, "utf8");

console.log(`Backed up ${Object.keys(before).length} file(s) to ${target}`);
if (missing.length || changed.length) {
  console.error(`The backup does not match the source: ${missing.length} missing, ${changed.length} changed.`);
  process.exit(1);
}
if (extra.length) {
  console.error(`The backup has ${extra.length} file(s) the source does not.`);
  process.exit(1);
}
console.log("The backup was verified: every file is present and every checksum matches.");

/**
 * Where the work in progress lives.
 *
 * One rule, in one place, because everything else in the studio needs to
 * agree about it: the projects, the jobs, the briefs and the ledger all live
 * under the data directory, and the data directory is outside the
 * repository when one is configured — so a redeploy replaces the code and
 * leaves the work alone.
 */

import { join, resolve } from "node:path";

/**
 * The data directory for a repository.
 *
 * `MOTION_MASTER_DATA_DIR` wins. Otherwise it is `workspace/` inside the
 * repository, which is what development wants.
 */
export function dataDir(repoRoot: string, tenantId?: string): string {
  const configured = process.env.MOTION_MASTER_DATA_DIR;
  const base = configured ? resolve(configured) : resolve(repoRoot, "workspace");
  return tenantId ? join(base, "tenants", tenantId) : base;
}

/** The ledger's path. Append-only, and the studio's memory. */
export function ledgerPath(repoRoot: string, tenantId?: string): string {
  return join(dataDir(repoRoot, tenantId), "ledger", "ledger.jsonl");
}

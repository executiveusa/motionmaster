/**
 * Tenants — who is allowed to make the studio work, and how much.
 *
 * One bearer key for the whole studio is fine on a laptop and wrong the
 * moment anybody else uses it. This is the next step: a key belongs to a
 * tenant, a tenant has its own data directory, a tenant has a quota, and
 * everything a tenant causes is recorded against it.
 *
 * The design is deliberately small, because it is a file and not a database:
 *
 * ```json
 * {
 *   "tenants": {
 *     "acme": { "key": "…", "rendersPerDay": 20 },
 *     "globex": { "key": "…", "rendersPerDay": 5 }
 *   }
 * }
 * ```
 *
 * **A key is never stored in the clear in the repository.** The file is
 * created outside it, and it is `MOTION_MASTER_TENANTS_PATH` that says
 * where it is. If the file is not there, the studio is single-tenant and
 * open — which is the development default and is honest about being one.
 *
 * **The quota is counted, not remembered.** It is the number of published
 * jobs in the tenant's own ledger today. A quota that is kept in memory
 * resets when the process restarts, which is not a quota.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { dataDir } from "./datadir.js";

export interface Tenant {
  id: string;
  /** How many publishes a day. Zero or less means no limit. */
  rendersPerDay: number;
  /** The key that belongs to this tenant. Compared, never logged. */
  key: string;
}

export interface TenantFile {
  tenants: Record<string, { key: string; rendersPerDay?: number }>;
}

/** Where the tenants file is. Outside the repository by default. */
export function tenantsPath(repoRoot: string): string {
  return process.env.MOTION_MASTER_TENANTS_PATH?.trim()
    ? resolve(process.env.MOTION_MASTER_TENANTS_PATH)
    : join(dataDir(repoRoot), "tenants.json");
}

/**
 * Read the tenants file.
 *
 * A file that is not there means one tenant, no key, no quota. A file that
 * is there but wrong is an error: it is a configuration mistake, and
 * pretending the studio is open when it was meant to be closed is worse
 * than refusing to start.
 */
export function loadTenants(repoRoot: string): { tenants: Tenant[]; error?: string } {
  const path = tenantsPath(repoRoot);
  if (!existsSync(path)) return { tenants: [] };

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    return {
      tenants: [],
      error: `The tenants file at ${path} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  const file = parsed as TenantFile;
  if (!file || typeof file !== "object" || typeof file.tenants !== "object" || !file.tenants) {
    return { tenants: [], error: `The tenants file at ${path} has no "tenants" object.` };
  }

  const tenants: Tenant[] = [];
  for (const [id, entry] of Object.entries(file.tenants)) {
    if (!entry || typeof entry.key !== "string" || entry.key.length < 8) {
      return {
        tenants: [],
        error: `The tenant "${id}" has no usable key. A key is at least eight characters.`,
      };
    }
    tenants.push({ id, key: entry.key, rendersPerDay: entry.rendersPerDay ?? 0 });
  }
  return { tenants };
}

/** The tenant a request belongs to, from its bearer key. */
export function tenantForKey(repoRoot: string, key: string): Tenant | null {
  const { tenants } = loadTenants(repoRoot);
  if (!key) return null;
  return tenants.find((tenant) => tenant.key === key) ?? null;
}

/** A tenant's own data directory. Its projects, its jobs, its ledger. */
export function tenantDataDir(repoRoot: string, tenantId: string): string {
  return join(dataDir(repoRoot), "tenants", tenantId);
}

/**
 * How many publishes a tenant has made today.
 *
 * Counted from the tenant's own ledger, because a ledger is the only thing
 * that survives a restart and the only thing nobody can quietly edit.
 */
export function publishesToday(repoRoot: string, tenantId: string): number {
  const path = join(tenantDataDir(repoRoot, tenantId), "ledger", "ledger.jsonl");
  if (!existsSync(path)) return 0;
  const today = new Date().toISOString().slice(0, 10);
  let count = 0;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line) as { at?: string; event?: string };
      if (entry.event === "published" && String(entry.at ?? "").startsWith(today)) count += 1;
    } catch {
      /* A corrupt line does not change the count. */
    }
  }
  return count;
}

/** Whether a tenant may publish another job today. */
export function withinQuota(repoRoot: string, tenant: Tenant): { ok: boolean; used: number; limit: number } {
  const used = publishesToday(repoRoot, tenant.id);
  const limit = tenant.rendersPerDay;
  return { ok: limit <= 0 || used < limit, used, limit };
}

/**
 * Write a tenants file.
 *
 * It refuses to write it inside the repository: a key in a file that goes to
 * a public remote is a key in a public remote.
 */
export function writeTenantsFile(path: string, file: TenantFile): { ok: boolean; error?: string } {
  if (path.includes("/motion-master/") && path.includes("/plugins/")) {
    return { ok: false, error: "The tenants file cannot live inside the plugin package." };
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(file, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  return { ok: true };
}

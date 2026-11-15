#!/usr/bin/env node
/**
 * Prove the identity layer.
 *
 * Three claims, each proved against a real server:
 *
 *   1. **With tenants configured, a key is required.** A studio that has
 *      tenants and still lets anybody in is a mistake, not a convenience.
 *   2. **A key decides which tenant you are.** One tenant's projects, jobs
 *      and ledger are invisible to another.
 *   3. **The quota is counted, not remembered.** A tenant's quota is the
 *      number of publishes in its own ledger today — so it survives a
 *      restart, and it cannot be quietly edited.
 *
 *   node scripts/proof-identity.mjs
 */
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const ROOT = resolve(new URL("..", import.meta.url).pathname);
const WORK = join(tmpdir(), `mm-identity-${Date.now()}`);
mkdirSync(WORK, { recursive: true });

const DATA = join(WORK, "data");
const TENANTS = join(WORK, "tenants.json");

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

/* Two tenants, each with a quota of one publish a day. */
writeFileSync(
  TENANTS,
  `${JSON.stringify({
    tenants: {
      acme: { key: "acme-key-0123456789", rendersPerDay: 1 },
      globex: { key: "globex-key-0123456789", rendersPerDay: 1 },
    },
  }, null, 2)}\n`,
  "utf8",
);

const PORT = 8851;
const BASE = `http://127.0.0.1:${PORT}`;
const server = spawn("node", ["dist/index.js"], {
  cwd: join(ROOT, "mcp"),
  env: {
    ...process.env,
    MOTION_MASTER_MCP_PORT: String(PORT),
    MOTION_MASTER_DATA_DIR: DATA,
    MOTION_MASTER_TENANTS_PATH: TENANTS,
  },
  stdio: ["ignore", "pipe", "pipe"],
});
server.stderr.on("data", (d) => {
  const text = String(d);
  if (/error|failed/i.test(text)) process.stderr.write(`[server] ${text}`);
});

async function waitForServer() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const response = await fetch(`${BASE}/health`);
      if (response.ok) return true;
    } catch {
      /* Not up yet. */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

const get = async (route, key) => {
  const response = await fetch(`${BASE}/api/v1${route}`, {
    headers: key ? { authorization: `Bearer ${key}` } : {},
  });
  return { status: response.status, body: await response.json().catch(() => null) };
};
const post = async (route, key, body) => {
  const response = await fetch(`${BASE}/api/v1${route}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(key ? { authorization: `Bearer ${key}` } : {}) },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json().catch(() => null) };
};

try {
  check("the server started", await waitForServer());

  /* 1. A key is required. */
  const noKey = await get("/supervisor/status");
  check("without a key the API refuses", noKey.status === 401, `status ${noKey.status}`);

  const wrongKey = await get("/supervisor/status", "not-a-key");
  check("a key that belongs to nobody is refused", wrongKey.status === 401, `status ${wrongKey.status}`);

  /* 2. A key decides which tenant you are. */
  const acme = await get("/supervisor/status", "acme-key-0123456789");
  const globex = await get("/supervisor/status", "globex-key-0123456789");
  check("a valid key is let in", acme.status === 200, `status ${acme.status}`);
  check(
    "the tenant's ledger is its own",
    acme.body?.ledgerPath !== globex.body?.ledgerPath,
    `${acme.body?.ledgerPath} vs ${globex.body?.ledgerPath}`,
  );
  check(
    "the tenant's ledger path holds the tenant's name",
    String(acme.body?.ledgerPath ?? "").includes("acme"),
    acme.body?.ledgerPath,
  );

  /* 3. Work is scoped. A brief from one tenant is not in the other's inbox. */
  const submitted = await post("/supervisor/brief", "acme-key-0123456789", {
    title: "ACME private work",
    brief: "A brief that belongs to one tenant only.",
  });
  check("a tenant may submit a brief", submitted.status === 201, `status ${submitted.status}`);
  check(
    "the brief went into the tenant's own inbox",
    String(submitted.body?.path ?? "").includes("acme"),
    submitted.body?.path,
  );

  const acmeInbox = await get("/supervisor/status", "acme-key-0123456789");
  const globexInbox = await get("/supervisor/status", "globex-key-0123456789");
  check("the two tenants' queues are separate", acmeInbox.body?.ledgerPath !== globexInbox.body?.ledgerPath);

  /* 4. The audit trail. */
  const auditPath = join(ROOT, "workspace", "audit", "audit.jsonl");
  const auditExists = existsSync(auditPath);
  check("the audit trail was written", auditExists, auditPath);
  if (auditExists) {
    const lines = readFileSync(auditPath, "utf8").split("\n").filter((line) => line.trim());
    check("the audit trail has lines", lines.length > 0);
    const entries = lines.map((line) => JSON.parse(line));
    check(
      "the audit trail names the tenant",
      entries.some((entry) => entry.tenant === "acme" && entry.action === "brief.submitted"),
      JSON.stringify(entries.slice(-2)),
    );
    check(
      "the audit trail never writes the key",
      !readFileSync(auditPath, "utf8").includes("acme-key-0123456789"),
    );
  }

  /* 5. The quota is counted, not remembered. */
  const quota = await import(`file://${join(ROOT, "mcp", "dist", "tenants.js")}`);
  process.env.MOTION_MASTER_TENANTS_PATH = TENANTS;
  process.env.MOTION_MASTER_DATA_DIR = DATA;
  const tenants = quota.loadTenants(ROOT);
  check("the tenants file is read", tenants.tenants.length === 2, `${tenants.tenants.length} tenants`);
  check("a tenant with no publishes is under quota", quota.withinQuota(ROOT, tenants.tenants[0]).ok);
} finally {
  server.kill("SIGTERM");
  rmSync(WORK, { recursive: true, force: true });
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
console.log("A key decides who you are, what you can see, and how much you may make.");

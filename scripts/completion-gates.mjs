#!/usr/bin/env node
/**
 * Motion Master completion gate runner.
 * Read-only validation: it never edits product code, merges, deploys or spends.
 * An implementation agent repairs failed gates in isolated PRs, then reruns it.
 *
 * Usage: node scripts/completion-gates.mjs [--quick]
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const quick = process.argv.includes("--quick");
const outputDir = resolve(root, ".completion-proof");
mkdirSync(outputDir, { recursive: true });
const checks = [
  { name: "private-offer", cwd: ".", command: process.execPath, args: ["-e", "const f=require('./licence.json');if(f.status.onSale!==false)process.exit(1)"], timeoutMs: 15_000 },
  { name: "plugin-contract", cwd: ".", command: process.execPath, args: ["scripts/check-plugin-contract.mjs"], timeoutMs: 60_000 },
  { name: "house-library", cwd: ".", command: process.execPath, args: ["scripts/build-house-library.mjs", "--check"], timeoutMs: 60_000 },
  { name: "composition-verdicts", cwd: ".", command: process.execPath, args: ["scripts/check-composition-verdicts.mjs"], timeoutMs: 60_000 },
  { name: "mcp-typecheck", cwd: "mcp", command: "npm", args: ["run", "typecheck"], timeoutMs: 240_000 },
  { name: "mcp-tests", cwd: "mcp", command: "npm", args: ["test"], timeoutMs: 600_000 },
  { name: "mcp-tool-policy", cwd: "mcp", command: "node", args: ["scripts/verify-tools.mjs"], timeoutMs: 240_000 },
  { name: "mcp-qualified-pool", cwd: "mcp", command: "node", args: ["scripts/proof-qualified-pool.mjs"], timeoutMs: 240_000 },
  { name: "mcp-studio-surfaces", cwd: "mcp", command: "node", args: ["scripts/proof-studio.mjs"], timeoutMs: 240_000 },
  /* The two proofs of the loop. The remediation proof runs a real browser
     and a real gate, so it is not a quick check. */
  { name: "loop-supervisor", cwd: ".", command: "node", args: ["scripts/proof-supervisor.mjs"], timeoutMs: 240_000 },
  { name: "loop-inbox", cwd: ".", command: "node", args: ["scripts/proof-inbox.mjs"], timeoutMs: 240_000 },
  { name: "loop-identity", cwd: ".", command: "node", args: ["scripts/proof-identity.mjs"], timeoutMs: 240_000 },
  /* The site is built before the panel proof, because the panel proof
     serves the built site. A proof that measures an empty page is worse
     than no proof. */
  { name: "site-build-content-gate", cwd: "site", command: "npm", args: ["run", "build"], timeoutMs: 600_000 },
  ...(quick ? [] : [
    { name: "loop-panel", cwd: ".", command: "node", args: ["scripts/proof-loop-panel.mjs"], timeoutMs: 420_000 },
    /* The page itself, in a real browser: the collage plays, the film
       plays, the sound shelf has sounds, the clips carry their prompts,
       every touch target is big enough to hit, and no price is on the
       page. This proof went stale once because nothing ran it — it was
       still asking about a design the site had been rebuilt without. */
    { name: "deploy-proof", cwd: ".", command: "node", args: ["scripts/proof-deploy.mjs"], timeoutMs: 420_000 },
  ]),
  ...(quick ? [] : [
    { name: "loop-remediation", cwd: ".", command: "node", args: ["scripts/proof-remediation.mjs"], timeoutMs: 900_000 },
  ]),
  { name: "clips-typecheck", cwd: "clips", command: "npm", args: ["run", "typecheck"], timeoutMs: 240_000 },
  { name: "clips-tests", cwd: "clips", command: "npm", args: ["test"], timeoutMs: 240_000 },
  ...(quick ? [] : [
    { name: "montage-bridge-tests", cwd: "bridge", command: "npm", args: ["test"], timeoutMs: 240_000 },
    { name: "montage-bridge-typecheck", cwd: "bridge", command: "npm", args: ["run", "typecheck"], timeoutMs: 240_000 },
  ]),
];
/**
 * Install what the gates need.
 *
 * A clean checkout has no node_modules anywhere, and a gate that fails
 * because a dependency is missing is not testing anything — it is
 * reporting the shape of the machine. The workflow installs mcp, site and
 * bridge; the clips package was left out, so the suite installs it here.
 *
 * It is skipped when the dependencies are already there, so the common
 * case costs nothing.
 */
const PACKAGES = ["mcp", "site", "bridge", "clips"];
for (const pkg of PACKAGES) {
  const dir = join(root, pkg);
  if (existsSync(join(dir, "node_modules"))) continue;
  if (!existsSync(join(dir, "package.json"))) continue;
  process.stdout.write(`installing ${pkg} dependencies\n`);
  const install = spawnSync("npm", ["ci", "--no-audit", "--no-fund"], {
    cwd: dir, encoding: "utf8", maxBuffer: 8 * 1024 * 1024, shell: false, timeout: 600_000,
  });
  if (install.status !== 0) {
    process.stderr.write(`could not install ${pkg}:\n${(install.stderr ?? "").slice(-800)}\n`);
  }
}

/*
 * The mcp package is built before anything else.
 *
 * Several scripts import its compiled output — the house's verdict policy
 * lives in mcp/src/verdicts.ts and is compiled to mcp/dist/verdicts.js. That
 * is a build output, so it does not exist in a clean checkout, and the gates
 * that use it ran before the build. A gate that fails because a dependency
 * has not been compiled is not testing anything.
 */
{
  const build = spawnSync("npm", ["run", "build"], {
    cwd: join(root, "mcp"), encoding: "utf8", maxBuffer: 8 * 1024 * 1024, shell: false, timeout: 300_000,
  });
  if (build.status !== 0) {
    process.stderr.write(`could not build mcp:\n${(build.stderr ?? "").slice(-800)}\n`);
  }
}

const results = [];
for (const check of checks) {
  const start = Date.now();
  const result = spawnSync(check.command, check.args, {
    cwd: join(root, check.cwd), timeout: check.timeoutMs,
    encoding: "utf8", maxBuffer: 8 * 1024 * 1024, shell: false,
  });
  const ok = result.status === 0 && !result.error;
  const details = [result.stdout ?? "", result.stderr ?? "", result.error?.message ?? ""].filter(Boolean).join("\n");
  const logPath = join(outputDir, `${check.name}.log`);
  writeFileSync(logPath, details);
  results.push({
    check: check.name, ok, exitCode: result.status,
    seconds: Math.round((Date.now() - start) / 1000),
    signal: result.signal, timedOut: result.error?.code === "ETIMEDOUT",
    log: `.completion-proof/${check.name}.log`,
    tail: details.slice(-1200),
  });
  process.stdout.write(`${ok ? "PASS" : "FAIL"} ${check.name} (${results.at(-1).seconds}s)\n`);
  /* A failing gate that does not say why is a gate you have to go and
     reproduce by hand. The last twenty lines are right there. */
  if (!ok) {
    const tail = details.trim().split("\n").slice(-20).join("\n");
    process.stderr.write(`\n--- ${check.name} failed ---\n${tail}\n--- end ${check.name} ---\n\n`);
  }
}
const revision = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).stdout?.trim() ?? "unknown";
const report = {
  kind: "verification-not-release-approval",
  generatedAt: new Date().toISOString(), revision, mode: quick ? "quick" : "full",
  passed: results.every((r) => r.ok), results,
  outstandingReleaseProof: [
    "Real browser and 15s brief-to-MP4-to-edit-to-MP4 run",
    "10 consecutive successful end-to-end runs",
    "Independent security, user and taste review",
    "Owner-controlled infrastructure and rollback test",
    "Founder authorization for merge and release",
  ],
};
writeFileSync(join(outputDir, "latest.json"), JSON.stringify(report, null, 2) + "\n");
writeFileSync(join(outputDir, "latest.md"), [
  `# Motion Master completion gates — ${report.passed ? "PASS" : "FAIL"}`,
  `Revision: \`${revision}\``,
  `Mode: ${report.mode} | ${report.generatedAt}`,
  "",
  ...results.map((r) => `- ${r.ok ? "[x]" : "[ ]"} ${r.check} — ${r.seconds}s (see \`${r.log}\`)`),
  "",
  "Passing automated gates does not establish release readiness. Manual, browser, integration, security and founder checks are mandatory.",
].join("\n") + "\n");
process.exit(report.passed ? 0 : 1);

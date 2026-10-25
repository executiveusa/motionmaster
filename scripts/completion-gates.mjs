#!/usr/bin/env node
/**
 * Motion Master completion gate runner.
 * Read-only validation: it never edits product code, merges, deploys or spends.
 * An implementation agent repairs failed gates in isolated PRs, then reruns it.
 *
 * Usage: node scripts/completion-gates.mjs [--quick]
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const quick = process.argv.includes("--quick");
const outputDir = resolve(root, ".completion-proof");
mkdirSync(outputDir, { recursive: true });
const checks = [
  { name: "private-offer", cwd: ".", command: process.execPath, args: ["-e", "const f=require('./licence.json');if(f.status.onSale!==false)process.exit(1)"], timeoutMs: 15_000 },
  { name: "mcp-typecheck", cwd: "mcp", command: "npm", args: ["run", "typecheck"], timeoutMs: 240_000 },
  { name: "mcp-tests", cwd: "mcp", command: "npm", args: ["test"], timeoutMs: 600_000 },
  { name: "mcp-tool-policy", cwd: "mcp", command: "node", args: ["scripts/verify-tools.mjs"], timeoutMs: 240_000 },
  { name: "site-build-content-gate", cwd: "site", command: "npm", args: ["run", "build"], timeoutMs: 600_000 },
  ...(quick ? [] : [
    { name: "montage-bridge-tests", cwd: "bridge", command: "npm", args: ["test"], timeoutMs: 240_000 },
    { name: "montage-bridge-typecheck", cwd: "bridge", command: "npm", args: ["run", "typecheck"], timeoutMs: 240_000 },
  ]),
];
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

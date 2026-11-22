#!/usr/bin/env node
/**
 * Watch the loop, and say when it needs a person.
 *
 * One rule, and it is the only rule worth an alert: **three consecutive
 * failures with the same finding is a broken rule, not a bad brief.** One
 * failure is a composition; three in a row is the remediation table not
 * knowing how to fix something, and that is a hole in the table rather than
 * anything to do with the work.
 *
 * Everything else — a job that failed once, a queue that is long, a render
 * that was slow — is visible in the metrics and is not an emergency.
 *
 *   node scripts/alert-loop.mjs          # exits 1 when the loop needs help
 *   node scripts/alert-loop.mjs --json
 *
 * Run it from a cron, a CI step, or a health check.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(new URL("..", import.meta.url).pathname);
const { readMetrics } = await import(`file://${join(ROOT, "mcp", "dist", "metrics.js")}`);

const dataDir = process.env.MOTION_MASTER_DATA_DIR || join(ROOT, "workspace");
const metrics = readMetrics(ROOT);

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(metrics, null, 2));
} else {
  console.log(`Motion Master loop — ${metrics.at}`);
  console.log(`  events      : ${metrics.events.total}`);
  console.log(`  queue       : ${metrics.queue.queued} waiting, ${metrics.queue.interrupted} interrupted`);
  console.log(`  published   : ${metrics.published.total}`);
  console.log(`  findings    : ${metrics.findings.total}`);
  console.log(`  repairs     : ${metrics.repairs.total}`);
  console.log(`  escalated   : ${metrics.escalated.total}`);
  if (metrics.repeatedFailure) {
    console.log(`  REPEATED    : "${metrics.repeatedFailure.code}" failed ${metrics.repeatedFailure.count} times in a row`);
  }
}

if (metrics.repeatedFailure) {
  console.error(
    `\nThe loop needs a repair rule: "${metrics.repeatedFailure.code}" has failed ${metrics.repeatedFailure.count} times in a row.\n` +
      `Three in a row is the remediation table not knowing how to fix something, not a bad brief.\n` +
      `Add a rule to mcp/src/remediations.ts and prove it with scripts/proof-remediation.mjs.`,
  );
  process.exit(1);
}

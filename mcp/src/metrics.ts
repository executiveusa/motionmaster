/**
 * Metrics — what the studio is doing, counted.
 *
 * The ledger already holds every event. This is the arithmetic over it.
 * There is no database and no telemetry service: the ledger is the source,
 * and a number that cannot be traced back to a line in the ledger is a
 * number nobody should trust.
 *
 * The counters that matter are not vanity numbers. They are:
 *
 *   - **jobs by state** — is work piling up?
 *   - **findings by code** — what is the studio actually failing on?
 *   - **repairs by code** — is the remediation table earning its place?
 *   - **findings that survived the budget** — these are the ones a person
 *     has to look at, and they are the only number that says the loop needs
 *     help.
 */

import { readLedger, type LedgerEntry } from "./supervisor.js";
import { Supervisor } from "./supervisor.js";
import { ledgerPath } from "./datadir.js";

export interface LoopMetrics {
  /** When these numbers were read. */
  at: string;
  /** How long the studio has been recording. */
  window: { first?: string; last?: string };
  /** The ledger's shape. */
  events: { total: number; byEvent: Record<string, number> };
  /** The queue, right now. */
  queue: { queued: number; interrupted: number };
  /** What the gate is failing on. */
  findings: { byCode: Record<string, number>; total: number };
  /** What the remediation table fixed. */
  repairs: { byCode: Record<string, number>; total: number };
  /** The findings that survived the budget. These need a person. */
  escalated: { byCode: Record<string, number>; total: number };
  /** The jobs that ended in a published file. */
  published: { total: number; lastArtifact?: string };
  /** How long a job took, in milliseconds, over the published ones. */
  duration: { count: number; meanMs: number; maxMs: number };
  /**
   * The one number that says whether the loop needs a human: three
   * consecutive failures with the same finding is a broken rule, not a bad
   * brief.
   */
  repeatedFailure: { code?: string; count: number } | null;
}

function count(codes: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const code of codes) counts[code] = (counts[code] ?? 0) + 1;
  return counts;
}

/** The same finding failing three times in a row is a broken repair rule. */
export function repeatedFailure(entries: LedgerEntry[]): { code?: string; count: number } | null {
  const failures = entries.filter((entry) => entry.event === "failed" && (entry.findings?.length ?? 0) > 0);
  let best: { code?: string; count: number } | null = null;
  let run: { code?: string; count: number } | null = null;
  for (const failure of failures) {
    const code = failure.findings?.[0];
    if (run && run.code === code) {
      run = { code, count: run.count + 1 };
    } else {
      run = { code, count: 1 };
    }
    if (!best || run.count > best.count) best = run;
  }
  return best && best.count >= 3 ? best : null;
}

/** Read the metrics. */
export function readMetrics(repoRoot: string, tenantId?: string): LoopMetrics {
  const entries = readLedger(ledgerPath(repoRoot, tenantId));
  const supervisor = new Supervisor({ repoRoot, tenantId });

  const byEvent = count(entries.map((entry) => entry.event));
  const failures = entries.filter((entry) => entry.event === "failed");
  const repaired = entries.filter((entry) => entry.event === "repaired");
  const published = entries.filter((entry) => entry.event === "published");
  const durations = published.map((entry) => entry.durationMs ?? 0).filter((ms) => ms > 0);

  const findingCodes = failures.flatMap((entry) => entry.findings ?? []);
  const repairCodes = repaired.map((entry) => (entry.detail ?? "").split(":")[0] ?? "unknown");
  const escalated = entries.filter((entry) => entry.event === "escalated");

  return {
    at: new Date().toISOString(),
    window: {
      first: entries[0]?.at,
      last: entries[entries.length - 1]?.at,
    },
    events: { total: entries.length, byEvent },
    queue: {
      queued: supervisor.queuedJobs().length,
      interrupted: supervisor.interruptedJobs().length,
    },
    findings: { byCode: count(findingCodes), total: findingCodes.length },
    repairs: { byCode: count(repairCodes), total: repairCodes.length },
    escalated: {
      byCode: count(escalated.flatMap((entry) => entry.findings ?? [])),
      total: escalated.length,
    },
    published: {
      total: published.length,
      lastArtifact: published[published.length - 1]?.artifact,
    },
    duration: {
      count: durations.length,
      meanMs: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
      maxMs: durations.length ? Math.max(...durations) : 0,
    },
    repeatedFailure: repeatedFailure(entries),
  };
}

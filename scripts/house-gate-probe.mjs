#!/usr/bin/env node
/**
 * What the house will not publish in a gate report.
 *
 *   node scripts/house-gate-probe.mjs <project-dir> [...]
 *
 * Reads the gate's own report the way the render gate reads it, and prints
 * the findings the house refuses. The render gate fails on these; this is
 * the same judgement, said out loud, so a person can see it without
 * starting a render.
 */
import { readGateFindings } from "../mcp/dist/render.js";

let failures = 0;
for (const dir of process.argv.slice(2)) {
  const findings = readGateFindings(dir);
  console.log(`${dir}: ${findings.length} finding(s) the house will not publish`);
  for (const finding of findings) {
    failures += 1;
    console.log(`   ${finding.code}: ${String(finding.message).slice(0, 140)}`);
  }
}
process.exit(failures ? 1 : 0);

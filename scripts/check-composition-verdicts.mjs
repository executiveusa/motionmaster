#!/usr/bin/env node
/**
 * The composition verdict gate.
 *
 * A house scene that came from somewhere else has to have passed the gate,
 * the same as one that came from the registry. This checks that: every scene
 * in the house library has a passing verdict, and every composition that was
 * measured has a verdict — including the ones that failed, with a reason.
 *
 *   node scripts/check-composition-verdicts.mjs
 *
 * The exit code is 0 only when every check passed.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { isQualified } from "../mcp/dist/verdicts.js";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const VERDICTS = join(ROOT, "library", "composition-verdicts.json");
const TEMPLATES = join(ROOT, "studio", "templates.json");

let failures = 0;
function check(ok, label, detail = "") {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
}

if (!existsSync(VERDICTS)) {
  check(false, "the composition verdicts exist", `missing ${VERDICTS}`);
  process.exit(1);
}

const verdicts = JSON.parse(readFileSync(VERDICTS, "utf8")).verdicts ?? {};
const measured = Object.keys(verdicts);
check(measured.length > 0, "compositions have been measured", `${measured.length} measured`);

/* Every measured composition has a reason for its verdict. */
let unexplained = 0;
for (const [key, verdict] of Object.entries(verdicts)) {
  if (verdict.ok) continue;
  if (!Array.isArray(verdict.reasons) || !verdict.reasons.length) unexplained += 1;
}
check(unexplained === 0, "every failing composition says why", `${unexplained} unexplained`);

/* Every house scene that came from a composition has a passing verdict. */
if (existsSync(TEMPLATES)) {
  const templates = JSON.parse(readFileSync(TEMPLATES, "utf8")).templates ?? [];
  const local = templates.filter((t) => t.source?.kind === "local");
  let bad = 0;
  for (const template of local) {
    const key = Object.keys(verdicts).find((k) => k.endsWith(`/${template.source.id}`));
    /* The house's policy, not the gate's severity column: a scene whose text
       is 14 px on a phone is not a scene the house ships. */
    if (!key || !isQualified(verdicts[key])) bad += 1;
  }
  check(bad === 0, `every house scene from a composition passed (${local.length} scenes)`, `${bad} without a passing verdict`);
}

/* Every composition on disk has been measured. */
const sets = ["motion-library", "reelforge"];
let unmeasured = 0;
for (const set of sets) {
  const root = join(ROOT, "studio", "compositions", set);
  if (!existsSync(root)) continue;
  for (const entry of readdirSync(root)) {
    const directory = join(root, entry);
    if (!existsSync(join(directory, "index.html")) && !existsSync(join(directory, "block.html"))) {
      continue;
    }
    if (!Object.keys(verdicts).includes(`${set}/${entry}`)) {
      console.log(`      unmeasured: ${set}/${entry}`);
      unmeasured += 1;
    }
  }
}
check(unmeasured === 0, "every composition on disk has a verdict", `${unmeasured} unmeasured`);

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);

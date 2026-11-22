#!/usr/bin/env node
/**
 * Copy the studio's own skills into the Hermes plugin.
 *
 * Hermes loads a native plugin from a folder. When that folder is the one in
 * this repository — which is how `hermes plugins install owner/repository`
 * works — the whole pack sits beside it and no copy is needed. When someone
 * copies the plugin folder on its own, the pack is not there, so the studio's
 * own skills travel with it.
 *
 * The copy is generated, never hand-edited, so the two cannot drift. This
 * script writes the copy; `check-plugin-contract.mjs` fails if it is stale.
 */
import { cpSync, existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const source = join(ROOT, "plugins", "motion-master", "skills");
const target = join(ROOT, "plugins", "motion-master", "hermes", "skills");

/* The studio's own surface: the router, the house rules, the ad studio, the
   API and the board sync. Everything else is a library the studio calls. */
const OWN = ["motion-master", "meta-ads", "motion-master-api", "motion-design", "board-sync"];

const check = process.argv.includes("--check");
if (existsSync(target)) rmSync(target, { recursive: true, force: true });

let stale = 0;
for (const name of OWN) {
  const from = join(source, name);
  if (!existsSync(from)) {
    console.error(`missing  ${name}`);
    stale += 1;
    continue;
  }
  const to = join(target, name);
  if (check) {
    const want = statSync(from).size;
    console.log(`ok      hermes/skills/${name}`);
    void want;
  } else {
    cpSync(from, to, { recursive: true });
    console.log(`wrote   hermes/skills/${name}`);
  }
}
if (check) {
  const have = existsSync(target) ? readdirSync(target) : [];
  const missing = OWN.filter((n) => !have.includes(n));
  if (missing.length) {
    console.error(`\nmissing in hermes/skills: ${missing.join(", ")}`);
    process.exit(1);
  }
}

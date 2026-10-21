#!/usr/bin/env node
/**
 * Mirror the canonical Motion Master token file into the MCP server as a typed
 * TypeScript module, so the server still works when it is copied out of the
 * repository on its own.
 *
 *   node scripts/sync-tokens.mjs           # write src/tokens.generated.ts
 *   node scripts/sync-tokens.mjs --check   # fail if the mirror is stale
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");
const source = join(repoRoot, "plugins", "motion-master", "assets", "motion-tokens.json");
const target = join(here, "..", "src", "tokens.generated.ts");

if (!existsSync(source)) {
  console.error(`canonical token file not found: ${source}`);
  process.exit(1);
}

const json = JSON.parse(readFileSync(source, "utf8"));
const body = `/**
 * GENERATED FILE — do not edit by hand.
 * Source: plugins/motion-master/assets/motion-tokens.json
 * Regenerate: npm run sync:tokens     Verify: npm run check:tokens
 */
export const GENERATED_TOKENS = ${JSON.stringify(json, null, 2)} as const;
`;

const check = process.argv.includes("--check");
const current = existsSync(target) ? readFileSync(target, "utf8") : "";

if (check) {
  if (current !== body) {
    console.error("tokens.generated.ts is out of date — run `npm run sync:tokens`");
    process.exit(1);
  }
  console.log("tokens.generated.ts is in sync with plugins/motion-master/assets/motion-tokens.json");
} else {
  writeFileSync(target, body, "utf8");
  console.log(`wrote ${target} from ${source}`);
}

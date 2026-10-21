#!/usr/bin/env node
/**
 * Generate mcp/src/licence.generated.ts from the repo-root licence.json.
 *
 * The offer — prices, tiers, what each tier includes, how rendering is paid
 * for — is written once, in licence.json, at the repo root. The landing page
 * imports that file directly. The MCP server cannot import it (its tsconfig
 * pins rootDir to src/), so it gets a generated TypeScript twin.
 *
 *   npm run sync:licence     regenerate
 *   npm run check:licence    fail if the twin is stale
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(here, '..', '..', 'licence.json');
const TARGET = join(here, '..', 'src', 'licence.generated.ts');

const source = JSON.parse(readFileSync(SOURCE, 'utf8'));

const banner = `/**
 * GENERATED FILE — do not edit by hand.
 * Source: licence.json (repo root)
 * Regenerate: npm run sync:licence     Verify: npm run check:licence
 */`;

const body = `${banner}
export const GENERATED_LICENCE = ${JSON.stringify(source, null, 2)} as const;
`;

const check = process.argv.includes('--check');
if (check) {
  let current = '';
  try {
    current = readFileSync(TARGET, 'utf8');
  } catch {
    console.error(`stale: ${TARGET} does not exist. Run: npm run sync:licence`);
    process.exit(1);
  }
  if (current !== body) {
    console.error(`stale: ${TARGET} is out of date with licence.json. Run: npm run sync:licence`);
    process.exit(1);
  }
  console.log('licence.generated.ts is in sync with licence.json');
} else {
  writeFileSync(TARGET, body);
  console.log(`wrote ${TARGET}`);
}

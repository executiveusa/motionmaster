#!/usr/bin/env node
/**
 * Check that the configuration table in bridge/README.md is truthful.
 *
 * The README promises that every documented variable is read by the code and
 * that nothing in the code reads a variable the README does not document.
 * This script is what makes that promise true, so it runs as part of `npm test`.
 *
 *   node scripts/check-config-table.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

/** Every .ts file under src/ */
function sourceFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (full.endsWith('.ts')) out.push(full);
  }
  return out;
}

const files = sourceFiles(join(root, 'src'));
const code = files.map((f) => readFileSync(f, 'utf8')).join('\n');

// MONTAGE_* is the namespace this bridge owns. Anything else in process.env
// belongs to the host process and is not ours to document.
const inCode = new Set();
for (const m of code.matchAll(/process\.env\.([A-Z_][A-Z0-9_]*)/g)) inCode.add(m[1]);
for (const m of code.matchAll(/process\.env\[['"`]([A-Z_][A-Z0-9_]*)['"`]\]/g)) inCode.add(m[1]);
const documentedInCode = new Set([...inCode].filter((k) => k.startsWith('MONTAGE_')));

const readme = readFileSync(join(root, 'README.md'), 'utf8');
const documented = new Set();
for (const m of readme.matchAll(/`(MONTAGE_[A-Z_]+)`/g)) documented.add(m[1]);

const problems = [];
for (const key of documented) {
  if (!documentedInCode.has(key)) {
    problems.push(`README documents ${key} but no file in src/ reads it`);
  }
}
for (const key of documentedInCode) {
  if (!documented.has(key)) {
    problems.push(`src/ reads ${key} but the README does not document it`);
  }
}

if (problems.length) {
  console.error('[config-table] FAILED:');
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

console.log(
  `[config-table] OK — ${documented.size} documented variables (${[...documented].sort().join(', ')}), and every one is read by the code`,
);

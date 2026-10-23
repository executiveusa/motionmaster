#!/usr/bin/env node
/**
 * sync-skills.mjs — keep the skill count on the page honest.
 *
 * The plugin ships a directory of skills. The page claims a number of them.
 * That number has already drifted twice, so it is generated from the directory
 * and written into the page rather than typed.
 *
 *   node scripts/sync-skills.mjs [--check]
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const SKILLS_DIR = join(ROOT, 'plugins', 'motion-master', 'skills');
const HTML = join(ROOT, 'site', 'index.html');
const TREE = join(ROOT, 'site', 'src', 'modules', 'tree.ts');
const DATA = join(ROOT, 'site', 'src', 'data', 'skill-count.json');

const check = process.argv.includes('--check');

const ONES = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen',
];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

/** Spell a small number the way copy does: thirty-eight, forty, twelve. */
function numberWord(n) {
  if (n < 20) return ONES[n];
  if (n < 100) {
    const t = TENS[Math.floor(n / 10)];
    const o = n % 10;
    return o === 0 ? t : `${t}-${ONES[o]}`;
  }
  return String(n);
}

const count = readdirSync(SKILLS_DIR).filter((name) => {
  const p = join(SKILLS_DIR, name);
  return statSync(p).isDirectory() && !name.startsWith('.');
}).length;

const word = numberWord(count);
const json = `${JSON.stringify({ count, word }, null, 2)}\n`;

const html = readFileSync(HTML, 'utf8');
const tree = readFileSync(TREE, 'utf8');

const Cap = word[0].toUpperCase() + word.slice(1);

// The tree names five skills individually; the rest are counted as one line.
const NAMED_IN_TREE = 5;

const nextHtml = html
  .replace(/Thirty-three motion skills/g, `${Cap} motion skills`)
  .replace(/Thirty-three skills/g, `${Cap} skills`)
  .replace(/\b\d+ motion skills\b/g, `${count} motion skills`)
  .replace(/\b\d+ skills · licences kept/g, `${count} skills · licences kept`);

const nextTree = tree
  .replace(/Thirty-three motion skills/g, `${Cap} motion skills`)
  .replace(/\b\d+ motion skills\b/g, `${Cap} motion skills`)
  .replace(/skills\/ — \d+ more/g, `skills/ — ${count - NAMED_IN_TREE} more`);

const changed = nextHtml !== html || nextTree !== tree || !existsSync(DATA) || readFileSync(DATA, 'utf8') !== json;

if (check) {
  if (changed) {
    console.error('The skill count is out of date. Run: node scripts/sync-skills.mjs');
    process.exit(1);
  }
  console.log(`skill count is up to date (${count})`);
} else {
  writeFileSync(HTML, nextHtml);
  writeFileSync(TREE, nextTree);
  writeFileSync(DATA, json);
  console.log(`skills: ${count} (${word})`);
}

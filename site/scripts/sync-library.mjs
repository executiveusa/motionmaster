#!/usr/bin/env node
/**
 * sync-library.mjs — build the browser payload for the library section.
 *
 * The full catalogue is 4 MB. The page does not need all of it up front, so
 * this writes a trimmed index into site/public/library.json and the page
 * fetches it the first time someone touches the library.
 *
 *   node scripts/sync-library.mjs [--check]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const CATALOGUE = join(ROOT, 'library', 'catalogue.json');
const OUT = join(ROOT, 'site', 'public', 'library.json');

const check = process.argv.includes('--check');

if (!existsSync(CATALOGUE)) {
  console.error(`Missing ${CATALOGUE}. Run: node scripts/build-library.mjs`);
  process.exit(1);
}

const catalogue = JSON.parse(readFileSync(CATALOGUE, 'utf8'));

/* Every style, in full: a style recipe is the most useful thing on the page. */
const styles = catalogue.items.filter((i) => i.kind === 'style');

/* Prompts: keep them, but cap the body so the payload stays sane. */
const MAX_PROMPT_CHARS = 1400;
const prompts = catalogue.items
  .filter((i) => i.kind === 'prompt' && i.prompt.length > 120)
  .map((i) => ({
    id: i.id,
    c: i.collection,
    k: i.kind,
    t: i.title,
    s: i.summary,
    p: i.prompt.length > MAX_PROMPT_CHARS ? `${i.prompt.slice(0, MAX_PROMPT_CHARS)}…` : i.prompt,
    x: i.partial ? 1 : 0,
    g: i.categories,
    a: i.author,
    u: i.source,
    l: i.license,
  }));

const cases = catalogue.items
  .filter((i) => i.kind === 'case' && i.prompt.length > 120)
  .map((i) => ({
    id: i.id,
    c: i.collection,
    k: i.kind,
    t: i.title,
    s: i.summary,
    p: i.prompt.length > MAX_PROMPT_CHARS ? `${i.prompt.slice(0, MAX_PROMPT_CHARS)}…` : i.prompt,
    x: i.partial ? 1 : 0,
    g: i.categories,
    a: i.author,
    u: i.source,
    l: i.license,
  }));

const skills = catalogue.items
  .filter((i) => i.kind === 'skill')
  .map((i) => ({
    id: i.id,
    c: i.collection,
    k: i.kind,
    t: i.title,
    s: i.summary,
    p: '',
    x: 0,
    g: i.categories,
    a: '',
    u: i.source,
    l: i.license,
  }));

const styleItems = styles.map((i) => ({
  id: i.id,
  c: i.collection,
  k: i.kind,
  t: i.title,
  s: i.summary,
  p: i.prompt,
  x: 0,
  g: i.categories,
  a: i.author,
  u: i.source,
  l: i.license,
}));

const payload = {
  generated: 'scripts/sync-library.mjs',
  counts: {
    ...catalogue.counts,
    shipped: styleItems.length + prompts.length + cases.length + skills.length,
  },
  collections: catalogue.collections.map((c) => ({
    id: c.id,
    title: c.title,
    repo: c.repo,
    license: c.license,
    count: c.count,
  })),
  categories: catalogue.categories.filter((c) => c.count >= 2),
  items: [...styleItems, ...prompts, ...cases, ...skills],
};

const json = JSON.stringify(payload);
mkdirSync(dirname(OUT), { recursive: true });

if (check) {
  const current = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
  if (current !== json) {
    console.error('site/public/library.json is out of date. Run: node scripts/sync-library.mjs');
    process.exit(1);
  }
  console.log('library.json is up to date');
} else {
  writeFileSync(OUT, json);
  console.log(
    `library.json: ${payload.items.length} items · ${payload.categories.length} categories · ` +
      `${(Buffer.byteLength(json) / 1024).toFixed(0)} kB`,
  );
}

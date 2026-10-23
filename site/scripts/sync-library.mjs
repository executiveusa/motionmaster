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
const REPO = resolve(HERE, '..', '..');
const CATALOGUE = join(REPO, 'library', 'catalogue.json');
const OUT = join(REPO, 'site', 'public', 'library.json');

const check = process.argv.includes('--check');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

if (!existsSync(CATALOGUE)) {
  console.error(`Missing ${CATALOGUE}. Run: node scripts/build-library.mjs`);
  process.exit(1);
}

const catalogue = JSON.parse(readFileSync(CATALOGUE, 'utf8'));
const blocksFile = JSON.parse(readFileSync(join(REPO, 'library', 'blocks.json'), 'utf8'));
const payloadBlocks = blocksFile.blocks ?? [];

/* Every style, in full: a style recipe is the most useful thing on the page. */
const styles = catalogue.items.filter((i) => i.kind === 'style');

/* Prompts: keep them, but cap the body so the payload stays sane. */
const MAX_PROMPT_CHARS = 1400;

/** Slugs that name a kind rather than a subject. */
const GENERIC_CATEGORIES = new Set([
  'prompt', 'case', 'skill', 'style', 'style-recipe', 'analysis',
]);
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

/*
 * The starting points. Each one names a real category and a real block, so a
 * click gives the agent something concrete to work from instead of a blank
 * box. They are chosen from the catalogue, not typed.
 */
const STARTER_SPECS = [
  { tag: 'title-card', brief: 'A calm title card for my brand, with the name of the brand and nothing else.' },
  { tag: 'kinetic-text', brief: 'Kinetic type for one line of words, each word arriving on its own beat.' },
  { tag: 'product-demo', brief: 'A product reveal: the thing comes forward out of the dark and settles.' },
  { tag: 'data', brief: 'A data chart that draws itself, with the number counting up to the value.' },
  { tag: 'brand', brief: 'A brand end card: the wordmark, one line, and a clean exit.' },
  { tag: 'transition', brief: 'A sequence of cuts that each land on the beat of the music.' },
];

const starters = STARTER_SPECS.map((spec) => {
  const candidates = payloadBlocks.filter(
    (b) => b.tags.includes(spec.tag) && b.variables.length > 0,
  );
  // A carousel needs a dozen images. Unless the starter asked for one, it is
  // the wrong answer for a brief that mentions no pictures.
  const block =
    candidates.find((b) => !b.tags.includes('carousel')) ?? candidates[0];
  return {
    tag: spec.tag,
    label: spec.tag.replace(/-/g, ' '),
    brief: spec.brief,
    block: block ? block.id : null,
  };
}).filter((s) => s.block);

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
  // The generic kind-slugs ('prompt', 'case', 'skill') are not categories a
  // person browses by — the filter chips already do that job. The real
  // categories are the ones worth listing.
  starters,
  categories: catalogue.categories.filter(
    (c) => c.count >= 2 && !GENERIC_CATEGORIES.has(c.slug),
  ),
  items: [...styleItems, ...prompts, ...cases, ...skills],
};

const json = JSON.stringify(payload);
mkdirSync(dirname(OUT), { recursive: true });

/*
 * The starting-point buttons are written into the page, so they are there
 * before any JavaScript runs and cannot drift from the library.
 */
const HTML = join(REPO, 'site', 'index.html');
const buttons = starters
  .map(
    (s) =>
      `                <button type="button" class="console__starter" data-console-starter data-console-starter-tag="${esc(s.tag)}" data-console-starter-block="${esc(s.block ?? '')}" data-console-starter="${esc(s.brief)}">${esc(s.label)}</button>`,
  )
  .join('\n');

const html = readFileSync(HTML, 'utf8');
const OPEN = '              <!-- the starting points are generated from the library -->\n';
const CLOSE = '              <!-- end of the generated starting points -->\n';
const start = html.indexOf(OPEN);
// Replace the generated region, never append to it: the script must be safe
// to run twice.
const end = html.indexOf(CLOSE, start);
const withStarters =
  start === -1
    ? html.replace(OPEN, OPEN + buttons + '\n' + CLOSE)
    : html.slice(0, start) + OPEN + buttons + '\n' + CLOSE + html.slice(end + CLOSE.length);

if (check) {
  if (withStarters !== html) {
    console.error('site/index.html is out of date with the library. Run: node scripts/sync-library.mjs');
    process.exit(1);
  }
  console.log('library.json and the starting points are up to date');
} else {
  writeFileSync(HTML, withStarters);
  writeFileSync(OUT, json);
  console.log(
    `library.json: ${payload.items.length} items · ${payload.categories.length} categories · ` +
      `${(Buffer.byteLength(json) / 1024).toFixed(0)} kB · ${starters.length} starting points`,
  );
}



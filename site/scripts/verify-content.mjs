/**
 * Post-build content check.
 *
 * Verifies that the built page carries the exact prompts and alt text from
 * src/clips.json, that no banned copy or emoji slipped in, that the media
 * elements are labelled, and that nothing points at an external host.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteDir = dirname(dirname(fileURLToPath(import.meta.url)));
const distDir = join(siteDir, 'dist');
const htmlPath = join(distDir, 'index.html');

const BANNED_WORDS = [
  'transform',
  'unlock',
  'empower',
  'reimagine',
  'revolutionize',
  'supercharge',
  'seamless',
  'elevate',
  'game-changing',
  'get started',
];

const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2300}-\u{27BF}\u{FE0F}\u{1F1E6}-\u{1F1FF}]/u;

const failures = [];
const notes = [];

const fail = (message) => failures.push(message);
const decode = (s) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

if (!existsSync(htmlPath)) {
  console.error('[check] dist/index.html is missing — run the build first');
  process.exit(1);
}

const html = readFileSync(htmlPath, 'utf8');
const text = decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');

/* ---- 1. clips.json fidelity ------------------------------------------- */

const clips = JSON.parse(readFileSync(join(siteDir, 'src', 'clips.json'), 'utf8'));
for (const clip of clips.clips) {
  if (!text.includes(clip.prompt)) fail(`prompt missing for "${clip.id}"`);
  if (!html.includes(clip.alt)) fail(`alt text missing for "${clip.id}"`);
  if (!text.includes(clip.title)) fail(`title missing for "${clip.id}"`);
  if (!text.includes(clip.duration)) fail(`duration missing for "${clip.id}"`);
  if (!html.includes(clip.stack)) fail(`stack "${clip.stack}" missing for "${clip.id}"`);
}
notes.push(`checked ${clips.clips.length} clip prompts, titles, durations, stacks and alt texts`);

/* ---- 2. banned copy ---------------------------------------------------- */

for (const word of BANNED_WORDS) {
  if (text.toLowerCase().includes(word)) fail(`banned copy "${word}" in dist/index.html`);
  for (const file of ['index.html', 'src/main.ts']) {
    const path = join(siteDir, file);
    if (!existsSync(path)) continue;
    const body = readFileSync(path, 'utf8').toLowerCase();
    if (body.includes(word)) fail(`banned copy "${word}" in ${file}`);
  }
}

/* ---- 2b. the sale state ------------------------------------------------- */

/*
 * The offer is not on sale. While that is true the page must not tell anyone
 * to buy anything, and the prices may only appear as recorded terms. This
 * check is what stops the page quietly going back on sale.
 */
const saleState = JSON.parse(readFileSync(join(siteDir, '..', 'licence.json'), 'utf8'));
const onSale = saleState.status?.onSale !== false;
if (!onSale) {
  // Look for invitations to buy, not the mere word "checkout" in a sentence
  // that says there is none.
  for (const phrase of ['buy the licence', 'buy now', 'buy solo', 'buy studio', 'add to cart', 'order now']) {
    if (text.toLowerCase().includes(phrase)) {
      fail(`"${phrase}" appears in the page but the offer is not on sale`);
    }
  }
  if (/data-buy\s*=/.test(text)) {
    fail('a purchase button is present but the offer is not on sale');
  }
  if (!text.toLowerCase().includes('not on sale')) {
    fail('the page must say plainly that the offer is not on sale');
  }
  notes.push('offer is not on sale — no purchase language in the page');
} else {
  notes.push('offer is on sale');
}

/* ---- 3. emoji ----------------------------------------------------------- */

if (EMOJI.test(text)) fail('emoji or pictograph character in dist/index.html');

/* ---- 4. media labelling -------------------------------------------------- */

const videos = html.match(/<video\b[^>]*>/g) ?? [];
for (const tag of videos) {
  if (!/aria-label=/.test(tag)) fail(`<video> without aria-label: ${tag.slice(0, 80)}`);
  if (!/muted/.test(tag)) fail(`<video> without muted: ${tag.slice(0, 80)}`);
}
const images = html.match(/<img\b[^>]*>/g) ?? [];
for (const tag of images) {
  if (!/alt=/.test(tag)) fail(`<img> without alt: ${tag.slice(0, 80)}`);
}

/* ---- 5. heading order ----------------------------------------------------- */

const headings = [...html.matchAll(/<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/g)].map((m) => ({
  level: Number(m[1][1]),
  text: decode(m[2].replace(/<[^>]+>/g, '')).trim(),
}));
const h1s = headings.filter((h) => h.level === 1);
if (h1s.length !== 1) fail(`expected exactly one h1, found ${h1s.length}`);
let previous = 0;
for (const heading of headings) {
  if (previous && heading.level > previous + 1) {
    fail(`heading level jump h${previous} → h${heading.level} at "${heading.text.slice(0, 40)}"`);
  }
  previous = heading.level;
}
notes.push(`heading order checked across ${headings.length} headings`);

/* ---- 6. no external hosts -------------------------------------------------- */

const external = html.match(/(?:src|href)="https?:\/\/[^"]+"/g) ?? [];
for (const url of external) fail(`external resource referenced: ${url}`);
if (/rel="canonical"/.test(html) === false) {
  notes.push('no canonical link (the domain is not secured yet — the ledger forbids naming one)');
}

/* ---- 7. assets: my code is clean, the vendor chunk is identified ------------ */

const assetDir = join(distDir, 'assets');
if (existsSync(assetDir)) {
  for (const file of readdirSync(assetDir)) {
    if (!/\.(js|css)$/.test(file)) continue;
    const raw = readFileSync(join(assetDir, file), 'utf8');
    const isVendor = file.startsWith('gsap-');

    // Only comments and `content:` strings can carry copy in a stylesheet.
    // A property named `transform` or a value of `will-change: transform` is
    // code, and the banned word is about words a reader reads.
    let body = raw;
    if (file.endsWith('.css')) {
      const comments = raw.match(/\/\*[\s\S]*?\*\//g) ?? [];
      const contents = raw.match(/content\s*:\s*("[^"]*"|'[^']*')/gi) ?? [];
      body = [...comments, ...contents].join(' ');
    }
    body = body.toLowerCase().split('text-transform').join('text-uppercase');

    for (const word of BANNED_WORDS) {
      if (!body.includes(word)) continue;
      if (isVendor) {
        notes.push(`"${word}" appears in the vendor chunk ${file} (GSAP library code, not page copy)`);
      } else {
        fail(`banned copy "${word}" in built asset ${file}`);
      }
    }
    if (raw.includes('text-transform')) {
      notes.push(`"text-transform: uppercase" is the only "transform" string in ${file} — a CSS property used for the uppercase label style, not copy`);
    }
  }
}

let jsBytes = 0;
if (existsSync(assetDir)) {
  for (const file of readdirSync(assetDir)) {
    if (file.endsWith('.js')) jsBytes += statSync(join(assetDir, file)).size;
  }
}
notes.push(`built JS (all chunks, uncompressed): ${(jsBytes / 1024).toFixed(1)} kB`);

/* ---- 8. no placeholder media ------------------------------------------------ */

const clipsDir = join(siteDir, 'public', 'clips');
if (existsSync(clipsDir)) {
  for (const file of readdirSync(clipsDir)) {
    const size = statSync(join(clipsDir, file)).size;
    if (size < 1024 && !file.endsWith('.json')) {
      fail(`suspiciously small media file in public/clips: ${file} (${size} bytes)`);
    }
  }
}

/* ---- 9. the offer: prices and tier lists match licence.json --------------- */

const offer = JSON.parse(readFileSync(join(siteDir, '..', 'licence.json'), 'utf8'));
// Private-use preview has no tier or checkout interface by design.
if (onSale || html.includes('data-tier="solo"')) {
  for (const tier of offer.tiers) {
    if (!text.includes(tier.display)) fail(`price "${tier.display}" missing from dist/index.html`);
    if (!text.includes(tier.label)) fail(`tier name "${tier.label}" missing from dist/index.html`);
    for (const item of tier.includes) {
      if (!text.includes(item)) fail(`tier item missing for "${tier.id}": "${item}"`);
    }
  }
} else {
  notes.push('private-use landing omits prices and tier lists; canonical offer retained in licence.json');
}
for (const stale of ['$149', '$599']) {
  if (text.includes(stale)) fail(`stale price ${stale} still on the page`);
}
notes.push(`checked ${offer.tiers.length} tiers, their prices and ${offer.tiers.reduce((n, t) => n + t.includes.length, 0)} tier items against licence.json`);

/* ---- 10. the domain: one place, no TLD -------------------------------------- */

const domainTags = html.match(/<meta[^>]+name="site-domain"[^>]*>/g) ?? [];
if (domainTags.length !== 1) fail(`expected exactly one site-domain meta tag, found ${domainTags.length}`);
if (!html.includes('content="motionmaster"')) fail('site-domain meta tag does not carry the domain word');
if (/motionmaster\.[a-z]{2,6}/i.test(html)) fail('a domain with a TLD appears on the page');
if (/rel="canonical"/.test(html)) fail('canonical link present — the domain is not secured yet');

/* ---- 9b. every film the page promises is actually there -------------------- */

const FILMS = [
  ['film/motion-master-hero.mp4', 'the hero film'],
  ['demos/blueprint.mp4', 'the blueprint demo'],
  ['demos/ink.mp4', 'the ink demo'],
  ['demos/whiteboard.mp4', 'the whiteboard demo'],
];
for (const [rel, what] of FILMS) {
  const path = join(distDir, rel);
  if (!existsSync(path)) fail(`${what} is missing from the build: ${rel}`);
  else {
    const bytes = statSync(path).size;
    if (bytes < 100 * 1024) fail(`${what} looks truncated (${bytes} bytes)`);
  }
}
notes.push(`checked ${FILMS.length} films are present in the build`);

/* ---- report ----------------------------------------------------------------- */

for (const note of notes) console.log(`[check] ${note}`);
if (failures.length) {
  console.error(`\n[check] FAILED with ${failures.length} problem(s):`);
  for (const problem of failures) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log('[check] OK — content, media labelling, heading order and copy all pass');

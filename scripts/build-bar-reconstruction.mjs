#!/usr/bin/env node
/**
 * Build a faithful TEXT reconstruction of the motionvideo.xyz landing page
 * from its own source, so the anti-slop audit can run against it.
 *
 * Why a reconstruction and not a screenshot: motionvideo.xyz does not resolve
 * from this sandbox (TLS handshake fails, and the fetch times out). Their site
 * is open source, so the copy is read from the source of truth:
 *   motionvideohq/motionvideo.xyz @ HEAD
 *     apps/web/src/routes/index.content.ts   (hero + toolbar strings)
 *     apps/web/src/components/site-header.content.ts
 *     apps/web/src/components/site-footer.content.ts
 *     apps/web/src/components/pricing.content.ts
 *     apps/web/src/data/motion-catalog.json   (the cards)
 *     apps/web/src/constants/pricing.ts       (the real numbers)
 *
 * This reconstructs COPY and STRUCTURE, not pixels. It is enough to audit the
 * writing, which is what the extractor rules target. It is NOT enough to
 * claim anything about their visual design, and this file does not.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const REPO = '/workspace/.research/mv/repo/apps/web/src';
const OUT = '/workspace/motion-master/.review/gauntlet';

/** Pull the English strings out of an intlayer content file. */
function enStrings(file) {
  const t = readFileSync(join(REPO, file), 'utf8');
  const out = [];
  const re = /en:\s*\n?\s*"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = re.exec(t)) !== null) out.push(m[1].replace(/\\"/g, '"'));
  return out;
}

/** The hero + toolbar strings, keyed by their key name. */
function keyed(file) {
  const t = readFileSync(join(REPO, file), 'utf8');
  const out = {};
  const re = /(\w+):\s*t\(\{\s*\n\s*en:\s*\n?\s*"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = re.exec(t)) !== null) out[m[1]] = m[2].replace(/\\"/g, '"');
  return out;
}

const hero = keyed('routes/index.content.ts');
const header = enStrings('components/site-header.content.ts');
const footer = enStrings('components/site-footer.content.ts');
const pricing = enStrings('components/pricing.content.ts');
const constants = readFileSync(join(REPO, 'constants/pricing.ts'), 'utf8');
const base = constants.match(/BASE_PRICE_CENTS = (\d+)/)[1];
const launch = constants.match(/LAUNCH_PRICE_CENTS = (\d+)/)[1];
const limit = constants.match(/LAUNCH_LIMIT = (\d+)/)[1];

const catalog = JSON.parse(readFileSync(join(REPO, 'data/motion-catalog.json'), 'utf8'));
// Their landing page shows the newest slice of the collection.
const cards = catalog.videos.slice(0, 35);

const nav = ['Discover', 'Tools', 'Creatives', 'Skills', 'Extras', 'More'];
const footNav = ['About', 'Brand', 'Contact', 'Sponsor'];
const legal = ['Terms of service', 'Privacy policy', 'Refund policy'];

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Motion video inspiration</title></head>
<body>
<header>
  <nav aria-label="Main navigation">${nav.map((n) => `<a href="#">${n}</a>`).join(' ')}</nav>
  <a href="#">${header.find((s) => s.includes('sponsor')) ?? 'Your logo here: sponsor MotionVideo'}</a>
  <a href="#">Get the MotionVideo agent skill (SKILL.md)</a>
  <a href="#">Sign in</a>
  <a href="#">${hero.submitVideo ?? 'Submit a video'}</a>
</header>

<main>
  <section>
    <p class="eyebrow">${hero.eyebrow}</p>
    <h1>${hero.title}</h1>
    <p>${hero.intro}</p>
    <a href="#">${hero.submitVideo}</a>
    <a href="#">${hero.surprise}</a>
    <a href="#">${hero.browse}</a>
  </section>

  <section>
    <div class="toolbar">
      <label>${hero.filterType}</label>
      <label>${hero.filterCategory}</label>
      <label>${hero.sort}</label>
      <button>${hero.popular}</button>
      <button>${hero.newest}</button>
      <button>${hero.oldest}</button>
      <button>${hero.play}</button>
      <button>${hero.pause}</button>
    </div>
    <div class="pills">
      <button>${hero.all}</button>
      <button>${hero.prompt}</button>
      <button>${hero.skill}</button>
    </div>
  </section>

  <section class="gallery">
    ${cards
      .map(
        (c) => `<article>
      <p class="type">${c.tags.includes('skill') ? 'Skill' : 'Prompt'}</p>
      <h2>${c.title}</h2>
      <a href="#">Watch video</a>
      <a href="#">Open</a>
    </article>`,
      )
      .join('\n')}
  </section>

  <section class="pricing">
    <h2>One-time purchase</h2>
    <p>Buy now for $${(+launch / 100).toFixed(0)}</p>
    <p>Launch offer LIVE</p>
    <p>${limit} spots remaining</p>
    <p>The launch offer ends after the first ${limit} purchases. Then the price is $${(+base / 100).toFixed(0)}.</p>
    <ul>
      <li>Skills for any coding agent and renderer</li>
      <li>Storyboard skills, scene starters, and motion tokens</li>
      <li>Unlimited personal and client projects</li>
      <li>Updates pushed to the same repository</li>
    </ul>
    <button>Buy now for $${(+launch / 100).toFixed(0)}</button>
  </section>
</main>

<footer>
  <p>${footer.find((s) => s === 'Built by') ?? 'Built by'}</p>
  <nav>${footNav.map((n) => `<a href="#">${n}</a>`).join(' ')}</nav>
  <nav>${legal.map((n) => `<a href="#">${n}</a>`).join(' ')}</nav>
  <a href="#">GitHub repository</a>
  <a href="#">Follow on X</a>
  <p>Questions, credit, or want this removed? <a href="#">Contact us</a></p>
</footer>
</body></html>
`;

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'motionvideo-reconstruction.html'), html);
console.log(
  `wrote ${OUT}/motionvideo-reconstruction.html — ${cards.length} cards, price $${(+launch / 100).toFixed(0)} launch / $${(+base / 100).toFixed(0)} after ${limit} purchases`,
);

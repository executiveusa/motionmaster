#!/usr/bin/env node
/**
 * Write the pricing tier blocks into site/index.html from licence.json.
 *
 * The tier list exists twice: once as static markup (so the page is complete
 * without JavaScript) and once at runtime (pricing.ts reads the same file).
 * Hand-editing one and not the other is how the page ends up disagreeing with
 * the offer, so the static copy is generated instead.
 *
 *   node scripts/sync-offer.mjs          rewrite index.html
 *   node scripts/sync-offer.mjs --check  fail if index.html is stale
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteDir = dirname(dirname(fileURLToPath(import.meta.url)));
const offer = JSON.parse(readFileSync(join(siteDir, '..', 'licence.json'), 'utf8'));
const htmlPath = join(siteDir, 'index.html');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function block(tier) {
  const items = tier.includes.map((i) => `                <li>${esc(i)}</li>`).join('\n');
  const cls = tier.id === 'studio' ? 'tier tier--studio' : 'tier';
  const flag =
    tier.id === 'studio' ? ' <span class="tier__flag">includes the footage bridge</span>' : '';
  return `            <article class="${cls}" data-tier="${tier.id}" aria-labelledby="tier-${tier.id}-title">
              <p class="tier__name">${tier.label}${flag}</p>
              <p class="tier__price"><span class="tier__amount">${tier.display}</span> <span class="tier__once">once</span></p>
              <ul class="tier__list" data-tier-list="${tier.id}">
${items}
              </ul>
              <a class="btn btn--primary btn--block" href="#buy" data-buy="${tier.id}" data-buy-label="${tier.id}">Buy ${tier.label} — ${tier.display}</a>
            </article>`;
}

const replacement = offer.tiers.map(block).join('\n\n');

const html = readFileSync(htmlPath, 'utf8');
const start = html.indexOf('            <article class="tier');
const end = html.indexOf('          </div>\n\n          <div class="buy" id="buy">');
if (start === -1 || end === -1 || end < start) {
  console.error('[offer] could not find the tier blocks in index.html');
  process.exit(1);
}
const next = html.slice(0, start) + replacement + '\n' + html.slice(end);

// The buy line's default amount comes from the Solo tier.
const solo = offer.tiers[0];
const withAmount = next.replace(
  /<strong data-buy-amount>[^<]*<\/strong>/,
  `<strong data-buy-amount>${solo.display}</strong>`,
);

if (process.argv.includes('--check')) {
  if (withAmount !== html) {
    console.error('[offer] index.html is out of date with licence.json. Run: npm run sync:offer');
    process.exit(1);
  }
  console.log('[offer] index.html is in sync with licence.json');
} else {
  writeFileSync(htmlPath, withAmount);
  console.log(`[offer] wrote ${offer.tiers.length} tiers from licence.json into index.html`);
}

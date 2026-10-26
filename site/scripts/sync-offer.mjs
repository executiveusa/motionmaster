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

const onSale = offer.status?.onSale !== false;

function block(tier) {
  const items = tier.includes.map((i) => `                <li>${esc(i)}</li>`).join('\n');
  const cls = tier.id === 'studio' ? 'tier tier--studio' : 'tier';
  const flag =
    tier.id === 'studio' ? ' <span class="tier__flag">includes the footage bridge</span>' : '';
  // While the offer is not on sale there is no purchase to make, so the
  // button is replaced by a plain statement. The price is still shown
  // because it is the recorded term, not a claim that a sale is open.
  const action = onSale
    ? `              <a class="btn btn--primary btn--block" href="#buy" data-buy="${tier.id}" data-buy-label="${tier.id}">Buy ${tier.label} — ${tier.display}</a>`
    : `              <p class="tier__note">Not on sale. ${esc(tier.label)} is the tier this package would ship as.</p>`;
  return `            <article class="${cls}" data-tier="${tier.id}" aria-labelledby="tier-${tier.id}-title">
              <p class="tier__name">${tier.label}${flag}</p>
              <p class="tier__price"><span class="tier__amount">${tier.display}</span> <span class="tier__once">once</span></p>
              <ul class="tier__list" data-tier-list="${tier.id}">
${items}
              </ul>
${action}
            </article>`;
}

const replacement = offer.tiers.map(block).join('\n\n');

// The pricing heading and the checkout panel follow the sale state too.
const head = onSale
  ? {
      eyebrow: 'Pricing',
      title: 'One payment. No subscription for the software.',
      lede:
        'Two tiers, because the product has two things in it: the skill pack for one person, and\n' +
        '              the footage bridge for a team.',
    }
  : {
      eyebrow: 'The offer, recorded',
      title: 'Not on sale. Built for our own use.',
      lede:
        'This is the terms the package would ship under, kept in one file so a launch is a single\n' +
        '              change. Nothing here is for sale today, and no purchase is implied.',
    };

const html = readFileSync(htmlPath, 'utf8');
/* Private, not-for-sale homepage intentionally omits pricing furniture.
 * The status and canonical terms still live in licence.json; it is not
 * appropriate to generate a sales section on an internal preview. */
if (!onSale && !html.includes('data-tier="solo"') && !html.includes('id="pricing-title"')) {
  if (!html.toLowerCase().includes('not on sale')) {
    console.error('[offer] private homepage must disclose its not-for-sale state');
    process.exit(1);
  }
  console.log('[offer] private preview: canonical sale lock verified; no pricing section');
  process.exit(0);
}

const start = html.indexOf('            <article class="tier');
const end = html.indexOf('          </div>\n\n          <div class="buy" id="buy">');
if (start === -1 || end === -1 || end < start) {
  console.error('[offer] could not find the tier blocks in index.html');
  process.exit(1);
}
let next = html.slice(0, start) + replacement + '\n' + html.slice(end);

next = next
  .replace(
    /<p class="eyebrow"><span class="mark" aria-hidden="true"><\/span>[^<]*<\/p>\s*<h2 class="h2" id="pricing-title">[^<]*<\/h2>\s*<p class="section__lede">\s*[\s\S]*?<\/p>/,
    `<p class="eyebrow"><span class="mark" aria-hidden="true"></span>${head.eyebrow}</p>\n            <h2 class="h2" id="pricing-title">${head.title}</h2>\n            <p class="section__lede">\n              ${head.lede}\n            </p>`,
  );

// The checkout panel only exists while a sale is open.
const buyStart = next.indexOf('          <div class="buy" id="buy">');
const buyEnd = next.indexOf('          </div>\n        </div>\n      </section>', buyStart);
if (!onSale && buyStart !== -1 && buyEnd !== -1) {
  next =
    next.slice(0, buyStart) +
    `          <div class="buy" id="buy">
            <p class="buy__label">Status</p>
            <div class="buy__body">
              <p class="buy__line">
                There is no checkout and no licence key. The package runs as-is, locally, for the
                people building it.
              </p>
              <p class="buy__line buy__line--muted">
                ${esc(offer.status.note)}
              </p>
              <p class="buy__status" role="status" aria-live="polite" data-buy-status></p>
            </div>
          </div>
` +
    next.slice(buyEnd);
}

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

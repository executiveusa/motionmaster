import offer from '../../../licence.json';
import { qs, qsa } from '../lib/dom';

/**
 * The checkout panel.
 *
 * The prices and the tier contents are NOT written here. They come from
 * `licence.json` at the repo root — the same file the MCP server reads — so
 * the page and the server can never disagree about what the product costs.
 * The markup carries the same values as a no-JS fallback; this module keeps
 * them in step.
 */

interface Tier {
  id: string;
  label: string;
  price: number;
  display: string;
  priceLine: string;
  includes: string[];
}

interface Offer {
  tiers: Tier[];
  summary: string;
}

const catalogue = offer as Offer;

export function initPricing(): void {
  const amount = qs<HTMLElement>('[data-buy-amount]');
  const status = qs<HTMLElement>('[data-buy-status]');

  // Tier name, price, feature list and button label all come from the offer.
  for (const tier of catalogue.tiers) {
    const block = qs<HTMLElement>(`[data-tier="${tier.id}"]`);
    if (block) {
      const name = qs<HTMLElement>('.tier__name', block);
      if (name) {
        // Keep the Studio flag span if the markup has one.
        const flag = name.querySelector('.tier__flag');
        name.textContent = tier.label;
        if (flag) name.appendChild(flag);
      }
      const price = qs<HTMLElement>('.tier__amount', block);
      if (price) price.textContent = tier.display;

      const list = qs<HTMLUListElement>('.tier__list', block);
      if (list) {
        list.textContent = '';
        for (const item of tier.includes) {
          const li = document.createElement('li');
          li.textContent = item;
          list.appendChild(li);
        }
      }

      const button = qs<HTMLElement>(`[data-buy-label="${tier.id}"]`);
      if (button) button.textContent = `Buy ${tier.label} — ${tier.display}`;
    }

    if (amount && tier.id === 'solo') amount.textContent = tier.display;
  }

  for (const button of qsa<HTMLAnchorElement>('[data-buy]')) {
    button.addEventListener('click', () => {
      const key = button.dataset.buy ?? 'solo';
      const tier = catalogue.tiers.find((t) => t.id === key);
      if (!tier) return;
      if (amount) amount.textContent = tier.display;
      if (status) {
        status.textContent =
          `${tier.label} — ${tier.display} once. The payment page is not connected to this site yet, ` +
          `so nothing has been charged.`;
      }
    });
  }
}

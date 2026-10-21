import { qs, qsa } from '../lib/dom';

const TIERS: Record<string, { name: string; amount: string }> = {
  solo: { name: 'Solo', amount: '$149' },
  studio: { name: 'Studio', amount: '$599' },
};

/**
 * The checkout panel. The payment processor is not connected to this page, so
 * the panel states the tier and the price rather than pretending a payment
 * happened.
 */
export function initPricing(): void {
  const amount = qs<HTMLElement>('[data-buy-amount]');
  const status = qs<HTMLElement>('[data-buy-status]');

  for (const button of qsa<HTMLAnchorElement>('[data-buy]')) {
    button.addEventListener('click', () => {
      const key = button.dataset.buy ?? 'solo';
      const tier = TIERS[key];
      if (!tier) return;
      if (amount) amount.textContent = tier.amount;
      if (status) {
        status.textContent = `${tier.name} — ${tier.amount} once. The payment page is not connected to this site yet, so nothing has been charged.`;
      }
    });
  }
}

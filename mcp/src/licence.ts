/**
 * The Motion Master offer, in one place.
 *
 * The prices, the tier lists and the rendering policy are NOT written here.
 * They live in `licence.json` at the repo root — the same file the landing
 * page imports — and arrive here as a generated twin. Edit licence.json, then
 * `npm run sync:licence` in this package.
 *
 * The rules this file exists to enforce:
 *   - Motion Master is a PAID, ONE-TIME licence. Not a subscription.
 *   - No number appears here that has not been decided. The hosted render
 *     allowance is null until the founder sets it, and nothing publishes one.
 *   - The MCP server never renders anything. It hands the caller the command.
 *   - No URL with a TLD. The domain word is recorded in brand.json and the TLD
 *     has not been chosen.
 */
import { GENERATED_LICENCE } from './licence.generated.js';

export type LicenceTierId = 'solo' | 'studio';

export interface LicenceTier {
  id: LicenceTierId;
  label: string;
  price: number;
  display: string;
  priceLine: string;
  includes: string[];
}

export interface LicenceStatus {
  onSale: boolean;
  mode: string;
  note: string;
  summary: string;
}

export interface LicenceFacts {
  status: LicenceStatus;
  type: string;
  currency: string;
  cadence: string;
  tiers: LicenceTier[];
  summary: string;
  licenceKey: string;
  rendering: {
    local: { available: boolean; tier: string; note: string };
    hosted: {
      available: boolean;
      tier: string;
      allowance: number | null;
      allowanceNote: string;
      billingNote: string;
      note: string;
    };
  };
  domain: { word: string; tld: null; url: null; note: string };
}

const generated = GENERATED_LICENCE as unknown as LicenceFacts;

export const LICENCE_TIERS: LicenceTier[] = generated.tiers.map((tier) => ({
  id: tier.id,
  label: tier.label,
  price: tier.price,
  display: tier.display,
  priceLine: tier.priceLine,
  includes: [...tier.includes],
}));

export const LICENCE: LicenceFacts = generated;

/** A short, plain sentence describing the offer — used in tool output. */
export function licenceSentence(): string {
  if (!LICENCE.status?.onSale) {
    return `Motion Master is not on sale. ${LICENCE.status?.summary ?? ''}`.trim();
  }
  return `Motion Master is a paid, one-time licence (${LICENCE.tiers
    .map((tier) => `${tier.label} ${tier.display} once`)
    .join(' / ')}).`;
}

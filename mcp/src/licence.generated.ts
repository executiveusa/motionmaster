/**
 * GENERATED FILE — do not edit by hand.
 * Source: licence.json (repo root)
 * Regenerate: npm run sync:licence     Verify: npm run check:licence
 */
export const GENERATED_LICENCE = {
  "$comment": "THE single source of truth for the Motion Master offer. The landing page, the MCP server, the plugin manifest and the docs all read this. If a price, a tier list or a rendering promise changes, it changes here and nowhere else. Nothing in this file may promise a number that has not been decided: hostedRenderAllowance is null until the founder sets it.",
  "product": "Motion Master",
  "type": "paid-one-time",
  "currency": "USD",
  "cadence": "one-time",
  "summary": "Motion Master is a paid, one-time licence: $99 Solo or $399 Studio. One payment, no subscription.",
  "licenceKey": "The licence key is delivered by email after checkout. It unlocks the paid tier of the plugin; nothing in this server phones home to check it.",
  "tiers": [
    {
      "id": "solo",
      "label": "Solo",
      "price": 99,
      "display": "$99",
      "priceLine": "$99 once",
      "includes": [
        "33 motion skills — motion doctrine, GSAP, Remotion, the craft law and 60 film styles",
        "One plugin package, 16 agent hosts",
        "The MCP server: plan_video, build_composition, mix_footage, clip library",
        "Motion tokens and four scene starters",
        "Renders on your own machine, no per-minute fee",
        "Commercial use — upstream licences and attribution stay in the package"
      ]
    },
    {
      "id": "studio",
      "label": "Studio",
      "price": 399,
      "display": "$399",
      "priceLine": "$399 once",
      "includes": [
        "Everything in Solo",
        "The Montage bridge (AGPL-3.0) for footage you own",
        "Hosted rendering, with an allowance in your licence",
        "Commercial use, and the bridge ships under AGPL-3.0"
      ]
    }
  ],
  "rendering": {
    "local": {
      "available": true,
      "tier": "solo",
      "note": "Compositions render on your own machine with Remotion (npx remotion render ...). There is no per-minute fee."
    },
    "hosted": {
      "available": true,
      "tier": "studio",
      "allowance": null,
      "allowanceNote": "The size of the allowance is not decided yet, so no number is published. The allowance is confirmed in the checkout receipt, and the size is a number we will publish here before launch.",
      "billingNote": "Nothing is ever charged automatically. If you want more than the allowance, you choose it and you pay for it.",
      "note": "Studio can render on our machines. The MCP server never renders anything itself."
    }
  },
  "domain": {
    "word": "motionmaster",
    "tld": null,
    "url": null,
    "note": "The domain word is confirmed and the TLD is not. No URL with a TLD may be published by the site, the plugin, the MCP server or the docs. The one place it is recorded is plugins/motion-master/assets/brand.json."
  }
} as const;

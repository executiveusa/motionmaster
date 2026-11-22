# The campaign stamp

A new campaign is a copy of this folder, not a blank page. The template *is*
the schema: if a campaign does not match this shape, it is restamped or
archived.

```
campaigns/
├─ CONTEXT.md        this contract, copied with the campaign
├─ brief.json        what the ad is for: the offer, the audience, the brand
├─ copy.md           the words: primary text and headline, with the counts
├─ design.json       the placement, the kit, the focal point, the scene
├─ produce/          the composition and the renders
└─ deliver/          the final file, the thumbnail, ad.json, preflight.json
```

## The brief

```json
{
  "id": "acme-coffee-slow-mornings",
  "brand": "acme-coffee",
  "placement": "reels-9x16",
  "offer": "A coffee subscription that arrives the night before.",
  "audience": "People who start the day slowly.",
  "claim": "Coffee that arrives before you do",
  "eyebrow": "SLOW MORNINGS",
  "brandMark": "ACME COFFEE",
  "primaryText": "",
  "headline": "",
  "durationSeconds": 6
}
```

Every field that states a fact about the offer comes from the founder. None
of them are invented here.

## Human check

Read `copy.md` and `design.json`. Is the claim true? Is the copy inside
Meta's limits? Then run the delivery.

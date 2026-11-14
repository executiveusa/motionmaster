# The brand stamp

A new brand is a copy of this folder, not a blank page.

```
records/
├─ log.md               one line per brand
└─ <brand-id>/
   ├─ CONTEXT.md        this contract, copied with the brand
   ├─ kit.json          the brand's overrides of the house tokens
   ├─ voice.md          the brand's voice, if it differs from the house's
   ├─ assets/           the logos, the fonts, the footage
   └─ campaigns/        one folder per campaign, copied from the campaign stamp
```

## The kit

The same shape as a brand kit anywhere else in the studio: a partial
override of the canonical tokens. It may change the palette, the type, the
easing or the durations. It may not remove a token and it may not change the
system identity.

```json
{
  "id": "acme-coffee",
  "name": "ACME Coffee",
  "palette": { "accent": "#C2410C" },
  "typography": { "display": { "family": "sans" } }
}
```

## Human check

Is the accent one accent? Does the kit override rather than replace? Are the
assets the brand's own, and do they have the rights to be used here?

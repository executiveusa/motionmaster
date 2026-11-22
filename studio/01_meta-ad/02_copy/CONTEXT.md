# 02_copy — write the words

One job: the primary text and the headline, inside Meta's limits, in the
house voice.

## Inputs
- Working (this run): `campaigns/<id>/brief.json`
- Reference (every run): `../../_shared/copy-rules.md`
- Reference (every run): `../../_shared/brand-voice.md`
- Reference (every run): `../../../records/<brand>/voice.md` — if the brand has one

## Process
1. Write the primary text: what the offer is, and why it is worth a click.
   Between forty and a hundred and fifty characters. One idea, then the
   reason.
2. Write the headline: a phrase, not a sentence. Twenty-seven characters on
   Feed, fifty-five on Reels.
3. Write both into `copy.md`, with the character counts beside them.
4. Check them:

```bash
node scripts/check-ad-copy.mjs --placement reels-9x16 \
  --primary-text "…" --headline "…"
```

## Outputs
- `copy.md` → the campaign folder

## Human check
Read the primary text out loud. Does it sound like a person? Does it say
something true about the offer? Count the characters — the checker counts
too, but a person reads the words.

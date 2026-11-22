# acme-coffee — ACME Coffee

One job: hold everything about this brand in one place, so that an ad for it
is a copy and not a blank page.

## Inputs
- Reference (every run): `../../_shared/house-style.md`
- Reference (every run): `../../_shared/copy-rules.md`
- Working (this run): `campaigns/<id>/` — the campaign being made

## Process
1. Read `kit.json` for the brand's overrides and `voice.md` for its voice.
2. For a campaign, follow `_templates/campaign/`, not this folder: this one
   says who the brand is; the campaign says what is being made.
3. Add the campaign to `../log.md`.

## Outputs
- `campaigns/<id>/` — the campaign

## Human check

Is the claim true of ACME Coffee? Are the assets ACME's own?

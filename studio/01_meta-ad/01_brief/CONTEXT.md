# 01_brief — take the brief and the placement

One job: write `brief.json`, the file every later stage reads.

## Inputs
- Working (this run): `campaigns/<id>/brief.json` — the founder's brief, if there is one
- Reference (every run): `../../_shared/ad-specs.md` — the placement and its real numbers
- Reference (every run): `../../../records/<brand>/CONTEXT.md` — the brand's kit and voice

## Process
1. Read the founder's brief. If there is not one, ask for it. Do not invent the offer.
2. Choose the placement. The default is `reels-9x16`: it is the biggest
   surface on Instagram and Facebook, and it is the one people watch on a phone.
3. Write `brief.json` in the shape of `_templates/campaign/brief.json`.
4. Fill the claim, the eyebrow and the brand mark from the brief. The claim
   is one line, and it is true.

## Outputs
- `brief.json` → the campaign folder

## Human check
Is every claim in the brief something the founder said? Is the placement the
one the campaign is for? If a fact is missing, ask — do not fill it in.

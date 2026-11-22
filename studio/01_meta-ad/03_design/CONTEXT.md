# 03_design — choose the composition

One job: decide what the ad looks like — the placement, the kit, the scene,
the focal point — and write it down.

## Inputs
- Working (this run): `campaigns/<id>/brief.json`, `campaigns/<id>/copy.md`
- Reference (every run): `../../_shared/house-style.md`
- Reference (every run): `../../_shared/ad-specs.md`

## Process
1. Pick the placement's master size. It is in `ad-specs.md`, and it is
   Meta's, not a guess.
2. Pick the brand kit. A kit overrides the house tokens; it never removes
   them.
3. Choose the composition. The ad composition is authored at the placement's
   own size — the type stack sits inside the safe area by construction.
4. Choose the focal point, if the composition has art in it: where the
   product or the number sits in the frame. A focal point that is not in the
   middle is fine; one that is not in the safe area is not.
5. Write `design.json`.

## Outputs
- `design.json` → the campaign folder

## Human check
Is the accent the one accent? Is there one idea in the frame? Would you
stop for this on a phone?

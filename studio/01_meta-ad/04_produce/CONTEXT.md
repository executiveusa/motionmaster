# 04_produce — build it, gate it, render it

One job: turn the design into a file that passed the gate.

## Inputs
- Working (this run): `campaigns/<id>/design.json`, `campaigns/<id>/brief.json`
- Reference (every run): `../../_shared/house-style.md`

## Process
1. Build the composition:

```bash
node scripts/build-meta-ad.mjs --placement reels-9x16 \
  --brief campaigns/<id>/brief.json --out campaigns/<id>/produce
```

2. Gate it. The gate is hard; a failed gate is a failed ad:

```bash
npx hyperframes check campaigns/<id>/produce
```

3. Fix what the gate found. It names the finding and the fix — contrast
   gives the colour that passes, the type floor gives the size, an empty
   first frame means the claim belongs at zero.
4. Render it:

```bash
bash generator/render.sh campaigns/<id>/produce campaigns/<id>/produce/ad.mp4
```

5. One render at a time. The queue is there so that three agents firing at
   once do not take the machine with them.

## Outputs
- `ad.mp4` → `campaigns/<id>/produce/`

## Human check
Watch the first frame. That is the thumbnail. Then watch the whole thing
once at phone size.

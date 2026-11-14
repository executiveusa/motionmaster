# 01_meta-ad — a paid social ad, made for a placement

One job: turn a brief into an ad that Meta will deliver without cropping it
and that a person would stop for.

## The sequence

| folder | what it does |
|---|---|
| `01_brief/` | take the brief, the brand and the placement; write `brief.json` |
| `02_copy/` | write the primary text and the headline, inside Meta's limits |
| `03_design/` | choose the placement, the kit and the composition |
| `04_produce/` | build the composition, gate it, render it |
| `05_deliver/` | the file, the thumbnail, `ad.json`, the preflight |

Read them in order. Each one writes a file the next one reads.

## The rules that are not negotiable

- **The ad is composed for its placement.** A landscape scene cropped to 9:16
  keeps a third of its width and the headline ends up half off the canvas.
  The composition is authored at the placement's own size.
- **The safe zone is read out of the placement**, not guessed at. The type
  stack sits inside it by construction.
- **The words live in the platform.** The creative carries the brand; the
  primary text and the headline live in `ad.json`.
- **Frame zero is the thumbnail.** The claim is on screen at zero.
- **The gate is hard.** A failed gate is a failed ad.

## The commands

```bash
node scripts/build-meta-ad.mjs --placement reels-9x16 --brief campaigns/<id>/brief.json
bash generator/render.sh <build-dir> <build-dir>/ad.mp4
node scripts/check-ad-copy.mjs --placement reels-9x16 --primary-text "…" --headline "…"
```

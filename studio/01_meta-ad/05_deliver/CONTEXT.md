# 05_deliver — the package

One job: the file, the copy and the proof, together.

## Inputs
- Working (this run): `campaigns/<id>/produce/ad.mp4`, `campaigns/<id>/copy.md`
- Reference (every run): `../../_shared/ad-specs.md`

## Process
1. Take a thumbnail from the first frame. It is what the platform shows
   before anybody presses play.
2. Write `ad.json`: the placement, the master, the safe area, the copy with
   its character counts, and the crop loss of the alternative.
3. Preflight the file against the placement — the ratio, the width, the
   duration, the encoding, the file size:

```bash
node scripts/preflight-ad.mjs --placement reels-9x16 --file ad.mp4
```

4. Move the package into `deliver/`.

## Outputs
- `deliver/ad.mp4`, `deliver/thumbnail.jpg`, `deliver/ad.json`,
  `deliver/preflight.json`

## Human check
The preflight has to be clean. If it is not, the ad will be cropped or
rejected, and neither is worth discovering at upload.

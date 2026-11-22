---
name: meta-ads
description: >
  Make a paid social ad for Meta — Facebook, Instagram, Reels, Stories — that
  is composed for its placement rather than cropped to it. Use when asked for
  a Facebook ad, an Instagram ad, a Reels ad, a Story ad, a social ad, a
  paid social video, a feed ad, a Meta placement, an ad for a placement, an ad
  package with copy, or when asked to take a video and turn it into a social
  ad. Covers the placements and their real sizes, the safe zone, the character
  limits on the primary text and the headline, composing the type stack inside
  the safe area, the house gate, and the delivery package.
---

# Meta ads

**An ad is three things: the file, the copy, and the placement.** The copy
lives in the platform, not in the picture.

## The thing that makes this different

Every scene in this studio is sixteen by nine. Meta's placements are 4:5,
9:16 and 1:1, and **Facebook Reels accepts zero per cent aspect-ratio
tolerance**. The safe zone on a full-screen vertical placement covers roughly
half the frame: leave the top fourteen per cent, the bottom thirty-five per
cent and six per cent of each side free of text, logos and key creative.

A 1920×1080 frame cropped to 9:16 keeps **thirty-two per cent of its width**.
The headline ends up half off the canvas. So the ad is **composed at the
placement's own size**, with the type stack inside the safe area by
construction — not cropped afterwards.

## The placements

| placement | ratio | master | where |
|---|---|---|---|
| Feed | 4:5 | 1440 × 1800 | Facebook Feed, Instagram Feed |
| Reels and Stories | 9:16 | 1440 × 2560 | Facebook and Instagram Reels and Stories |
| Square | 1:1 | 1440 × 1440 | Feed, carousel cards, in-stream |
| Landscape | 16:9 | 1920 × 1080 | Facebook Feed, Instagram in-stream |

These are Meta's own numbers, read on 2026-11-13. They live in
`studio/_shared/ad-specs.md` and in the MCP tool `list_meta_placements`. If
they disagree with the Ads Guide, the Ads Guide wins.

## How to make one

```bash
# 1. The brief. Copy _templates/campaign/ — never start from a blank page.
# 2. The words: primary text 40–150 characters, headline 27 or 55.
node scripts/check-ad-copy.mjs --placement reels-9x16 \
  --primary-text "…" --headline "…"

# 3. The ad, composed for its placement.
node scripts/build-meta-ad.mjs --placement reels-9x16 \
  --brief campaigns/<id>/brief.json --out campaigns/<id>/produce

# 4. The gate. It is hard.
npx hyperframes check campaigns/<id>/produce

# 5. The render.
bash generator/render.sh campaigns/<id>/produce campaigns/<id>/produce/ad.mp4

# 6. The package and the proof.
node scripts/preflight-ad.mjs --placement reels-9x16 --file ad.mp4
```

## The rules that are not negotiable

- **The copy lives in the platform.** The creative carries the brand; the
  primary text and the headline live in `ad.json`, where they can be
  translated and read by a screen reader.
- **Frame zero is the thumbnail.** The claim is on screen at zero. Never
  animate it in from an empty frame.
- **Every piece of reading type clears the type floor**: 2.6% of the short
  side — 37 px on a 1440-wide frame.
- **The accent is a mark, not a surface.** One accent, at most eight per cent
  of the frame.
- **The gate is hard.** A failed gate is a failed ad, not a warning.
- **Never fabricate.** No invented offer, no invented statistic, no invented
  name.

## What the gate will tell you

It names the finding and the fix, which is most of the value:

| finding | what it means | the fix |
|---|---|---|
| `contrast_aa_failure` | text is under 4.5:1 | use the colour it names |
| `text_below_floor` | reading type is too small | raise it to 2.6% of the short side, or mark it `data-layout-ignore` if it is texture |
| `first_frame_empty` | frame zero has nothing on it | put the claim at zero |
| `text_occluded` | something is on top of the text | move it or move the text |
| `content_overlap` | two things are on top of each other | one thing at a time |

## The delivery package

```
deliver/
├─ ad.mp4          the file, at the placement's master size
├─ thumbnail.jpg   the first frame — what the platform shows before play
├─ ad.json         the placement, the safe area, the copy, the measurements
└─ preflight.json  the proof that the file is inside the contract
```

## Where the folders are

The whole studio is in `studio/`, as folders an agent of any kind can walk:
`studio/AGENTS.md` is the map, each pipeline folder has a `CONTEXT.md`, and
each brand lives in `studio/records/<brand>/`.

## The tools

`list_meta_placements`, `check_ad_copy`, `build_meta_ad`, `preflight_ad` and
`plan_meta_ad` are MCP tools and HTTP routes at `/api/v1/meta/*`. Use the
tools when the host has them; use the folders when it does not.

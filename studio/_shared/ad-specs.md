# Meta's placements — the real numbers

Read from Meta's Ads Guide on **2026-11-13**. These move, so the date is on
the file. If a number here disagrees with the Ads Guide, the Ads Guide wins
and this file is wrong.

The authoritative copy in code is `mcp/src/meta.ts`, which carries the same
figures with their source URLs. This file is the human-readable one.

## The placements we deliver

| placement | ratio | master | where it runs | aspect tolerance |
|---|---|---|---|---|
| Feed | 4:5 | 1440 × 1800 | Facebook Feed, Instagram Feed | 3% |
| Reels and Stories | 9:16 | 1440 × 2560 | Facebook and Instagram Reels and Stories | **0%** on Facebook Reels |
| Square | 1:1 | 1440 × 1440 | Feed, carousel cards, in-stream | 1% |
| Landscape | 16:9 | 1920 × 1080 | Facebook Feed, Instagram in-stream | 3% |

**Four by five is the Feed's shape.** Anything taller gets cropped, and the
crop is not always the one you would have chosen.

## The safe zone

On a full-screen vertical placement, leave free of text, logos and key
creative:

| | fraction | on 1080 × 1920 | on 1440 × 2560 |
|---|---|---|---|
| top | 14% | 269 px | 358 px |
| bottom | 35% | 672 px | 896 px |
| each side | 6% | 65 px | 86 px |

That is roughly half the frame. The profile name, the caption, the audio
ticker and the call to action all sit on top of it. If the ad carries a
disclaimer, the bottom becomes forty per cent.

Your footage still fills the whole screen. **Only the words and the logos
stay in the middle.**

## The file

- MP4 or MOV, up to 4 GB.
- H.264, square pixels, fixed frame rate, progressive scan, stereo AAC at
  128 kbps or higher.
- Minimum width 250 px on Reels for ads under thirty seconds, 500 px for
  thirty seconds and longer.
- Duration: one second to 241 minutes on Feed; up to fifteen minutes on
  Instagram Reels.

## The text — which lives in the platform

| field | limit |
|---|---|
| primary text | 40 characters at the bottom, 150 at the top |
| headline | 27 characters on Feed, 55 on Reels |

**These are not burned into the creative.** They are fields in Ads Manager,
where they can be translated, read by a screen reader, and changed without
re-rendering the video. Meta's own guidance is that an ad image or video
should carry very little text: the words belong in the fields.

An ad is three things: the file, the copy, and the placement. The studio
writes all three, and `ad.json` holds them together.

## Sources

- <https://eventsmanager.facebook.com/business/ads-guide/update/video/facebook-facebook-reels>
- <https://eventsmanager.facebook.com/business/ads-guide/update/video/instagram-reels>
- <https://business.facebook.com/business/help/682655495435254/>

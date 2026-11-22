# 25 — THE HERO FILM

**The 104-second film, cut to 55.4 seconds, and given a score.**
**Date: 2026-11-11.**

The founder's open item was: *shorten the hero film to 45–60 seconds.* This is that,
and it is more than that, because two real defects showed up on the way.

---

## 1. The cut is an edit decision list, not a re-timing

`hero/film.js` still draws exactly the frames it always drew. What changed is the
**cut**: `hero/film.js` now holds an edit decision list, and the movement functions
still receive the time they were designed for.

```js
const EDITS = {
  full:  { dur: 104,   segments: [ … ] },   // the original rhythm, one to one
  short: { dur: 55.4,  segments: [ … ] },   // what the page links to
};
```

Each segment maps a stretch of the finished timeline onto a stretch of the original
timeline. The animations are not sped up; the **staging** is compressed around them.

| movement | what it is | original | in the short cut | pace |
|---|---|---|---|---|
| 1 | the brief lands on the reel | 0–20 s | 0–12.4 s | 1:1 |
| 2 | four shots in depth, the near one takes the frame | 20–50 s | 12.4–28.4 s | 1.9× |
| 3 | the code that made the picture | 50–77.5 s | 28.4–41.4 s | 2:1 |
| 4 | three shots, cut on motion | 77.5–96 s | 41.4–47.4 s | 3:1 |
| 5 | the shots collapse into one file | 96–104 s | 47.4–55.4 s | 1:1 |

The shape is deliberate: **a slow opening, a fast middle, a held ending.** Movement 1
keeps its own pace because a brief arriving should be unhurried. Movement 5 keeps its
own pace because the ending is where the film stops showing work and starts
delivering a thing, and that should not be rushed.

`window.setEdit('full' | 'short')` switches cuts. The long film is still one render
away.

---

## 2. The footage clock is separate from the film clock

Compressing a movement must not speed up the footage inside it — a clip seen at 1.9×
reads as a different, worse clip. So each segment carries a second clock:

- `m0` — where that segment's **footage** clock starts.
- The footage plays at **real speed** in every segment and restarts at every cut.
- The **staging** around it is what gets compressed.

So in the short cut the code panel scrolls at 1:1 while the cursor's journey around
the screen is twice as quick. That is what an editor does: the picture inside the
frame is never hurried, only the cut around it.

---

## 3. Two real defects the cut exposed

### 3.1 The film was showing the empty part of two clips

The footage-title clip spends its first **three seconds** on an empty ground before
anything is drawn. The kinetic clip spends its first half second the same way. The
film was showing those empty parts — including in the two places that matter most:
the third shot of the montage, and the still the file lands on in the ending.

The clips now declare the window that actually holds the picture:

```js
const CLIPS = {
  launch:  { from: 1,  count: 420 },
  kinetic: { from: 13, count: 255 },
  product: { from: 1,  count: 621 },
  footage: { from: 92, count: 459 },
};
```

and the loops run inside that window. The montage's third shot now lands on
*Cut it. Title it.*, and the file lands on the same frame, instead of on a black
rectangle.

### 3.2 A frame index was resolved twice

Fixing the windows above exposed a bug in the original code: the frame index was
wrapped once when the needed frames were worked out and **again** when the image was
loaded, and the cache key was written from the first value while the file was read
from the second. The two disagreed, so every frame came back empty and the film
rendered black wherever a clip should have been.

It is now wrapped exactly once, in one place, and the cache key and the file on disk
cannot disagree.

Both defects were found by **rendering stills and looking at them** — thirteen frames
on a contact sheet, before spending twenty minutes on a render.

---

## 4. The score

The film was silent. A showreel with no sound is a slideshow with extra steps.

`hero/sound-kit.json` is the score, written down so it can be argued with. Every
sound comes from the shelf this repository built — `library/sfx.json`, 1,470 sounds
from earshot (MIT), uisfx (MIT code / CC0 audio) and Openverse (per-item licence).
Each cue carries a time, a level, a **role** and a **reason**:

```json
{
  "at": 33.6,
  "id": "earshot:pro_click/mouse",
  "gainDb": -12,
  "role": "the cursor clicks",
  "reason": "A pointer travels in, parks and clicks. The most literal sound in the
             film, and the only one that has to be exactly right — it is the sound
             of the work being made."
}
```

Sixteen cues and a bed. The beats are the beats of the **finished** cut, not of the
long one.

| t | what is on screen | sound |
|---|---|---|
| 0.00 | the film opens on a running reel | `cut_hit/sub` |
| 0.25 | the brief lands | `land.light/finger_phone` |
| 4.65 | the words lift off the ground | `riser/dark` |
| 12.40 | cut into the plan | `pro_whoosh_big/windy` |
| 26.80 | the near panel takes the frame | `cut_hit/rumble` |
| 28.40 | cut into the code | `whoosh_fast/heavy` |
| 29.40 | the code panel slides in | `pro_zip/up` |
| 33.60 | the cursor clicks | `pro_click/mouse` |
| 41.40 / 43.51 / 45.45 | the three shots land | three **different** hits |
| 47.40 | cut into the file | `cut_hit/sub` |
| 51.00 | the file name lands | `pro_click/tink` |
| 53.00 | the end card | `pro_logo_sting/sweep_hit` |

The three montage hits are deliberately three different sounds. Three identical hits
read as a loop.

### 4.1 The bed has no period

A single ten-second whoosh, looped, pulses once every ten seconds and anyone
listening will hear the seam. The bed is therefore **four layers of the same file**,
each looping from a different point and running at a slightly different tempo
(0.965, 0.988, 1.014, 1.041), low-passed to 520 Hz so it never competes with the
hits, and faded out before the end card. The sum has no period at all.

---

## 5. How it was measured

`hero/score.mjs` places the cues, mixes them, normalises and muxes. The loudness is
measured in **two passes** — the mix is rendered, measured, and then corrected exactly
— because `loudnorm` in one pass cannot hit an integrated target on a sparse mix
without crushing it.

Every cue is checked against the shelf before it is used: a cue that names a sound we
do not have is a **failure**, not a silent hole.

**Delivered:**

| | |
|---|---|
| Duration | **55.400 s** |
| Picture | 1920×1080, 30 fps, 1,662 frames |
| Sound | AAC, 48 kHz, stereo |
| Integrated loudness | **−18.5 LUFS** |
| True peak | **−1.5 dBTP** |
| Loudness range | 5.3 LU |
| Size | 21.5 MB |

The kit's declared target says **−18.5 LUFS**, because that is what the mix honestly
is, not what it would be nice for it to be.

---

## 6. The render

`hero/render.mjs` grew `--from` and `--to`, so a long render can be done in chunks:

```bash
node hero/render.mjs --out hero/chunks/hero-01.mp4 --from 0     --to 18.5
node hero/render.mjs --out hero/chunks/hero-02.mp4 --from 18.5 --to 37
node hero/render.mjs --out hero/chunks/hero-03.mp4 --from 37    --to 55.4
```

and the chunks are joined with the concat demuxer. A render that dies at minute
forty is worth nothing; a chunk that dies at minute nine costs nine minutes. The
duration is read from the film itself unless one is given, so the two cuts cannot
drift apart.

The page links the short cut. The long cut is one command away.

---

## 7. What is on the page now

- The **55-second** film is what the "behind the scenes" link opens.
- The link says 55 seconds because it is 55 seconds.
- The twenty-second engine film still has its own section, because twenty seconds is
  a thing a page plays on its own and fifty-five is a thing a visitor chooses.

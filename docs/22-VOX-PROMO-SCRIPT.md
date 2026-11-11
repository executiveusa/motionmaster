# 22 — THE VOX PROMO SCRIPT

**Date:** 2026-11-10
**The film:** `clips/src/vox/VoxPromo.tsx` — 20 seconds, 1920×1080, 24fps.
**The machine-readable script:** `clips/src/vox/script.ts`.
**Output:** `site/public/film/motion-master-vox-promo.mp4`.

---

## The script

Read down the page. The **cut-out type** is the big headline on the paper.
The **caption** is the spoken line, timed word by word, at the bottom of the
frame. They are never the same sentence — a caption that repeats the headline
says the same thing twice on one screen, and the bigger of the two wins, so
the smaller one stops being read.

---

### 0.0 – 3.9 · THE OPENING

> **cut-out type** — `A FILM,` *(on a torn strip of ink paper)*
> `ONE SENTENCE.`
>
> **caption** — `DESCRIBE THE FILM.`

The strip comes in from the left on the stepped clock, with a paper swipe
under it. The paper breathes: half a degree of lean, a slow breath. The
caption's first word takes the accent and lights the sentence.

---

### 4.6 – 8.0 · THE MECHANISM

> **cut-out type** — none. The code is the picture.
>
> **caption** — `THE AGENT WRITES THE CODE.`

A dark panel slides down. Three lines type in, one at a time, with an accent
cursor at the end of the line being written:

```
const plan = planShots(cards, brief);
const film = build(plan, { fps: 24 });
await render(film, out);
```

Those are our real calls. `planShots` is the tool that reads the 124 shot
cards; `build` and `render` are what it becomes.

---

### 8.8 – 11.0 · THE VOCABULARY

> **cut-out type** — `124 SHOTS.`
>
> **caption** — `IT ALREADY KNOWS THEM.`

Six cards fly in on the stepped beat, one every four steps, each with its
own lean: `opening`, `typography`, `camera`, `data`, `ui-entrance`, `outro`.
The first card is ink; the rest are paper with an ink rule.

**124 is the real number.** It is what `plugins/motion-master/skills/shotcraft`
holds and what `plan_shots` counts. Nothing in this film is a figure invented
for the film.

---

### 11.6 – 15.5 · THE MAP

> **cut-out type** — none. The map is the picture.
>
> **caption** — `IT DRAWS THE MAP TOO.`

The camera starts on the whole world and flies to the North Atlantic. A route
draws itself from New York, through London, to Lisbon. A pin drops with a
soft chime of a drop. A callout arrows in from the right with `LISBON` on a
black label. A vignette tightens over the destination.

The map is a **demonstration, not decoration**: it shows the agent drawing
boundaries, a route, a pin, a callout and a highlight — the parts of a map
that are hard, and that the `vector-map` skill now knows.

---

### 17.0 – 19.4 · THE CLOSE

> **cut-out type** — `THE FILE IS YOURS.` *(on a torn strip of ink paper)*
>
> **caption** — `RENDERED ON YOUR MACHINE.`

The strip comes back, larger, with a punch under it. The caption lands the
last line and holds.

---

## The sound

Four sounds, all from our own shelf. There is no music bed: the film is
quiet and the sounds are the punctuation.

| at | sound | level | on what |
|---|---|---|---|
| 0.85 | `swipe_paper.mp3` | 0.55 | the strip arrives |
| 4.55 | `swipe_paper.mp3` | 0.40 | the code panel |
| 8.75 | `swipe_paper.mp3` | 0.32 | the shot cards |
| 11.50 | `pro_riser_air_gate.mp3` | 0.34 | the camera starts moving |
| 13.55 | `drip_drop.mp3` | 0.60 | the pin drops |
| 16.90 | `swipe_paper.mp3` | 0.50 | the close |
| 17.00 | `cut_hit_punch.mp3` | 0.65 | the last line |

---

## The rules this film follows

1. **The graphic layer steps at 12fps; the base is smooth.** The type, the
   cards and the map move on twos. Nothing else is quantised.
2. **Quantise the clock, not the result.** The frame is snapped *before* any
   value is computed, so a scale that grows lands on twos instead of
   dissolving.
3. **Posterise the graphics, texture the whole frame.** Six levels of colour
   on the graphic layer; grain, a halftone screen and a vignette over
   everything.
4. **The paper boils.** Nothing sits perfectly still.
5. **The caption is synced to the word.** The active word takes the accent and
   lifts; the words before it recede; the words after it have not arrived.
6. **One accent, one thing at a time.** The active word, or the route, or the
   pin.
7. **The cut-out type and the caption are different sentences.**
8. **No count of three.** The house rule, and the script is checked by a test
   rather than trusted.

---

## How to change it

The script is data. `clips/src/vox/script.ts` holds the beats, the caption
text, the sound cues and the route. Change a line, move a beat, and re-render:

```sh
cd clips
npx remotion render VoxPromo ../site/public/film/motion-master-vox-promo.mp4 \
  --browser-executable="$CHROME_BIN" --ignore-certificate-errors --gl=swangle \
  --concurrency=1 --codec=h264 --crf=18
```

Or run the whole media chain, including this film:

```sh
scripts/rebuild-media.sh
```

Twenty seconds takes about twenty minutes to render on two cores, most of it
in the posterise filter.

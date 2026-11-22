# 21 — THE VOX ENGINE

**Date:** 2026-11-10
**Mandate:** study three Vox-style repositories and upgrade the rendering
pipeline with what they actually do.
**Source of truth:** `executiveusa/motionmaster` main.

---

## 1. The three repositories, and what they really are

The mandate named three. Each was cloned and read before a line of our code
changed.

### `alisa0808/vox-director` — MIT

**What it is:** an agent skill, not an application. Python scripts and local
ffmpeg; the heavy lifting is a text-to-image model on the Atlas Cloud API.
One topic in, a paper-collage explainer out.

**Its engine:** Python (Pillow) → PNG frames → ffmpeg. Twenty-eight scripts.

**Its subtitle sync — the good part.** `scripts/asr_beats.py` transcribes a
voice track into **word-level timestamps**, then segments those words into
beats:

- a beat ends at a sentence-ending word once it is at least 2.0s long;
- or at a pause of 0.35s or more;
- or is force-cut at 9.5s, because the video model caps a single call at 10s;
- a trailing fragment under 2.0s is merged into the beat before it.

The segmentation is a good algorithm and it is now part of how we think about
captions: **a beat is a unit of work, bounded by what the renderer can do.**

**Its captions:** `scripts/text_overlay.py` renders each caption to a
transparent PNG with Pillow and composites it with ffmpeg's `overlay`. The
"white" style is plain white letters with a dark edge and a soft shadow, no
band. It also samples the dominant saturated colour out of the keyframe so
the caption's keyline travels with each film's palette.

**Its texture:** there is no runtime texture filter. The grain, the halftone
and the torn paper are **in the generated image** — the collage poster is the
finished artifact, and the motion is added afterwards. This is the opposite
of our approach, and worth knowing.

**Its motion — where the "boil" actually is.** `scripts/motion.py` is a
keyframe engine: each element is a `Layer` with a keyframe track plus two
continuous terms added every frame:

```python
s *= 1 + self.pulse * math.sin(t * 2.1)   # the breath
r += self.sway * math.sin(t * 1.3)        # the lean
```

**That is the boil.** A collage element that sits perfectly still looks like
a PNG. Paper on a desk never does. The names in the mandate — "boil
effects" — are real, but they live here, as a sway and a pulse on a sine.

### `santmun/video-vox` — MIT

**What it is:** a Remotion 4.0.487 project. React 18, `@remotion/transitions`,
`@remotion/google-fonts`. 518 KB, fourteen source files.

**Its engine:** Remotion, 1080×1920 at 30fps for a vertical short.

**Its structure:** a `short.json` with `fps`, `width`, `height`,
`totalFrames` and a list of scenes, each with an `id`, a `keyword`, a
`narration`, a direction, an audio file, an image and a `durationInFrames`.
`Short.tsx` maps scenes to `<Sequence>`s; `EscenaShort.tsx` draws one.

**Its captions are scene-level, not word-level.** Each scene shows one
keyword on an orange card — `EJEMPLO`, and so on. There is no word
synchronisation anywhere in this repository. The mandate's description of it
was wrong, and the honest finding is that the word-level sync we wanted was
in vox-director, not here.

**Its texture:** `components/PaperBackground.tsx` uses an SVG `feTurbulence`
fractal noise at `baseFrequency="0.012"`, two octaves, seed 7, plus a
`feColorMatrix` to make it a paper grain, drawn over the whole frame.

**Its motion:** `anim/SlideIn.tsx` — an entrance from a direction with a
distance, a delay and a `damping` term, and a text direction that differs
from the image direction, so the type and the picture do not arrive together.

### `iart-ai/motion-skills` — MIT

**What it is:** a catalogue, not a library. Nineteen separate repositories,
each a pack of skills for a different audience.

The two that matter to the mandate:

- **`map-animation-skills`** — Vox-style editorial maps. The **12fps
  stutter**: "the single most recognizable trait of this style is animating
  the map graphics at 12fps inside a 24fps edit. The base footage and audio
  run at 24 (smooth); the graphic layer steps at 12." The maths is
  `STEP = Math.round(fps / 12); f = Math.floor(frame / STEP) * STEP`, and
  the rule is explicit: **use the quantised frame for all graphic motion,
  keep the base camera on the raw frame.** In After Effects the equivalent is
  `posterizeTime(12)` on the overlay precomp.
- **`kinetic-typography-skills`** — the reveal recipes: mask/clip reveal as
  the robust default, blur-in, clip-path wipe, character stagger; ease-out
  `cubic-bezier(0.16, 1, 0.3, 1)`; 400–600ms per fragment; 40–70ms between
  words; cap the whole reveal near 800ms. And the accessibility note that
  matters: splitting into per-character spans destroys the text for screen
  readers, so the container keeps an `aria-label` and the fragments are
  `aria-hidden`.

**There is no "boil" anywhere in this repository.** The boil is vox-director's.

## 2. The gap, and the upgrade

What we had: blocks, styles, a sound shelf, an enhancer that guessed a shape.
What we did not have: a way to make a frame look like it was *made*, and a
way to say where the words are.

### 2.1 The analog layer — `analog-motion` (new skill)

A global filter layer, in `clips/src/vox/`:

- **The stepped clock** (`stutter.ts`) — the frame is quantised before any
  value is computed. Quantising the *result* instead of the clock is the
  mistake that makes it look like a dissolve.
- **Posterised colour** (`AnalogTexture.tsx`) — an SVG `feComponentTransfer`
  with a discrete table, six levels, applied to the graphic layer only.
- **Paper** — a 220×220 `feTurbulence` tile repeated (a whole-frame
  turbulence would cost minutes of render time; a tile costs milliseconds),
  a 6px halftone screen, and a vignette.
- **The boil** (`stutter.ts`) — the sway and the pulse, from vox-director.
- **Word-synced captions** (`WordCaptions.tsx`) — the active word takes the
  accent and lifts; the words before it recede; the words after it have not
  arrived. The clock comes from an ASR transcript, a written script, or a
  known tempo, and the component does not care which.

### 2.2 The vector map — `vector-map` (new skill)

`clips/src/vox/VectorMap.tsx`, with a self-contained Mercator projection so
it needs no install:

- boundaries from Natural Earth 1:110m (public domain), simplified and
  rounded to a tenth of a degree — finer than one pixel at 1920 wide;
- a camera as one transform on the map group, eased toward a projected point;
- a route drawn on by dash offset, with a flight-path arc;
- a pin that drops, settles and pulses;
- a callout whose arrow is drawn in screen space, so the label stays level
  while the map turns, and stops short of the pin;
- a region vignette — a soft radial plus a tightening dashed ring — behind
  the route and the pin.

### 2.3 What we did not take

- **Google Earth Studio → After Effects.** The photoreal path. It needs a
  browser tool, an AE licence and a `.jsx` camera import. The vector path is
  the one that renders in code, and that is what an agent can drive.
- **Atlas Cloud, the image model, the lipsync scorer, the confetti.** All of
  it needs a paid API or a GPU. Our renderer draws frames, so our look is
  drawn, not generated.
- **`d3-geo` and `d3-interpolate`.** A Mercator is twenty lines and a
  great-circle interpolator is ten. Both are vendored into the component, so
  the skill works in every host without an install.

## 3. The film

`clips/src/vox/VoxPromo.tsx` — **"Motion Master, in twenty seconds"**, 20s,
1920×1080, 24fps. The script is in `clips/src/vox/script.ts`.

| time | the frame | the cut-out type | the caption |
|---|---|---|---|
| 0.9–3.8 | torn paper, one headline | A FILM, / ONE SENTENCE. | DESCRIBE THE FILM. |
| 4.6–8.0 | a code panel, typing | — | THE AGENT WRITES THE CODE. |
| 8.8–11.0 | six shot cards | 124 SHOTS. | IT ALREADY KNOWS THEM. |
| 11.6–15.5 | the map: route, pin, callout | — | IT DRAWS THE MAP TOO. |
| 17.0–19.4 | torn paper, the close | THE FILE IS YOURS. | RENDERED ON YOUR MACHINE. |

**The cut-out type and the caption are different sentences.** A caption that
repeats the headline says the same thing twice on one screen, and the bigger
of the two wins — so the smaller one stops being read.

**The sound is four cues from our own shelf** — a paper swipe on each beat, a
riser under the camera move, a drop on the pin, a punch on the close. There
is no music bed: the film is quiet and the sounds are the punctuation.

**"124 SHOTS."** is the real number of shot cards in the plugin, and it is
the number the `plan_shots` tool counts. It is not a marketing figure
invented for the film.

## 4. The rules that came out of the audit

1. **Stutter the graphics, never the base.** The camera and the footage stay
   smooth. Stuttering everything looks like dropped frames.
2. **Quantise the clock, not the result.**
3. **A beat is bounded by what the renderer can do.** 2 seconds minimum, the
   model's cap maximum, sentence ends and pauses as the natural cuts.
4. **The boil is a sine on a sway and a pulse.** Half a degree and 0.4%.
5. **Posterise the graphic layer, texture the whole frame.**
6. **Splitting text destroys it for a screen reader.** The container keeps
   the `aria-label`; the fragments are `aria-hidden`.
7. **One accent, one thing at a time.**

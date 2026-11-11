---
name: analog-motion
description: The analog layer — posterised colour, paper grain, a halftone screen, a vignette, the 12fps stepped clock, the boiling paper, and word-synced captions. Use this to make a clean digital animation read as printed and shot: "make it look filmic", "add grain", "give it a 12fps stutter", "posterize the colour", "sync the captions to the words", "make it look like cut paper". Covers the filters, the frame quantisation, the breathing layer and the caption clock.
license: MIT
---

# The analog layer

A clean vector animation is *too* clean. It reads as a screen, not as
something printed and shot. Four things fix that, and none of them are
assets — they are filters and one quantised clock:

1. **The stepped clock.** The graphic layer moves on twos.
2. **Posterised colour.** A handful of flat steps instead of a smooth ramp.
3. **Paper.** Grain, a halftone screen, a vignette.
4. **The boil.** The paper is never perfectly still.

## 1. The stepped clock

Render at 24fps, step the graphics at 12. The base camera and the footage
stay smooth — stuttering everything looks like dropped frames, not style.

```ts
const STEP = Math.max(1, Math.round(fps / 12));   // 2 at 24fps
const f = Math.floor(frame / STEP) * STEP;         // read `f`, not `frame`
```

**Quantise the frame before computing any value.** If you compute a smooth
progress and then step the *result*, the movement still looks smooth: a scale
that grows by a hair every frame reads as a dissolve. Quantise the clock and
the movement lands on twos.

Derive `STEP` from `fps`, so it survives a change of frame rate.

From the map-animation skill (iart-ai, MIT).

## 2. Posterised colour

Quantise each colour channel to a fixed number of levels with an SVG
`feComponentTransfer`:

```html
<filter id="posterize" colorInterpolationFilters="sRGB">
  <feComponentTransfer>
    <feFuncR type="discrete" tableValues="0 0.2 0.4 0.6 0.8 1" />
    <feFuncG type="discrete" tableValues="0 0.2 0.4 0.6 0.8 1" />
    <feFuncB type="discrete" tableValues="0 0.2 0.4 0.6 0.8 1" />
  </feComponentTransfer>
</filter>
```

Six levels is the useful range. Four is flat enough to lose the accent;
twelve is smooth enough to stop reading as print. Apply it to the **graphic
layer**, not to the whole frame — see the rule above.

## 3. Paper

Three cheap layers over the top of everything:

- **Grain.** One 220×220 patch of fractal noise, rasterised once and repeated.
  Running `feTurbulence` across a whole 1920×1080 frame every frame costs
  minutes of render time; a tile costs milliseconds. Opacity around 0.3, and
  multiply blend.
- **Halftone.** A 6px radial-gradient dot screen at about 0.1 opacity. Coarse
  on purpose — a fine screen moirés against the frame.
- **Vignette.** A radial gradient that is transparent in the middle and lifts
  the ink at the corners by about 30%.

All three are backgrounds and gradients. No assets, no licences, no weight.

## 4. The boil

A collage element that sits perfectly still looks like a PNG. Real paper on a
real desk never does. So the elements breathe: a slow rotation and a slow
scale, both on a sine.

```ts
const boil = (t: number, { sway = 0, pulse = 0 } = {}) => ({
  rotation: sway * Math.sin(t * 1.3),
  scale: 1 + pulse * Math.sin(t * 2.1),
});
```

Sway of about half a degree and pulse of about 0.4% is invisible as a number
and obvious as a feeling. Anything more looks like a wobble.

From the vox-director keyframe engine (Alisa0808, MIT), where every collage
layer carries a sway and a pulse on top of its own keyframes.

## 5. Word-synced captions

The caption is synced, so the eye lands on the word being said rather than on
a block of text.

The clock comes from three places and the component does not care which:

- **An ASR transcript.** Word timestamps in, beats out: cut on a sentence end
  or on a pause, never longer than the model's per-call cap, and merge a
  trailing fragment shorter than the minimum into the beat before it.
  (The vox-director skill's `segment_words` does exactly this.)
- **A written script.** A phrase and a start; spread the words across the
  phrase's own length.
- **A lyric or a title card** read at a known tempo.

What the caption does with that clock:

- the word being said takes the accent colour and lifts a little;
- the words before it stay legible but recede to about half;
- the words after it are barely there yet;
- the line appears slightly before it is spoken and leaves slightly after.

**The caption and the cut-out headline must be different sentences.** A
caption that repeats the headline says the same thing twice on one screen,
and the bigger of the two wins — so the smaller one stops being read.

## Our rules

- **The accent is one thing at a time.** The active word, or the route, or
  the pin. Never two at once.
- **The texture is over everything, the posterise is under it.** Grain on top
  of posterised colour reads as print; the other way round reads as a filter.
- **Six levels, 0.3 grain, 6px halftone.** The defaults in
  `clips/src/vox/AnalogTexture.tsx`. Change them only with a reason.
- **Never quantise the base camera.** Only the graphics.

## Reference

- `references/recipes.md` — the recipes, written out with the numbers.
- `clips/src/vox/` — the working implementation: `stutter.ts`,
  `AnalogTexture.tsx`, `WordCaptions.tsx`, `Paper.tsx`.

## Related

- `vector-map` — the editorial map, and the 12fps cadence it is built on.
- `shotcraft` — the shot vocabulary; the `rhythm` role covers beat cuts.
- `motion-master` — the router.

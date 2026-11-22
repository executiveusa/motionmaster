# The recipes

Every number below is the one the working implementation uses. Change them
only with a reason.

## The stepped clock

| | |
|---|---|
| target rate | 12fps |
| at 24fps | `STEP = 2` — each value is held for two frames |
| at 30fps | `STEP = 3` — about 10fps |
| at 60fps | `STEP = 5` — exactly 12fps |

```ts
const STEP = Math.max(1, Math.round(fps / 12));
const f = Math.floor(frame / STEP) * STEP;
```

Stagger on the step, not on the frame: `f - i * STEP * 4` puts four steps
between two entrances, which at 24fps is a third of a second.

## Posterised colour

| levels | what it looks like |
|---|---|
| 4 | flat; loses the accent's mid-tones |
| **6** | **the default** — reads as print, keeps the accent |
| 8 | still clearly stepped, a little smoother |
| 12 | smooth enough to stop reading as print |

The table is the same on all three channels. `colorInterpolationFilters="sRGB"`
matters: without it the filter works in linear light and the result is
darker than intended.

## Paper

| layer | value |
|---|---|
| grain tile | 220×220, `feTurbulence` fractalNoise, baseFrequency 0.82, 3 octaves, seed 11 |
| grain opacity | 0.32–0.35, multiply blend |
| halftone | 6px radial gradient, 1.15px dots, opacity 0.10 (rendered at 0.55 of that) |
| vignette | radial, transparent to 42%, ink at 100%, overall opacity 0.55 |

The grain tile is embedded as an SVG data URI. It is rasterised once and
repeated, which is what makes it affordable at full resolution.

## The boil

| | |
|---|---|
| sway frequency | 1.3 rad/s — one slow lean every five seconds |
| pulse frequency | 2.1 rad/s — one slow breath every three seconds |
| typical sway | 0.5° for a card, 0.35° for a headline |
| typical pulse | 0.4% of scale |

Both are on sines, so the motion never repeats visibly and never stops.

## Captions

| | |
|---|---|
| active word | accent colour, lifts 10px on a sine over 0.22s |
| past words | ink at 52% |
| future words | ink at 22% |
| line appears | 0.35s before the first word is spoken |
| line leaves | 0.5s after the last word |

## The type

| | |
|---|---|
| display size | 104–136px on a 1920 frame |
| weight | 700 |
| tracking | −5px at 136px, −3px at 104px — about −3% |
| line height | 1.02 for a single line |
| case | uppercase |

Set display type tight. The same setting on body copy looks like a mistake.

## The paper strip

| | |
|---|---|
| tear step | 26px |
| roughness | 7px of wander on the tear |
| shadow | black at 16%, blurred 6px, offset 10/16 |

The tear is a polyline with a little noise on it — the same trick a
paper-tearing machine plays on straight edges. The noise is deterministic, so
a strip is the same shape on every render.

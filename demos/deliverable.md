# demos/ — three films, three crafts

Three demo films, each one about Motion Master, each made with a different skill
from the plugin package. They exist because the gallery's four clips are all one
voice: type on a flat ground. These are three other voices, and they are the
range proof the page was missing.

| film | skill | what it is |
|---|---|---|
| `blueprint/blueprint.mp4` | **lemo-opuscar** → `styles/blueprint` | The plan of a film, drawn to drafting convention on one sheet of Prussian blue, while a hand signs the title block. |
| `ink/ink.mp4` | **huashu-art-motion** → `17_ink` (中国水墨写意) | Four shots printed in ink on rice paper under a brushed title, with a bleeding wash, drifting mist, swaying bamboo and a seal. |
| `whiteboard/whiteboard.mp4` | **gnipbao/codex-whiteboard-video-skill** | A hand writes the brief, draws the shot list, pins the four shots to the board, and writes the file name. |

All three are 1920×1080, 30 fps, 30 seconds, h264.

## How they are built

Picture is a function of time. `film.js` exposes `window.render(t)` and draws the
frame at time `t`; `hero/render.mjs` drives one headless Chrome, calls `render(t)`
for every frame, and pipes each one straight into ffmpeg. No screen recording, no
dropped frames, and the same input always gives the same output.

```
node hero/stills.mjs --dir demos/blueprint 4 10 16 23 28   # stills, to judge the design
node hero/render.mjs --dir demos/blueprint --duration 30 --out demos/blueprint/blueprint.mp4
```

`demos/lib/strokes.js` is the shared engine: brush and marker strokes with
arc-length resampling, pressure profiles, dry-brush breakup, a pen that travels
the stroke it is drawing, and a cached paper texture.

## What was taken from each skill

**lemo-opuscar / blueprint.** "The whole film happens on one sheet of blueprint
paper lying on a dark drafting table. The camera moves over it like an eye
reading a drawing." White line work on uneven Prussian blue, centre lines,
dimension lines with figures, leader lines to numbered balloons, a title block,
a notes column. 2D line drawing only — no 3D, because the style card says never.
The camera comes and goes rather than pushing continuously.

**huashu-art-motion / 17_ink.** Rice paper at `#efe6d0` with 2,600 short fibre
arcs, half brown and half light, and a radial vignette. Five tones of one ink
(焦 .9 / 浓 .8 / 重 .6 / 淡 .35 / 清 .15). The brush resamples its point list by
arc length before adding texture, or the dry-brush noise changes frequency with
the length of the stroke; pressure rises fast and falls slowly; bristles are
continuous paths with butt caps. The wash grows — the halo keeps widening after
the body has settled. The title is real glyphs with the ink skipped by a dry
brush, which is 飞白, flying white. A seal is pressed at the end.

**whiteboard-video.** The drawing appears because a pen moved: the hand travels
the stroke, the marker is on the board until it lifts, and nothing fades in that
was not written. A real board — never flat white — with smudges, a frame, and a
tray. Marker colour limited to black, one red and one blue. One idea per shot,
and the camera comes and goes.

**From motionmaxxing**, which all three follow: one idea per shot, 2–6 seconds
each, the camera comes and goes and never pushes twice in a row, text-led shots
under 30 per cent, and the picture stays alive — a wash is not a still image
switched on.

## What is real and what is not

Real: the four shots inside the ink film and the whiteboard film are the actual
rendered gallery clips, printed and pinned. The ink film's type is real
lettering with a dry-brush mask. The blueprint's line work is drawn stroke by
stroke. The whiteboard's hand travels the strokes it is drawing.

Not real: the engines these skills ship were not run. PyPI is unreachable from
this sandbox, so `whiteboard-video-engine` cannot be installed; `uv` and
Playwright are not available for the huashu engine; and there is no image
generation API for the paintings the huashu pipeline expects a model to make.
What is used here is the **style knowledge and the craft rules** from each
skill, implemented in this repository's own renderer. That is the honest
description of what these films are.

## The stories

All three are about the same product and the same brief — *four shots, one file*
— and each one tells it in its own hand: the blueprint as a production drawing,
the ink as a brushed painting, the whiteboard as an explanation someone gives
you in a meeting.

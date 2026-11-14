# 04_explainer — a diagram or a concept that draws itself

One job: take a technical thing — an architecture, a flow, a sequence — and
make it watchable.

## The sequence

1. **The diagram** — semantic SVG, authored from a description or from an
   existing PNG or SVG.
2. **The choreography** — GSAP 3 timelines: edges draw on, data flows along
   a path, the camera moves.
3. **The camera** — six patterns for flows larger than the canvas: guided
   tour, follow-cam, vertical scroll, conveyor, pulse-zoom, reveal-pan.
4. **The voice** — with an SRT or VTT, every beat fires on its cue and holds
   while its narration plays.
5. **Render** — MP4, GIF and SVG by default, plus a self-contained
   interactive HTML with a scrubber.

## The skills

`animated-diagrams` carries the whole line: twelve style presets, the camera
rig, the RTL support and the voiceover mode.

## The rules

- **The diagram is semantic.** The SVG has to mean something, because the
  animation is going to move its parts.
- **The camera moves to show, not to impress.** Every move has to reveal
  something the previous frame hid.
- **A beat that fires on a cue holds.** The narration is not played over the
  animation; the animation waits for it.

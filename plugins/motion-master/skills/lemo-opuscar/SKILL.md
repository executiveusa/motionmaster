---
name: lemo-opuscar
description: >
  A toolbox of sixty complete film styles made in code. Each style is a STYLE.md
  — a named look plus the style prompt that produces it — with a demo film drawn
  entirely in code, no video model. Use this when a brief needs a specific visual
  look (ink wash, blueprint, art deco, film noir, dataviz, kino-montage, dataviz,
  claymation, and fifty more) rather than a generic one, or when you need to build
  a film where the picture is a function of time.
license: MIT
metadata:
  author: Lemomo (lemomo-ai/lemo-opuscar)
  version: "1.0.0"
---

# lemo-opuscar — film styles made in code

**This file is Motion Master's own index into the upstream toolbox.** The upstream
project ships `README.md`, `DIRECTOR.md`, `TECHNIQUE.md`, `core-lib.js` and a
`styles/` directory — it has no `SKILL.md` of its own, so it could not be loaded
as a skill until this one was added. Everything except this file is upstream,
under MIT + CC BY 4.0.

## The styles

`styles/<name>/STYLE.md`, one directory per style. Each holds a named look, the
style prompt that produces it, and the notes on what the look is *for*.

```
styles/blueprint/       a drafting sheet on Prussian blue, drawn to convention
styles/ink-wash/        中国水墨写意 — brush-written, bleeding, with flying white
styles/art-deco/        geometry, gold, 1930s
styles/archive-lighttable/  a lit table of paper, the flat archival look
styles/ascii-crt/       text mode, phosphor green
styles/brick-toy/       toy-moulded plastic, shallow depth of field
```

There are sixty. Read `styles/` to see them all rather than guessing a name.

## How to use a style

1. Read the style's `STYLE.md`. Take the **style prompt** from it.
2. Put the style prompt *before* your own brief, so the look leads and the
   subject follows.
3. Use the demo film in that directory as the reference, not the source.

A style prompt is a recipe, not a description. "Style: blueprint. Every shape is
drawn as wobbly pencil or ink lines..." is what makes the render reproducible.
"Make it look like a blueprint" is not.

## Building a film where the picture is a function of time

This is the technique the toolbox was built around, and it is worth having
regardless of which style you use.

```
window.render(t)          // the picture is a pure function of the time
```

Render it by driving the page frame by frame — call `render(t)` for every frame,
capture each one in headless Chrome, and pipe the PNGs into ffmpeg. No screen
recording, no dropped frames, and the output is deterministic: the same code
produces the same film every time.

`TECHNIQUE.md` has the full method. `core-lib.js` has the shared helpers —
resampled strokes, easing tables, type handling.

## Where this sits in Motion Master

- The **catalogue** indexes all sixty style recipes, so `browse_library` with
  `kind=style` returns them with their licence and their source.
- The **enhancer** matches one of these recipes automatically when a brief names
  no style.
- `styles/` is the upstream copy and is not modified. `styles/_template/` is
  the skeleton for making a new one.

## Licence

MIT for the code, CC BY 4.0 for the style prompts and the demo media.
Attribution is kept in `LICENSE` and in the collection entry in
`library/catalogue.json`.

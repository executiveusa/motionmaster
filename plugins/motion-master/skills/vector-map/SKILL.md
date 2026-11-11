---
name: vector-map
description: The editorial map — a camera that flies over a base map while a route draws itself, a pin drops, a callout arrows in and a vignette says "here". Use this when a brief needs a map: "zoom to this country", "draw a route between two places", "highlight a region", "label this place", or a Vox-style explainer beat that needs geography. Covers the 12fps stutter, GeoJSON/SVG projection, camera moves, pins, routes, callouts and region vignettes.
license: MIT
---

# Vector maps, drawn in code

An editorial map is four things moving at once: a **camera** over the land, a
**route** drawing itself, a **pin** dropping, and a **callout** pointing at
something. This skill is how to build all four in one coordinate space, so
they stay glued together while the camera moves.

## The one rule that makes the style

**The graphic layer steps at 12fps inside a 24fps edit.** The base camera and
the footage stay smooth. Stuttering everything looks like dropped frames;
stuttering the *graphics* looks like someone built the map by hand, on twos.

```ts
const STEP = Math.max(1, Math.round(fps / 12));   // 2 at 24fps, ~2-3 at 30fps
const f = Math.floor(frame / STEP) * STEP;         // read `f`, not `frame`
```

Derive the step from `fps` and it survives a change of frame rate. In After
Effects the equivalent is `posterizeTime(12)` on the overlay layer only.

## The projection

Everything shares one projection, so a pin, a route and a label all live in
the same pixels and the camera can move all of them at once.

```ts
const project = ({ lat, lng }: { lat: number; lng: number }) => {
  const x = ((lng + 180) / 360) * WIDTH;
  const y = (1 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / Math.PI) / 2 * HEIGHT;
  return { x, y };
};
```

Mercator is the web map's projection, and it is why a route across the
Atlantic looks like a route across the Atlantic. It is also a straight-line
projection, which means every edge between two projected points is a straight
line — the boundaries stay honest, which a conic projection would not.

We ship a projection with no dependency, because a skill that needs an
install works in every host. `clips/src/vox/VectorMap.tsx` has the whole
thing: projection, camera, camera transform, country paths, routes, pins,
callouts and the region vignette.

## The camera

The camera is one transform on the map group: a scale and a centre.

```ts
const camera = { scale: 1, x: WIDTH / 2, y: HEIGHT / 2 };   // the whole world
const transform = `translate(${WIDTH / 2} ${HEIGHT / 2}) scale(${camera.scale}) translate(${-camera.x} ${-camera.y})`;
```

To look at a place, project it, and ease the camera's scale and centre
toward it over a second or two. Establish, do not whip.

## The four pieces

**A route** — one SVG path, drawn on by moving the dash offset. Use
`pathLength={1}` so one 0→1 value draws any length of route. A flight-path
arc wants the waypoints densified into a curve first.

**A pin** — a drop and a settle: it falls in from above, overshoots a little
and comes to rest, then optionally pulses. Stagger the pins on the stepped
clock so they land one at a time rather than all together.

**A callout** — a label on the screen and an arrow reaching from the label to
the point on the map. The arrow is drawn in *screen* space, so the label stays
level while the map turns. Stop the arrow short of the point so the head does
not cover the pin.

**A region vignette** — a soft radial that says *here*, plus a dashed ring
that tightens as it lands. Keep it tight: a big wash over the frame reads as
a mistake, a focused glow reads as an annotation.

## Our rules on top

- **The land is paper, the sea is paper too.** Our palette is warm neutral
  with one accent. Land `#E3DED2`, sea is the canvas, coastline in ink at
  about 1.15px. No blue ocean.
- **The accent is the route, the pin and the callout.** One thing at a time.
- **One map, one claim.** A map that shows six highlighted places is showing
  nothing. Pick the place the sentence is about.
- **Real boundaries or no boundaries.** Use Natural Earth, which is public
  domain. Never draw a coastline from memory.
- **The map is a demonstration, not decoration.** If the map does not carry
  the sentence, cut it.

## Reference

- `references/UPSTREAM-vector-maps.md` — the upstream cookbook: projection
  choice, camera to a lat/long, pin recipes, route draw-on, region highlight,
  and the full 12fps quantisation recipe for code and for After Effects.
- `references/UPSTREAM-earth-studio-to-ae.md` — the photoreal path: Google
  Earth Studio's camera export, the After Effects `.jsx` import, and parenting
  overlays to track points.
- `references/UPSTREAM-SKILL.md` — the upstream skill in full.
- `references/callouts-and-vignettes.md` — the callout and vignette geometry,
  written out.

## Related

- `analog-motion` — the 12fps stutter, the posterised colour and the paper
  grain that this style is made of.
- `shotcraft` — the shot vocabulary, including the `rhythm` and `camera` roles
  a map beat draws on.

# Callouts and vignettes

The geometry, written out. Both are small; the difference between a map that
looks made and one that looks generated is in these two pieces.

## The callout

A callout is three parts: **a label**, **a line**, and **a head**. The label
is a box on the screen. The line runs from the label to the place. The head
is the arrow tip.

### Drawing the arrow in screen space

The map group is under a camera transform, so the target's *projected* point
is not where it appears. Push it through the camera by hand:

```ts
const screen = {
  x: (target.x - camera.x) * camera.scale + WIDTH / 2,
  y: (target.y - camera.y) * camera.scale + HEIGHT / 2,
};
```

Then the label is already in screen space, so the line between them is a
straight screen-space line — and the label stays level while the map turns.

### Stop short of the point

The arrow should not cover the pin. Pull the end back along its own direction:

```ts
const dx = screen.x - labelAt.x;
const dy = screen.y - labelAt.y;
const len = Math.hypot(dx, dy) || 1;
const endX = screen.x - (dx / len) * 26;   // 26px short
const endY = screen.y - (dy / len) * 26;
```

### The head

Two points either side of the tip, rotated by the line's own angle:

```ts
const angle = Math.atan2(dy, dx);
const head = 16;
const points =
  `${endX},${endY} ` +
  `${endX - head * Math.cos(angle - 0.42)},${endY - head * Math.sin(angle - 0.42)} ` +
  `${endX - head * Math.cos(angle + 0.42)},${endY - head * Math.sin(angle + 0.42)}`;
```

A head of 15–18px on a 1920-wide frame reads as a drawn arrow. Bigger reads
as a clip-art pointer.

### The label

- A filled box, no border. Ink fill, canvas type.
- Padding of about 22px horizontally, 38px above the baseline.
- The type is set at roughly 44px on a 1920 frame, weight 700, tracking −1.
- The box width follows the text: `label.length * 23 + 44` is close enough
  for uppercase sans, and it is better to be slightly generous than to clip
  a letter.

### Drawing it on

The line draws on with a dash offset, the head fades in, and the label fades
in with it. Do not slide the label in — a callout that flies in is a
notification, and a callout that draws is an annotation.

## The region vignette

The vignette says *here*. It is a soft radial plus a dashed ring.

### The radial

```html
<radialGradient id="mm-highlight" cx="50%" cy="50%" r="50%">
  <stop offset="0%"   stopColor="{accent}" stopOpacity="0.34" />
  <stop offset="58%"  stopColor="{accent}" stopOpacity="0.12" />
  <stop offset="100%" stopColor="{accent}" stopOpacity="0" />
</radialGradient>
```

The middle stop matters. Without it the falloff is a hard-edged disc; with
it, the light dissolves. Keep the peak under 0.4 — at 0.5 it stops reading as
light on paper and starts reading as a coloured overlay.

### The ring

A dashed circle in the accent, at about 40% of the vignette's radius, with a
dash pattern of `14 10`. It tightens as it lands, which is the only motion
the vignette needs.

### The radius

Tight. On a 1920-wide frame, 130–180 units around the target is a
highlight; 400 is a colour wash over a third of the map. If the vignette has
to be big to be visible, the map is too zoomed out.

### It is behind the route and the pin

The vignette is light on the paper. The route, the pin and the callout sit on
top of it, because they are the things being pointed at.

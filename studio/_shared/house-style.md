# The house look

The studio's identity. Every render in it uses these tokens, and a brand kit
may override them — but never remove them.

## The palette

| token | value | what it is |
|---|---|---|
| `canvas` | `#F4F4F2` | the paper a light scene sits on |
| `ink` | `#111113` | the ink on that paper, and the canvas of a dark scene |
| `accent` | `#FF4A1C` | the mark. The one colour that means something |
| `mutedInk` | `#6B6B70` | secondary text on a light surface |
| `hairline` | `#DDDEDA` | a rule on a light surface |
| `playerZone` | `#0E0E10` | the surface a composition is previewed on |

**The accent is a mark, not a decoration.** It is the CTA, the emphasis, the
route, the pin, the callout. At most eight per cent of any viewport. Never a
background, never a border fill, never a surface. One accent at a time.

On a dark canvas the muted ink has to clear WCAG AA against it, which the
house's `mutedInk` does not — a dark ad canvas uses `#7C7C80` for secondary
text. The gate will tell you.

## The type

- **Display** — IBM Plex Sans, weight 700, tracking `-0.03em`, line height
  `0.95`. Large and tight.
- **Body** — IBM Plex Sans, weight 400.
- **Label** — IBM Plex Mono, weight 500, tracking `0.14em`–`0.3em`, always
  uppercase.

Monospace is for values: timecodes, shot names, file names, numbers, the
eyebrow. It is never a decorative "technical voice" on a sentence.

**The type floor.** Reading type is never smaller than 2.6% of the short side
of the frame — 37 px on a 1440-wide frame. A phone has to be able to read it.
Text that is texture rather than reading carries `data-layout-ignore`.

## The motion

- **Entrance** — ease-out. The thing arrives and settles.
- **Exit** — ease-in. The thing leaves; it does not fall.
- **On screen** — ease-in-out.
- **Stagger** — 40 ms between siblings, inside a budget of 320 ms. A stagger
  that runs long reads as a queue.
- **Overshoot** — the house motion is settled. Premium work overshoots 0%.
- **Nothing moves that does not need to.** A still frame is a valid frame.

## The composition rules

- **The first frame is the thumbnail.** On a social player, frame zero is what
  the viewer sees before they press play. Have the claim on screen at zero;
  never animate it in from an empty frame.
- **One thing at a time.** A frame carries one idea.
- **Nothing clips.** Text has to fit its box, panels have to fit the canvas.
- **The safe zone is respected by construction,** not by cropping afterwards.

## What never ships

- A tricolon headline — three things counted in a row.
- An eyebrow label above every heading.
- A price, a claim or a statistic that is not in the brief.
- More than one accent, or the accent as a surface.
- A frame that is only a background with nothing on it.

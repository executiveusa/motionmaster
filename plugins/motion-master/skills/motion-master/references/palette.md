# Palette

The Motion Master palette is a neutral bench with exactly one signal colour. It comes
from the design lock (`docs/03-DESIGN-LOCK.md`) and is mirrored in
`plugins/motion-master/assets/motion-tokens.json` under `palette`.

---

## 1. The tokens

| Token | Value | What it is for |
| --- | --- | --- |
| `canvas` | `#F4F4F2` | the background of the page or the frame |
| `surface` | `#FFFFFF` | panels, cards, the surface a control sits on |
| `ink` | `#111113` | body text, small text, headings |
| `mutedInk` | `#6B6B70` | secondary text, captions, metadata |
| `hairline` | `#DDDEDA` | borders and rules |
| `accent` | `#FF4A1C` | the call to action and emphasis — nothing else |
| `accentDark` | `#D63A12` | the accent when it has to work as small text on a light background |
| `playerZone` | `#0E0E10` | the only dark surface in the system, and it is a real frame |

---

## 2. The accent budget

`#FF4A1C` on `#F4F4F2` is roughly **3.3:1** — below the 4.5:1 that WCAG AA requires
for small text. So:

- `accent` is **large text (≥24px, or ≥18.66px bold) and non-text UI only**.
- Small text uses `ink` or `accentDark` (`#D63A12` on `#F4F4F2` clears 4.5:1).
- The accent is a **mark, not a decoration**: never a card background, never a border
  fill, never a gradient.
- The accent must stay **at or below 8% of any viewport**. A frame that is mostly
  orange is not Motion Master, it is a warning.
- One accent, one job per frame. If two things are emphasised, nothing is.

---

## 3. Banned colours

- **Violet, indigo, purple** — anywhere, including in gradients. This is the single
  hardest rejection in the system; the product's own first demo render used
  `#7C5CFF` and had to be re-rendered.
- **Cream, ivory, clay, olive, terracotta** — the editorial palette look.
- **Gradients in UI chrome.** A gradient is allowed inside an actual video frame and
  nowhere else.
- **Glowing blobs, floating orbs, abstract gradient backgrounds.**
- **Glassmorphism** — no `backdrop-filter` on large surfaces.

---

## 4. Shape and surface

- 0 radius on structural elements (rails, rules, panels, frames).
- 4px radius on controls only.
- No pills except a single status chip.
- No 24px card radius.
- Surfaces are flat: hairline borders, one elevation recipe (the player zone), and no
  shadow stacks.

---

## 5. Worked example — a title card

```
canvas       #F4F4F2   the frame
hairline     #DDDEDA   a 2px rule under the wordmark
ink          #111113   the wordmark
accent       #FF4A1C   one word, or the CTA — nothing else
```

That is the whole palette. If a frame needs a fourth colour, the frame is wrong.

# Typography

Two families, four weights, one scale. Type is the loudest part of a motion frame, so
it is also the part that is most often wrong.

Machine-readable source: `plugins/motion-master/assets/motion-tokens.json` under
`typography`.

---

## 1. The families

| Token | Family | Weights | Role |
| --- | --- | --- | --- |
| `sans` | **IBM Plex Sans** | 400, 500, 600, 700 | everything a person reads: display, headings, body |
| `mono` | **IBM Plex Mono** | 400, 500 | timecode, labels, metadata, code, prompts |

Two families. Never a third. Never a decorative serif, never an italic word swap in a
headline, never a variable-font trick to make a headline feel "designed".

Self-host the fonts. `@fontsource/ibm-plex-sans` and `@fontsource/ibm-plex-mono` are
the packages. `font-display: swap`, subset to latin. No runtime request to a font CDN.

---

## 2. The scale

| Token | Size | Weight | Tracking | Line height |
| --- | --- | --- | --- | --- |
| `display` | `clamp(48px, 7.2vw, 104px)` | 700 | `-0.03em` | 0.95 |
| `h2` | `clamp(32px, 4vw, 52px)` | 600 | `-0.02em` | 1.05 |
| `body` | 17px (16px on mobile) | 400 | `0em` | 1.6 |
| `label` | 12px | 500 | `0.12em`, uppercase | — |
| `meta` | 13px | 400 | `0em` | — |

Display type is tight: negative tracking and a line height below 1. The type is set,
not floated. Body copy is loose: 1.6.

---

## 3. Rules that matter in motion

- **Never crop the type inside a frame.** A wordmark that is clipped by the frame edge
  is a bug, not a style.
- **One focal line per beat.** If two lines compete, one of them waits for the next
  beat.
- **Cap the line length** at roughly 40 characters. Longer lines at display size are
  read in the wrong order.
- **Optical alignment beats mathematical alignment.** A wordmark with a round letter
  needs a small negative indent.
- **The font must be loaded before the frame is measured.** Use
  `calculate-metadata.ts` and `measuring-text.md` from `remotion-markup` rather than
  guessing a width.
- **Scale with the frame.** Type in a 1080p render and type in a 4K render are the
  same type, not the same pixels.
- **Letter-spacing is not a substitute for hierarchy.** If a label needs tracking to
  look right, it is probably a label and should stay 12px mono.

---

## 4. Timecode and code

Timecode is always **IBM Plex Mono 500**, always tabular, always with a fixed width
so the numbers do not jitter as they change. Code and prompts are the same family at
`meta` size. A prompt shown to the user is not a quotation — it is a command, and it
is set in mono so it reads as copyable.

---

## 5. In a composition

```tsx
const style: React.CSSProperties = {
  fontFamily: "IBM Plex Sans, sans-serif",
  fontSize: 104,
  fontWeight: 700,
  letterSpacing: "-0.03em",
  lineHeight: 0.95,
  color: "#111113",
};
```

The generated compositions from `build_composition` already carry these tokens.

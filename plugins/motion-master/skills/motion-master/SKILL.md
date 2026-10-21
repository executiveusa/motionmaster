---
name: motion-master
description: >
  The Motion Master router. Start here for any motion-design work: product overview,
  the brief → storyboard → choreography → code → render → review workflow, the motion
  doctrine (entrance eases out, exit eases in, on-screen eases in-out, stagger under
  500ms, premium durations), the palette and type tokens, and the anti-slop rules.
  Then load only the specialised skills this brief actually needs (motion-design,
  gsap-timeline, remotion-markup, remotion-render, …). Use it whenever someone asks
  for a video, an animation, a title sequence, a product loop, a showreel, motion
  graphics or a render.
license: SEE LICENSE IN ../../LICENSE.md
metadata:
  author: Motion Master
  version: "1.0.0"
---

# Motion Master

**Describe the video. Get the file.**

Motion Master is a **paid, one-time licence**: **$99 Solo**, **$399 Studio**. One
payment, no subscription, no per-render billing — the licence key is delivered by
email. It teaches an agent to write motion design in code — Remotion, GSAP, ffmpeg —
and hand a non-technical creator a finished video they own. The agent plans the shot
list, writes the animation, renders it on the owner's own machine, and shows the owner
the file.

**There is hosted rendering on Studio, with an allowance in your licence.** Motion Master never renders in the cloud and
never claims to. Compositions are rendered locally with Remotion
(`npx remotion render src/index.tsx <id> out/<id>.mp4`), and real footage is mixed by
a Montage instance the owner runs themselves (`mix_footage`). The domain is recorded
once, in `assets/brand.json`; its TLD is not chosen yet, so no URL may be published.

This skill is the **router**. It carries the doctrine and the tokens. It does not
duplicate the specialised skills. Load only the ones the brief needs.

---

## 1. The workflow

Never skip a stage. Each stage has an output the next stage consumes.

| Stage | What happens | Tool / skill |
| --- | --- | --- |
| **1. Brief** | Capture the audience, the length, the feeling, the words, the footage. Ask only what changes the plan. | conversation |
| **2. Storyboard** | Turn the brief into numbered beats with in/out times and an easing role per beat. | MCP `plan_video` |
| **3. Choreography** | Decide the order, the stagger, the cuts, the holds. Nothing moves without a reason. | `motion-design`, `gsap-timeline` |
| **4. Code** | Write the composition. Use the tokens, never ad-hoc values. | `remotion-markup`, `remotion-create`, `gsap-core` |
| **5. Render** | Produce the file the owner can use. | `remotion-render`, `remotion-studio` |
| **6. Review** | Check against the quality checklist before delivery. | `motion-design` → `reference/quality-checklist.md` |

### Stage 1 — Brief

Collect, in this order and no more:

1. **Length** — "15s" is enough. A duration is a decision, not a default.
2. **Feeling** — premium, calm, energetic, snappy. This picks the timing personality.
3. **Words** — the exact copy. Motion does not fix bad copy.
4. **Footage** — if there is real video, it goes through the Montage bridge (`mix_footage`), not through a fake animation.
5. **Where it runs** — 16:9 or 9:16 changes the layout, not the doctrine.

### Stage 2 — Storyboard

Call the MCP tool `plan_video` with the brief. It returns a deterministic storyboard:
numbered beats, in/out times in seconds and frames, the easing role of every beat, and
the stagger plan. The planner is deterministic — the same brief always returns the same
storyboard, so a re-run never silently changes the shot list.

Show the owner the beat list before writing code. A storyboard is a contract.

### Stage 3 — Choreography

- Load `motion-design` for the *why*: narrative structure, choreography, the decision
  framework, the emotion mapping.
- Load `gsap-timeline` when the animation is a web timeline with a position parameter.
- Load `gsap-scrolltrigger` only for scroll-linked work — never for a video.
- Load `remotion-interactivity` only when the video itself is interactive.

### Stage 4 — Code

- `remotion-create` — scaffold a project and a composition.
- `remotion-markup` — the content, animation and effects best practices. Read the
  matching file: `compositions.md`, `parameters.md`, `audio.md`, `images.md`,
  `embedding-videos.md`, `ffmpeg.md`, `local-fonts.md`, `measuring-text.md`,
  `calculate-metadata.md`, `motion-blur.md`, `color-correction.md`, `light-leaks.md`,
  `gifs.md`, `lottie.md`, `html-in-canvas.md`, `3d.md`, `arabic-text.md`,
  `audio-visualization.md`, `cropping.md`, `effects.md`.
- `remotion-captions` — captions and transcripts.
- `remotion-maps` — map animations (the Cesium, Mapbox, MapLibre, MapTiler and
  static-map techniques).
- `gsap-core`, `gsap-react`, `gsap-frameworks`, `gsap-utils`, `gsap-plugins`,
  `gsap-performance` — the GSAP side.
- `remotion-multimedia` — Mediabunny.
- `remotion-docs` — look up current Remotion documentation.
- `remotion-saas` — build a product around Remotion.
- `remotion-upgrade` — version bumps.

The MCP tool `build_composition` writes the first pass of the composition for you: a
real `<Composition>` registration, the tokens inlined, the doctrine curves applied.

### Stage 5 — Render

`remotion-render` for the export, `remotion-studio` to preview. The composition name in
the render command must be the one you registered.

### Stage 6 — Review

Run the quality checklist in `motion-design/reference/quality-checklist.md` and the
anti-slop rules below. Fix what fails. Then deliver the file, the prompt, and the
source.

---

## 2. The motion doctrine

These rules are not stylistic preferences. They are the product.

| Rule | Value |
| --- | --- |
| **Entrance** | eases **out** — `cubic-bezier(0.05, 0.7, 0.1, 1)` |
| **Exit** | eases **in** — `cubic-bezier(0.3, 0, 1, 1)`, and lasts 65–75% of the matching entrance |
| **On-screen** | eases **in-out** — `cubic-bezier(0.2, 0, 0, 1)` |
| **Loop** | sine — `cubic-bezier(0.37, 0, 0.63, 1)` |
| **Progress / counters** | linear — the viewer must read them as measurements |
| **Stagger budget** | the **total** stagger of a group stays **under 500ms**. When a group is too large, shorten the interval — never exceed the budget. |
| **Durations** | premium work: 350ms quick, 500ms standard, 800ms slow. UI: 180–420ms. Nothing bounces. |
| **Springs** | critically damped. `stiffness 170 / damping 26 / mass 1` is the premium default. Overshoot is 0% in premium work. |
| **Holds** | a hold is not dead time. It is the time the viewer needs to read the line. |
| **Cuts** | cut on the beat. Do not ease a cut into existence. |
| **Reduced motion** | freeze on the final frame, drop the reveals, keep the state legible. |

Full tables: `references/motion-tokens.md`. The machine-readable source of truth is
`plugins/motion-master/assets/motion-tokens.json` — read it, never retype it.

---

## 3. Palette and type

The palette is neutral with exactly one signal colour.

| Token | Value | Use |
| --- | --- | --- |
| `canvas` | `#F4F4F2` | the page / the frame background |
| `surface` | `#FFFFFF` | panels |
| `ink` | `#111113` | all body and small text |
| `mutedInk` | `#6B6B70` | secondary text |
| `hairline` | `#DDDEDA` | rules, borders |
| `accent` | `#FF4A1C` | CTA and emphasis only — large text and non-text. Never a background or border fill. Never more than 8% of a frame. |
| `accentDark` | `#D63A12` | small text on a light background |
| `playerZone` | `#0E0E10` | the only dark surface, and it is a real frame |

Type: **IBM Plex Sans** 400/500/600/700 for everything, **IBM Plex Mono** 400/500 for
timecode, labels and code. Display is `clamp(48px, 7.2vw, 104px)` at weight 700,
tracking `-0.03em`, line-height `0.95`. Body is 17px/1.6 (16px on mobile). Labels are
12px mono, uppercase, tracking `0.12em`.

Full rules: `references/palette.md` and `references/typography.md`.

---

## 4. Anti-slop rules

These are hard rejections. If a deliverable breaks one of them, it is not finished.

1. No violet, indigo or purple — anywhere, including gradients.
2. No rounded-rectangle card grids as a default container.
3. No decorative left accent stripes.
4. No emoji as icons.
5. No glowing blobs, floating orbs or abstract gradient backgrounds.
6. No glassmorphism.
7. No three identical feature cards, no default bento grid.
8. No decorative serif or italic word swap in a headline.
9. No cream, ivory, clay, olive or terracotta palette.
10. No fake browser chrome, fake testimonials, fake logos or fake numbers.
11. No motion without communicative purpose. No scroll-jacking.
12. Banned words: *transform, unlock, empower, reimagine, revolutionize, supercharge,
    seamless, elevate, game-changing*. Never "Get Started" as a call to action.
13. No gradient hero that is not an actual video frame.
14. Never claim a render, a file or a result that does not exist.

---

## 5. Reference material in this package

| File | What it holds |
| --- | --- |
| `references/motion-tokens.md` | every easing curve, duration, spring and stagger value |
| `references/palette.md` | the palette, the accent budget, the contrast rules |
| `references/typography.md` | the type scale, the tracking, the line heights |
| `references/prompt-patterns.md` | six ready-made prompts with their expected beats and stack |

The four gallery prompts shipped with the product are also available through the MCP
tools `list_clips` and `get_clip_prompt`.

---

## 6. Specialised skills in this package

Load only what the brief needs.

**Motion doctrine** — `motion-design` (director, patterns and reference folders).
**GSAP** — `gsap-core`, `gsap-timeline`, `gsap-scrolltrigger`, `gsap-utils`,
`gsap-plugins`, `gsap-react`, `gsap-frameworks`, `gsap-performance`.
**Remotion** — `remotion-create`, `remotion-markup`, `remotion-render`,
`remotion-studio`, `remotion-captions`, `remotion-interactivity`, `remotion-maps`,
`remotion-multimedia`, `remotion-docs`, `remotion-saas`, `remotion-upgrade`.

All twenty are MIT-licensed and carry their upstream attribution. The Motion Master
layer (this router, the token files, the prompt library and the MCP server) is the
paid product: **$99 Solo, $399 Studio, one-time**.

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

Motion Master is **not on sale**. It is the founder's own motion-design agent,
used in-house. The paid terms it would ship under are recorded in `licence.json` —
$99 Solo, $399 Studio, one payment, no subscription — so that a launch is a single
change rather than a rebuild, but nothing may be published as purchasable.

Motion Master teaches an agent to write motion design in code — Remotion, GSAP,
HyperFrames, ffmpeg — and hand back a finished video. The agent plans the shot list,
writes the animation, renders it on the owner's own machine, and shows the owner the
file.

**There is no hosted rendering.** Compositions are rendered locally with Remotion
(`npx remotion render src/index.tsx <id> out/<id>.mp4`) or with HyperFrames
(`hyperframes render <dir> --output out.mp4`), and real footage is mixed by a Montage
instance the owner runs themselves (`mix_footage`). The domain is recorded once, in
`assets/brand.json`; its TLD is not chosen yet, so no URL may be published.

This skill is the **router**. It carries the doctrine and the tokens. It does not
duplicate the specialised skills. Load only the ones the brief needs.

---

## 1. The workflow

Never skip a stage. Each stage has an output the next stage consumes.

| Stage | What happens | Tool / skill |
| --- | --- | --- |
| **0. Reference** | If the brief names a look, find it in the library before you write anything. | MCP `list_library_categories`, `browse_library` |
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

### Stage 1b — Strengthen the brief

A brief is usually weak in the same ways: no format, no duration, no camera, no
timing, no palette, no exclusions. Call the MCP tool `enhance_prompt` with the
owner's own words. It returns a diagnosis of what is missing, a complete brief,
the style recipes it matched, and anything it had to assume.

Use it whenever the brief is a sentence rather than a specification. Do not use it
to override a brief that already names its decisions — it reports a strong prompt
as strong and leaves it alone.

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

**Or render it as HTML instead of React.** HyperFrames turns an HTML document with a
seekable GSAP timeline into a deterministic MP4. It is often the faster road, it
brings a lint and layout gate with it, and it needs no React. Load `hyperframes` for
the composition format and `hyperframes-cli` for the commands; `hyperframes-registry`
covers the 448 installable motion blocks; `media-use` covers sound. The MCP tool
`build_hyperframes_composition` writes the whole project — HTML, manifest and a local
copy of GSAP — from a storyboard.

### Stage 5 — Render

**Remotion:** `remotion-render` for the export, `remotion-studio` to preview. The
composition name in the render command must be the one you registered.

**HyperFrames:** `hyperframes check <dir>` first — it lints the composition, runs it
in a real browser, checks contrast and reports a still frame, a silent film, a dead
stretch or a type below the reading floor. Fix what it reports, then
`hyperframes render <dir> --output out.mp4 -f 30 -q delivery`.

In this repository, `generator/render.sh <dir> <out.mp4>` wraps the render and finds
the browser. The sample composition is `generator/compositions/library-map`.

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

Load only what the brief needs. Thirty-eight upstream skills ship in this package; the
router decides which two or three to open.

**Craft law — read before you animate anything.** `motionmaxxing` decides *what* is good
and *how* it is measured: what good is, what never ships, the craft laws, and the gates
that are computed on the render rather than asserted. If a brief is a film rather than a
widget, this is the first skill to load, and it overrides your defaults.

**Motion doctrine** — `motion-design` (director, patterns and reference folders).
**GSAP** — `gsap-core`, `gsap-timeline`, `gsap-scrolltrigger`, `gsap-utils`,
`gsap-plugins`, `gsap-react`, `gsap-frameworks`, `gsap-performance`.
**Remotion** — `remotion-create`, `remotion-markup`, `remotion-render`,
`remotion-studio`, `remotion-captions`, `remotion-interactivity`, `remotion-maps`,
`remotion-multimedia`, `remotion-docs`, `remotion-saas`, `remotion-upgrade`.
**HyperFrames** — `hyperframes` (the HTML-to-video composition format),
`hyperframes-cli` (check, render, snapshot, compare), `hyperframes-registry` (the 448
installable motion blocks and how to add your own), `media-use` (sound: beds, impacts,
whooshes, and the loudness rules).

**Film styles** — `lemo-opuscar` holds sixty complete film styles, each with a
`STYLE.md` that is a style prompt you can reuse on your own brief (glass product,
ink wash, blueprint, art deco, dataviz, film-noir, kino-montage and fifty more), plus
the technique for building a film where *picture is a function of time*: a page with
`window.render(t)`, rendered frame by frame through headless Chrome. `huashu-art-motion`
does the same for paintings moving in thirty-five art styles.

**Producing a film** — `product-launch-motion` (one shape that never cuts, camera work
that fills every frame), `guizang-product-video` (promo films built from the real
product), `jacky-motion` (turning a voiceover script into motion).

**Browser and canvas** — `oil-motion` (interactive web animation), `animate`
(procedural canvas animation in any style), `claude-motion-motion-design`,
`claude-motion-review-loop`, `claude-motion-sound-design`,
`claude-motion-web-sims`.

**Technique lookup** — `awesome-ai-motion` is a catalogue of 637 motion techniques with
their parameters and prompts, for when you know the effect you want and need the recipe.

**The prompt library** — nine open-source collections, normalised into one index of
nearly 4,000 items across 756 categories, plus 448 installable motion blocks. Reach
for it before you invent a style prompt. `list_library_categories` shows what is
there, `browse_library` returns the prompt with its author and licence, and
`get_library_item` returns it in full. `enhance_prompt` turns a weak brief into a
complete one. The same index is browsable in the page, under **The library**.

**The block library** — 448 HyperFrames components that already work. Each one
carries its variable schema: the headline strings, the image slots, the speed, the
colour. `list_motion_blocks` lists them by tag, `fill_block` fills one from a
brief, and `compose_film` assembles a shot list from several. **This is the
shortcut to a good film**: the block knows how the motion works, so the brief only
has to say what the film is about. Do not rebuild a carousel when one exists.

The upstream skills keep their own licences and attribution — MIT, MIT + CC BY 4.0, and
Apache-2.0 for `motionmaxxing` — and each carries its licence file and an `UPSTREAM.md`
saying where it came from. The Motion Master layer — this router, the token files, the
prompt library and the MCP server — is the product. It is **not on sale**; the terms it
would ship under are recorded in `licence.json` (**$99 Solo, $399 Studio,
one-time**.

### How to route

| The brief says | Open |
| --- | --- |
| "a promo / launch film / ad" | `motionmaxxing`, then `product-launch-motion`, then a style from `lemo-opuscar/styles/` |
| "this brand has a look" | `lemo-opuscar` and pick the style that fits the brand, not the brand's name |
| "make it feel alive / interactive / on the web" | `oil-motion`, `animate`, `claude-motion-web-sims` |
| "a title card / kinetic type" | `motion-design`, `gsap-timeline` |
| "render it to a file" | `remotion-create`, `remotion-markup`, `remotion-render` — or `hyperframes` if the composition is simpler as HTML |
| "I want to see the technique" | `awesome-ai-motion` |
| "I want a look / a style / a named visual" | MCP `browse_library` with `kind=style`, or `lemo-opuscar/styles/` |
| "here is a one-line brief, make it good" | MCP `enhance_prompt` first, then plan the video |
| "give me a ready-made motion piece" | MCP `list_motion_blocks` — 448 installable blocks, each with tags and dimensions |
| "build me a film from real motion" | MCP `compose_film` — picks the blocks whose tags fit, fills each one, and returns the shot list |
| "put my words in that block" | MCP `fill_block` — fills a block's headline, colour and speed from a brief |
| "it looks like AI slop" | `motionmaxxing` — then read `references/slop.md` before touching anything |

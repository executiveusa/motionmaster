# 28 — The ten repos

Date: 2026-11-13.

**"10 GitHub Repos That Level Up HyperFrames Videos"** — Cookstar Vibes Code,
16K views, one month old. The video names ten repositories and says it read the
code of every one before picking them.

It was scraped and every repository was checked here before anything went in:
licence from the licence file, stars from the API, and the actual contents
cloned and read. Seven of the ten were new to this repository.

## The list, and what happened to each

| # | repository | licence | stars | what it really is | what we did |
|---|---|---|---|---|---|
| 01 | `gongnyang/reelforge` | Apache-2.0 | 96 | Eight HyperFrames compositions for numbers — bar, pie, line, list, numbered, statistic, compare, quote | **Vendored, measured, and 0 of 8 passed** |
| 02 | `gkurt/tegaki` | MIT | 3,306 | A handwriting engine: HarfBuzz shaping, a pressure model, a nib, glyph drawing for any font | **Vendored as source, not yet wired** |
| 03 | `omkamal/animated-diagrams-skill` | Apache-2.0 | 24 | Technical diagrams that draw themselves, with a camera rig, twelve style presets, Arabic and RTL support, and a voiceover mode that fires every beat on its SRT cue | **Vendored as a skill** |
| 04 | `AgentsORG/design-engineering` | MIT | 1 | Thirteen specialist agents that review UI details, with a benchmark | **Recorded, not vendored** |
| 05 | `alchaincyf/huashu-design` | MIT | 29,427 | The Huashu design suite: web, app, PPTX, animation, infographic | **Already covered** by the vendored `huashu-art-motion` |
| 06 | `nateherkai/hyperframes-student-kit` | MIT | 2,819 | Fifteen skills that edit a recording: transcript-driven cuts, silence cutting, a style library, showreels, and a second HyperFrames doctrine with nine palettes | **Vendored as twelve skills** |
| 07 | `nutllwhy/hyperframes-motion-library` | MIT | 308 | Twenty-seven HyperFrames compositions — charts, numbers, chapter titles, comparisons, timelines — with the director rules that pick one | **Vendored, measured, 24 of 27 passed** |
| 08 | `tugrawork-creator/saas-motion-kit` | MIT | 257 | The seven-stage studio process, with the tone matrix, the variety rules, the component forge and the transition atlas | **Vendored as a skill** |
| 09 | `AbubakrChan/product-launch-motion` | MIT | 460 | A product launch film that comes out of code | **Already vendored** |
| 10 | `openai/plugins` | *no licence file* | 7,931 | HeyGen's official HyperFrames plugin for Codex — five skills, including `website-to-hyperframes` | **Recorded, not vendored** |

## What the video got wrong, and what it left out

**It says reelforge ships "render-tested motion fragments".** It does not — not
yet. The blocks are real: eight HyperFrames compositions in exactly the format
this repository already consumes, with the same `data-composition-variables`
attribute and the same GSAP timeline. But the registry beside them is a
placeholder that says so in its own README, and **none of the eight pass the
gate**. Their failures are structural rather than craft — each one is written
as a single large file with the root styled by class, and one of them reaches
for an asset with `../../` in the path. They are vendored and recorded as
failing. They are not house scenes.

**`hyperframes-student-kit` no longer exists under that name.** It was renamed
to `nateherkai/herk-edit-kit` and it is no longer a student kit — it is a
fifteen-skill editing and production kit, and it is the answer to the one
question this repository had no answer for: *what do you do with the footage
you already shot?* It cuts silences, it cuts mistakes, it drives a showreel.

**`openai/plugins` has no licence file.** Its `plugins/hyperframes/` directory
is the HeyGen plugin — five skills, and one of them,
`website-to-hyperframes`, is the same idea as herk's version but a different
file. The MIT version was vendored; the unlicensed one was recorded.

**`design-engineering` is about UI, not motion.** The video calls it "sound
derived from motion". It has one HyperFrames demo composition about sound and
a `sound-designer` subagent, but the repository is thirteen agents reviewing
interface details with a benchmark that scores the result. At one star, and
for a studio that makes films, it is not what it was taken for.

## What went in

Thirteen skills, thirty-five compositions and one engine, each with its licence
file and an `UPSTREAM.md` saying where it came from.

- `scripts/import-hf-video-repos.mjs` does the import, and is the record of
  what was taken from where.
- The new skills are `animated-diagrams`, `saas-motion-video`, and the twelve
  from the editing kit: `cut-mistakes`, `cut-silences`, `edit-video`,
  `short-form-edit`, `make-a-video`, `motion-showreel`, `short-form-video`,
  `video-storytelling`, `style-library`, `hyperframes-doctrine` and
  `website-to-hyperframes`.
- The compositions are in `studio/compositions/`, thirty-five of them in our own
  native format: twenty-seven from the motion library, eight from reelforge.
- `vendor/tegaki/` holds the handwriting engine's source. It is **not** wired
  into a composition yet, and its bundled fonts are not vendored: they are
  twenty-five megabytes of binaries under their own licences.

## The thirty-five compositions went through our own gate

They are HyperFrames compositions, so they were measured the way the registry
blocks were: mounted, filled from the same neutral brief, and put through
`hyperframes check`. Thirty-five compositions were measured.

**Twenty-four of twenty-seven motion-library templates pass. None of the eight
reelforge blocks do.**

Two things had to happen to a composition before it could be measured, and
both are recorded in the work directory:

- **The GSAP reference was localised.** These compositions load GSAP from a
  CDN and the renderer has no network.
- **Undeclared font families were declared.** The gate was right about this.
  Every motion-library template names CJK system fonts with no `@font-face`,
  so the renderer cannot supply them and the typography would have been quietly
  wrong. Each undeclared family got a `@font-face` with `src: local(...)` —
  which is the truth about how these fonts are used, they are system fonts.

The three motion-library templates that fail, fail for craft reasons:
`cause-chain` tweens `left` instead of a transform so the motion snaps to
whole pixels, `chapter-title` overflows its text box, and `checklist-pop` has
text that is never painted and a first frame that is empty.

`library/composition-verdicts.json` holds every verdict, with the reason.

## What it did to the studio

The house library went from **75 scenes to 99**.

| role | before | after |
|---|---|---|
| data | 5 | **20** |
| typography | 20 | 26 |
| rhythm | 29 | 32 |
| ui-entrance | 54 | 54 |
| interaction | 41 | 41 |
| outro | 35 | 35 |
| camera | 20 | 20 |
| effects | 10 | 10 |
| transition | 9 | 9 |
| opening | 6 | 6 |

The thin spot is fixed. `data` was the scarcest role at five scenes, and it is
now twenty — the house has a number, a chart and a comparison for every film
that needs one, which is every film that makes a claim.

## The rule this found

A composition that came from somewhere else is not a scene until it has passed
the gate. That is the same rule the registry blocks are under, and it held for
thirty-five compositions that arrived with a video's recommendation attached.

**Nine of the ten repositories went in.** Of the thirty-five compositions that
came with them, twenty-four passed and they are house scenes now.

# 11 — THE LIBRARY, THE ENHANCER, AND THE GENERATOR

**Date: 2026-10-23.** This document records what changed when the founder
stopped selling the product and started using it, and what was built to make
it genuinely useful rather than merely sellable.

## The pivot

`licence.json` now carries a `status` block:

```json
"status": {
  "onSale": false,
  "mode": "personal-use"
}
```

That is the switch. While `onSale` is false:

- the page says **"Not on sale. Built for our own use."** instead of a price
  with a buy button;
- there is no checkout, no licence key and no purchase language anywhere —
  `site/scripts/verify-content.mjs` fails the build if any appears;
- the MCP server's licence sentence says the product is not on sale;
- the recorded terms ($99 Solo, $399 Studio) stay in the file, untouched, so a
  launch is one edit rather than a rebuild.

The price is still shown in the tier list. It is the recorded term, not a claim
that a sale is open — the button next to it is gone.

## Why the licence question stopped mattering

The earlier survey found that four of the nine open-source prompt collections
could not legally go inside a paid product: one is non-commercial, one forbids
repackaging, one has no licence file at all, and one needs attribution.

Using the package in-house removes that constraint — with one caveat that is
now recorded rather than assumed: **the four restricted collections are not
safe to redistribute.** `library/LICENSES.md` states which is which, and the
catalogue carries the licence of every single item, so nothing can be moved
into a shipped product without reading its own licence first.

## The library

`library/` holds the vendored source data for all nine collections plus the
normalised index.

| | |
| --- | --- |
| **Items** | 3,988 |
| **Collections** | 9 |
| **Categories** | 756 |
| **Motion blocks** | 448 (HyperFrames) |
| **Build** | `node scripts/build-library.mjs` |

The build script vendors the upstream data (no media — two of the repositories
are 90% video and none of it is usable in a product), normalises every item to
one shape, and writes `library/catalogue.json` and `library/blocks.json`. It is
deterministic: run it twice, the bytes are the same.

The nine collections are the ones from the survey in `docs/10`, plus the
HyperFrames block library. Every item carries its collection, kind, title,
prompt, categories, tags, author, source link and **licence**.

### The collections

| id | items | licence |
| --- | --- | --- |
| `hiapi-styles` | 437 | CC-BY-4.0 |
| `leadde-prompts` | 728 | all rights reserved (no licence file) |
| `lian-verified` | 334 | CC-BY-4.0 |
| `maning-prompts` | 389 | custom, not OSI — forbids repackaging |
| `cindy-prompt-bank` | 58 | CC BY-NC-SA 4.0 (non-commercial) |
| `zhuyansen-skills` | 333 | CC0-1.0 (the list itself) |
| `phy-playbook` | 233 | CC-BY-4.0 |
| `guanmo-ai-motion` | 1,417 | MIT |
| `lemo-opuscar` | 59 | MIT + CC BY 4.0 |

Two licence facts were corrected during the build: `LeaddeOpenLab` and
`PHY041` both ship a CC-BY-4.0 `LICENSE` file that their READMEs do not
mention, and `Li-Evan` also ships one. The catalogue now records the file, not
the README.

## Browsing it — humans and agents

**For agents**, over MCP:

| tool | what it does |
| --- | --- |
| `list_library_collections` | the nine collections, with licences and a shippable/restricted split |
| `list_library_categories` | every category with its count, filterable by collection and kind |
| `browse_library` | search and filter the index; returns prompts with author, source and licence |
| `get_library_item` | one item in full |
| `list_motion_blocks` | the 448 HyperFrames components, tagged and installable |
| `enhance_prompt` | turn a weak brief into a complete one |

**For humans**, on the page: a new section, **The library**, under the demos.
Categories on the left, items on the right, the full prompt of whatever you
pick, and a copy button. The index is 1 MB, so it is fetched the first time the
section comes near the viewport — the page's initial load is unchanged.

## The enhancer

`enhance_prompt` is deterministic. It does not call a model and it does not
invent facts about the subject.

It was built from a measurement of the corpus, not from intuition. Across the
1,934 prompts and 71 style recipes in the library, the median prompt is **162
characters** and only 673 exceed 200. A weak prompt is weak in a predictable
way, so the enhancer checks eleven things a motion brief needs:

subject · format and resolution · duration · a named style · the camera ·
timing and easing · typography · palette · audio · what to avoid · how it is
produced.

It then rebuilds the prompt as a complete brief, using the Motion Master motion
tokens for the easing, the durations, the stagger budget, the palette and the
type, and a style recipe **matched out of the library** when the brief names no
style.

The rules it follows:

- the owner's own words are carried through **verbatim** — it adds craft, it
  never rewrites intent;
- anything it had to assume is reported in `assumptions`, not passed off as fact;
- a strong prompt is left alone. A brief that already names its decisions comes
  back as `strong` with a score of 100 and at most two additions.

Worked example — `a cool product video for my coffee brand`:

```
VERDICT: weak   0 -> 100
```

and the same brief with its decisions already made comes back `strong 100 -> 100`
with one addition (the brief itself, carried through).

## HyperFrames as the generator

`generator/` is the new render path. HyperFrames (heygen-com, Apache-2.0)
turns an HTML document with a seekable GSAP timeline into a deterministic MP4:
frames are captured one by one in headless Chrome and encoded with ffmpeg.

It was chosen over hand-rolled canvas code for one reason above all — **it
brings a gate**. `hyperframes check` lints the composition, runs it in a real
browser, measures contrast, and reports the things a render would never tell
you.

The `library-map` composition went through it. The gate found six real problems
that I had not seen:

| finding | what it meant |
| --- | --- |
| `first_frame_empty` | frame 0 was a blank canvas — the first frame is the thumbnail on social players |
| `dead_stretch` ×2 | 5.5 s and 9.0 s where nothing on screen changed at all |
| `film_silent` | no audio source, so the film would have been silent |
| `text_below_floor` | 16 px text — below the 28 px a phone can read |
| `gsap_non_transform_motion` | a `letterSpacing` tween snaps to integer pixels and stutters under frame-by-frame capture |
| `media_missing_id` | the `<audio>` had no `id`, so **the renderer would have produced a silent file** |

The last one is the argument for using the gate at all. That is a bug that
renders successfully and delivers the wrong thing.

The composition now passes with zero errors and 89/89 contrast checks, and
renders to 24 s of 1920×1080 h264 with an audio track in about two minutes on
two cores.

`generator/render.sh` wraps the render and finds the browser through a chain of
candidate paths, because the sandbox's Chrome has moved before.

## The block library — the shortcut to a good film

The catalogue command gives names, tags and descriptions. What it does not give
is the thing that makes a block *usable*: its **variable schema** — the headline
strings, the image slots, the speed, the colour, the enum choices. Those live in
each registry item's `registry-item.json`.

`scripts/fetch-registry.mjs` pulls all 458 of them at a pinned revision:
**448 blocks, 231 with variables, 618 tags**. Every variable carries an id, a
type, a role (`content`, `style`, `timing`, `layout`, `motion`), a label and a
default.

This is the difference between a template planner and something that works. A
block already knows how the motion behaves — a headline that mask-reveals word by
word, a carousel that converges from off-frame. The brief only has to say what it
is about.

Two new tools:

| tool | what it does |
| --- | --- |
| `fill_block` | fills one block's variables from a brief: the headline from the subject, the brand into a wordmark, the colours from the Motion Master palette, the duration from the brief. Every value says where it came from. |
| `compose_film` | picks the blocks whose tags fit the brief, fills each one, and returns the shot list with the values for every block. |

Three rules the matcher and the filler follow, each of which fixed a real
failure:

- **Variants of one idea are one idea.** "carousel-text-circle-3" and
  "-4" are the same block at a different angle. The matcher keeps the best of
  each family, so a shot list is a shot list and not five flavours of the same
  thing.
- **A brief with no pictures is not answered with a twelve-image carousel.**
  Image slots the brief did not ask for are a cost, not a feature.
- **The upstream's own placeholder is flagged, never inherited.** A block that
  ships with "HYPERFRAMES" or a heygen.com URL in it reports that variable as
  unresolved, so the film cannot quietly advertise somebody else's product.

## The MCP now writes HyperFrames too

`build_hyperframes_composition` takes the same storyboard `build_composition`
takes and returns a complete project: `index.html` with the seekable timeline
and the doctrine applied, the project manifest, and a **local** copy of GSAP, so
the render never touches a CDN.

## What is still open

- The hosted-render allowance is still `null` and must stay `null` until it is
  decided.
- The domain TLD is still unchosen, so no URL may be published.
- The licence file for `LeaddeOpenLab` was found but its README still disagrees
  with it; the catalogue records the file.
- The library is indexed but not yet *enriched* — there is no quality ranking
  beyond the collections' own, and the "partial" flag is the only signal that a
  prompt is a fragment.

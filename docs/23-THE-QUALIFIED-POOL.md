# 23 — THE QUALIFIED POOL

**The 448-block HyperFrames registry, measured against the gate.**

The registry is not a menu of finished things. It is a catalogue of
candidates, and some of them are broken — text clipped by its own box,
a label under the contrast floor, an occluded line, a frame that never
moves. The gate finds all of that. Until now only two blocks had been
measured, both by accident, both because they had already broken
something.

So the whole pool was measured: each block installed on its own, mounted
in a host page with its variables filled from a neutral brief, and
checked. The verdicts are in `library/block-verdicts.json`, written after
every block, so the run can be interrupted and resumed.

---

## What the pool actually contains

| | |
|---|---|
| Registry entries | 448 |
| Mountable compositions | 210 |
| Snippets — pasted into a composition, never mounted | 238 |
| Measured | 448 |
| Pass the gate | 75 |
| Fail the gate | 135 |
| Not yet measured | 0 |

**A snippet is not a defect.** 238 of the 448 entries are fragments —
markup and CSS to paste into a composition. The matcher already refuses
them, because a fragment mounted as a composition produces a shot with
no identity. They are recorded with the reason that is true, and they
are never gated.

## Why the gate said no

A block can fail for more than one reason, so these overlap.

| Reason | Blocks |
|---|---|
| `check_runtime_failure` | 76 |
| `contrast_aa_failure` | 44 |
| `text_below_floor` | 40 |
| `text_occluded` | 23 |
| `line_unread` | 20 |
| `first_frame_empty` | 19 |
| `console_warning` | 14 |
| `content_overlap` | 13 |
| `overlapping_gsap_tweens` | 10 |
| `container_overflow` | 8 |
| `film_silent` | 8 |
| `negative_z_index` | 6 |
| `escaped_container` | 3 |
| `http_error` | 2 |
| `missing_or_empty_sub_composition` | 2 |
| `console_error` | 2 |
| `gsap_timeline_set_initial_hide` | 2 |
| `panel_out_of_canvas` | 2 |
| `timed_element_missing_clip_class` | 1 |
| `sweep_static` | 1 |
| `request_failed` | 1 |
| `rotation_pivot_drift` | 1 |
| `gate_failed` | 1 |
| `clipped_text` | 1 |
| `text_box_overflow` | 1 |
| `canvas_content_at_edge` | 1 |
| `page_error` | 1 |
| `dead_stretch` | 1 |
| `gsap_callback_dom_measurement` | 1 |
| `text_not_painted` | 1 |

The full list of rejected blocks, with the gate's own words, is in
`library/block-verdicts.json`. Every one of them is now kept out of a
plan: the matcher refuses a block the gate has rejected, and prefers a
block the gate has passed over one nobody has measured.

## The roles, and why a block now has one

The shot vocabulary has ten roles and the block pool had never met
them: the matcher scored blocks against the wording of a brief, so a
brief asking for a camera move could be answered with a chart.

`scripts/map-block-roles.mjs` reads the registry tags and maps every
gate-passing block to the roles it can serve. The table it uses is
written down in that file rather than hidden in the matcher, so it can
be argued with.

| Role | Blocks that can serve it |
|---|---|
| `ui-entrance` | 54 |
| `interaction` | 41 |
| `outro` | 35 |
| `rhythm` | 29 |
| `camera` | 20 |
| `typography` | 20 |
| `effects` | 10 |
| `transition` | 9 |
| `opening` | 6 |
| `data` | 5 |

The plan writes the roles into the brief, the matcher reads them back,
and each shot is filled with a block that serves its role and has
passed the gate.

## How the matcher uses this

`matchBlocks` now takes the verdicts:

1. A block with a failing verdict is **not offered at all**, whatever the
   brief says.
2. A block with a passing verdict comes **before** one nobody has
   measured. A brief is answered from the measured pool whenever the
   measured pool has something that matched.
3. An unmeasured pool still answers. Nothing breaks while the pool is
   being measured.

The exclusion already existed on the film path (`plan_video`, the
worker, the HTTP API); it now also applies to `fill_block` and the
`/blocks/fill` route, which could still hand back a block the gate had
already rejected.

## Reproducing it

```sh
cd motion-master
node scripts/qualify-blocks.mjs --resume
node scripts/report-qualified-pool.mjs
```

Each block costs one browser launch — about fourteen seconds — so the
whole pool takes about an hour on two cores. The run is resumable and
the verdicts are written after every block.

## The honest caveat

A block was filled with one neutral brief and mounted on a host page of
our own making. A block that passes there can still clip a much longer
headline than the one it was measured with, and a block that needs a GPU
(`aurora` declares `data-requires-webgpu`) fails on a machine with no
adapter — that is a fact about this machine, not a defect in the block,
and the verdict says so.

So the verdicts are a real measurement of a real pool, not a guarantee.
They are a floor: a block that fails here is never used, and a block that
passes is preferred.

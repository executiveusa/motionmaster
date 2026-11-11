# 24 — THE BLIND GAUNTLET

**Status: run, twice. The first round we lost. The fixes are in. The second round is
recorded below.**
**Date of run: 2026-11-11.**

The bar is the public surface of **motionvideo.xyz**. The founder's words: *beat
motionvideo.xyz*. A round count is not a win. **A blind win is.** The exit condition
was fixed before the run: *a critic with fresh context, who cannot tell which page is
ours, picks ours.*

Until now `motionvideo.xyz` did not resolve from this sandbox, so the visual half was
never run. It resolves now. The gauntlet can finally be run properly, and it was.

---

## 1. How the blind test is built

`scripts/blind-capture.mjs` captures both pages at the same viewports, **hides the
brand on both**, and assigns the file names **at random**.

- The brand is hidden rather than cropped, because the header is part of the design
  and cropping it would change the thing being compared.
- The mapping is written to `blind-key.json` after the capture, never before, and the
  critic is given only `A-*.jpg` and `B-*.jpg`.
- The critic is a **fresh agent session** with no history of this project. It has
  never seen the site, the founder, the plan, or the first round.

Viewports: 1440×900 and 390×844 — desktop and phone.

---

## 2. The measurable half, for the record

Same tool, same rules, same input shape for both sides (`the-extractor`, MIT).

| | Motion Master | motionvideo.xyz |
|---|---|---|
| Signals | 1 | 5 |
| High severity | **0** | 0 |
| Medium severity | **1** | 4 |
| Low severity | 0 | 1 |

`scripts/gauntlet.sh` re-runs this. The bar is fetched live, not reconstructed — the
reconstruction in `scripts/build-bar-reconstruction.mjs` is a fallback and was not
needed.

**0 high signals on both sides.** The measurable half is a tie at the top and a win on
the middle. It was never going to be decisive. The taste half was always going to be
the one that mattered.

---

## 3. Round one — we lost

A fresh critic, blind, medium confidence:

> **WINNER: A** — the bar.
>
> 1. *It actually shows the product's output at full size* — a woodblock dusk village,
>    a translucent jellyfish loop, a hand-annotated blueprint reel, a red starburst
>    logotype — while B's hero is a storyboard diagram, an editor timeline screenshot
>    and two title slates chopped mid-word (`on a white canva`, `Four shots. One fi…`),
>    so the motion itself is never legible.
> 2. *B's mobile is a shrunk desktop with collisions:* the timeline card overlaps and
>    clips `Create Motion`, the collage bleeds off both edges, and the nav collapses to
>    just `EN` and `MENU`; A's mobile is a real single-column composition with no
>    overlaps and no clipped text.
> 3. *A's chrome is disciplined and consistent* — one yellow accent, one badge/icon
>    system, aligned card grid, uniform radius — whereas B's art direction shows
>    cracks (the spec sheet sliced by the viewport edge, every hero image truncated
>    mid-word).

The critic also said, and this was fair:

> **The single worst thing about the winner**: the showcase grid is polluted — three
> orphan dashed `+` buttons under the CTAs, a grey `Sponsored / Shadcn Labs` product
> card, and multiple dud frames (a black frame with one hairline titled *Bold kinetic
> type showcase*, a flat grey card with a lone black circle, a near-empty white launch
> film) that read as failed renders, not work.

**Three of its findings were about our page, and all three were true.** The rest were
about motionvideo.xyz's gallery — real, varied, community work — which is a different
kind of page from ours. We are a landing page; they are an explore feed. The critic
noticed this itself and said the comparison was not quite like-for-like.

But the three defects in our page were ours, and they were real:

1. **Text cut mid-word in the hero.** `on a white canva`, `Four shots. One fi…`.
2. **The mobile hero was a shrunk desktop**, and a card physically cut the headline.
3. **Two stylesheets both owned the hero.** See §5.

---

## 4. What was fixed

### 4.1 The hero collage no longer crops a frame

Every render we ship is 16:9. Every hero card is now 16:9, so `object-fit: cover`
crops **nothing**. A title card cut mid-word reads as a broken render, not as a crop.

The cards were then re-placed so that **no card covers the words of the card beneath
it**: the overlap now falls on margins and empty ground. The kinetic card moved down
and out of the caption line; the whiteboard card moved up so its shot list is whole.

### 4.2 The phone hero is its own composition

It is no longer a shrunken pile. On a phone there is now:

- one clip **full-bleed** across the top,
- one card overlapping it,
- the headline, the sentence and the buttons below, with a clean band between.

Nothing overlaps the words, and no frame is cropped. And because there is no pointer
on a phone, the first clip now **plays** there — muted, looping, one video — instead
of sitting there as a still. The hero moves on the half of the audience that cannot
hover.

### 4.3 The two-owner bug

`site/src/styles/hero-brand.css` and `site/src/styles/product-v2.css` both declared
`.hero__card--c1` … `.hero__card--c6`, `.hero--brand`, `.hero__body`, `.display`.
`product-v2.css` was imported later, so it won — and `hero-brand.css` had been dead
weight for an unknown number of rounds, while everybody believed the page was using
the designed collage.

**One stylesheet now owns the hero.** `hero-brand.css` was deleted and its rules
folded into `product-v2.css`.

Removing it also removed the only `position: relative` on `.hero--brand`, so the cards
started positioning against the **viewport** instead of the hero. That was caught in
the same round by measuring the DOM rather than by looking at the picture, and it is
fixed: the cards are positioned against the hero, and the percentages mean what they
say.

---

## 5. The rule this teaches

**A screenshot proves that a page looks right. It does not prove that the CSS you
think is styling it is the CSS that is.** Two stylesheets owned the same classes, the
later one won, and the page looked plausible in every screenshot — it was simply the
other design.

The check that found it was `getComputedStyle` on the live DOM. That is the check to
run when a page looks right and something is still wrong.

---

## 6. Round two

Recorded in `docs/26-THE-ROUND-TWO-VERDICT.md` when the second critic reported.

The rule for round two is the same as round one: a **fresh** critic, blind, and the
same five questions. Round one's critic does not get a second vote — a critic that has
seen the page cannot be blind to it.

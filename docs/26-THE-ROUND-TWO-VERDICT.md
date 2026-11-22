# 26 — THE ROUND-TWO VERDICT

**Status: WE WON.**
**Date: 2026-11-11.**

Round one of the blind gauntlet went to the bar. The findings were fixed. A **second
fresh critic**, blind, was run against the fixed page, and this one picked ours.

Same method as round one: `scripts/blind-capture.mjs`, brand hidden on both pages,
file names assigned at random, a fresh agent session with no history of this project.
The mapping in this round was `A = ours`, `B = motionvideo.xyz`.

---

## The verdict

> **WINNER: A** — ours.
> **CONFIDENCE: medium**
>
> 1. **Hierarchy**: one enormous left-aligned headline and one black primary CTA —
>    you know what it is and what to do in about a second; B buries its headline at
>    28px inside grid column one and offers "Surprise me" as the main action, so it
>    reads as a browse page, not a pitch.
> 2. **Craft and taste**: A's mockups carry a serif editorial voice ("A 21 second
>    product loop. Four shots. One file."), hand-drawn annotations, a scribbled
>    filename and a single red accent against lavender — the mark of someone with
>    opinions. B is uniform component-library chrome (badge + two icons + avatar +
>    arrow on every tile), which is the "made to look like a motion-design product"
>    tell.
> 3. **Mobile is a recomposition, not a shrink**: crop the collage, stack the CTAs
>    full-width, keep the next section's promise. B's mobile has a genuine rendering
>    bug — the "Featured" chip overlaps and clips "Phone" — and its own filter row is
>    cut off.
>
> **The single best thing about the loser**: B's catalogue is real proof: dozens of
> varied, genuinely handsome motion pieces — translucent jellyfish, a coral field,
> kinetic type, an octopus at a DJ booth — playing as actual tiles. That demonstrates
> capability in a way A's mock panels never do.

The critic was also fair about us:

> **The single worst thing about the winner**: A's hero collage overlaps its own
> content — the "Make the film" panel covers the cream card's fourth shot and
> crowds the wordmark, and the same "Four shots. One file." artwork is shown twice at
> two scales in the same viewport — the one composition that should be the showpiece
> looks like two of the same thing stacked by accident.

---

## What the critic got wrong, and what it got right

**It got right — and all of it was fixed:**

| the critic said | the fix |
|---|---|
| the launch-title card covers the ink card's fourth thumbnail | the card moved right and up; the fourth thumbnail is whole |
| the black frame's corner crowds the "film" wordmark | the whiteboard card moved right; the wordmark has room |
| the same "Four shots. One file." artwork appears twice at two scales | **the whiteboard demo's own copy changed** — it now says **"Shot by shot."** and the ink film keeps "Four shots. One file." Two different sentences, two different films. |
| the subhead and CTA row are right-shifted while the headline is left-aligned, so nothing lines up | the caption block is now aligned to the headline's left edge. One left edge for the whole bottom band. |

**It got one thing wrong, and the wrongness is worth recording.** The critic read the
brand-hidden mobile header as *"the nav collapses to just EN and MENU"* — a
criticism of the bar's page in round one, and of ours in round two. It is an artefact
of the blind capture: the capture hides the brand on both pages, because a brand
gives the game away. Our mobile header has the brand, the language picker and the
menu button. The critic could not see the brand, and read the gap as a fault.

This is the first cost the blind method has, and it is a small one. It is noted here
so that the next round is not read as a regression.

---

## The bar, described by a critic who did not know what it was

For the record, since the critique of the bar is the whole point of running it:

- its headline sits inside a grid column at 28px, not above the fold;
- every card carries the same chrome — a badge, two icons, an avatar, an arrow;
- there is a **sponsored third-party tile** inside a motion gallery;
- three **unlabelled `+` buttons** in a row;
- three tiles that render as **empty grey gradients**;
- on mobile, the "Featured" chip **overlaps and clips** "Phone" mid-word, and the
  category row is cut off at the right edge.

That is a marketplace with community uploads. It shows a lot of real work. It is not
a designed page, and it is not a page about *us*.

---

## The honest reading

We won a blind comparison against the bar, at medium confidence, on a landing page.
The bar's page is a different kind of thing — an explore feed of community work, and
it has things we do not have: dozens of real community videos and a working
submission flow.

What this run actually proves is narrower and more useful:

1. **A landing page can beat an explore feed at being a landing page.** Hierarchy,
   one primary action, restraint, a phone composition that is its own composition.
2. **Our measurable half was never the problem and is not the fix.** 1 signal against
   5, 0 high on both. The taste half was always the one that mattered.
3. **The critic's complaints were mostly about crops and collisions, not about
   taste.** Every one of them was a real defect in our page, and every one was
   cheap to fix. That is the useful shape of a critique: specific, visible, and
   answerable.

The exit condition from `docs/07-GAUNTLET-PLAN.md` — *a critic, blind, picks ours* —
is now met.

---

## What round three would be for

Not to repeat this. The honest next round would test something we have not tested:
whether the page still wins when the critic is told to judge **only** the motion
work on screen, with the page chrome out of the frame. On that question the bar is
ahead, and it should be — it has a community to draw from and we do not.

The thing worth building instead is not another round. It is the thing that would
change the answer: **more of our own work on the page.** The hero carries six cards
and two of them are the same film. The page has four gallery examples. A page that
showed twenty real renders — ours and the library's — would not need the argument.

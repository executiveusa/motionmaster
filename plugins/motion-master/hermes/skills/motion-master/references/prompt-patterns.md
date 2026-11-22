# Prompt patterns

Six prompts you can paste straight into ChatGPT (with the plugin installed) or type
into any agent that has the Motion Master skills. Each one is a **complete brief**:
length, feeling, words and stack. The planner reads them as they are written.

The expected beats are what `plan_video` returns for the prompt, and the stack is
what the composition is built with. If your agent's storyboard differs from the
expected beats, something was lost in the brief — fix the brief, not the plan.

---

## 1. Launch film

> A 12s launch film for a small-business accounting app. Premium, calm. Beat 1: a
> hairline rule draws across a warm-neutral frame. Beat 2: the wordmark "Ledgerly"
> rises 24px and settles. Beat 3: the tagline "Books done by Friday" fades up under
> it. Beat 4: hold 2s on the lockup, then a calm fade out. One accent, nothing else.

**Expected beats** — establish (on-screen) → wordmark reveal (entrance) → hold
(on-screen) → exit (ease-in).
**Stack** — Remotion (`remotion-markup` + `remotion-create`), tokens inlined.
**Watch for** — the hold must be long enough to read the tagline; the exit is
shorter than the entrance.

---

## 2. Showreel

> A 30s showreel for a motion design studio. Open on a hairline frame mark, then
> four pieces of work one after another, each held for 5s, then an end card with the
> studio name and a single accent line. Premium pacing, no bounce, no transition
> effects — hard cuts on the beat.

**Expected beats** — open (on-screen) → work 1 → work 2 → work 3 → work 4 (entrance)
→ end card (entrance) → exit (ease-in).
**Stack** — Remotion, or GSAP in the browser (`gsap-timeline`) for a web showreel.
**Watch for** — cuts, not crossfades. A showreel that dissolves is a template.

---

## 3. Title sequence

> A 8s title sequence for a short film. Start on a still neutral frame, fade the
> title "NORTHBOUND" in over 500ms, hold 2s with the credit "a film by R. Mensah"
> in mono underneath, then cut to black over 300ms. No logo animation, no glow.

**Expected beats** — build (on-screen) → title card (entrance) → hold (on-screen) →
out (ease-in).
**Stack** — Remotion (`remotion-markup`), or `gsap-core` for a web title.
**Watch for** — the credit is mono, 12px, uppercase. The title is display, 700.

---

## 4. Product loop

> A 21s product loop, 3 beats: (1) 0:00 big number counts up to 12,480, (2) 0:08 bar
> chart staggers in with 8px gaps, (3) 0:16 title card and exit. 8px bar gaps, one
> accent, no decoration.

**Expected beats** — hero metric (entrance) → chart (entrance) → title card
(entrance) → loop point (ease-in).
**Stack** — Remotion + ffmpeg for the export (`remotion-render`, `remotion-markup/ffmpeg.md`).
**Watch for** — the counter is **linear**, not eased: the viewer reads it as a
measurement. The bar chart staggers in under the 500ms budget.

---

## 5. Changelog clip

> A 15s changelog clip for a release. Beat 1: a mono release badge "v2.4" appears.
> Beat 2: one line, "Offline mode". Beat 3: one line, "Faster exports". Beat 4: the
> close, "See what's new", with the accent underline. Beat 5: exit. Calm, typographic,
> one accent, nothing else.

**Expected beats** — release badge (on-screen) → change one (entrance) → change two
(entrance) → close (entrance) → exit (ease-in).
**Stack** — Remotion (`remotion-markup`, `remotion-captions` if you subtitle it).
**Watch for** — two changes means a stagger of one interval, not a cascade. Resist
stacking more lines than the viewer can read in 4s.

---

## 6. Social cutdown

> A 10s vertical cutdown (1080×1920) for social. Beat 1: a headline lands in the
> first second — "Your books, done by Friday". Beat 2: a product clip punches in
> with a ken-burns move. Beat 3: the logo and a "link in bio" line in mono. Beat 4:
> exit. Energetic, tight, one accent.

**Expected beats** — hook (entrance) → punch (entrance) → brand (entrance) → exit
(ease-in).
**Stack** — Remotion for the render; the footage itself goes through the Montage
bridge (`mix_footage`) if it is real video.
**Watch for** — the hook is the whole clip. If the viewer has not understood it in
one second, the clip is wrong.

---

## 7. Footage with a title burned in (the Montage bridge)

> Cut the first 3s of the source clip, add a title card in our brand type at 0:03,
> hold over the footage, fade out at 0:14.

**Expected beats** — cut (0:00–0:03) → hero title overlay (0:03) → section title
overlay → fade out at 0:14, ending at 0:16.
**Stack** — Remotion + the Montage bridge (`mix_footage`). The bridge builds the
timeline; **Montage renders** — Motion Master never renders the footage itself.
**Watch for** — the overlay uses the palette and type tokens from this package, and
the cut's `in_seconds`/`out_seconds` are points inside the source file, not on the
timeline.

---

## How to write your own

1. **Lead with the length and the feeling.** "12s, premium" gives the planner more
   than a paragraph of adjectives.
2. **Number the beats.** "Beat 1… Beat 4" is a storyboard, and the planner reads it
   as one.
3. **Say what holds and for how long.** "Hold 2s" is a timing instruction, not a
   mood.
4. **Say the stack** if you care: Remotion, GSAP, ffmpeg, Montage.
5. **Name the words.** Motion does not fix bad copy — give the exact line.
6. **One accent.** Say it once and stop.

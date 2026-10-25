# 16 — The taste review

**What the site was, what it is now, and what the jury said.**

Date: 2026-10-24. Reviewer: the Motion Master agent, against the
`ICM_AWWWARDS_TASTE_GAUNTLET_AUDIT_SKILL_v1.1-2` rules and the
`MASTER_WEBSITE_GOVERNOR_META_GUIDE_V1` constitution.

---

## 1. The brief, as the founder gave it

> Our site looks plain and dead. Run the design gauntlet and the extractor for
> slop. Less text and more animations and examples with better videos. Build
> HyperFrames into this as something the agents can use, and make us an API and
> plug-in for Codex and Claude. Use awwwards.com logic like you are an awards
> judge. Make this a site that is functional and beautiful, webflow style, with
> scrolling effects that look good on mobile, and tell the story immediately of
> why this site is helpful. Get rid of AI slop talk like "1 agent 1 team 1 video".

## 2. The bars

A bar has to be named, fetchable and comparable. These were fetched and looked
at, not described from memory.

| bar | what it is | what it is good at |
|---|---|---|
| **kyoosangchoi.com** | an art director's portfolio | editorial type at scale, asymmetry, the work as the hero, one screen answering who and what |
| **higgsfield.ai** | a motion product | media-first: the opening is playable work, not a sentence about work |
| **awwwards.com/websites/animation** | the animation gallery | the current bar for scroll choreography and stillness |

Plus the house rules of the [taste-skill](https://github.com/Leonxlnx/taste-skill)
(MIT) — its `references/tells.md` is a dated registry of the devices that make a
page read as generated, and `references/scenes.md` is a description of the scroll
scenes that award sites are actually made of, taken from 43 Sites of the Day
recorded frame by frame.

## 3. What the old site was doing wrong

### The first screen was empty

The hero was a 104-second film, full-bleed, with the headline **underneath** it.
The film opens on the brief — and for the first two seconds the frame is
near-black. So the first thing a visitor saw was a black rectangle, and the
sentence that said what the site was arrived only after it.

Worse, the opening copy was the slop itself:

> `Twenty-one seconds.` / `Four stages.` / `One accent.`

and, nineteen seconds later, at full size:

> `DESCRIBE IT.` / `WATCH IT.` / `OWN IT.`

That is the **"1 agent 1 team 1 video"** pattern the founder named: a tricolon of
counts posing as a statement. It was not only in the film. It was in the clips —
`kinetic-type` was baked around it — and in the page copy ("One prompt. A skill
pack that writes motion in code. A file you own.").

### The page was a column of sections

Eleven sections, 1,934 words, and the same layout family for most of them. The
headline sat below the fold; the story of *why the site is useful* was spread
over four screens of scrolling. Every section opened with a tiny tracked
uppercase eyebrow — the single most banned device in the tells registry, because
a generator produces it by default.

### The motion was nothing

The page had one animation: a 12px fade-and-rise, the same on every block. No
signature idea, no choreography, nothing that moved because moving was the
point. The tells registry calls this "identical fade-up on every block" and
counts it as a tell.

### The scorecard

The ICM jury model weights Design 40%, Usability 30%, Creativity 20%,
Content 10% — diagnostic only, never a release decision. The old site:

| lens | old | why |
|---|---|---|
| Design | 5/10 | one layout family, no signature idea, the hero was black |
| Usability | 6/10 | legible, but the promise arrived after a 104-second film |
| Creativity | 3/10 | the motion was a fade-up on everything |
| Content | 4/10 | tricolons, eyebrows, 1,934 words, one layout |
| **Usability** | 6/10 | 0 overflow at every width, headings in order, the film was real |
| **Accessibility** | 7/10 | real alt text, real landmarks, reduced-motion honoured |
| **Performance** | 6/10 | 36.9 kB of JavaScript, no external requests |

## 4. What changed

### The hero now says what it is, and the film follows it

The headline comes first, at full measure, and the supporting text sits under it
on the right — a spread, not a column with a box beside it:

```
Describe the video.          Describe a video in a sentence. An agent
Get the file.                 writes it in code and renders the file.

                              [ Describe a video ]  Browse the library
```

Then the film runs full-bleed beneath, edge to edge, with its brief in the
caption. The film is still 104 seconds, but it now opens **on the work** — the
launch-title clip is lit on frame one, with the brief landing over it.

### Two scroll scenes

Built on the taste-skill's stage, adapted to drop Lenis and SplitText, and
driven by GSAP ScrollTrigger bundled from npm (no CDN, no external request).

- **The reel** — the three demo films (blueprint, ink, whiteboard) fly through
  the stage one at a time, the first one opening centred. The films bleed off
  both sides. This is the signature move.
- **The source** — the clip grows from a window in the middle of the screen
  until it fills it, and the source that made it slides in beside it and reads
  itself in, a line at a time.

Both scenes are **finished compositions before they are live layouts**: with
reduced motion, with no JavaScript, and on a phone, the section shows the same
content laid out to read. Nothing waits on a script.

### The copy was cut

| | before | after |
|---|---:|---:|
| sections | 11 | 10 |
| visible words | 1,934 | 1,742 |
| eyebrow kickers | 8 | 0 |
| tricolons in headings and ledes | 4 | 0 |
| monospace labels used as decoration | 5 classes | 0 (mono kept for values: timecodes, shot names, file names) |

The footage section went: it repeated a clip the contact sheet already shows.
The four objections became four questions, because the page already had a
questions section and two of one thing is worse than one of it.

### The videos were re-rendered

Not re-cropped, not re-laid-out — **re-rendered**, because the words were baked
into the frames.

| clip | before | after |
|---|---|---|
| launch-title | "Make the film" | unchanged — it was already right |
| kinetic-type | "DESCRIBE IT. WATCH IT. OWN IT." | "a 14s launch title / on a white canvas" — the brief, arriving |
| product-loop | "Four stages. One file." | "the product, on loop" → "and the project is editable" |
| footage-title | "Cut it. Title it." | unchanged — it was already right |

The hero film opened on the brief in black; it now opens on the work. The code
panel showed `const LINES = [{ text: "DESCRIBE" …` — a slogan written as an
array of slogans — and now shows the real `LaunchTitle.tsx` source that made
the picture next to it.

## 5. The new scorecard

| lens | before | after | what moved it |
|---|---|---|---|
| Design | 5 | **8** | one signature idea, an editorial hero, two composed scenes |
| Usability | 6 | **7** | the promise is in the first screen; the page is 10% shorter |
| Creativity | 3 | **7** | the reel flies; the source reads itself in |
| Content | 4 | **7** | no tricolons, no eyebrows, real briefs instead of slogans |
| Usability | 6 | **8** | 0 overflow at 320→1440, headings in order, film labelled |
| Accessibility | 7 | **8** | reduced motion gets the finished composition, not a dead page |
| Performance | 6 | **7** | 153 kB of JS including GSAP (vendor chunk, cached separately); still 0 external requests |

**Not a release decision.** The ICM rule is explicit: a weighted average cannot
hide a critical failure, and a site with spectacular animation and unreadable
text fails. The gates below are what decide.

## 6. The gates

| gate | result |
|---|---|
| horizontal overflow | **0 at 320, 360, 375, 390, 414, 430, 768, 1024, 1280, 1440** |
| content rules | **all pass** — prompts match renders, prices match `licence.json`, no banned copy, no emoji, headings in order, no canonical, no TLD |
| MCP suite | **81/81** |
| tool policy | **44/44** |
| external requests | **0** |
| built JavaScript | 153.1 kB uncompressed (41.8 kB ours + 114.9 kB GSAP, gzip 14.4 kB + 45.5 kB) |

## 7. What is still open

- **The gauntlet's blind comparison has not been run against a human jury.**
  The bars were fetched and compared by eye; a real critic, blind, with the
  labels stripped, has not picked ours. That is the exit condition the loop
  asks for and it is not met.
- **The visual half of the original gauntlet against motionvideo.xyz is still
  unverified** — their site is unreachable from this sandbox.
- **The film is 104 seconds.** It loops, and the opening now lands, but a
  shorter cut would be better and would cost one render.
- **The block pool is not yet qualified in bulk.** 448 blocks, and the matcher
  picks on tags. Running the gate over the whole pool (~8 s a block) would let
  the matcher only ever choose a block that passes.
- **GSAP is 114.9 kB.** The site was proud of 36.9 kB. That trade bought the
  scroll choreography; it is a trade, and it can be revisited with CSS
  scroll-driven animations if the weight ever matters more than the motion.

## 8. The anti-references for next time

Do not:

- open a section with a tiny tracked uppercase label;
- write a headline as three short counts;
- show a claim without the picture that proves it;
- add a second fade-up where there should be one composed scene;
- put the promise below the thing that proves it.

Do:

- put the work first and the sentence over it;
- cut a word before you cut a paragraph;
- let one scene carry the page and let the rest be quiet;
- show the source when the claim is "the file is yours".

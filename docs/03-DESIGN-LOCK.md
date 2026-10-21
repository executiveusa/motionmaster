# CREATIVE TERRITORIES → DESIGN LOCK

Refero MCP was unreachable from the build sandbox (`api.refero.design` blocked), so the
reference-lock workflow runs on Refero's **bundled craft references**
(`references/typography.md`, `color.md`, `motion.md`, `anti-ai-slop.md`, `craft-details.md`)
plus live competitor evidence. Same discipline, no live styles.

---

## STATE 4 — REFERENCE LEDGER

| Reference | Source | Why relevant | Useful principle | What must NOT be copied | Imitation risk |
|---|---|---|---|---|---|
| motionvideo.xyz `/skills` | live (fetched 2026-10-21) | The catalog we must beat | Real work + the prompt behind it | Their card-grid catalog layout, their "Motion worth making." line, their hero | Medium — we are a direct substitute |
| motionvideo.xyz `/motionvideo-skill` | live (fetched) | Their paid page | Clear price + what is in the pack | "One price. Every update." copy, their 94-left urgency counter | High if lifted verbatim |
| motionvideo-mcp plugin set | GitHub, MIT | Their distribution blueprint | One HTTP MCP + one plugin folder → 16 hosts | Their exact manifest values | Low — this is a format, not an expression |
| Higesfield / Runway / Descript | live pricing pages | Category visual language: dark, cinematic, credit-metered | Motion products live in dark rooms | Their dark-cinematic default (we are choosing *against* it) | Medium |
| Envato / Motion Array | category knowledge + research | The audience we are actually selling to | Browse → preview → buy → ship | Their infinite-grid thumbnail wall | Low |
| Refero bundled craft refs | local | Methodology + anti-slop rules | Research before design; no averages | — | — |
| LottieFiles `motion-design` skill | installed locally | The product's own motion doctrine | Duration tables, easing roles, stagger budget | — | — |

**Governing idea (why this visual behaviour belongs to THIS product):**
Motion Master writes *code* that becomes *frames*. So the site speaks two languages at once —
**timecode** and **source**. Every layout decision is derived from that: the site is a
film-lab contact sheet, not a SaaS marketing page. The product is a thing that makes frames;
the page is made of frames, labeled with timecode, sitting next to the code that made them.

This fails the "could belong to anybody" test cleanly: swap in a coffee shop and the
timecode rail, the frame ticks and the code column make no sense. It is not reusable
decoration — it is the product's truth rendered.

---

## STATE 7 — THE THREE TERRITORIES

### TERRITORY A — "THE FILM LAB" · **SELECTED**
Quiet, engineered, editorial-technical. A contact sheet on a light bench. Ink on neutral
paper, one signal orange. A live frame rail down the left edge carrying a real timecode.
Clips presented as a filmstrip with their prompt and stack printed beneath, like a lab
report. Code shown where it exists, not abstracted into icons.

- Grid: 12-column, asymmetric; a persistent 56px left rail; type set to a baseline rhythm.
- Typography: IBM Plex Sans (display + UI), IBM Plex Mono (timecode, code, labels).
- Color: neutral light canvas, near-black ink, one signal orange. No violet. No gradients
  except inside a video frame.
- Motion: the site *is* the demo. Reveals are cut on a beat. Nothing bounces. Nothing
  scroll-jacks. The hero clip scrubs on a timecode rail.
- Signature moment: the frame rail. It shows live timecode over the hero, and each section
  is stamped with its own timecode as you reach it. It is functional, not ornamental.
- Mobile: rail becomes a 2px top progress line; contact sheet becomes a vertical filmstrip;
  prompt is always visible under its clip.
- Risk: could read as "too technical" for a non-technical buyer → mitigated by copy, not
  by softening the system.
- Why it fits: the buyer is buying precision they cannot yet do. The page demonstrates
  precision before it asks for money.

### TERRITORY B — "THE CUTTING ROOM"
Dark, cinematic, editorial. A film-lab console: charcoal, warm amber, timecode scrubbers
as the primary navigation. Feels like a colour-grading suite. High drama, high craft,
highest risk of reading as "AI video tool #47" — which is exactly the category we are
positioning against, and exactly what Higgsfield, Runway and Descript already own.
- Would this page belong to anybody? Yes. It would belong to any AI video startup. **This
  is the disqualifying property the Creative Director reviewer is instructed to catch.**

### TERRITORY C — "THE TYPE FOUNDRY"
Extreme typographic scale; the product is treated as a type-in-motion system. One
enormous word, a specimen-sheet grid, variable font as the hero, motion as the type
itself. Ownership is high and it is a real differentiator.
- But: the buyer is non-technical. A type specimen is a connoisseur's page. It optimises
  for the critic, not the customer. And a type-led page without type-led *proof* is
  decoration.

**Scoring:** A wins on audience fit, originality, and proof legibility. B wins on drama and
loses on originality. C wins on memorability and loses on conversion. **A is selected.**
Not an average of the three.

---

## STATE 8 — DESIGN LOCK

### CREATIVE
- **Territory:** A — The Film Lab
- **Governing idea:** Timecode and source, side by side. Motion Master makes frames; the
  page is a contact sheet of frames, labelled, with the code that made them.
- **Emotional tone:** Precision. Quiet confidence. Studio, not startup.
- **Signature behaviour:** The frame rail — a 56px left gutter carrying frame ticks, a
  live timecode that scrubs with the hero clip, and a section stamp that changes as each
  section is reached. It is the one element that must exist.

### CONTENT
- **Hero hierarchy:** Eyebrow → promise (6 words max) → one sentence of mechanism → two
  actions → live proof strip of real clips with their prompts.
- **Primary promise:** *Describe the video. Get the file.* (draft, subject to copy pass)
- **Supporting explanation:** It writes the storyboard, then the animation, then the render.
  You get the video, the project, and the code.
- **Product proof:** a live in-browser motion canvas in the hero; real rendered clips with
  their exact prompts in the proof strip; a real storyboard artifact; a real code panel.
- **Trust sequence:** real clip → real prompt → real code → real licence terms → price.
- **Objection sequence:** "it looks like AI" → "I don't know code" → "$99 vs $15/mo" →
  "it's my footage" → "I own it".
- **CTA wording:** `Buy the license — $99` (primary) / `See it make one` (secondary).
- **Confirmation state:** checkout success page showing the install command per host and
  the download link. Not a toast.

### VISUAL SYSTEM
- **Grid:** 12 columns, 1440 max, 24px gutter, 56px left frame rail, 88px outer margin.
  Baseline rhythm 8px. Content max 1320px.
- **Typography:** IBM Plex Sans (400/500/600/700) + IBM Plex Mono (400/500).
  Display: clamp(48px, 7.2vw, 104px), weight 700, tracking -0.03em, line-height 0.95.
  H2: clamp(32px, 4vw, 52px), 600, -0.02em. Body: 17px/1.6 (mobile 16px).
  Labels: 12px mono, tracking 0.12em, uppercase. Meta: 13px mono.
- **Spacing rhythm:** 8px base. Section padding 128px desktop / 72px mobile.
- **Color:** canvas `#F4F4F2` · surface `#FFFFFF` · ink `#111113` · muted ink `#6B6B70` ·
  hairline `#DDDEDA` · **accent `#FF4A1C`** (signal orange — editor's mark; CTA + emphasis
  ONLY) · player zone `#0E0E10` (the only dark surface, and it is a real frame).
  Accent usage budget: ≤ 8% of any viewport. No violet. No indigo. No gradients in UI chrome.
- **Image direction:** real motion, real frames. No stock photography of people at laptops.
  No 3D blobs. No abstract gradient hero.
- **Iconography:** Lucide (1.5px stroke), or geometric primitives drawn in CSS. **No emoji.**
- **Shape language:** 0 radius on structural elements (rails, rules, panels). 4px on controls.
  No pills except a single status chip. No 24px card radius.
- **Surface behavior:** flat. Hairline borders. One elevation recipe: the player zone.
- **Motion philosophy:** cut on the beat, not eased into existence. Durations 180–420ms,
  cubic-bezier(0.2, 0, 0, 1) for on-screen, (0.05, 0.7, 0.1, 1) for entrances.
  Critically damped, no bounce. `prefers-reduced-motion` freezes the hero to its final
  frame and removes all reveals.

### MOBILE CONTRACT
- **Hero transformation:** eyebrow → promise → mechanism → CTA → live canvas full-bleed.
  The canvas moves BELOW the CTA: proof before the ask on a phone.
- **Navigation:** sticky top bar, 56px. Menu is a full-height panel with focus trap,
  Escape to close, focus returned to the trigger. No bottom sheet.
- **CTA behavior:** full-width 52px primary button, sticky footer bar on scroll after the
  hero passes (56px, respects safe-area inset).
- **Image crops:** 16:9 for clips, 1:1 for frame stills. Never crop the type inside a frame.
- **Content order:** promise → live canvas → clips+prompts → how it works → in the box →
  footage mix → objections → price → FAQ.
- **Touch:** all controls ≥ 48px. `touch-action: manipulation`. Press state = 2% scale.
- **Safe area:** `env(safe-area-inset-*)` on the sticky bar and footer.
- **Motion reductions:** no scroll-linked movement except the 2px progress line.
- **Mobile-only changes:** frame rail → top line; 3-up grid → 1 column; code panel →
  horizontal scroll with a visible scrollbar affordance; timecodes always visible.

### QUALITY
- **Target references:** the contact sheet / lab report, not a SaaS landing page.
- **Accessibility:** WCAG AA on all text (accent orange on canvas must clear 4.5:1 — verify,
  `#FF4A1C` on `#F4F4F2` is ~3.3:1, so accent is **large-text and non-text only**; for
  small text on light use ink or a darkened `#D63A12`). Keyboard operable player,
  reduced-motion path, real focus rings, semantic headings, alt text on every frame.
- **Performance budget:** LCP < 1.8s on 4G. Hero clip: pre-encoded poster + first frame
  eager, remaining frames lazy. JS < 90KB gzipped excluding GSAP core. CLS = 0.
  Font: 2 families, 4 weights max, `font-display: swap`, subset latin.
- **SEO:** title, description, canonical, OG image rendered from the hero frame.
- **Supported breakpoints:** 320 / 375 / 390 / 430 / 768 / 1024 / 1440.
- **Anti-slop blacklist:** (see below)
- **Technical constraints:** static site, deployable as a static bundle. GSAP for the
  in-browser motion canvas. No framework lock-in. No Lenis / no scroll-jacking.

### ANTI-SLOP BLACKLIST (hard rejections)
1. Indigo / violet / purple anywhere, including gradients. ← *our own first demo render used
   `#7C5CFF`; it is banned and must be re-rendered in the signal palette.*
2. Rounded-rectangle card grids as a default container. Only genuinely interactive
   containers get a border, and their radius is 4px, not 24px.
3. Left accent stripes on cards. The accent is a mark, not a decoration.
4. Emoji as icons.
5. "Glowing blobs" / floating orbs / abstract gradient backgrounds.
6. Glassmorphism.
7. Three identical feature cards.
8. Default bento grid.
9. A generic centred SaaS hero with a left-text/right-image split.
10. A decorative serif/italic word swap in the headline.
11. Cream / ivory / clay / olive / terracotta editorial palette.
12. Fake browser chrome.
13. Fake testimonials, fake logos, fake numbers.
14. Motion without communicative purpose; decorative scroll-jacking.
15. The words: transform, unlock, empower, reimagine, revolutionize, supercharge, seamless,
    elevate, game-changing.
16. "Get Started" as a CTA.
17. Generic 3-column pricing.
18. A gradient hero that is not an actual video frame.
19. Emoji-adjacent "sparkle" icons used as product explanation.
20. Numbers on cards that we cannot verify.

### Performance + motion ledger (summary)
| Motion | Purpose | Property | Reduced-motion |
|---|---|---|---|
| Hero clip playback | proof | media | shows final frame poster |
| Timecode scrub (rail) | shows frames are real, ties rail to clip | text + transform | timecode shows static frame number |
| Section stamp change | orientation | text | no change |
| Clip reveal on scroll | orientation + load deferral | opacity + translateY 12px | visible immediately |
| Prompt copy interaction | control | — | n/a |
| Sticky mobile CTA | persistent action | position | n/a |

# 09 — RELEASE REPORT

**MOTION MASTER — what exists, what is proven, what is still open.**

Date: 2026-10-21, updated 2026-11-11. Repository: **`executiveusa/motionmaster`** —
the final home. The history on disk is 335 commits and 3,691 files.

> **Updated 2026-11-11 — the blind gauntlet is closed, and we won it.**
> `motionvideo.xyz` resolves from the sandbox now, so the visual half of the
> gauntlet ran for the first time. Two fresh critics, blind, judged our page
> against theirs with the brand hidden and the file names randomised. Round one
> went to the bar; every finding it made about our page was true and was fixed;
> **round two picked ours.** See
> [`docs/24-THE-BLIND-GAUNTLET.md`](24-THE-BLIND-GAUNTLET.md) and
> [`docs/26-THE-ROUND-TWO-VERDICT.md`](26-THE-ROUND-TWO-VERDICT.md).
>
> **The hero film is now 55.4 seconds** and has a score. See
> [`docs/25-THE-HERO-FILM.md`](25-THE-HERO-FILM.md).
>
> **Updated 2026-11-12 — the in-house studio.** The founder's three
> decisions set the shape: house library first, renders local or remote, and
> the taste gate hard on every render. Four layers were built — a generated
> contract, brand kits, a 75-scene house library and a render queue. The
> plugin had been advertising a paid product with a hosted render allowance
> while `licence.json` said it was not on sale; that is fixed at the source
> and a gate now keeps it fixed. See
> [`docs/27-THE-IN-HOUSE-STUDIO.md`](27-THE-IN-HOUSE-STUDIO.md).

> **Updated 2026-10-24 — it is live.** The repository was pushed to
> `executiveusa/motionmaster` on 2026-10-24, replacing the single README commit that
> was there. The site was rebuilt the same day — see
> [`docs/16-THE-TASTE-REVIEW.md`](16-THE-TASTE-REVIEW.md). The push was a force push with a lease pinned to the commit it replaced,
> so it refused to run if anybody had pushed in the meantime. The old repository,
> `executiveusa/motion-master-`, is untouched and was not written to.
> See [`HANDOFF.md`](../HANDOFF.md) for the procedure and the recovery bundle.

> **Updated 2026-10-23 — the offer is not live.** The founder stopped selling the
> product and is using it in-house. `licence.json` carries `status.onSale = false`;
> the page, the plugin and the MCP server all read it. The terms are recorded, not
> published. See [`docs/11-LIBRARY-AND-GENERATOR.md`](11-LIBRARY-AND-GENERATOR.md)
> for what changed: the nine-collection prompt library, the prompt enhancer, the
> HyperFrames generator, and the browsable catalogue page.

---

## 1. What was built

| | | state |
|---|---|---|
| **Landing page** | `site/` | Vite + vanilla TS, **zero runtime dependencies**. A 104-second hero film, then 4 real rendered clips with their exact prompts, 3 demo films, a browsable catalogue of 3,988 library items, mechanism, contents, objections, pricing, FAQ. 0 external requests, 36.9 kB of JavaScript. |
| **Hero film** | `hero/` | **55.4 seconds**, 1920×1080, 30 fps, rendered frame by frame, with a score. The brief, the shot list, the code beside the footage it produced, the renders, the file. The 104-second cut is still one command away. |
| **Agent plugin** | `plugins/motion-master/` | 38 upstream motion skills + the Motion Master router, packaged for ChatGPT, Codex, Claude, Cursor and 12 more hosts. 3 marketplace catalogs, all validated. |
 the skill and clip tools (`list_skills`, `get_motion_tokens`, `list_clips`, `get_clip_prompt`, `plan_video`, `build_composition`, `build_hyperframes_composition`, `mix_footage`), the library tools (`list_library_collections`, `list_library_categories`, `browse_library`, `get_library_item`, `list_motion_blocks`, `enhance_prompt`), the **sound tools** (`list_sfx_kinds`, `browse_sfx`, `search_sfx`, `get_sfx`, `plan_sound`) and the **render tools** (`render_film`, `film_status`, `list_films`). 65/65 tests, 44/44 tool-policy checks. |
| **Console** | `site/src/modules/chat.ts` | A chat on the front page that talks to our own MCP server. The agent's artifacts are built by the **server from the real tool result**, so the console can never show a description of something that did not happen. Model by OpenRouter, BYO via PKCE — the key never sits on our server. 12/12 browser checks against the deployed page. |
| **Sound library** | `library/sfx*` | **1,470 sounds, 35 canonical kinds** from three sources — earshot (MIT recipes), uisfx (MIT code, CC0 audio) and Openverse (282 real recordings, each with its own licence). The same 35 kinds are the site's buttons and the agent's search words, so a sound found by clicking and by asking land in the same place. |
| **Prompt library** | `library/` | 9 open-source collections normalised into one index: **3,988 items, 756 categories**, plus **448 HyperFrames motion blocks**. Every item carries its licence. |
| **Prompt enhancer** | `mcp/src/enhancer.ts` | Deterministic. Checks the 11 things a motion brief needs, rebuilds the prompt with the motion tokens and a matched style recipe, and reports what it assumed. Built from a measurement of the corpus, not a guess. |
| **Generator** | `generator/` | HyperFrames (Apache-2.0) as the render path, with its lint and layout gate. Sample composition passes with 0 errors and 89/89 contrast checks. |
| **Montage bridge** | `bridge/` | Clean-room client for the AGPL Montage agent. 24/24 tests. AGPL-3.0-only, isolated, never modifies the Montage repo. |
| **Proof clips** | `clips/` | 4 compositions rendered to 1280×720 h264 + posters. 3 real skills, 1 real bridge timeline. |
| **Plan & lock docs** | `docs/00`–`docs/08` | 10 documents written *before* the code, then corrected by the evidence. |
| **Gauntlet** | `docs/08` | Measurable half **won**. Visual half **open** — their site is unreachable from the sandbox. |

---

## 2. Everything verified, with the command that proves it

| check | result |
|---|---|
| `site: npm run build` | green — tsc, vite, and 9 content rules |
| `site`: overflow at 320/375/390/430/768/1024/1280/1440 | **0 horizontal overflow at every width** |
| `site`: WCAG AA contrast, every visible text node | **0 failures** |
| `site`: touch targets | none under 44px |
| `site`: built JS | **36.9 kB** uncompressed — still zero runtime dependencies; the extra is the library browser and the sound browser, and its 1 MB index is fetched only when the section is approached |
| `site`: external runtime requests | **0** |
| `bridge: npx tsc --noEmit` | clean |
| `bridge: npm test` | **24/24** |
| `bridge: npm run validate:example` | valid against the schema and the Montage rules |
| `mcp: npx tsc --noEmit` | clean |
| `mcp: npm test` | **65/65** (library, enhancer, blocks, sound, chat) |
| `mcp: node scripts/verify-tools.mjs` | **44/44** (12 of them sound checks) |
| `the-extractor` audit of our page | **0 high**, 1 medium (25 headings) |
| `the-extractor` audit of motionvideo.xyz (from their source) | 0 high, **2 medium** (37 headings, 93 links) |
| clip media | 4 × mp4 + 4 × poster, all 1280×720 / 30fps / h264, `ffprobe` clean |

The one signal we trip is `X-S01 Long-page hierarchy burden` — 25 headings. It is real
and it is on the record. A product page that has to carry proof, mechanism, contents,
pricing, objections and FAQ cannot be cut to a poster, but the finding gets watched as
the page grows.

---

## 3. The things that were wrong and got fixed

This is the part worth reading. The work was not a straight line.

**Three of the four prompts on the page did not match the clips they were attached to.**
The product loop has **four** stages; the manifest said "three beats". The kinetic type
is **six words on six lines**; the manifest said "six words across three lines". The
whole claim of the page is "the exact prompt behind this clip", so a manifest that
disagrees with the render is the product failing at its one promise. Both were
corrected to the render, and the alt text with them.

**Posters were grabbed at frame 0**, which is an empty canvas on three of the four
clips. A poster that shows an empty frame lies about what the clip contains. The
posters are now taken at a chosen moment (3.5s, 3.4s, 10.5s, 6.0s) and
`clips/render-all.sh` carries the same timestamps so a re-render reproduces them.

**The footage clip was nearly black.** The first source render was too dark to read as
footage at all. The source was re-rendered brighter with a visible light sweep, and
`footage-title` was re-rendered from it.

**The site and the MCP server disagreed about the product.** The MCP was claiming
"there is no hosted render service" while the pricing table promised hosted rendering.
The locked design is a one-time licence **plus** a hosted render allowance, so the MCP
was wrong. The offer now lives in one file — `licence.json` at the repo root — which
the site imports and the MCP generates from. The build fails if the page and the file
disagree by so much as a bullet point. **That was the most valuable fix in the run**:
not a bug, but a seam.

**The page overflowed at 320px.** A storyboard table and a code sample were widening
the document, because grid and flex children default to `min-width: auto` and that
stops their own scroll boxes from working. The brand link was a 24px touch target. All
found by measuring a real browser, not by reading the CSS.

**The domain leaked a TLD in two deliverable documents** while explaining that it
should not. Rewritten.

**Unbacked promises were removed**: "Lifetime updates", "Priority support", "Team
seats". Nothing in the evidence ledger backs them, and the ledger is the rule.

---

## 3b. The second pass — what the craft law said about our own work

The ten best skills from motionvideo.xyz were imported into the plugin package. One of
them, **motionmaxxing**, is a craft law measured on 53 professional recreations, with a
"never ship" list and gates computed on the render rather than asserted.

Its gate G5 bans, in a shot: corner labels, tracked-caps labels, counters, timecodes,
resolution text, header and footer bars, kickers above a headline, progress bars and
letter-typed headlines.

**All four of our clips were carrying every one of those things.** "RENDERED BY MOTION
MASTER" in the corner. "storyboard · choreograph · render" as a tracked-caps footer.
`00:00:14 · 1280×720` as a timecode. "CUT + OVERLAY · MONTAGE BRIDGE" as a bottom bar.
A shot that carries its own instrumentation is a screenshot of a tool, not a piece of
film — which is exactly why the gallery read as AI slop.

So the chrome came out of all four compositions, and they were re-rendered. The launch
title is now a wordmark, an accent rule and two hairlines on a white canvas, and it
looks like a title card instead of a web card.

Then the hero became a film: `hero/film.js` is a page where **picture is a function of
time** — `window.render(t)` draws the frame — rendered frame by frame through headless
Chrome and piped into ffmpeg. That is the technique lemo-opuscar documents, and it is
why the film can have a world with ground, light and depth, a camera that always
drifts, cuts on motion, arrivals that decelerate from oversize, and an end card under
1.4 seconds.

The footage inside the film is the real rendered clips. The code panel beside it is the
real `KineticType.tsx`. The words the film opens with are the words that describe the
clip you can see: *Twenty-one seconds. Four stages. One accent.*

---

## 4. The competitive picture, corrected

This is new information that was not in the plan, and it changes the GTM.

**motionvideo.xyz sells a one-time skill bundle for $29 during a launch offer, $49
after the first 100 purchases.** Read from their own source at HEAD
(`apps/web/src/constants/pricing.ts`). Their page ships a live "spots remaining"
counter against that limit of 100 — a manufactured deadline on a price that has not
changed. Their verified all-time revenue is **$58**, about two launch sales.

We are at **$99 Solo / $399 Studio**. That is 2×–8× their price for a strictly larger
bundle: the same skills, plus a plugin for 16 hosts, plus an MCP server, plus the
Montage footage bridge they do not have, plus a hosted render path they do not have.

**The price was not changed.** The founder set it, and `docs/06-GO-TO-MARKET.md`
already treats $99 as a hypothesis to test against $149 and $249 — with a $29–$49
reference point now in the world, that hypothesis set is incomplete, and the founder
should decide whether to widen it. This is **founder decision, open.**

What we do have that they do not: their landing page is a directory of 247 clips
(35 on the page) where every prompt is behind a click. Ours is four clips where the
prompt is printed next to the video and the prompt is the copy button. Their page is
12,831px tall at 1920 wide. Ours is about 7,000px.

**Do not claim we beat them on price.** The honest claim is: we are a paid product
with a real bridge and a real MCP, they are a free catalogue with a $29 skill file.

---

## 5. The gauntlet is half-closed, and says so

`docs/08-GAUNTLET-RESULT.md` has the full result. The short version:

**This half is now closed. It ran on 2026-11-11.**

- **Measurable half: won.** 0 high-severity signals for both sides; we have 1 medium
  finding, they have 4. `scripts/gauntlet.sh` re-runs it, and the bar is fetched
  live — the reconstruction script was not needed.
- **Visual half: run, twice, and won.** `motionvideo.xyz` resolves from this sandbox
  now. `scripts/blind-capture.mjs` captures both pages at 1440 and 390 with the brand
  hidden on both and the file names assigned at random, and a **fresh agent session**
  with no history of this project judges them.
  - **Round one: the bar won.** Three of its findings were true of our page — title
    cards cut mid-word in the hero, a phone hero that was a shrunk desktop with a
    card cutting the headline, and cards cropping the footage they held.
  - All three were fixed, along with a **two-stylesheets-own-the-hero** bug that had
    been silently shipping the wrong design.
  - **Round two: ours won**, at medium confidence — on hierarchy, on craft and
    taste, and on the phone being its own composition.

Claiming a win we did not measure is the exact failure the gauntlet exists to
prevent, so the exit condition stayed unchanged until a blind critic actually
picked ours. It took two rounds, and the first one was lost.

---

## 6. The bridge, and the Montage repo

`bridge/` is **AGPL-3.0-only**, isolated in its own directory, a separate npm package
and a separate process. It is never imported by the product.

It is AGPL because it re-implements against the Montage composition document shape
(`cuts` / `overlays` / `themeConfig`) and the Montage MCP tool surface, and those
are AGPL interfaces. That is the licence that is unambiguously correct while the
bridge talks to an AGPL project.

**The Montage repository was not modified.** Not one file. The bridge is clean-room: it
talks to Montage's public HTTP and MCP interfaces exactly as any third-party client
would. The licence decision — whether the owner grants a commercial licence for the
specific components the bridge touches, which would let `bridge/` be relicensed and
remove the AGPL boundary from the shipped product — belongs to the Montage owner
alone, and is **founder decision, open**. `bridge/LICENSING.md` sets out the path.

Three real defects in the bridge were found and fixed during the build, each with a
regression test: write-back returned the wrong version, the round-trip lost the cut
media path, and `MONTAGE_TOKEN` was not being sent as a bearer token on the SSE feed.
24/24 tests now pass, including the new regression suite.

---

## 7. Open decisions — these are yours

1. **The domain TLD.** The word `motionmaster` is written in exactly one place in the
   built page, a single meta tag. No URL with a suffix appears anywhere. Pick the TLD
   and buy it.
2. **The price.** $99 / $399 is set and live on the page. The market reference point
   turned out to be $29 / $49. Keep it, or move Solo.
3. **The hosted render allowance.** It is `null` in `licence.json`, and the page says
   Studio includes one, with the size confirmed at checkout. No number is published
   because none has been decided. Set it, and the page picks it up by itself.
4. **The payment processor.** The checkout panel states the tier and the price and says
   plainly that nothing has been charged. No processor is chosen.
5. **The commercial licence note on the Montage repo.** Whether to file it, and what
   to ask for.
6. **Close the gauntlet's visual half** on a machine that can load motionvideo.xyz.

---

## 8. The deployments

The site is live at **https://20vyen0s3mpc9.space.minimax.io** — the current build: the
rebuilt hero, the two scroll scenes, the console and the sound library. Earlier deployments were superseded by the hero film,
the re-rendered clips, the library browser, the console and the sound section.

What changed in that pass:

- The hero is now a **104-second film** instead of a live GSAP canvas. That removed the
  page's only runtime dependency: built JavaScript went from **84.7 kB to 20.1 kB** and
  GSAP is gone from `site/package.json` entirely.
- The four clips were re-rendered **without their chrome**.
- The gallery prompt for `footage-title` was corrected to match its new clip, and the
  build's content check caught the drift before it could ship.
- The pricing tier list is now **generated** from `licence.json` rather than
  hand-written, because it had already drifted once.

Verified on the deployed copy, not the local build: the film, its poster and all four
clips serve 200 with the right content types; `$99` and `$399` are in the live HTML; no
horizontal overflow at 320/375/390/430/768/1024/1440; and the anti-slop audit is still
**0 high-severity findings, 1 medium** (25 headings).

The hosting platform injects a "Created by MiniMax Agent" badge in the corner of the
page. It is the platform's, not ours, and it disappears with a real domain.

---

## 9. What is not claimed

- No user counts, no revenue figures, no testimonials, no logos, no "trusted by".
- No render-speed number — it has not been measured on a stated rig.
- No hosted-render allowance figure.
- No URL, no canonical link, no TLD.
- No claim that the gallery was beaten, on the half that was not measured.
- The source footage in `footage-title` is a generated stand-in and says so.
- The `footage-title` clip shows the bridge's cut-and-overlay timeline shape, rendered
  by our own composition. It is not a screenshot of a running Montage instance.
- The hero film shows our four clips and our own source code. It is not a clip from a
  customer, and it does not claim to be.

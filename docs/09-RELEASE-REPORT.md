# 09 — RELEASE REPORT

**MOTION MASTER v1 — what exists, what is proven, what is still open.**

Date: 2026-10-21. Repository: `motion-master/`. Nothing has been pushed; the founder
has not approved a push.

---

## 1. What was built

| | | state |
|---|---|---|
| **Landing page** | `site/` | Vite + vanilla TS, **zero runtime dependencies**. A 104-second hero film, then 4 real rendered clips with their exact prompts, mechanism, contents, objections, pricing, FAQ. 0 external requests, 15.3 kB of JavaScript. |
| **Hero film** | `hero/` | 104 seconds, 1920×1080, rendered frame by frame. The brief, the shot list, the code beside the footage it produced, the renders, the file. |
| **Agent plugin** | `plugins/motion-master/` | 33 upstream motion skills + the Motion Master router, packaged for ChatGPT, Codex, Claude, Cursor and 12 more hosts. 3 marketplace catalogs, all validated. |
| **MCP server** | `mcp/` | 7 tools: `list_skills`, `get_motion_tokens`, `list_clips`, `get_clip_prompt`, `plan_video`, `build_composition`, `mix_footage`. 30/30 policy checks. |
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
| `site`: built JS | **15.3 kB** uncompressed — the GSAP hero canvas is gone, so the page has no runtime dependency at all |
| `site`: external runtime requests | **0** |
| `bridge: npx tsc --noEmit` | clean |
| `bridge: npm test` | **24/24** |
| `bridge: npm run validate:example` | valid against the schema and the Montage rules |
| `mcp: npx tsc --noEmit` | clean |
| `mcp: npm test` | **15/15** |
| `mcp: node scripts/verify-tools.mjs` | **30/30** |
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

- **Measurable half: won.** 0 high-severity signals for both; we have 1 medium
  finding, they have 2; 25 headings against 37; 26 links against 93.
- **Visual half: UNVERIFIED.** motionvideo.xyz does not resolve from this sandbox —
  the TLS handshake fails and every fetch times out. Their site is open source, so
  their *copy and structure* were audited from source and the reconstruction is
  reproducible via `scripts/build-bar-reconstruction.mjs`. Their *pixels* were never
  seen. A blind critic with fresh context is supposed to put the two screenshots side
  by side and pick a winner. **That did not happen.**
- `scripts/gauntlet.sh` performs that capture the moment the domain is reachable.

Claiming a win we did not measure is the exact failure the gauntlet exists to prevent,
so the exit condition is unchanged: a blind critic picks ours.

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

## 8. What is not claimed

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

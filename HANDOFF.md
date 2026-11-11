# HANDOFF — Motion Master

**Read this first. It is everything another agent needs to pick this up cold.**

Written 2026-10-24. Repository: **`executiveusa/motionmaster`** (final home).
Local clone: `/workspace/motion-master`. `main` = `65af542`.

---

## 1. What this is

Motion Master is a motion-design agent product. You describe a video in a
sentence; an agent writes the shot list, the choreography and the sound in code,
renders the file on your own machine, and hands you a video you own.

Four parts, and they are not separate products — they are the same product
behind four doors:

| | where | what it is |
|---|---|---|
| the site | `site/` | the landing page: the film, the prompts, the console, the sound shelf, the browsable library |
| the plug-in | `plugins/motion-master/` | 39 skills + a manifest, for ChatGPT, Codex, Claude, Cursor and 15 more hosts |
| the MCP server | `mcp/` | 26 tools, the agent's hands: the library, the blocks, the sound, the renderer |
| the HTTP API | `mcp/src/api.ts` | the same thing at `/api/v1`, for scripts, CI jobs and web apps |

The honest summary of the whole thing: **the prompt, the code and the film are
one artifact.** Nothing here is a description of a video. Every clip on the page
was rendered by the skills in the pack, and the prompt that made it is printed
underneath it.

## 2. Where it lives

```
origin          https://github.com/executiveusa/motionmaster.git   ← the final home
motion-master-  https://github.com/executiveusa/motion-master-.git  ← the old repo, read-only reference
main            65af542  "Make the site a film instead of a column of sections"
initial-readme  7f72974  the founder's original README commit, preserved as a branch
```

Live: **https://20vyen0s3mpc9.space.minimax.io**

## 3. The rules this work lives under

Read these before changing anything. They are not advice; they are the brief.

- `docs/00-PROJECT-LOCK.md` … `docs/07-GAUNTLET-PLAN.md` — the lock, written
  before the code.
- `docs/16-THE-TASTE-REVIEW.md` — the most recent work: what the site was, what
  it is now, the jury scorecard, and the anti-references for next time.
- `docs/13-THE-CONSOLE.md`, `docs/15-THE-SOUND.md` — the two product halves.
- `licence.json` — **the offer lives in one file.** The site, the MCP server and
  the API all read it. `status.onSale = false` is the single switch for a
  launch; nothing else needs to change.
- `docs/03-DESIGN-LOCK.md` — the visual identity: canvas `#F4F4F2`, ink
  `#111113`, muted `#6B6B70`, hairline `#DDDEDA`, accent `#FF4A1C`, player
  `#0E0E10`. IBM Plex Sans + Mono. **Mono is for values** — timecodes, shot
  names, file names — and not for words a reader reads as words.
- The founder's own rules, which override any general advice: **no fake
  testimonials, no invented logos or counts, no "trusted by", no fake urgency,
  no indigo or violet, no card grids, no emoji, no glassmorphism.** And
  explicitly: *"1 agent 1 team 1 video" — the tricolon-of-counts pattern is AI
  slop and the founder hates it.* It was in the hero film, baked into a clip,
  and in three headings. It is gone. **Do not put it back.**

## 4. The state of every workstream

### The site — the approved wireframe, plus the work put back on it

The page is the wireframe from PR #8 (merged as `50c0a97`): a hero that leads
with the headline, a searchable sheet of four real clips each carrying its
exact prompt, the console, the library, the agents and the quickstart. Six
sections, 706 visible words, one h1, no eyebrow kickers, no tricolons.

What changed on 2026-11-11: **the page had no motion above the fold.** The
hero film, the three demo films and the twenty-second engine film were all on
disk and appeared nowhere.

- **The hero collage carries the real renders.** Six cards, each with its
  footage and a poster that is a frame of it, so the picture is right before
  anything plays. The card under the pointer runs and rewinds; one video
  decodes at a time. The cards sit *behind* the headline
  (`z-index: 10` on `.hero__body`), so the hero listens for the pointer and
  works out which card it is over rather than expecting the card to get the
  event.
- **The engine film has a home** — a complete twenty-second render, mounted
  like a print between the hero and the examples, because the work comes
  before the explanation. Muted, looping, plays when scrolled to and stops
  when it is not. The one control is the sound, in the corner, clear of the
  film's own caption line; the stock control bar would sit on top of it.
- The section's classes are **`showcase__*`**. The console already owns
  `.film__*` for the film it renders — see §8.
- GSAP 3.15.0 is bundled from npm into its own chunk (`gsap-*.js`), so the
  content check can tell vendor bytes from ours. **There are still zero
  external requests.**
- The clips and the hero film were **re-rendered** because their words were
  baked into the frames. `scripts/rebuild-media.sh` runs the whole chain.

### The agent surfaces

- **MCP**: 35 tools — the shot vocabulary (`list_shots`, `get_shot`,
  `plan_shots`), the effect shelf (`list_motion_effects`,
  `get_motion_effect`), the block inspector and the gate
  (`get_motion_block`, `check_hyperframes`), and the board sync.
- The startup banner names all 35, and `scripts/verify-tools.mjs` checks the
  banner against the same list it checks the live server against, so the two
  cannot drift apart again.
- **HTTP API**: `/api/v1` with an OpenAPI document at `/api/v1/openapi.json`.
  Optional bearer auth via `MOTION_MASTER_API_KEY`.
- **Plug-in**: 47 skills, with the Claude, Codex and Cursor marketplaces
  updated.

### The talking-head reel skill (2026-11-10)

The founder supplied `talking-head-reels` directly — a complete skill that
turns a talking-head recording into a finished vertical reel: pause cuts,
a whisper transcript, an EDL, kinetic typography, B-roll inserts, mattes,
film grain, and a voice mastered to −14 LUFS.

It is vendored at `plugins/motion-master/skills/talking-head-reels/` with
`UPSTREAM.md` recording that it came from the founder and declares no
upstream licence. The Anton font keeps its OFL.

**The platform constraint is real:** the Apple Vision mattes need macOS and
`swiftc`. Everything else — the pause cuts, the transcript, the EDL, the
renderer — is Python and ffmpeg, and runs anywhere. The vision parts ship
labelled as macOS-only.

### The vox engine (2026-11-10)

Three Vox-style repositories were cloned and read before any of our code
changed: `alisa0808/vox-director`, `santmun/video-vox` and
`iart-ai/motion-skills`. What came out of them is a rendering upgrade, not a
set of imports.

- **The analog layer** (`clips/src/vox/`) — the 12fps stepped clock for the
  graphic layer, posterised colour, paper grain, a halftone screen, a
  vignette, the boiling paper, and word-synced captions. Shipped as the new
  `analog-motion` skill.
- **The vector map** (`clips/src/vox/VectorMap.tsx` + `geo.ts`) — a camera
  over Natural Earth boundaries, a route that draws itself, a pin that drops,
  a callout whose arrow is drawn in screen space, and a region vignette.
  Shipped as the new `vector-map` skill.
- **The twenty-second promo** — `clips/src/vox/VoxPromo.tsx`, with its script
  in `clips/src/vox/script.ts` and the readable version in
  `docs/22-VOX-PROMO-SCRIPT.md`.

See [`docs/21-THE-VOX-ENGINE.md`](docs/21-THE-VOX-ENGINE.md) for the audit,
including where the mandate's description of the reference repositories was
wrong.

### The talking-head reel skill (2026-11-10)

The founder supplied `talking-head-reels` directly — a complete skill that
turns a talking-head recording into a finished vertical reel: pause cuts,
a whisper transcript, an EDL, kinetic typography, B-roll inserts, mattes,
film grain, and a voice mastered to −14 LUFS.

It is vendored at `plugins/motion-master/skills/talking-head-reels/` with
`UPSTREAM.md` recording that it came from the founder and declares no
upstream licence. The Anton font keeps its OFL.

**The platform constraint is real:** the Apple Vision mattes need macOS and
`swiftc`. Everything else — the pause cuts, the transcript, the EDL, the
renderer — is Python and ffmpeg, and runs anywhere. The vision parts ship
labelled as macOS-only.

### The vox engine (2026-11-10)

Three Vox-style repositories were cloned and read before any of our code
changed: `alisa0808/vox-director`, `santmun/video-vox` and
`iart-ai/motion-skills`. What came out of them is a rendering upgrade, not a
set of imports.

- **The analog layer** (`clips/src/vox/`) — the 12fps stepped clock for the
  graphic layer, posterised colour, paper grain, a halftone screen, a
  vignette, the boiling paper, and word-synced captions. Shipped as the new
  `analog-motion` skill.
- **The vector map** (`clips/src/vox/VectorMap.tsx` + `geo.ts`) — a camera
  over Natural Earth boundaries, a route that draws itself, a pin that drops,
  a callout whose arrow is drawn in screen space, and a region vignette.
  Shipped as the new `vector-map` skill.
- **The twenty-second promo** — `clips/src/vox/VoxPromo.tsx`, with its script
  in `clips/src/vox/script.ts` and the readable version in
  `docs/22-VOX-PROMO-SCRIPT.md`.

See [`docs/21-THE-VOX-ENGINE.md`](docs/21-THE-VOX-ENGINE.md) for the audit,
including where the mandate's description of the reference repositories was
wrong.

### The shot vocabulary and the effect shelf (2026-11-10)

Motion Master can now pick a **shot**, not just a block. 124 authored shot
cards (Apache-2.0, from video-shotcraft) and 244 motion effects (MIT, from
pixelfx) are vendored into the plugin, exposed over MCP and HTTP, and the
enhancer takes a shot plan instead of guessing a shape. See
[`docs/20-THE-VIDEO-REPOS.md`](docs/20-THE-VIDEO-REPOS.md) for the reasoning
and for what was deliberately left out.

New tools: `list_shots`, `get_shot`, `plan_shots`, `list_motion_effects`,
`get_motion_effect`. New routes: `/api/v1/shots`, `/api/v1/shots/{id}`,
`/api/v1/shots/plan`, `/api/v1/effects`, `/api/v1/effects/{id}`.

### Verification — all green as of `f2f9177`

| check | result |
|---|---|
| `site: npm run build` | green — tsc, vite, and the content rules |
| overflow at 320/375/390/430/768/1024/1440 | **0** |
| `mcp: npm test` | **186/186** |
| `clips: npm test` | **20/20** |
| plugin skills | **47** |
| `mcp: node scripts/verify-tools.mjs` | **47/47** |
| `clips: npm run typecheck` | clean |
| `mcp: npm run typecheck` | clean |
| `node scripts/completion-gates.mjs` | **10/10** |
| hero film | 55.4 s, 1920×1080, 30 fps, h264 + AAC 48 kHz stereo, −18.5 LUFS, −1.5 dBTP |
| blind gauntlet | measurable half ours (1 signal vs 5); taste half **lost round one**, fixes in |
| external requests | **0** |

## 5. The commands

```bash
cd /workspace/motion-master

# the site
cd site && npm install && npm run build        # tsc + vite + content rules
cd site && npm run preview                     # http://127.0.0.1:4173

# the agent
cd mcp && npm install && npm test               # 81 tests
cd mcp && npm start                             # http://127.0.0.1:8787
curl http://127.0.0.1:8787/api/v1              # the API index
curl http://127.0.0.1:8787/api/v1/openapi.json # the API description

# the media
scripts/rebuild-media.sh                        # clips → frames → hero film (≈45 min)

# the proof
node scripts/overflow.mjs 320                  # needs chrome on :9222
node scripts/shot-scrolled.mjs "#demos" out.png 1440
```

## 6. The sandbox, and how it bites

These cost hours. Read them once.

- **The sandbox kills background processes between bash calls.** A server must be
  started with the tool's `run_in_background` option, never with shell `&`.
- **ffmpeg reads stdin by default.** Always pass `-nostdin`.
- **Chrome Headless Shell** lives at
  `/workspace/.home/chrome/chrome-headless-shell-linux64/chrome-headless-shell`.
  It needs `--ignore-certificate-errors` for https origins and
  `--disable-features=LocalNetworkAccessChecks` so a deployed https page can
  reach a loopback agent.
- **CDP over WebSocket needs `--remote-allow-origins='*'`** on newer Chrome, or
  the connection is refused and the script hangs rather than errors.
- **NFS leaves `.nfs…` files** when a file is deleted while a process still has
  it open, and then `rmdir` fails with `ENOTEMPTY`. `site/scripts/clean-dist.mjs`
  now clears `dist` first and names the process holding it.
- **`pkill -f "node dist/index.js"` kills its own shell**, because the pattern
  matches the command line that runs it. Kill by PID.
- **`npm install` created a Dependabot branch** on the remote. That is GitHub's,
  not ours. Leave it.
- **PyPI**: the Aliyun mirror is blocked; `https://pypi.org/simple` works
  (`pip install --break-system-packages --index-url https://pypi.org/simple/`).
- **No Docker**, so thepopebot cannot run here. **No OpenRouter key**, so the
  console's model path is verified against a mock and the live catalogue, never
  a live model. **No `mcode-tools` OAuth**, so no connector path.
- **Refero MCP is unreachable** (`api.refero.design`); use the bundled refs at
  `/workspace/.research/refero/refero_skill-master/skills/refero-design/references/`.
- **Subagent output is not retrievable** in this sandbox. Do research in-root.

## 7. What is open, and the order I would do it in

1. ~~**Qualify the whole 448-block pool against the gate.**~~ **Done**
   (2026-11-11). Every block was installed, mounted and checked: **75 of the
   210 mountable compositions pass; 135 fail; the other 238 are snippets,
   not compositions, and are never mounted.** The matcher now refuses a
   rejected block and prefers a passed one over an unmeasured one, and
   `fill_block` refuses a rejected block even when it is named. See
   `docs/23-THE-QUALIFIED-POOL.md`.
2. **Give `enhance_prompt` a shot plan**, so the matcher chooses instead of
   guessing. (`enhance_prompt` now takes `plan_shots` and `max_shots`, so the
   enhancer writes a plan into the brief instead of guessing a shape.)
3. ~~**Qualify the blocks against the gate, by role.**~~ **Done**
   (2026-11-11). `scripts/map-block-roles.mjs` reads the registry tags and
   maps every gate-passing block to the shot roles it can serve; the plan
   writes the roles into the brief, the matcher reads them back, and each
   shot is filled with a block that serves its role **and** has passed the
   gate. The table is in `scripts/map-block-roles.mjs`, written down so it
   can be argued with. The pool is uneven — 54 blocks can serve
   `ui-entrance`, only 6 can serve `opening` — so the roles that are scarce
   are where the next work is.
4. ~~**Run the gauntlet blind.**~~ **Done — and we lost the first round.**
   (2026-11-11). `motionvideo.xyz` resolves from this sandbox now, so the
   visual half ran for the first time. `scripts/blind-capture.mjs` captures both
   pages at 1440 and 390, **hides the brand on both**, and assigns `A`/`B` at
   random; a fresh agent session with no history of this project judged them.
   The measurable half is ours (1 signal against 5, 0 high on both). The taste
   half went to the bar, and three of the critic's findings were true of our
   page: title cards cut mid-word in the hero, a phone hero that was a shrunk
   desktop with a card cutting the headline, and a collage whose cards cropped
   the footage. All three are fixed. See `docs/24-THE-BLIND-GAUNTLET.md`.
   **Round two: WE WON.** A second fresh critic, blind, picked ours at medium
   confidence — on hierarchy, on craft and taste, and on the phone being its own
   composition rather than a shrink. Its complaints about our hero (a card
   covering another's thumbnail, a crowded wordmark, the same artwork twice, a
   caption block that did not line up with the headline) were all true and all
   fixed; the whiteboard demo's copy changed to "Shot by shot." so the two films
   no longer say the same thing. See `docs/26-THE-ROUND-TWO-VERDICT.md`.
5. ~~**Close the visual half of the motionvideo.xyz gauntlet.**~~ **Done.**
   Same run as item 4. The bar is fetched live; the reconstruction script was
   not needed.
6. ~~**Shorten the hero film.**~~ **Done.**
   (2026-11-11). **55.4 seconds**, cut with an edit decision list — a slow
   opening, a fast middle, a held ending — and the footage clock runs at real
   speed so a clip is never seen sped up. It now has a **score**: sixteen cues
   and a bed, every sound from our own shelf, written down with a role and a
   reason. −18.5 LUFS integrated, −1.5 dBTP. The cut also exposed that the
   film had been showing the empty opening of two clips, and that a frame index
   was resolved twice. See `docs/25-THE-HERO-FILM.md`.
7. **Redeploy the site.** The live URL still serves the old structure, which
   includes a Pricing section — forbidden while the offer is not on sale.
   The current build is ready, measured and 10/10 gated; it needs the founder's
   word because the deployment is public.
8. **Push local `main` to `executiveusa/motionmaster`.** Local `main` is ahead
   of the remote by ten commits and the push is a clean fast-forward. It needs
   the founder's browser for the device-flow code — see §8.
9. **Founder decisions still open**: the OpenRouter key (BYO PKCE vs a server
   fallback), the public surface, popebot fork-vs-configure (Phase 2 — ships
   labelled unverified, no Docker here), a render machine, and whether to keep
   the old remote.

## 8. Do not

- **do not push without the founder.** There is a `gh` session signed in as
  `executiveusa` in this sandbox; it is a convenience, not permission. The
  token in `/workspace/.home/.config/gh/hosts.yml` expires and has to be
  replaced by a device-flow login; the founder has to type the code.
- **do not commit onto a detached HEAD.** `git checkout origin/main` to read
  another branch's work leaves `HEAD` detached, and commits land there with
  `main` still pointing at the old commit. The push then either does nothing
  or is refused as a non-fast-forward, and it looks like a permissions
  problem. After reading another branch: `git branch -f main <your commit>`,
  then `git checkout main`.
- **do not reuse a class name that another part of the page already owns.**
  The console owns `.film__*` for the film it renders. A new section called
  `film` picked up the console's `max-width: 720px` and its dark stage, and
  the film came out as a small panel on black. The new section is
  `showcase__*`.
- **do not let two stylesheets own the same classes.** `hero-brand.css` and
  `product-v2.css` both declared `.hero__card--c1` … `--c6`, `.hero--brand`,
  `.hero__body` and `.display`. The later import won, so the designed collage
  was dead weight for several rounds and every screenshot still looked
  plausible. One file owns the hero now. When something looks right and
  something is still wrong, read `getComputedStyle` on the live DOM — a
  screenshot proves what the page looks like, not which CSS is styling it.
- **do not crop a frame of our own work.** Every render we ship is 16:9, so
  every card that holds a render is 16:9. A title card cut mid-word reads as a
  broken render, not as a crop. The same goes for cards covering cards: the
  overlap has to fall on a margin, never on a word.
- **do not publish a URL or a TLD.** The domain word `motionmaster` is recorded
  in `licence.json`; its TLD is not chosen. The build checks for a canonical
  link and fails if one appears.
- **do not publish a hosted-render allowance number.** It is `null` and it
  stays `null` until it is real. Nothing is ever billed automatically.
- **do not put the tricolon back.** No "1 agent 1 team 1 video", no
  "One prompt. A skill pack. A file." See `docs/16-THE-TASTE-REVIEW.md` §8.
- **do not put the eyebrow kickers back.** No tiny tracked uppercase label
  above a heading.
- **do not weaken the gate to make a render succeed.** A block the gate blames
  is dropped and recorded in `library/block-verdicts.json`.
- **do not modify the Montage repo.** `bridge/` is a clean-room client for the
  AGPL-3.0 Montage agent, kept isolated in its own process.

## 9. If the working tree is lost

The whole repository is one git bundle, and it has been verified to restore:

```bash
git clone motion-master.bundle recovered
cd recovered && git checkout main
git remote set-url origin https://github.com/executiveusa/motionmaster.git
```

The bundle travels as five parts in the Drive (`motion-master.bundle.part00`
… `part04`, ~32 MB each):

```bash
cat motion-master.bundle.part* > motion-master.bundle
sha256sum -c SHA256SUMS.txt
```

The remote is the real backup. If the remote is reachable, `git clone` it.

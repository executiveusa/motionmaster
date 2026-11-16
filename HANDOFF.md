# HANDOFF — Motion Master

**Read this first. It is everything another agent needs to pick this up cold.**

Written 2026-10-24, updated 2026-11-13. Repository: **`executiveusa/motionmaster`** (final home).
Local clone: `/workspace/motion-master`. `main` = `44aeac9`.

---

> **If you are here to take this to a real product, read
> [`docs/29-THE-PRODUCTION-LOOP.md`](docs/29-THE-PRODUCTION-LOOP.md) first.**
> It is the blueprint: what is real today and what is not, the loop's
> architecture, the four levels of "done", the remediation table that lets
> the gate teach the loop to fix itself, and six phases — each with the
> command that proves it is finished. This document is the map; that one is
> the work.

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

- **MCP**: 42 tools — the shot vocabulary (`list_shots`, `get_shot`,
  `plan_shots`), the effect shelf (`list_motion_effects`,
  `get_motion_effect`), the block inspector and the gate
  (`get_motion_block`, `check_hyperframes`), and the board sync.
- The startup banner names all 42, and `scripts/verify-tools.mjs` checks the
  banner against the same list it checks the live server against, so the two
  cannot drift apart again.
- **HTTP API**: `/api/v1` with an OpenAPI document at `/api/v1/openapi.json`.
  Optional bearer auth via `MOTION_MASTER_API_KEY`.
- **Plug-in**: 61 skills, with the Claude, Codex and Cursor marketplaces
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

### The in-house studio (2026-11-12)

Three decisions by the founder set the shape: the studio produces **house
library first, films assembled from it**; renders run **local or remote**; and
**the taste gate is hard on every render**. The design is
[`docs/27-THE-IN-HOUSE-STUDIO.md`](docs/27-THE-IN-HOUSE-STUDIO.md).

Four layers, built in that order:

- **The contract.** The plugin used to advertise a paid product with a hosted
  render allowance while `licence.json` said `onSale: false`, and one
  marketplace catalog still said "33 skills" when there were 47. Nine files
  are now generated from `licence.json` by
  `scripts/sync-plugin-contract.mjs`, and
  `scripts/check-plugin-contract.mjs` is a gate that scans 1,157
  agent-readable files for a price or a live offer.
- **Brand kits** (`mcp/src/brandkit.ts`, `studio/kits/house.json`). A kit is
  a partial override of the canonical tokens. It may not remove a token and
  it may not change the system identity. Three MCP tools, three HTTP routes,
  and a `brand_kit` argument on eight tools. The argument is called
  `brand_kit`, not `kit`, because `render_film` already has a kit and that
  one is the sound kit.
- **The house library** (`studio/templates.json`, 75 scenes). Every motion
  block that passed the gate, filed under the shot roles it can serve, bound
  to a brand kit, named down to its content variables. Generated by
  `scripts/build-house-library.mjs`; `--check` is a gate. Three MCP tools,
  three HTTP routes.
- **The render queue** (`mcp/src/queue.ts`). The job's directory name
  carries a content hash of the request, so the same request renders once.
  A semaphore hands slots over rather than releasing and re-taking them. A
  job left "rendering" by a dead process is reconciled to failed at startup.
  `target: "remote"` posts to another instance's `/api/v1/films`.
  `queue_status` and `GET /api/v1/queue`.

### The ten repos (2026-11-13)

Ten repositories were named in a video and every one was checked here before
anything went in — licence from the licence file, contents cloned and read.
Seven were new. What came in: **thirteen skills, thirty-five HyperFrames
compositions and one handwriting engine**, each with its licence and an
`UPSTREAM.md`.

The compositions were measured by our own gate, the way the registry blocks
were: **24 of 27 motion-library templates pass; none of the 8 reelforge
blocks do** — their failure is structural, not craft. The house library went
from **75 scenes to 99**, and the `data` role from 5 to 20, which was the
thin spot.

`scripts/import-hf-video-repos.mjs` is the import and the record of what was
taken from where. `scripts/qualify-compositions.mjs` is the measurement.
See [`docs/28-THE-TEN-REPOS.md`](docs/28-THE-TEN-REPOS.md).

### The Meta ad studio and the ICM workspace (2026-11-13)

The founder's ask: make Motion Master the motion-graphic studio for big
brands and for Meta/Facebook ads, callable by any LLM through a file-and-
folder structure, on ChatGPT, Codex, Hermes and Claude Code, with the API
and the MCP.

**The ICM workspace — `studio/`.** A folder tree an agent of any kind can
walk. `studio/AGENTS.md` is the map and says which folder to open for a job.
Every pipeline and every stage has a `CONTEXT.md` saying what it reads, what
it writes and what a person checks. A campaign is a **copy of a stamp**
(`studio/_templates/campaign/`), never a blank page; a brand is a **record**
(`studio/records/<brand>/`) with its kit, its voice and its campaigns. State
is the files on disk — nothing hidden in a database or a framework.

```
studio/
├─ AGENTS.md            the map
├─ CONTEXT.md           which folder for which job
├─ _shared/             house-style, ad-specs, copy-rules, brand-voice
├─ _templates/campaign/ the stamp
├─ _index/log.md        the catalog
├─ 01_meta-ad/          01_brief 02_copy 03_design 04_produce 05_deliver
├─ 02_brand-film/       a brand film or a commercial
├─ 03_cutdown/          cut a recording into shorts
├─ 04_explainer/        a diagram that draws itself
└─ records/acme-coffee/ the worked example
```

**The ad business.** A Meta ad is three things — the file, the copy and the
placement — and **the copy lives in the platform, not in the picture**. The
placements, the safe zones and the character limits are Meta's own numbers,
read on 2026-11-13, and they live in one file rather than in anyone's memory:
`studio/_shared/ad-specs.md` and `mcp/src/meta.ts`.

The finding that shaped the work: **Facebook Reels accepts zero per cent
aspect-ratio tolerance**, and the safe zone on a full-screen vertical
placement covers roughly half the frame. A sixteen-by-nine scene cropped to
nine-by-sixteen keeps **thirty-two per cent of its width**. The first
attempt reframed a landscape scene and the maths was right and the picture
was wrong — a slice, the headline half off the canvas. So the ad is
**authored at the placement's own size**, with the type stack inside the safe
area by construction.

The rendered ad: 1440×2560, six seconds, gate clean at 0 errors and 9/9
contrast checks. The gate caught two real defects — a wordmark at 3.56:1
against the canvas, and an empty first frame (which on a social player is the
thumbnail).

**The surfaces.**
- Five MCP tools: `list_meta_placements`, `check_ad_copy`, `plan_meta_ad`,
  `build_meta_ad`, `preflight_ad`. **47 tools in total.**
- Five HTTP routes under `/api/v1/meta/*`, sharing the one implementation.
- **A stdio transport** (`mcp/src/stdio.ts`, bin `motion-master-mcp-stdio`)
  — the same server, same tools, one factory. For the hosts that launch a
  server as a child process.
- Hermes: a **native plugin** at `plugins/motion-master/hermes/`
  (`plugin.yaml` + `register(ctx)`) that loads the pack under the
  `motion-master:` namespace and registers a `/motion` command. It finds the
  pack beside it in the repo, and falls back to a generated copy of the
  studio's own five skills if the plugin folder was copied on its own.
- ChatGPT and Codex: the OpenAI interface block. Claude Code:
  `.claude-plugin/plugin.json` and `.mcp.json`. The Agent Plugins v1
  package (`plugin.json` + `mcp.json`) is the Hermes-shaped one.
- The `meta-ads` skill (skill 61) teaches the whole line.

**Two real defects fixed on the way.** The Claude Code manifest still said
**"33 motion skills"** — it was not in the generator's list, so it had been
wrong for a long time without anybody noticing; it is now generated and
gated. And the server advertised 24 tools while registering 35; that had
already been caught once and came back, so the banner is now checked against
the same list the live server is checked against.

### The production loop, and the CI that proved it (2026-11-16)

The founder's ask: build the production loop into the product, then finish
it and merge it. `docs/29-THE-PRODUCTION-LOOP.md` is the blueprint;
`docs/30-THE-LOOP-IS-BUILT.md` is what was built.

The loop is six stages over a **file-and-folder** world — nothing in a
database, everything on disk:

| stage | what it is |
| --- | --- |
| P0 remediation | 11 rules that repair what the gate found, and ~175 codes that get a clear failure instead of a guessed repair |
| P1 supervisor | claims a job before it works on it, oldest first, three gate rounds per finding, six per job, and an append-only ledger |
| P2 durability | `MOTION_MASTER_DATA_DIR`; projects, jobs, briefs and the ledger all live under it; a backup that verifies by checksum |
| P3 the brief inbox | `workspace/briefs/` — a brief is a JSON file, it is taken once, and a bad one is refused with the reason written beside it |
| P4 identity | open, one key, or tenants-with-a-required-key; tenant-scoped data; an audit trail that names the tenant and never writes the key |
| P5 operations | counters that are arithmetic over the ledger, and an alert that fires when three consecutive failures share a finding |
| P6 the front door | the project editor in the page: connect to your agent, create a lower-third, edit the text and the duration, render, play it, download it, export the source, import it back |

**The CI was red before this.** It had been red for a while — the workflow
never ran the steps past the first failure, so nobody saw the rest. Four
gates failed on the first run and each one turned out to be a real defect:

1. `loop-supervisor` wrote its scratch directory into `workspace/`, which is
   gitignored and does not exist in a clean checkout. It goes in the system
   temp now.
2. `loop-panel` looked for a browser at a path that only exists in this
   sandbox. It resolves the way the house does — an explicit path, then the
   binaries on PATH — so a CI runner's `google-chrome` works too.
3. `clips-typecheck` said `tsc: not found`: the workflow installed `mcp`,
   `site` and `bridge` but never `clips`, while the gate suite runs the
   clips gates. The suite now installs what it needs, so it does not depend
   on a workflow having remembered.
4. `typescript` was never in the `clips` dependencies or its lockfile. It
   worked locally only because a loose `npm install` had left one behind.
   It is declared now, pinned to the same version the other three packages
   use.

**The gate runner now says why.** It printed `FAIL name (0s)` and left the
reason in the artifact. It prints the last twenty lines of a failing gate
now, so CI says what broke instead of asking you to reproduce it by hand.

**Every touch target is 44px.** The gauntlet failed on small targets, and
the check was only reporting four of the eighteen. The cause was the same
bug as the hero: two stylesheets own the same class. `product-v2.css` is
imported last and re-declares the house's controls smaller than the ones
that own them, so the later import won and the design shrank the controls.
Seven rules were raised. The check now counts them all and names them.

**The block verdicts were wrong, and the editor depended on one.** The
verdict came from the CLI's exit code rather than the gate's report, so a
block could be written down as a pass while its report held an error; and
a browser that died — "Target closed", "Execution context was destroyed" —
was recorded as a verdict on the composition. The report decides now, and a
browser that died gets the block measured again. The harness also had no
`--help`: asking it for help measured all 448 blocks, three of those ran at
once, each killed the others' browsers, and twelve good blocks were written
down as broken. `--help` prints the usage, and a lock file refuses a second
run.

**The editor no longer names a block.** It asked for `lt-neon-border` and
hoped it still qualified. It did not: the gate had rejected it, the render
refused it, and the person saw "the render stopped" with no way forward. The
server knows which blocks passed, so the server chooses now — the editor
asks for a block by brief and takes the first qualified one with editable
text. Naming a block no longer excuses it either: `POST /api/v1/blocks/fill`
used to take the name at face value, so a disqualified block could be filled
and handed to a render that would then refuse it.

**And the house now decides what it will publish.** The gate rates a finding
"error" or "warning"; the house has rules of its own (reading type clears
2.6% of the short side, contrast clears AA, a line a reader cannot read is
not a line a reader can read). The gate calls those warnings. The verdicts
file records measurements, and `mcp/src/verdicts.ts` holds the house policy
in one place. The frame-zero rule stays on the artifact and not on the
pool: a block is mounted, and the mount is what puts the claim on screen.

### Verification — all green as of `0215adc`

| check | result |
|---|---|
| `site: npm run build` | green — tsc, vite, and the content rules |
| overflow at 320/375/390/430/768/1024/1440 | **0** |
| `mcp: npm test` | **218/218** |
| `clips: npm test` | **20/20** |
| plugin skills | **60** |
| `mcp: node scripts/verify-tools.mjs` | **47/47** |
| `mcp: node scripts/proof-studio.mjs` | **30/30** — the kits, the scenes and the queue, against the real server |
| `clips: npm run typecheck` | clean |
| `mcp: npm run typecheck` | clean |
| `node scripts/completion-gates.mjs` | **14/14** |
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

# the ads
node scripts/check-ad-copy.mjs --placement reels-9x16 --primary-text "…" --headline "…"
node scripts/build-meta-ad.mjs --placement reels-9x16 --brief campaigns/<id>/brief.json --out campaigns/<id>/produce
npx hyperframes check campaigns/<id>/produce
bash generator/render.sh campaigns/<id>/produce campaigns/<id>/produce/ad.mp4
node scripts/preflight-ad.mjs --placement reels-9x16 --file campaigns/<id>/produce/ad.mp4

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

**The state as of 2026-11-13.** Items 1–7 below are done. The two that
remain are the push and the redeploy, and then the founder's decisions.

1. ~~**Qualify the whole 448-block pool against the gate.**~~ **Done.**
   75 of the 210 mountable compositions pass; 135 fail; the other 238 are
   snippets and are never mounted. `docs/23-THE-QUALIFIED-POOL.md`.
2. ~~**Give `enhance_prompt` a shot plan.**~~ **Done.**
3. ~~**Qualify the blocks against the gate, by role.**~~ **Done.**
   `scripts/map-block-roles.mjs`; the pool is uneven — 54 blocks can serve
   `ui-entrance`, only 6 can serve `opening`.
4. ~~**Run the gauntlet blind.**~~ **Done — and we lost the first round.**
   Fixed all three of the critic's findings. `docs/24-THE-BLIND-GAUNTLET.md`.
5. ~~**Close the visual half of the motionvideo.xyz gauntlet.**~~ **Done.**
6. ~~**Shorten the hero film.**~~ **Done.** 55.4 seconds, with a score.
   `docs/25-THE-HERO-FILM.md`.
7. **Build the ICM workspace and the four plugins.** **Done**
   (2026-11-13). `studio/`, the native Hermes plugin, the stdio transport,
   the ad studio, the five MCP tools and the five HTTP routes. See §4.
8. **The ad studio still needs three things** — and they are the next work,
   in this order:
   a. **Sound.** The rendered ad has **no audio track**, and the preflight
      says so out loud ("Meta recommends sound on an ad"). The shelf has
      1,470 sounds and the hero film already has a score
      (`hero/score.mjs`, `hero/sound-kit.json`) — the ad needs the same
      treatment: a bed and one or two accents, mixed to −18 LUFS.
   b. **A real brand.** `studio/records/acme-coffee/` is a worked example
      with no assets. A real record needs a wordmark, a kit and one real
      campaign run end to end, so the stamp has been used for something
      that was not invented.
   c. **More placements.** Four are covered. The ones that are not: the
      Stories variant (9:16 with a different bottom furniture), the in-stream
      16:9 crop of a vertical ad, and the carousel card. Meta's numbers for
      those need reading from the Ads Guide, not guessed.
9. ~~**Six high-severity dependency advisories.**~~ **Done** (2026-11-14).
   The Dependabot branch was merged and the one real break was fixed: zod
   v4 requires a key schema on `z.record()`, and **14 call sites** in
   `mcp/src/tools.ts` did not have one. Nothing else moved — the MCP SDK
   already accepted `^3.25 || ^4.0`, the tool count is still 47, and the
   server's answers are byte-identical to v3's. **218 MCP tests pass, all
   fourteen gates pass, and `npm audit` now reports zero high or critical
   advisories in `mcp/` and zero advisories of any severity in `site/`.**
   The lesson is worth keeping: this looked like a migration across 47 tool
   schemas and it was 14 mechanical edits. Measure before you dread.

10. **Redeploy the site.** The live URL still serves the old structure, which
   includes a Pricing section — forbidden while the offer is not on sale.
   The current build is ready, measured and gated; it needs the founder's
   word because the deployment is public.
11. ~~**Push local `main` to `executiveusa/motionmaster`.**~~ **Done**
    (2026-11-14). The remote is at `be569ab`; local and remote are level. **The founder has to
    enter the newest device code every time; an approval against an expired
    code does not count, and the codes expire in about fifteen minutes.**
12. **Build the production loop.** **P0 and P1 are done** (2026-11-14).
    See `docs/30-THE-LOOP-IS-BUILT.md`. The remediation table has eleven
    rules, each proved by re-gating a real composition in a real browser;
    the supervisor takes the oldest queued job, claims it before working,
    gates it, repairs what it can inside a budget of three rounds, renders
    it, publishes it, and escalates with the findings that survived.
    **50 MCP tools**, three HTTP routes under `/api/v1/supervisor/`, an
    append-only ledger, and two new completion gates (sixteen in all).

    **P3 is done too.** Work now arrives on its own: `workspace/briefs/` is
    a watched directory, a brief is a JSON file, and the supervisor takes it
    on its next tick — once, and never twice. `submit_brief` (an MCP tool)
    and `POST /api/v1/supervisor/brief` put work in the inbox from an agent
    or a script. A brief that cannot be read is refused with a reason and the
    loop keeps going. **51 MCP tools, four HTTP routes, seventeen gates.**

    **P2, P4, P5 and P6 are built too** (2026-11-15). The data directory
    lives outside the tree a redeploy wipes, and the backup is verified by
    restoring it. A key decides who you are, which tenant you are and how
    many films you may make today; the quota is counted from the ledger, and
    the audit trail never writes the key. There are metrics, one alert (three
    failures with the same finding — a broken rule, not a bad brief), a
    Dockerfile and a compose file. And the front door: a loop panel on the
    console section that shows the queue and the ledger and takes a brief —
    and that says plainly when the studio is not running, rather than
    showing zeroes. **52 MCP tools, nineteen gates, five of them proofs of
    the loop.**

    **Still open, in order:**
    - **The seven unattended days.** The product-level definition of done
      says the loop runs for a week without a restart, every job resolved,
      every failure legible. That is the next measurement, and it is the
      only one that proves this is a product rather than a demonstration.
    - **The image has never been built.** There is no Docker in this
      sandbox, so `Dockerfile` and `docker-compose.yml` are reviewed rather
      than run. Treat the first build as untested.
    - **P3's source** — the inbox works, but nothing writes into it yet on a
      schedule. A webhook or a recurring brief file is the missing half.
13. **Founder decisions still open**: the OpenRouter key (BYO PKCE vs a
    server fallback), the public surface, popebot fork-vs-configure (Phase 2
    — ships labelled unverified, no Docker here), a render machine, and
    whether to keep the old remote.

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

**The bundle is current.** It was rebuilt after the last commit and verified
by restoring it: 350+ commits, 4,342 files, 61 skills, 18 studio contracts,
47 MCP tools. It carries the final `main`, so check it rather than trusting a
hash written down here:

```bash
git bundle list-heads motion-master.bundle | grep refs/heads/main
# it must equal: git rev-parse main
```

- `/workspace/motion-master.bundle` — the git bundle, every branch and tag
- `/workspace/motion-master-push.zip` — the bundle, the parts, the checksums,
  `HANDOFF.md` and `scripts/push-to-final-home.sh`
- `/workspace/bundle-parts/` — the bundle in seven 32 MB pieces,
  `motion-master.bundle.part-00` … `part-06`
- `/workspace/SHA256SUMS.txt` — the checksums for all of it

```bash
git clone motion-master.bundle recovered
cd recovered && git checkout main
git remote set-url origin https://github.com/executiveusa/motionmaster.git
```

Or, from the parts:

```bash
cat bundle-parts/motion-master.bundle.part-* > motion-master.bundle
sha256sum -c SHA256SUMS.txt
```

**The push is done.** `executiveusa/motionmaster` is at the tip of `main` and the
remote is level with local `main` — 0 commits ahead on either side.

### The credential helper bites after a sandbox recycle

The push failed once with `could not read Username for 'https://github.com'`
even though `gh` was authenticated and working. The cause: git's credential
helper in `/workspace/.home/.gitconfig` pointed at the **mount path of an
earlier session** (`/run/csi/mount-root/nas/<hash>/.home/bin/gh`), which
stops existing when the sandbox is recycled. The fix is a helper that does
not name a session-specific path:

```bash
git config --global --replace-all credential.https://github.com.helper "!gh auth git-credential"
```

That resolves `gh` on `PATH`, and `gh` itself lives at
`/workspace/.home/bin/gh` so it survives the next recycle. Put that on
`PATH` in every shell that pushes.

### And never wrap `gh auth login` in `timeout`

`gh auth login --web` prints a code and then **polls** GitHub's device
endpoint. If the process is killed — by a `timeout`, or by a shell that
dies — the code is never exchanged and the token in `hosts.yml` stays the
old dead one. The symptom is identical to "the founder approved the wrong
thing": `gh api user` → `Bad credentials`. Run it as a background task with
a long window and report the code immediately.


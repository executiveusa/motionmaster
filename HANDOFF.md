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

### The site — rebuilt 2026-10-24

- The hero leads with the headline; the film runs full-bleed beneath it and
  opens on the work, not on black.
- Two scroll scenes on a GSAP stage (`site/src/modules/stage.ts`,
  `site/src/modules/scenes.ts`): the three demo films fly through; the clip
  grows from a window while the source that made it reads itself in.
- The copy is cut: 10 sections, 1,742 words, no eyebrow kickers, no tricolons.
- GSAP 3.15.0 is bundled from npm into its own chunk (`gsap-*.js`), so the
  content check can tell vendor bytes from ours. **There are still zero
  external requests.**
- The clips and the hero film were **re-rendered** because their words were
  baked into the frames. `scripts/rebuild-media.sh` runs the whole chain.

### The agent surfaces

- **MCP**: 26 tools. New this round: `get_motion_block` (one block's variables
  in full) and `check_hyperframes` (run the gate, get the findings **with the
  file each one came from**).
- **HTTP API**: `/api/v1` with an OpenAPI document at `/api/v1/openapi.json`.
  Optional bearer auth via `MOTION_MASTER_API_KEY`.
- **Plug-in**: 39 skills (the new one is `motion-master-api`), with the Claude,
  Codex and Cursor marketplaces updated.

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

### Verification — all green as of `65af542`

| check | result |
|---|---|
| `site: npm run build` | green — tsc, vite, and the content rules |
| overflow at 320/360/375/390/414/430/768/1024/1280/1440 | **0** |
| `mcp: npm test` | **169/169** |
| `clips: npm test` | **20/20** |
| plugin skills | **47** |
| `clips: npm test` | **20/20** |
| plugin skills | **47** |
| `mcp: node scripts/verify-tools.mjs` | **46/46** |
| `clips: npm run typecheck` | clean |
| `clips: npm run typecheck` | clean |
| `mcp: npm run typecheck` | clean |
| `node scripts/completion-gates.mjs` | 9/9 |
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

1. **Qualify the whole 448-block pool against the gate.** ≈8 s a block, no new
   code. The matcher currently picks on tags; once the pool is qualified it can
   only ever choose a block that passes. This is the highest-value hour left.
2. **Give `enhance_prompt` a shot plan**, so the matcher chooses instead of
   guessing.
3. **Qualify the 448 blocks against the gate, by role.** The shot cards now
   name the roles, so the blocks can be qualified per role and the matcher
   can choose a block that fits the *shot*, not just the words.
4. **Run the gauntlet blind.** The bars were fetched and compared by eye, but
   the exit condition is that a critic, blind, picks ours. That has not been
   run with a fresh critic. The loop is `gauntlet-loop-main` — builder, harsh
   critic, blind comparison, repeat until ours wins.
4. **Close the visual half of the motionvideo.xyz gauntlet** on a machine that
   can load their site.
5. **Shorten the hero film.** 104 s is a long thing to put on a front page. A
   45–60 s cut would be better and costs one render.
6. **Founder decisions still open**: the OpenRouter key (BYO PKCE vs a server
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

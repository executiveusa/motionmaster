# 20 — THE VIDEO REPOS, AND WHAT THEY CHANGE

**Date:** 2026-11-10
**Trigger:** "10 GitHub Repos to 10x Your AI Motion Graphics" — Matt Penny,
Applied AI (`youtube.com/watch?v=aD9X6Lc3dVk`).
**Source of truth:** `executiveusa/motionmaster` main.

---

## 1. The video

Ten chapters, one repo each, about making an agent's motion graphics better by
giving it libraries to reach for:

| # | 0:44 | repo | what it is |
|---|---|---|---|
| 1 | 0:44 | `lemomo-ai/lemo-opuscar` | 66 film styles, each one a style prompt plus a demo made in code |
| 2 | 2:34 | `mrdoob/three.js` | WebGL |
| 3 | 4:00 | `patch-gg/pixelfx` | 244 pixel-art effects, every one a small piece of code |
| 4 | 4:53 | `ahujasid/mcp-for-blender` | drive Blender from the agent |
| 5 | 7:04 | `yihui-dev/awesome-opus5-5-videos` + `joeseesun/opus-video-prompts` | the videos and the prompts behind them |
| 6 | 8:13 | `JohnHeibel/ClaudeAnimationBase` | hand-painted cartoon animation in p5.js |
| 7 | 8:58 | `pmndrs/react-three-rapier` | physics in React |
| 8 | 9:56 | `pmndrs/react-postprocessing` | post-processing for react-three-fiber |
| 9 | 10:49 | `librosa/librosa` | audio and music analysis |
| 10 | 11:38 | `Vincentwei1021/video-shotcraft` | 124 shot recipe cards, beat sync, sound design |

The list is a good list. Two of them are already ours, and two of the rest
fill a gap we had. The other seven are libraries, styles or reference
collections that do not change what Motion Master *is*.

## 2. The gap we had

Motion Master could pick a **block** — a piece of layout — and it could
time a film, and it had a sound shelf with 1,470 sounds in it. What it could
not do was pick a **shot**.

A brief says what the film is about. It does not say where the film opens,
how the words land, where the camera moves, how the beat falls, how it ends.
Without that, every brief renders as the same five seconds of a headline
sliding in. That was the real ceiling — and it was on our own ledger as
MM-04 ("shot-role-aware matching") and as the open item "give `enhance_prompt`
a shot plan so the matcher chooses instead of guessing."

## 3. What we adopted

### 3.1 `Vincentwei1021/video-shotcraft` — the shot vocabulary

**Apache-2.0.** 124 shot cards, each one an authored technique: what it is
for, how long it runs, how much energy it spends, the parameters, and the
traps its author already hit.

Imported to `plugins/motion-master/skills/shotcraft/` — the cards, the beat
sync and sound references, the licence, and an `ATTRIBUTION.md` that records
per research batch which public work each technique was studied from. The
implementations were written from scratch, with no original footage, art or
brand elements, and they stay that way.

This is the one that changes the product. It is the missing half of the
brief.

- `mcp/src/shots.ts` reads the 124 cards into a catalogue: role, summary,
  use-when, duration, energy, tags, path.
- **MCP `plan_shots`** builds a plan from a brief: an opening, the shots the
  brief asks for, a transition, an outro — each one a real card, each one
  cited.
- **MCP `list_shots`** and **`get_shot`** for browsing.
- **HTTP** `GET /api/v1/shots`, `GET /api/v1/shots/{id}`,
  `POST /api/v1/shots/plan`.
- **`enhance_prompt`** takes `plan_shots: true` and writes the plan into the
  brief, so the enhancer stops guessing a shape of its own.

Two rules from the cards are now enforced in code, because they are the
difference between a film and a sequence of slides:

1. **The opening spends little energy.** The cards are explicit — a film that
   opens on its best trick has nowhere to climb. The planner takes the
   cheapest opening among those that fit the brief, and falls back to the
   role's general card rather than opening on a firework.
2. **The ending is not optional.** A brief too short for an opening and an
   outro gets told so, rather than getting a film with no ending.

The planner is deterministic, like the enhancer: the same brief gives the
same plan, and everything it could not decide is reported in `unresolved`.

### 3.2 `patch-gg/pixelfx` — the effect shelf

**MIT.** 244 effects across 21 categories, every one a small file of code
with no dependencies. The ten under `transitions` — blinds, burn-away,
crt-off, diamond wipe, glitch wipe, iris, pixel dissolve, shatter wipe, slash
wipe, star iris — are usable between two shots as they are.

Imported to `plugins/motion-master/skills/pixelfx/` with its licence,
notice and catalogue.

- `mcp/src/effects.ts` reads the catalogue and the tags out of the source.
- **MCP `list_motion_effects`** and **`get_motion_effect`**.
- **HTTP** `GET /api/v1/effects`, `GET /api/v1/effects/{id}`.

An effect here is code, not a description. The agent opens the file and uses
it, rather than being asked to draw something like it.

### 3.3 `lemomo-ai/lemo-opuscar` — refreshed

Already ours. Upstream has moved from 60 styles to 66; the refresh is queued.

## 4. What we did not adopt, and why

| repo | why not, yet |
|---|---|
| `mrdoob/three.js`, `pmndrs/react-three-rapier`, `pmndrs/react-postprocessing` | Libraries, not skills. Each adds hundreds of kB to every render, and WebGL in a headless render is a risk we have not tested. `react-postprocessing` is the one worth taking when we want 3D — on its own, not as a stack. |
| `ahujasid/mcp-for-blender` | MIT and excellent, but it needs Blender installed and a GPU. It is a Phase 3 capability, and it would ship labelled unverified — no Docker and no GPU in this sandbox. |
| `yihui-dev/awesome-opus5-5-videos` | MIT, and it is a good library — but it is *reference videos*, a different asset class from the 3,988-item prompt catalogue we already hold. Worth adding to the catalogue when we want reference films rather than prompts. |
| `joeseesun/opus-video-prompts` | **No licence file and no licence statement anywhere in the repository.** No licence means no permission. Not vendored. |
| `JohnHeibel/ClaudeAnimationBase` | MIT, and it is a lovely style — hand-painted cartoon animation. It is a *style*, and we have a styles shelf. Candidate for the next style import; not urgent. |
| `librosa/librosa` | ISC, and this is the interesting one: it is how the beat sync becomes real. Held back because we have no music in the library — 1,470 sound effects and no tracks to cut. The moment there is music, librosa is the beat grid. |

## 5. Where this lands on the ledger

| ticket | before | after |
|---|---|---|
| MM-04 — shot-role-aware matching | blocked on a shot vocabulary | **the vocabulary exists**; the matcher can rank blocks against a role |
| MM-02 — beat visibility | a gap | `references/music-beat-sync.md` is vendored; the beat grid itself is still ahead of us, behind music |
| "give `enhance_prompt` a shot plan" | open | **done** — `plan_shots: true` |
| "qualify the 448 blocks against the gate" | open | still open, and now better targeted: qualify blocks per role, using the cards' roles |

## 6. What the next upgrades are, in order

1. **Qualify the 448 blocks against the gate, by role.** Now that a shot plan
   names the roles, the blocks can be qualified and indexed per role, and the
   matcher can choose a block that fits the shot rather than a block that
   fits the words.
2. **Music, and then the beat grid.** The sound shelf has effects and no
   tracks. A track library plus librosa would let the cut land on the beat —
   which is the one thing a soundtrack is for.
3. **One style import: `ClaudeAnimationBase`.** A hand-painted style on the
   shelf, to prove the styles shelf is a shelf and not a shelf of one.
4. **Three.js, on its own, when we want 3D.** `react-postprocessing` first;
   `react-three-rapier` only if physics is ever wanted, which for motion
   graphics it usually is not.
5. **Blender, last, and labelled.** It is a different product: a 3D studio
   with an agent in it, not a motion-graphics engine.

## 7. The honest bit

This upgrade did not add a feature anybody can see on the landing page. It
added the vocabulary that the agent thinks in. Before it, an agent given
"a launch film for a developer tool dashboard" had a style library, a block
library, a sound shelf and a deterministic enhancer, and no idea what a shot
was. Now it has 124 of them, written down by somebody who had to learn the
hard way, and the plan it produces says which card each shot came from — so
when the shot is wrong, the fix is a card swap rather than an argument.

That is the difference between a generator and an agent that knows craft.

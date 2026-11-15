# 29 — The production loop

**From a mock-up to a product that runs itself.**

Written 2026-11-14. Read this with `HANDOFF.md`. This document is the
blueprint; `HANDOFF.md` says where everything is.

> **P0 and P1 are done.** The remediation table and the supervisor are built,
> and both are proved — see
> [`docs/30-THE-LOOP-IS-BUILT.md`](30-THE-LOOP-IS-BUILT.md) for what was
> built, what the work turned up that this blueprint did not know, and what
> is still missing (P2 to P6, and the seven unattended days).

---

## 0. What is real today, and what is not

Honesty first, because a handoff that flatters the current state wastes the
next model's week.

### Real. Do not rebuild it.

| | |
|---|---|
| **The gate** | `hyperframes check` runs on every composition before a render is attempted. It catches contrast, the type floor, occlusion, overlap and empty first frames, and it names the finding. 75 of the 210 mountable blocks in the registry pass it; 135 fail. |
| **The renders** | Real MP4s at 1920×1080 and 1440×2560, h264 + AAC, mixed and loudness-measured. A 55-second scored hero film, three demo films, a 20-second engine promo, a Meta ad. |
| **The tool surface** | 47 MCP tools over two transports, 51 HTTP routes, 61 skills. |
| **The block pool** | 448 registry entries qualified against the gate; `library/block-verdicts.json` holds every verdict. The matcher only ever offers a block that passed. |
| **The role map** | Every passing block mapped to the shot roles it can serve, so a shot gets a block that fits its job, not just its wording. |
| **The queue** | `mcp/src/queue.ts` — content-hash keyed, one job at a time, local or remote target. |
| **The job state machine** | `mcp/src/projects.ts` — `queued → rendering → ready → failed → cancelled`, with `start / complete / fail / cancel / retry` as the only legal transitions, and illegal ones rejected. |
| **The house library** | 75 reusable scenes, each already gate-passing and role-filed. |

### Not real. This is the work.

| gap | why it matters |
|---|---|
| **No supervisor.** The worker runs jobs that are handed to it. Nothing picks work up on its own, nothing retries, nothing escalates. | This is the single biggest gap. Everything else is a feature of the loop, not of the pipeline. |
| **No remediation.** A gate failure is a failed job. Nothing tries to fix it. | The loop needs to be able to repair a finding without a human, or "persistent" just means "fails persistently". |
| **No persistence beyond the filesystem.** Projects live in a directory. Fine for one box; not for a fleet, not for a crash mid-job. | Durable state exists (jobs are written to disk), but the *queue* is in-process. |
| **No scheduler.** Nothing runs on a clock. | A studio that only works when someone types is a tool, not a product. |
| **No auth.** The bearer key is optional and unset. There are no users, no tenants, no quotas. | |
| **No observability.** No metrics, no traces, no structured logs, no alert. | A loop that runs unattended for a week cannot be debugged by reading a terminal. |
| **No packaging.** No Dockerfile, no image, no deploy. | |
| **No backups.** The recovery bundle is manual. | |
| **Single machine.** 2 cores, 3 GB, no GPU. | The remote target in the queue exists but has never pointed at a second box. |

---

## 1. What "production" means here

Not "it scales". It means:

1. **It runs without being told.** Work arrives; the studio picks it up, does
   it, checks it, and ships it. Nobody says "go".
2. **It finishes.** A job reaches `ready` or it reaches `failed` with a
   reason a human can act on. There is no third state where it hangs.
3. **It never ships a broken thing.** The gate is not advisory. A render that
   fails the gate is a failed job, and it is not published.
4. **It does not spin.** Every loop has a budget. When the budget is spent,
   the loop stops and reports. An unattended loop that retries forever is
   worse than one that fails.
5. **It can be trusted with money.** Not yet — but the path is: the licence
   says `onSale: false`, and that stays true until the founder says
   otherwise. Nothing in the loop may bill anyone.

---

## 2. The loop

### 2.1 The shape

```
                     ┌─────────────────────────────────────────┐
                     │            THE SUPERVISOR                │
                     │  wakes on a clock, claims work, decides  │
                     └───────────────┬─────────────────────────┘
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        │                            │                            │
   ┌────▼─────┐                ┌─────▼──────┐               ┌────▼────┐
   │  PLAN    │                │  PRODUCE   │               │ PUBLISH │
   │ brief →  │                │  compose   │               │ package │
   │ shotlist │                │  gate      │               │ deliver │
   │ copy     │                │  render    │               │ report  │
   └────┬─────┘                └─────┬──────┘               └────┬────┘
        │                            │                            │
        └──────────────┬─────────────┴────────────────────────────┘
                       │
              ┌────────▼────────┐
              │   THE GATE      │  contrast · type floor · occlusion
              │                 │  overlap · first frame · runtime
              └────────┬────────┘
                       │ fail
              ┌────────▼────────┐
              │  REMEDIATION    │  classify the finding → apply the
              │  (bounded)      │  named repair → re-gate
              └────────┬────────┘
                       │ budget spent
              ┌────────▼────────┐
              │   ESCALATE      │  stop, write the report, wait
              └─────────────────┘
```

### 2.2 The six stages, and the contract at each

Every stage reads files and writes files. Nothing is hidden in memory, so a
crash loses at most one stage's output, and a stage can be re-run alone.

| stage | reads | writes | done when |
|---|---|---|---|
| **PLAN** | the brief, the brand record, `_shared/` | `brief.json`, `copy.md`, `design.json`, the shot list | the copy passes the placement's limits and every claim is traceable to the brief |
| **COMPOSE** | the plan, the house library, the block verdicts | the HyperFrames project on disk | the composition mounts and the block matcher chose only passing blocks |
| **GATE** | the composition | the gate report | `hyperframes check` reports zero errors |
| **REMEDIATE** | the gate report | the patched composition | the finding's named repair is applied and the gate is re-run |
| **RENDER** | a passing composition | the MP4, the stills, the loudness report | the file exists, decodes, and meets the placement's contract |
| **PUBLISH** | the render, the copy | `ad.json`, `thumbnail.jpg`, `preflight.json`, the report | the preflight is clean and the artifact is registered |

**The order is fixed and the gate is never skipped.** A render is not
attempted until the gate passes (`mcp/src/render.ts` already enforces this).

### 2.3 Remediation — the part that makes it a loop

The gate's findings are structured: a code, a message, and sometimes the
exact value that would pass. That is enough to repair a finding without a
human, for a known set of codes.

| finding | the repair | where |
|---|---|---|
| `contrast_aa_failure` | the gate names the colour that passes — swap the token in the composition's stylesheet | `generator/compositions/*/styles.css` |
| `text_below_floor` | raise the size to the floor (2.6% of the short side); if the text is texture, mark it `data-layout-ignore` | the composition's type tokens |
| `first_frame_empty` | the claim has to be on screen at frame zero — set its entry tween's start to `0` and remove any delay | the composition's tween |
| `content_overlap` | one thing at a time — drop or move the later element | the composition |
| `text_occluded` | raise the z-index of the text or move the occluder | the composition |
| `clipped_text` | refit: wrap, then shrink, never below the floor | the composition |
| `check_runtime_failure` | the block is unusable — drop it and take the next passing block for that shot role | `mcp/src/blocks.ts` (`matchBlocks`) |
| `console_warning` | record it; a warning does not fail the gate | — |

**The budget.** Three remediation attempts per gate finding, and six per
job. When the budget is spent the job goes to `failed` with the finding, the
attempts and the state of the composition at the last attempt. It does not
retry forever.

**The rule for new findings.** An unknown finding code is never "fixed" by
guesswork. It fails the job and asks for a remediation rule. Adding a rule
to the table above is a code change, and it must come with a test that
proves the repair clears the finding.

### 2.4 The supervisor

One process. Its whole job is to keep the queue moving.

```
every tick (default 30s):
  if a job is already running: sleep
  claim the oldest queued job whose retry count is under budget
  if none: sleep
  run the job through the stage machine
  on success: publish, record the evidence, continue
  on gate failure: remediate within budget, re-gate
  on budget spent: mark failed, write the report, continue
```

**It is idempotent.** Claiming a job writes its id and the attempt number to
the job file before any work starts. A supervisor that dies mid-job leaves
the job in `rendering`, and the next supervisor sees it, checks the artefact,
and either completes it or fails it as interrupted. There is exactly one
transition function for that (`mcp/src/projects.ts` already refuses illegal
transitions — use it).

**It never decides taste.** The gate decides pass/fail. The supervisor only
decides order, retry and escalation. If a finding needs a human's judgement
— "is this claim true?" — the job fails with `needs_judgement` and waits.

**One at a time by default.** `MOTION_MASTER_RENDER_CONCURRENCY` raises it
when the machine can take it. On a 2-core box that number is 1.

### 2.5 The three state stores

| store | what it holds | where it goes |
|---|---|---|
| **The repo** | the studio: the skills, the blocks, the house library, the brand records | git. Today, the GitHub remote. |
| **The workspace** | the work in progress: projects, revisions, jobs, renders | a directory per project under `projects/`, one per film under `films/`. |
| **The ledger** | what happened: every job, every attempt, every gate finding, every publish | append-only JSONL. **This is the one thing that must never be lost.** It is what turns a pile of renders into a studio. |

The ledger is the product's memory. Without it there is no history, no
"why did this fail", no cost per render, and no way to tell the difference
between a bad brief and a bad composition.

---

## 3. The definition of done, at four levels

A handoff is only useful if "finished" is unambiguous.

### 3.1 An artifact is done

- The gate reported zero errors.
- The file decodes: the right size, the right duration, the right codec.
- The loudness is measured and inside the target (films: −18 LUFS, −1.5 dBTP).
- The first frame carries the claim — it is the thumbnail.
- Every piece of reading type clears 2.6% of the short side.
- The preflight is clean for the placement it is for.

### 3.2 A campaign is done

- Every deliverable in the brief exists and meets 3.1.
- The copy passes the placement's limits, and every claim is traceable to the
  brief — no invented offer, no invented number, no invented name.
- The delivery package is complete: the file, the copy, the placement, the
  thumbnail, the preflight.
- A human has read `copy.md` and `design.json`. **This is the one step the
  loop never takes.** A campaign is shipped by a person; the loop makes the
  work ready for them.

### 3.3 The product is done

- The supervisor runs unattended for **seven days** without a restart and
  without an unreported failure.
- Every job in that week reached `ready` or `failed` with a reason.
- Every failure that reached `failed` has an entry in the ledger with the
  gate finding, the attempts and the last state.
- No job is stuck in `rendering` for longer than its timeout.
- The gate's remediation table covers every finding code seen in those seven
  days, or each uncovered code is a named follow-up.
- A new brief can be turned into a shipped campaign with **no human writing
  code** — only the brief, the copy review and the publish decision.

### 3.4 A release is done

- All fourteen `scripts/completion-gates.mjs` gates pass.
- The plugin contract is in sync (`scripts/check-plugin-contract.mjs`).
- The plugin manifests are regenerated, not hand-edited.
- The dependency advisories are assessed and the ones marked safe are fixed.
- The recovery bundle is rebuilt **after** the release commit and verified by
  restoring it.
- The site is deployed and the deployed build is what the repo says it is.

---

## 4. The phases

Each phase has a command that proves it is done. A phase is not done until
its proof command passes.

### P0 — Remediation (the gate can teach the loop to fix itself)

*Turns a failed job into a retryable one.*

- [ ] A `remediations.ts` with the table in §2.3, each entry naming the
      finding code it handles.
- [ ] `applyRemediation(compositionDir, finding)` — patches the composition
      on disk and returns what it changed.
- [ ] A test per rule: given a composition with the finding, the rule
      applies and the gate then passes. **The proof is the gate, not the
      unit test.**
- [ ] `npm run build && node --test mcp/test/*.mjs` green.

**Proof:** `node scripts/proof-remediation.mjs` — takes each known finding,
manufactures a composition with it, runs the repair, and shows the gate
going from fail to pass. Exits non-zero if any rule fails to clear its
finding.

### P1 — The supervisor (the loop runs)

- [ ] `mcp/src/supervisor.ts` — the tick loop of §2.4.
- [ ] Claim-before-work, so a crash is recoverable.
- [ ] `MOTION_MASTER_SUPERVISOR=1` gates it off in the config, so the
      default server never starts it by accident.
- [ ] A ledger writer: one JSONL line per job event.
- [ ] A dry-run mode that does everything except publish.

**Proof:** `node scripts/proof-supervisor.mjs` — queue three jobs (one that
passes, one that fails the gate once and is repaired, one that fails
permanently), run the supervisor, and assert: the first reaches `ready`, the
second reaches `ready` **after a repair**, the third reaches `failed` with
its budget spent, and the ledger has one line per event.

### P2 — Durability (the state survives a crash and a reboot)

- [ ] Jobs and the ledger live outside the repo tree, in a data directory
      that is not wiped by a redeploy.
- [ ] A startup reconciliation pass: any job left in `rendering` by a dead
      process is marked failed as interrupted (`reconcileJobs` already exists
      — wire it to the supervisor's start).
- [ ] A backup of the ledger and the project directory, on a schedule, to
      somewhere that is not the same disk.

**Proof:** kill the supervisor mid-job, restart it, and assert the job is
reconciled rather than lost; then restore the backup into a clean directory
and assert the ledger is intact.

### P3 — The clock (work arrives on a schedule)

- [ ] A scheduler: briefs arrive from a watched directory, a webhook, or a
      recurring brief file.
- [ ] A brief format that a human or another model can write without
      reading this repository — the fields are in `studio/_templates/campaign/brief.json`.
- [ ] A nightly digest: what was produced, what failed and why, what is
      waiting for judgement.

**Proof:** drop a brief file into the watched directory, run the scheduler
once, and assert a campaign appears in the ledger and reaches `ready`.

### P4 — Identity (the studio can be opened by someone other than the owner)

- [ ] Real authentication on the HTTP API and the MCP endpoint. The bearer
      key becomes one user, not the whole model.
- [ ] Per-tenant workspaces: a brand's records, renders and ledger are
      separate.
- [ ] Quotas per tenant: renders per day, storage, concurrency.
- [ ] Audit: every publish records who asked for it.

**Proof:** two tenants, one API key each; tenant A's project list does not
contain tenant B's anything; tenant B's quota stops it and returns a clear
error.

### P5 — Operations (it can be run and watched in production)

- [ ] Structured logs, one JSON object per event, with the job id in every
      line.
- [ ] Metrics: jobs by state, gate findings by code, render duration,
      loudness, success rate.
- [ ] An alert when a job fails three times in a row with the same finding —
      that is a broken rule, not a bad brief.
- [ ] A Dockerfile, a compose file for the API and the worker, and a
      health check that means something (`/health` already exists).
- [ ] Secrets from the environment, never from a file in the repo.

**Proof:** run the stack under compose, kill the worker, and assert the
supervisor's restart recovers it and the alert fires.

### P6 — The surface (a client can use it without the founder)

- [ ] The chat console: the brief in, the plan back, the render queued, the
      copy reviewable in the page. The OpenRouter key is BYO via PKCE — that
      decision is made, the plumbing is not built.
- [ ] One command to go from a folder of briefs to a folder of finished
      campaigns.
- [ ] The billing question, answered by the founder, not by the code. The
      licence says `onSale: false` and the loop must not bill anyone until
      that changes.

**Proof:** a brief typed into the console produces a campaign in the ledger
that a person can review and ship.

---

## 5. The order, and why

P0 and P1 first, in that order, and nothing else matters until both are
done.

Without P0 the loop fails on the first bad render and needs a human every
time. Without P1 the loop is a script someone has to run. **P2–P6 make it
durable, openable, watchable and sellable — in that order, because each one
is worthless without the one before it.**

P4 is deliberately late. The studio is the founder's own, and a multi-tenant
identity system built before the loop can keep a promise is a system built
around a loop that does not work yet.

---

## 6. The traps, restated for the next model

Everything here has already cost time once. All of it is in `HANDOFF.md` §6
and §9; this is the short list for someone about to work on the loop.

- **Never let two stylesheets own the same classes.** It happened: two files
  declared the hero, the later import won, and the designed one was dead
  weight for several rounds while every screenshot still looked plausible.
  Found it with `getComputedStyle` on the live DOM, not by looking at
  pictures.
- **Never crop a frame of our own work.** Every render is 16:9, so every
  card holding a render is 16:9. A title card cut mid-word reads as a broken
  render, not as a crop.
- **Never resolve a frame index twice.** It was done once; the cache key and
  the file on disk disagreed and every affected frame came back black.
- **ffmpeg reads stdin by default.** Always pass `-nostdin`.
- **Kill stray browsers before a render.** Eleven orphaned Chrome processes
  exhausted 3 GB and Remotion failed with a 25-second browser timeout.
- **Render in foreground chunks.** Long renders die as background tasks. A
  render that dies at minute 40 is worth nothing; a chunk that dies at
  minute 9 costs nine minutes. `hero/render.mjs` takes `--from`/`--to`.
- **Never `pkill -f "node dist/index.js"` in the same command** that
  contains that string — it matches its own shell and kills the call. Use
  the bracket trick, and run the `pkill` in its own bash call.
- **The sandbox kills background processes between bash calls.** Long-lived
  servers and pollers must use the tool's `run_in_background`, not shell `&`.
- **The credential helper points at a session's mount path** after a recycle.
  `git config --global --replace-all credential.https://github.com.helper
  "!gh auth git-credential"`.
- **Never wrap `gh auth login` in `timeout`.** It kills the poller and the
  code is never exchanged; the symptom looks identical to a rejected
  approval.

---

## 7. The two decisions only the founder can make

1. **Is this sold, or is it internal?** The licence says `onSale: false` and
   the loop must not bill anyone until that changes. Everything in §3.3
   assumes internal use.
2. **Where does the heavy rendering happen?** The queue already supports a
   remote target that has never pointed at a second box. A product needs
   either a render fleet or a clear "your machine renders it" position.

---

## 8. Where everything is

| | |
|---|---|
| The studio | `studio/` — `AGENTS.md` is the map, `CONTEXT.md` per pipeline and stage |
| The gate | `mcp/src/render.ts` (`gateProject`), `library/block-verdicts.json` |
| The queue | `mcp/src/queue.ts` |
| The job state machine | `mcp/src/projects.ts` |
| The worker | `mcp/src/project-worker.ts` |
| The tools | `mcp/src/tools.ts` (47), `mcp/src/api.ts` (51 routes) |
| The house library | `studio/templates.json` — 75 scenes, built by `scripts/build-house-library.mjs` |
| The block pool | `library/blocks.json` (448), `library/block-roles.json` |
| The gates | `scripts/completion-gates.mjs` (14) |
| The proofs | `scripts/proof-*.mjs`, `mcp/scripts/proof-*.mjs` |
| The brand | `studio/records/<brand>/` |
| The offer | `licence.json` — the only source; everything else is generated |
| The agent surfaces | `plugins/motion-master/` (ChatGPT, Codex, Claude Code, Hermes) |

**The rule that keeps all of it honest:** the contract is generated, never
hand-written. `licence.json` is the only source of the offer; the plugin
manifests, the site's pricing, the MCP's licence twin and the ad studio's
numbers are all written by scripts, and a script checks that they still
match. Extend that pattern: anything a second person could restate wrongly
should be generated, and something should fail when it is not.

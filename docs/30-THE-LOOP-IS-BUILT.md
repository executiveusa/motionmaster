# 30 — The loop is built

**P0 and P1 are done.** The blueprint is `docs/29-THE-PRODUCTION-LOOP.md`; this
is what was actually built, what it cost, and what it does not do yet.

Written 2026-11-14.

---

## What exists now

| | |
|---|---|
| `mcp/src/remediations.ts` | eleven rules, one per repairable finding code, plus the colour maths |
| `mcp/src/supervisor.ts` | the loop: claim, gate, repair, re-gate, render, publish, escalate, ledger |
| `scripts/proof-remediation.mjs` | the proof of every rule, on a real gate, in a real browser |
| `scripts/proof-supervisor.mjs` | the proof of the loop: three jobs, one passes, one is repaired, one exhausts its budget |
| `mcp/src/inbox.ts` | the brief inbox: work arrives on its own |
| `scripts/proof-inbox.mjs` | the proof of the arrival: a brief is taken once, and a bad one says why |
| `mcp/src/tenants.ts` | identity: a key decides who you are and how much you may make |
| `mcp/src/metrics.ts` | the counters, counted from the ledger |
| `scripts/proof-identity.mjs` | the proof of the identity layer, against a real server |
| `scripts/proof-loop-panel.mjs` | the proof of the front door, in a real browser |
| `scripts/backup-data.mjs` | a verified backup of the data directory |
| `scripts/alert-loop.mjs` | the one alert worth having |
| `Dockerfile`, `docker-compose.yml` | the studio as two processes and a volume |
| `mcp/test/remediation.test.mjs` | sixteen unit tests for the arithmetic and the refusals |
| `run_supervisor`, `supervisor_status`, `start_supervisor`, `submit_brief` | four MCP tools — **51 tools in total** |
| `/api/v1/supervisor/{status,ledger,tick,brief}` | four HTTP routes |
| `scripts/completion-gates.mjs` | **nineteen gates**, five of which are the loop's own proofs |

```bash
node scripts/proof-remediation.mjs    # 8 rules, each proved on the gate
node scripts/proof-supervisor.mjs      # 24 checks on the loop's behaviour
node scripts/proof-inbox.mjs           # 16 checks on the arrival
node scripts/proof-identity.mjs        # 15 checks on who may use the studio
node scripts/proof-loop-panel.mjs      # 10 checks on the front door
node scripts/alert-loop.mjs            # exits 1 when the loop needs a person
node scripts/backup-data.mjs           # a backup, verified by restoring it
```

---

## The three things that were not in the blueprint

The blueprint said the remediation table would map findings to repairs. Three
things turned up that it did not know, and each one changed the design.

### The gate's raw finding was being thrown away

`readGateFindings` kept the code, the severity, the message and the file, and
dropped everything else. Everything else was where the foreground colour, the
background, the measured ratio, the required ratio and the suggested colour
lived.

**The rule that repairs a contrast failure cannot be written without them.**
The finding is kept whole now (`raw` on `GateFinding` in `mcp/src/render.ts`).

### The gate's suggested colour is a hint, not an answer

The finding that started this: `rgb(154,154,158)` on `rgb(244,244,242)`,
measured at **2.55:1** against a required **3:1**. The gate suggests
`rgb(141,141,145)` — which computes to **2.98:1**. Still failing.

So the repair does not trust the suggestion. It computes the colour itself
and walks the foreground away from the background until the ratio is
genuinely met. It lands on `#8c8c90` at **3.04:1**, which passes.

`passingColor` returns `null` rather than a colour that lies — which happens
only when the required ratio is above 21:1, since nothing in the world is
further apart than that.

### The job record will not accept a finished job that is not a film

This one was found because the supervisor's proof was flaky, and the flake
turned out to be a real bug. `transitionProjectJob(..., "complete")` requires
the artifact to be a **project-local `artifacts/<name>.mp4`**, a regular
file, non-empty, and — the part that matters — **confirmed by ffprobe to
hold a video stream**.

The supervisor was catching that error and swallowing it. So a job that ran
to success could not be marked ready, stayed in `rendering`, and was
reconciled as `failed` on the next tick. The reason was lost.

Two fixes: the runner now copies the finished film into the project's
artifact directory and reports the relative name, and **the transition error
is never swallowed** — it goes in the ledger.

---

## The rules

| finding | the repair |
|---|---|
| `contrast_aa_failure` | the foreground is replaced with one that genuinely meets the ratio |
| `deprecated_data_end` | `data-end` → `data-duration` |
| `deprecated_data_layer` | `data-layer` → `data-layer-index` |
| `self_closing_media_tag` | the tag is given a closing tag, not merely un-slashed |
| `visible_markup_comment` | the comment is removed |
| `video_missing_muted` | the video is muted — but never a self-closing one, which is the other rule's business |
| `media_missing_id` | the media element is given an id |
| `root_missing_composition_id` | the root gains a `data-composition-id` |
| `root_missing_dimensions` | the root gains its width and height |
| `timeline_id_mismatch` | the timeline is renamed to match the composition id |
| `text_below_floor` | reading type is raised to 2.6% of the short side |

**And about eighty codes that deliberately have no repair**, listed by name so
the failure says *"this needs a person"* rather than *"this was not
recognised"*. The difference matters: the first is a decision, the second is
a gap.

### A repair that finds nothing is a no-op, not a failure

Closing a self-closing video tag reveals that the video was never muted, and
that only shows up on the *next* gate. So the loop repairs, re-gates, and
repairs again — up to a budget of three rounds. The muted rule deliberately
skips a self-closing tag, so on the first round it has nothing to do and says
so. The round after the tag is closed, it has something to do.

**One round is not enough.** That is why the loop has a budget rather than a
single attempt, and it is the same reason the proof script loops.

---

## The loop

```
tick
 └─ reconcile anything a dead supervisor left behind
 └─ take the oldest queued job          (createdAt, then id — never the filesystem's mood)
 └─ claim it                            (the job file is written before any work starts)
 └─ gate
 │   ├─ clean → render → publish → ready
 │   ├─ repairable → repair → re-gate (up to three rounds)
 │   └─ not repairable → escalate → failed, with the findings that survived
 └─ write one ledger line per event
```

**It decides order, retry and escalation. It never decides taste.** The gate
decides pass or fail, and nothing is published that the gate has not passed.

**The ledger is append-only.** One JSON object per line, in
`workspace/ledger/ledger.jsonl`. It is the studio's memory: without it there
is no history, no answer to *"why did this fail"*, and no way to tell a bad
brief from a bad composition.

### The supervisor's proof

Three jobs and one injected runner, because the logic of the loop is what is
under test and a browser in the middle of it would only make the proof slow
and flaky:

- the first tick takes the **oldest** queued job, not a random one
- a job that fails the gate is **repaired and retried**
- a job that exhausts its budget ends in `failed` **with the reason**
- only the passing jobs are published
- a job left mid-flight by a dead supervisor is **reconciled, not lost**
- an unknown finding code is **refused, not guessed at**
- the ledger **only grows**

The real runner — gate, repair, re-gate, render — is proved separately, by
`scripts/proof-remediation.mjs`, which puts a real composition through a real
gate in a real browser.

---

## How to run it

```bash
# one job at a time, by hand
cd mcp && npm start
# then, from an agent:
run_supervisor { "ticks": 1 }
supervisor_status { }

# or as a process, on a clock
MOTION_MASTER_SUPERVISOR=1 MOTION_MASTER_SUPERVISOR_TICK_MS=30000 node mcp/dist/index.js

# or over HTTP
curl -X POST http://127.0.0.1:8787/api/v1/supervisor/tick -d '{"ticks":1}'
curl http://127.0.0.1:8787/api/v1/supervisor/status
```

---

## P3 — the brief inbox (done)

The loop needs work to arrive on its own, or it is a tool with a very good
keyboard. The inbox is a directory: `workspace/briefs/`. A brief is a JSON
file. The supervisor takes every new brief on its tick, makes a project and
a queued job out of it, and moves the file to `imported/` so the same brief is
never taken twice.

```json
{ "title": "ACME — slow mornings", "brief": "A coffee subscription that arrives the night before." }
```

```bash
submit_brief { "title": "ACME — slow mornings", "brief": "…" }
curl -X POST http://127.0.0.1:8787/api/v1/supervisor/brief -d '{"title":"…","brief":"…"}'
```

**The brief is not trusted.** It is a string that goes into the planner, and
that is all it is. It cannot carry a file path, a script or a URL, and the
planner never reads it as anything but text.

**A brief that cannot be read is refused with a reason.** It is moved to
`imported/<name>.rejected.json` with the reason written beside it, so
somebody can see what happened without opening anything, and the loop keeps
going. A brief with no title, or no brief, is refused the same way.

The inbox found a real bug in the proof of the loop: the fake runner returned
a fake artifact, the job could not be marked ready, and the next tick
reconciled it. The same defect as the swallowed transition error — caught
again, because a proof that is allowed to lie is not a proof.

## P2 — durability (done)

**The data directory is outside the tree a redeploy wipes.**
`MOTION_MASTER_DATA_DIR` says where; without it, `workspace/` inside the
repository, which is what development wants. The projects, the jobs, the
briefs and the ledger all live under it, so replacing the code does not
replace the work.

**The backup is verified, not hoped for.** `scripts/backup-data.mjs` copies
the data directory and then compares every file's checksum against the
source. A backup that was not checked is a hope.

```bash
node scripts/backup-data.mjs --to /var/backups/motion-master
```

The startup reconciliation was already in the supervisor: a job left
`rendering` by a dead process is marked failed on the first tick, with the
reason, rather than sitting there forever.

## P4 — identity (done)

**Three modes, and configuration decides which one is in force.**

- **No tenants file, no API key** — one studio, open. Development.
- **An API key** — one studio, one key.
- **A tenants file** — several studios, one key each, and **a key is
  required**. A studio that has tenants and still lets anybody in would be
  a mistake, not a convenience.

```json
{
  "tenants": {
    "acme":   { "key": "…", "rendersPerDay": 20 },
    "globex": { "key": "…", "rendersPerDay": 5 }
  }
}
```

The file lives **outside** the repository (`MOTION_MASTER_TENANTS_PATH`),
because a key in a file that goes to a public remote is a key in a public
remote.

**A tenant is a separate studio.** Its own projects, its own jobs, its own
briefs, its own ledger, its own metrics. One tenant's work is invisible to
another, and the proof checks that they are not the same path.

**The quota is counted, not remembered.** It is the number of publishes in
the tenant's own ledger today — so it survives a restart, and it cannot be
quietly edited. A quota kept in memory resets when the process restarts,
which is not a quota.

**The audit trail never writes the key.** One line per mutating request:
who, what, when. The tenant's name, never the key — because an audit log
that holds secrets is a place to leak them from.

## P5 — operations (done, with one caveat)

**Metrics.** `/api/v1/supervisor/metrics` and the `loop_metrics` tool. The
counters are arithmetic over the ledger: jobs by state, what the gate is
failing on, what the remediation table fixed, and the findings that
survived the budget. **Every number traces back to a line in the ledger**, so
none of them can drift.

**One alert, and only one.** `scripts/alert-loop.mjs` exits non-zero when
**three consecutive failures share a finding**. That is a broken repair
rule, not a bad brief. A job that failed once is a composition; a render
that was slow is in the metrics; neither is an emergency.

**A container.** `Dockerfile` and `docker-compose.yml`: the API, the worker
on a clock, and the data volume. The caveat: **there is no Docker in this
sandbox, so the image has never been built here.** The compose file is
reviewed, not run. Treat the first build as untested.

**The structured logs are the ledger.** One JSON object per line, append
only, with the job id in every line. There is no separate log pipeline
because there does not need to be one.

## P6 — the front door (done)

The loop panel on the console section: the queue, the films, the last eight
lines of the ledger, and **one box to put a brief in**.

It is a lab instrument, not a dashboard. No cards, no grid of statistics, no
cheerful tick. And it is **honest when it cannot reach the studio**: it says
*"The studio is not running. Start it with: cd mcp && npm start"*, and it
does **not** show zeroes, because zeroes look like a truth.

The proof checks that in a real browser at 1440, 390 and 320, and that the
brief box reports what happened rather than failing silently.

## What is still missing

**P0, P1, P2, P3, P4, P5 and P6 are built.** Two things are not:

| what | why it is not done |
|---|---|
| **The image has never been built.** There is no Docker in this sandbox. | The compose file is reviewed, not run. The first build is untested. |
| **The seven unattended days.** | The product-level definition of done in `docs/29` §3.3 says the loop runs for a week without a restart, every job resolved, every failure legible. **That is the next measurement, and it is the only one that proves this is a product rather than a demonstration.** |

Everything else in the blueprint is built and proved. What is left is
running it.

---

## The lesson worth keeping

The blueprint called the zod bump *"a major migration across all 47 tool
schemas"*. Measured, it was fourteen mechanical edits.

Then the remediation table was supposed to need a rule per finding, and the
gate turns out to emit **186 codes**. Eleven of them are mechanically
repairable. The other ~175 are decisions a person has to make — and the
right answer for those is not a smarter repair, it is **a clear failure**.

> Measure before you dread. And when the answer turns out to be small, the
> smallness is the point: it is the difference between a week and a month,
> and it is only knowable by looking.

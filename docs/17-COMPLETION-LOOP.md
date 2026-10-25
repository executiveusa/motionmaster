# 17 — MOTION MASTER COMPLETION LOOP (execution contract)

**Date:** 2026-10-24
**Mode:** BROWNFIELD. **Source of truth:** `executiveusa/motionmaster` main, verify SHA at every run.
**Goal:** Complete the private v1 in the October 24 completion PRD. Not a paid public release.
**Current offer lock:** `licence.json.status.onSale === false`.

## 1. One loop, multiple small reversible slices

This document is the *durable instructions for the next coding agent*. A GitHub Actions run is a **verifier**, not an autonomous programmer. A scheduled ChatGPT continuation can act as the **executor** only while it has authorized GitHub access. Neither passing CI nor starting a workflow proves production.

**Loop:**
```text
READ current main + active PR + this ledger
  -> pick the highest-priority unfinished prerequisite
  -> inspect the exact code and tests
  -> write one falsifiable acceptance test
  -> repair the smallest isolated slice
  -> run the existing checks + new regression
  -> inspect artifacts and independent risks
  -> commit to a feature branch / open or update draft PR
  -> record PROOF, FAILURE, ROLLBACK and NEXT
  -> immediately pick the next safe slice
  -> repeat until all acceptance gates pass
```

Do not create additional platforms or duplicate the present code. Do not touch `executiveusa/pauli-montage-video-agent`. Preserve the site's October 24 hero, two scroll scenes, original visual world and onSale=false. Keep owner control over repository, domain, secrets, storage and host. Never force-push or automatically merge.

A loop **does not spin indefinitely when blocked**: after two attempts against the same failure, preserve diagnostics and move to the next independent ticket. If all paths require a credential, legal decision, paid resource or owner-only action, mark BLOCKED and stop mutating resources; give the owner the precise prerequisite. Keep monitoring via the scheduled continuation rather than fabricating progress.

## 2. Locked backlog and dependencies

| ID | P | Outcome / evidence needed | Depends on |
|---|---|---|---|
| MM-01 | 0 | GitHub main SHA, baseline tests, repo map, existing infrastructure and rollback recorded | — |
| MM-02 | 0 | Fix HyperFrames target selector + beat visibility; inspect actual frames from a generated 15s MP4 | 01 |
| MM-03 | 0 | Canonical persisted project/revision/job schemas with migration and reopen test | 02 |
| MM-04 | 0 | Shot-role-aware matching and versioned verdicts for all 448 blocks; strict fail-closed eligible pool | 02 |
| MM-05 | 0 | Durable render job transitions, retry/idempotency, restart recovery and cancellation | 03,04 |
| MM-06 | 0 | API/MCP parity, OpenAPI correctness, safe auth, CORS, path validation and protected downloads | 03 |
| MM-07 | 0 | Real model -> tools -> artifact; owner-controlled persistent API and worker, HTTPS and rollback | 05,06 |
| MM-08 | 0 | Edit text, colors, durations/assets without code, save revision and rerender | 05,07 |
| MM-09 | 0 | Private upload checks and portable video + source export with asset licences | 06,08 |
| MM-10 | 1 | 320–1440 responsive, keyboard, WCAG, reduced motion and blind taste gauntlet | 07,08 |
| MM-11 | 1 | Actual install and real tool invocation from at least two supported hosts; label unverified hosts | 07 |
| MM-12 | 1 | Montage bridge external smoke against authorized instance, isolated licensing preserved | 05 |
| MM-13 | 0 | Health metrics, logs, backup restore and tested deployment rollback | 07 |
| MM-14 | 0 | Independent council, 5 first-time-user trials, 10 consecutive E2E successes, explicit founder release decision | 08–13 |

The existing 81/81 tests and website screenshots are **historical claims** until rerun on the target head. The 448-block qualification does **not** excuse a broken basic renderer.

## 3. Verification, gate and evidence

For every PR:
1. Fetch latest `main`, inspect changed files, check existing PRs and CI.
2. Run `npm ci` for `mcp`, `site`, `bridge` in the selected workspace.
3. Run `node scripts/completion-gates.mjs`. GitHub Actions also runs it on PR updates.
4. Store CI logs and machine-readable evidence from `.completion-proof/latest.json` in the PR description.
5. For rendering changes, reproduce **brief -> storyboard -> HyperFrames gate -> MP4 -> ffprobe -> actual time-separated frames -> editable source**. Unit tests alone are insufficient.
6. For UX changes, capture a real browser at desktop/mobile widths and keyboard + reduced-motion; check no errors.
7. For security changes, prove unauthorized cannot list, read, download or mutate private jobs.
8. Document reviewer **independent from builder**, blast radius, rollback and residual risks.

**No release unless** 10 consecutive actual brief-to-video-to-edit-to-export-to-reopen trials, 5 user tests (>=4 without coaching), security no high/critical findings, accessibility, visual council, licence audit, real hosted deployment and a tested rollback all pass. Builder cannot approve its own work. Recommended council score >=8.5 with no critical lens below 7.5.

## 4. Continuation state and branch policy

- Main remains the owner-controlled rollback anchor; only merge with separate founder approval.
- Only one active completion coding PR at a time; isolate high-risk changes into subsequent PRs rather than stacking everything into a massive unreviewable diff.
- Name future branches `agent/mm-XX-short-description`.
- After each execution report in PR/issue: `DECISION / CHANGES / PROOF / STATUS / COMMERCIAL IMPACT / RISKS / ROLLBACK / NEXT / HUMAN APPROVAL`.
- Prefer pushing **working tested changes** to branch over detailed plans. Do not declare success when tests cannot run.
- If any task is blocked, continue independent tickets. Do not invent tokens, owner approvals, vendor agreements, web domain, checkout, or payment authorization.

## 5. Initial slice in progress

PR on branch `agent/completion-loop-v1`:
- MM-02 generator selector and visibility correction, with repeatable regression tests; pending real Chrome/ffmpeg evidence.
- MM-06 OpenAPI prefix fix and test; remaining security work explicitly open.
- Recurring CI evidence runner and this contract.

**Verified 2026-10-25 UTC (branch, not production):** CI [run 40154081458](https://github.com/executiveusa/motionmaster/actions/runs/40154081458) passed on PR head `3dc2a453`; [artifact 12583931258](https://github.com/executiveusa/motionmaster/actions/runs/40154081458/artifacts/12583931258) includes seven passing quality gates, English and es-MX Chrome DOM/screenshot proof, all four real 1280×720 H.264 gallery clips decoded at two timestamps each, and a 15-second HyperFrames render with four distinct time-separated frames. A prior combined-site byte-range bug (416 instead of 206) was fixed and its regression passed. The first-viewport gallery no longer starts hidden behind an entrance tween. The canonical original prompts and licences remain intact, and `onSale=false`.

**Not verified:** Live Spanish selector-click round trip, translated arbitrary user/agent content, browser playback interaction, independent taste/accessibility/security review, production/staging URL, durable hosted projects/jobs, authenticated downloads, model-to-render/edit/export/reopen, and actual Codex/Claude MCP host calls. A passing screenshot and decoded MP4 are not a working end-to-end product.

**NEXT:** MM-03 persistent project/revision/job schema with migration and reopen test; then MM-05 durable job lifecycle and MM-06 authorization. Keep changes on draft PR #2, never auto-merge, and leave checkout off.


## 6. Continuation — 2026-10-25 03:31 UTC (private PR, not a release)

**DECISION:** Keep the gallery-first October 24 page and add a reversible MM-03 local persistence slice. Do not deploy or merge. The upstream MotionVideo gallery benchmark uses playable examples and prompt-backed discovery; do not clone its UI or claim equivalent catalogue scale.

**CHANGES:** `mcp/src/projects.ts` adds schema-versioned local project, immutable revision and queued-job records under `workspace/projects/`, with atomic JSON replacement, safe IDs, duplicate rejection, revision-conflict detection, and an explicit non-destructive import of legacy film metadata/shot lists. `mcp/src/api.ts` now offers `GET/POST /api/v1/projects`, `GET /api/v1/projects/:id`, `POST /api/v1/projects/:id/revisions`, and `GET /api/v1/projects/:id/revisions/:number`. Anonymous project storage is blocked when the server binds beyond loopback. New tests cover create/reopen/edit, immutable history, 409 stale edit, path rejection, local access guard, and idempotent migration.

**LANGUAGE / UX:** English remains the fresh-browser default. Mexican Spanish now covers dynamic console/job/sound labels and newly inserted `data-i18n` elements. A real Chromium test exercises the language selector both ways, inserts late DOM nodes, reloads to verify preference persistence, checks 390px horizontal overflow, and fails on uncaught browser exceptions. The original user prompts, licence records and source-language material remain intact; Chinese catalogue entries are excluded from visible library results rather than erased from source.

**PROOF:** [CI run 40158379511](https://github.com/executiveusa/motionmaster/actions/runs/40158379511) **SUCCESS** for branch head `29ec544075e09c8cc7fd4c14f34b528899e4609b`; [artifact 12585318598](https://github.com/executiveusa/motionmaster/actions/runs/40158379511/artifacts/12585318598). Seven completion gates passed; MCP suite **103/103**. Browser proof `locale-browser.json`: eight checks passed; 390px viewport / 390px scroll width. Gallery proof decodes all four MP4s and checks source prompts; HyperFrames 15-second render and time-separated frames passed. The run tests the PR merge ref against unchanged main, not production.

**RISKS:** This is a single-writer local JSON foundation, not a hosted multi-tenant database. The legacy import migrates project metadata and shot lists but does not yet migrate job status or verify historical MP4s. New project drafts are not yet wired into the film renderer or MCP edit/export tools. Authorization of film/file download routes, durable worker retries/cancellation, backups, real hosted HTTPS, Codex/Claude live tool calls, independent taste/security/accessibility council, and user trials remain unverified. The original live MiniMax site and the benchmark site could not be fetched by the automated inspection tools; the built local page was tested in Chromium instead.

**ROLLBACK:** Revert the MM-03 project/API/test commits and the locale/browser-test commits on the draft branch, or close PR #2. Legacy `workspace/films/` files are untouched; main remains `adc9685`. No secrets, paid services, production deploy, auto-merge or sale activation.

**NEXT:** MM-05 wire new revisions/jobs into the existing film renderer with unique IDs, idempotent lifecycle, restart recovery and verified MP4/source reopen; MM-06 protect all private film/file endpoints and downloads. Then owner-controlled staging, live Codex/Claude MCP smoke, independent gauntlet, and founder release decision. The builder cannot approve its own work.


## 7. Continuation — 2026-10-25 04:13 UTC (MM-06 / MM-09 safety and intake slice)

**DECISION:** Prioritize a concrete P0 private-route exposure and broken upload intake over starting a new rendering architecture. Keep PR #2 draft, main and production untouched.

**CHANGES:** `mcp/src/index.ts` now enforces the existing `MOTION_MASTER_API_KEY` on **all** private HTTP entrypoints (files, films, chat, MCP and the API), refuses any network-bound private route when the key is unset, and permits cross-origin browser access only from explicit `MOTION_MASTER_ALLOWED_ORIGINS` or the local combined-site origin. Preflight now allows the `Authorization` header. Flat uploaded-file reads reject encoded separators, traversal and symlinks escaping the workspace, and allow only GET/HEAD. Uploads now use a bounded binary reader rather than the JSON body decoder, which previously prevented real raw and multipart media intake.

**TEST CONTRACT:** New `mcp/test/private-http-auth.test.mjs` covers no-key network denial, bearer enforcement, path traversal/symlink rejection, method restrictions, browser-origin allowlist and preflight, and byte-perfect raw/multipart upload round trips. Commits: `0a61a6c`, `ce50ddc`, `1160f6e`, `fad3e67`. CI run [40161207411](https://github.com/executiveusa/motionmaster/actions/runs/40161207411) was queued at the time of this ledger entry; **do not mark these tests passed until the run completes successfully**.

**RISKS:** The UI has no hosted bearer-token entry flow yet, so a network deployment must not be advertised as usable until authorized frontend requests are wired and tested. Local single-writer JSON state, job restart/retry, full render/edit/export/reopen, remote MCP host calls and independent security/taste review remain open. A static Vercel frontend previously reported READY at commit `33aee7d`; that is **not** a deployment of this branch head or a live backend. External fetches of that URL and the benchmark were not independently successful in this run.

**ROLLBACK:** Revert the four commits above on the draft branch or close PR #2; no main merge, force push, secret, paid service, sale activation or Montage edit. Existing local combined mode continues to work without a key; public network listeners now fail closed.

**NEXT:** Inspect the new CI logs, repair any failing test, then implement MM-05 durable render transitions with an actual restart/reopen proof. Wire frontend auth before any owner-controlled staging API is exposed. Independent review and human release approval remain mandatory.

## 8. Continuation — 2026-10-25 05:23 UTC (MM-05 job lifecycle slice)

**DECISION:** Build a fail-closed, single-writer durable job lifecycle before connecting a worker. This does **not** claim end-to-end rendering or a hosted backend. Keep draft PR #2, `main`, sale state and existing production unchanged.

**CHANGES:** Added `listProjectJobs`, `transitionProjectJob` and `recoverInterruptedProjectJobs` to `mcp/src/projects.ts`. Jobs now have explicit queued → rendering → ready/failed/cancelled transitions, failed → queued retry, persisted attempt counts, idempotent repeated actions, and restart recovery that marks stranded in-flight jobs failed rather than silently rerunning them. A job can become ready only with a project-local regular MP4 containing an `ffprobe`-recognized video stream. `startChatServer` performs recovery before accepting requests. Added authenticated private HTTP queue/list/status/cancel/retry endpoints and OpenAPI entries; browser clients cannot mark jobs ready. New regression suites exercise durable transitions, invalid states, false MP4s, actual FFmpeg-generated MP4, recovery, and HTTP contract. Moved the existing CI FFmpeg install before the MCP suite so these tests can run without mock media.

**PROOF:** GitHub Actions [run 40165223072](https://github.com/executiveusa/motionmaster/actions/runs/40165223072) **SUCCESS**, [artifact 12588410820](https://github.com/executiveusa/motionmaster/actions/runs/40165223072/artifacts/12588410820). Seven quality gates passed; MCP tests **112/112**. CI also captured desktop 1440×900 and mobile 390×844, confirmed fresh English default and click/reload Mexican Spanish translation with no horizontal overflow, decoded all four gallery MP4s, and rendered the 15-second HyperFrames proof with separated frames. The CI ref is a test merge into unchanged `main`, not a release. A separate live-browser inspection of the **older** Vercel frontend at `33aee7d` verified all four gallery videos actually played, with advancing timestamps; the Spanish selector and mobile menu worked, 375px mobile had no horizontal overflow, and no visible Han characters were found. Those live checks **do not** verify this new backend branch on hosting.

**FAILURE / REPAIR:** Initial run [40165004659](https://github.com/executiveusa/motionmaster/actions/runs/40165004659) failed on an overly broad TypeScript route action, fixed in `718f5b6`. Run [40165131921](https://github.com/executiveusa/motionmaster/actions/runs/40165131921) failed on combined GET/POST OpenAPI index syntax and FFmpeg being installed after tests. Fixed in `7247f3b` and `295361d`; final CI passed.

**RISKS:** Queueing is not execution: the new project job queue is **not connected** to the legacy film builder, HyperFrames worker, model planner, editing, export or downloadable source. Cancellation marks state but cannot yet stop a running subprocess. Recovery is intentionally fail-closed and requires a single writer; there is no multi-instance locking, hosted database, authenticated browser connection or persistent worker. The independent Landing Page Director ten-lens gauntlet and human trials are not approved. No new staging deployment or Claude/Codex live MCP smoke was performed. `onSale=false` remains enforced.

**ROLLBACK:** Revert the MM-05 commits on draft PR #2, or close the draft PR. `main` remains the recovery anchor at `adc9685`; project and legacy film records are not destructively migrated or deleted. No production deploy, paid service, force-push, secret disclosure, auto-merge or Montage edits.

**NEXT:** MM-05 connect queued project jobs to a bounded single-worker execution adapter using the existing film/HyperFrames pipeline; prove brief → project → render → verified MP4 → restart → reopen → edit → rerender → export, with cancellation actually terminating work. Then MM-06 hosted auth/frontend bearer flow, owner-controlled staging, independent gauntlet, live Codex/Claude smoke and founder release approval.

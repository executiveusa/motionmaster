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

## 9. Continuation — 2026-10-25 07:19 UTC (MM-09 authenticated MP4 download slice)

**DECISION:** Implement the smallest reversible owner-private export prerequisite: authenticated, byte-preserving downloads of already-verified project MP4s. This does **not** claim portable source export, hosted rendering or a human-usable release.

**CHANGES:** Commits `e069833`, `e8eac5e`, `1590988` add `GET/HEAD /api/v1/projects/:id/jobs/:jobId/artifact`, a discoverable `downloadUrl` only for ready jobs, and OpenAPI/index entries. Downloads require the existing private-route bearer boundary, a ready job, the exact server-derived job-local MP4 path, a regular non-symlink file, and a path contained within the project. The response streams rather than buffering large videos, advertises its byte length, disables caching, and sets `nosniff`. Other methods are rejected; client-supplied paths are never accepted.

**TEST CONTRACT:** `mcp/test/project-artifact-download.test.mjs` generates an actual FFmpeg MP4 and verifies missing/wrong bearer denial, not-ready rejection, byte-identical GET, HEAD without a body, download URL discovery, unsupported method, missing job, symlink denial and missing artifact. **PROOF:** GitHub Actions [run 40172352811](https://github.com/executiveusa/motionmaster/actions/runs/40172352811) **SUCCESS** on PR code head `deb9446a` (test merge ref), [artifact 12590283574](https://github.com/executiveusa/motionmaster/actions/runs/40172352811/artifacts/12590283574). Seven completion gates passed: private offer, MCP typecheck/tests/tool policy, site build/content, Montage bridge tests/typecheck. Real Chromium English/es-MX selector and 390px mobile checks passed; all four gallery MP4s decoded; a 15-second HyperFrames video and four distinct frames passed. This is CI evidence, not hosted end-to-end or independent approval.

**SITE / REVIEW:** Existing older Vercel preview was not independently fetchable by this run's browser/web tooling, nor was the external benchmark. Do not treat its historical READY status as proof of the new branch. The Landing Page Director and independent gauntlet remain unapproved. English/es-MX and four gallery clips retain the previously reported CI evidence; this slice does not change the UI.

**RISKS:** This is one HTTP download path, not a complete source bundle, shot editor or export UI. The JSON store is single-writer, cancellation does not terminate FFmpeg, and the full default HyperFrames worker/model-to-render/edit/reopen sequence, owner-controlled staging and live Codex/Claude MCP calls remain unverified. The download relies on the local filesystem and existing auth; do not expose an unreviewed host publicly. Sale remains off.

**ROLLBACK:** Revert the three MM-09 commits on draft PR #2, or close the PR. Main, existing videos and the original source/licence records remain unchanged. No merge, force push, paid service or production deployment.

**NEXT:** Inspect new CI and repair failures. Then implement portable source bundle with licence manifest and verified re-import, followed by actual editable shot overrides and end-to-end rendering. Obtain independent security/taste review and founder release approval before any production action.


## 10. Continuation — 2026-10-25 UTC (MM-09 portable source export)

**DECISION:** Keep private v1 on the existing draft PR; implement a bounded, owner-private source export rather than deploy an unverified renderer or invent source ownership. No main merge, paid service, production deploy, or sale activation.

**CHANGES:** Commits `0b736a9`, `7c27584`, `794b993`, `52db67e` add `mcp/src/project-source-bundle.ts`, an authenticated `GET /api/v1/projects/:id/jobs/:jobId/source` route, OpenAPI discovery, and a regression suite. Completed jobs with an actual generated source directory can export a gzip-compressed JSON archive containing immutable revisions, project brief, job provenance, generated HTML/HyperFrames files and source assets, SHA-256 checksums, the recorded product licence if present, and an explicit warning that upstream asset rights require separate review. MP4 and render caches are deliberately excluded; MP4 remains available at the existing artifact endpoint. The archive is bounded (512 files, 16 MiB/file, 48 MiB source) and refuses symlinks, missing source or non-ready jobs. `inspectProjectSource` verifies archive structure, sizes, paths and every embedded file checksum without executing imported code.

**PROOF STATUS:** The previous baseline CI [40172553152](https://github.com/executiveusa/motionmaster/actions/runs/40172553152) passed before this slice. New run [40175866930](https://github.com/executiveusa/motionmaster/actions/runs/40175866930) was pending/in progress at ledger time; do **not** claim this slice passed until it completes. New test generates a real FFmpeg MP4, verifies authorization, pending-job denial, exact source bytes, revision history, checksum-tamper rejection, symlink refusal and unsupported methods. Browser/video checks are part of the existing workflow, not evidence of a deployed backend.

**LIVE/BENCHMARK:** Fresh external HTML fetch on 2026-10-25 returned HTTP 200 for the existing Vercel preview, with English-default page, four prompt-backed gallery examples and an agent connection message. Vercel reports READY at **old** commit `33aee7d`; no new backend has been deployed. The benchmark `motionvideo.xyz` also returned HTTP 200 and confirms a prompt-first, browsable video gallery pattern. These fetches do not verify current PR branch browser interactions or live rendering. Scraped fallback text is not proof of playback failure. Independent Landing Page Director / accessibility / security gauntlet remains outstanding.

**RISKS:** This is a portable **gzip JSON source archive**, not ZIP, not an automatic project re-import, not a live shot editor, and not a verified licence grant for third-party assets. The single-writer JSON store, worker cancellation, hosted persistent render process, model-to-edit/reopen, Claude/Codex live MCP smoke, independent review and user trials remain release blockers. `onSale=false` was checked in `licence.json`.

**ROLLBACK:** Revert the four MM-09 source-export commits on draft PR #2; generated project records and MP4s are untouched. Main stays at `adc9685`.

**NEXT:** Resolve any CI failures first. Then add verified source re-import/shot editing and complete the actual render→restart→edit→rerender→export acceptance test. No owner-controlled hosting changes without explicit approval.


## 11. Continuation — 2026-10-25 UTC (MM-09 private source re-import)

**DECISION:** Complete the smallest source-reopen slice before attempting hosted worker deployment or manual shot editing. Keep PR #2 draft; preserve `main`, production hosting, paid-service state and the Montage repository.

**CHANGES:** Commits `f846bab`, `ee911fb`, `2742f45`, `06b7fdb`, `991b3da`, `91046e8` harden source-archive inspection, reject malformed provenance, mismatched or invalid immutable revisions and unsafe source paths, and add `importProjectSource`. An archive now creates a **new** private project with restored editable revision content and original source bytes stored under a non-executable `imports/` directory. Original revision timestamps are recorded as provenance. Partial import failures remove only the newly created project. Imported files are **not** executed or silently marked rendered; no ready job is created. Added bearer-protected `POST /api/v1/projects/import` accepting bounded `application/gzip` bytes and OpenAPI/index discovery.

**TEST CONTRACT:** `mcp/test/project-source-import.test.mjs` covers private auth, invalid media, malformed gzip, archive path traversal, mismatched revision IDs/numbers, invalid shot duration, fresh project IDs, revision reopen, binary source integrity, and no fabricated completed jobs. The existing real-FFmpeg source-export suite now performs a source export → new project re-import → reopen round trip. The CI workflow also runs the established desktop/mobile Chromium, es-MX selector, gallery decode and HyperFrames smoke gates. **Do not report this slice as passing until the latest head's CI completes successfully.**

**LIVE / BENCHMARK:** A fresh read-only page scrape on 2026-10-25 retrieved the older Vercel homepage and `motionvideo.xyz`; both expose a prompt-backed gallery-first model. The Vercel deployment API still reports READY for the **old** `33aee7d` commit, not this PR. Scraped page text includes a kinetic clip marked unavailable, but hidden-state text is not proof of actual playback failure; verify it in a real browser. No new staging/production deployment or live backend smoke occurred. Landing Page Director and independent gauntlet are still unapproved.

**RISKS:** Imported source is intentionally inert and cannot be trusted as runnable code. The actual default model → HyperFrames → editable shots → rerender flow, subprocess cancellation, hosted persistent worker, browser bearer UX, Claude/Codex live MCP and first-time-user trials remain release blockers. Import is a single-writer local filesystem operation, not a multi-tenant or multi-instance service. Upstream asset licences remain review-required. `licence.json.status.onSale=false` remains unchanged.

**ROLLBACK:** Revert the six MM-09 commits on the draft branch, or close PR #2. Newly imported project directories can be removed individually; existing source projects, historical MP4s and `main` remain unchanged.

**NEXT:** Check latest CI and repair failures. Then implement a verified manual shot edit using the existing block catalogue and renderer, and prove create → render → restart → reopen → edit → rerender → export → re-import with the real default pipeline. Independent security, accessibility and taste review must approve before any production release.

## 12. Continuation — 2026-10-25 UTC (MM-08 explicit shot order and bounded trims)

**DECISION:** Implement one narrow, reversible editor-to-render prerequisite without rewriting the gallery or claiming that the whole shot editor is ready. Keep draft PR #2 and production untouched.

**CHANGES:** Commits `1390105`, `a1cce73`, `a30a9f7` extend the existing `planFilm` path to accept explicit, ordered, eligible catalogue block IDs from saved project revisions. The real project worker now passes those IDs through to the existing HyperFrames installer rather than rejecting all edited shot lists. It preserves the editor's shot order and descriptive titles and applies requested trim durations only after the installed source declares its natural duration. Longer-than-source trims fail closed rather than rendering blank tail frames. Missing, duplicate, excluded, fragment and ineligible IDs fail rather than being silently replaced. If any selected block fails to install, the worker fails the job instead of publishing a partial edit. Added regression tests for selection order, invalid IDs, trim bounds and generated editable HyperFrames source timing.

**PROOF STATUS:** Before this slice, [CI run 40180189736](https://github.com/executiveusa/motionmaster/actions/runs/40180189736) was SUCCESS on `5dd39a7`. New CI [run 40183876441](https://github.com/executiveusa/motionmaster/actions/runs/40183876441) was **in progress** at ledger time. Do not claim the edited default renderer has produced a real MP4: these new tests validate planning and source generation, while the existing independent HyperFrames smoke does not exercise a saved edited revision. Await latest-head CI before treating the code as verified.

**SITE / REVIEW:** No frontend changes in this slice. Fresh external web reads of the older Vercel preview and `motionvideo.xyz` were unavailable in this execution environment; the Vercel deployment API reported READY for **old** `33aee7d`, not this branch. This is not a new staging deployment, live backend, browser playback test or independent gauntlet approval.

**RISKS:** This slice enables block reorder and safe shortening of an explicit shot list, **not** editable on-screen text, colours, uploaded assets or a full visual editor. The shot title is metadata and does not change the block's visible text. The real edited revision still needs default HyperFrames MP4/reopen/rerender proof. Rendering uses the existing network-dependent registry installer. Worker subprocess cancellation, hosted persistence/authenticated browser UX, Claude/Codex live smoke, independent reviews and first-time-user trials remain open. Sale remains off.

**ROLLBACK:** Revert `a30a9f7`, `a1cce73`, `1390105` on the draft branch; immutable project records and `main` are unchanged. No force-push, auto-merge, paid service, production deployment, secret disclosure or Montage edit.

**NEXT:** Inspect latest CI and fix any failures. Then prove an edited revision renders a real MP4 through the default worker (not an injected renderer), survives restart and exports/re-imports. Add a minimal human-facing edit interaction only after the actual render path is verified. Independent reviewers must approve before release.

## 13. Continuation — 2026-10-25 UTC (MM-05 active subprocess cancellation)

**DECISION:** Repair a real P0 lifecycle gap before adding another editor surface. Keep the single-writer local worker, the October 24 gallery-first homepage, PR #2 draft, main and hosted frontend unchanged. No paid service, release, or sale activation.

**CHANGES:** Commits `bba7ad8`, `e4777db`, `202d0f3`, `cbffa11`, `c07f371`, `b533f34` propagate an AbortSignal from the authenticated HTTP cancel route through the active project worker to HyperFrames check/render/snapshot subprocesses. POSIX subprocesses now run in their own process group so cancellation and timeout signal the shell **and its children**, with SIGKILL escalation after two seconds; the caller waits for process exit. Aborted jobs remain cancelled and cannot publish an MP4. New regression tests cover a running worker, the real HTTP cancellation route, a long-running bash child and an already-aborted signal.

**PROOF:** [GitHub Actions run 40188155492](https://github.com/executiveusa/motionmaster/actions/runs/40188155492) **SUCCESS** for code head `b533f34e31b135144ae417a3a625f5dea7d25148`; [artifact 12597571252](https://github.com/executiveusa/motionmaster/actions/runs/40188155492/artifacts/12597571252). All seven completion gates passed, including MCP typecheck/tests and bridge checks. Chromium desktop/mobile capture, English/es-MX click/reload/dynamic-i18n, four decoded gallery MP4s and the independent 15-second HyperFrames smoke passed. These are CI/branch tests; they are not a default edited-project MP4 or hosted API smoke.

**LIVE / REVIEW:** Vercel still reports the older `33aee7d` static frontend as READY at `motionmaster-private-preview.vercel.app`; the new worker is not deployed. Direct live-site and `motionvideo.xyz` fetches were unavailable to this run's web reader. Independent Landing Page Director/taste, security, accessibility, live Codex/Claude and first-time-user approval remain outstanding.

**RISKS:** HyperFrames registry installation uses synchronous `execFileSync` and cannot be interrupted mid-install; abort prevents subsequent gate/render work. Process-group termination is POSIX-specific; Windows falls back to killing the immediate shell. A single-process abort controller is not a distributed cancellation mechanism. The default edited-revision HyperFrames MP4, persistent hosted worker, browser auth, source edit controls, backup/restore and 10 consecutive end-to-end trials are not yet verified. Sale remains `onSale=false`.

**ROLLBACK:** Revert the six code/test commits above from draft PR #2, or close the PR; no persisted project schema changed. `main` remains `adc9685`; existing projects and MP4s remain intact.

**NEXT:** Add a **real default-worker edited-revision** integration proof (select eligible block, render actual MP4, reopen, change shot trim/order, rerender and validate both files), without replacing the renderer with an injected FFmpeg stub. Only then wire a minimal visual editor and owner-controlled staging. Independent reviewer and founder approval remain required before release.

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


## 15. Continuation — 2026-10-25 UTC (MM-08 real default-worker edited MP4 gate)

**DECISION:** Convert the largest remaining unproven rendering claim into a falsifiable CI gate. Keep the private gallery-first design, `main`, existing hosting and sale state unchanged.

**CHANGES:** Commit `12470d6` adds `scripts/default-worker-edit-smoke.mjs`; `0bb13d1` wires it into the existing PR completion workflow with a 20-minute bounded step and artifact retention. The script selects a self-contained, text-capable real catalogue block; uses the shipped `runProjectJob` and default `renderProjectRevision` (no injected renderer); creates a private temporary project; renders its first MP4; reopens the persisted project/job from a **new Node process**; saves a shorter shot-duration revision; rerenders through the default worker; verifies both real MP4s with FFprobe and FFmpeg frame decoding, revision-specific source timing and distinct MP4 hashes. It saves the actual videos, frame images and JSON report to `.completion-proof/default-worker-edit/` and cleans its isolated temporary project.

**PROOF STATUS:** GitHub Actions [run 40192712063](https://github.com/executiveusa/motionmaster/actions/runs/40192712063) was **PENDING** immediately after the CI commit. This is an executable test contract, **not yet proof that the default renderer passes**. Do not report a successful edited MP4 until the run completes and its artifacts are inspected. The prior verified run [40188378062](https://github.com/executiveusa/motionmaster/actions/runs/40188378062) was successful on the preceding documentation head.

**LIVE / BENCHMARK:** A fresh read-only page scrape on 2026-10-25 returned HTTP 200 for the existing preview and for `motionvideo.xyz`. The preview contains four real source-backed video entries with printed prompts, English page metadata and a visible creation-console connection step. The scrape displayed a **kinetic-type 'Not available' state**, which may reflect the scraper's media environment; investigate in a real interactive browser before declaring a live playback failure. The Vercel deployment API reports READY for old frontend commit `33aee7d`, **not this branch**. The benchmark is a larger prompt-backed gallery; do not inflate Motion Master's homepage with unrelated controls.

**RISKS:** Default-worker registry installation requires external access and is synchronous; the new test may expose installation, craft-gate, render or duration failures. The test covers one selected shot and a trim edit, **not** text/color/asset editing, all catalogue blocks, ten consecutive full workflows, source export/import, owner-controlled persistent hosting, authenticated browser-to-worker connection or live Codex/Claude MCP calls. Independent security, accessibility, Landing Page Director and first-time-user reviews remain outstanding. Sale stays `onSale=false`.

**ROLLBACK:** Revert `0bb13d1` and `12470d6` from draft PR #2, or close the PR. No schema changes, merge, force-push, production deployment, paid service, secret disclosure or Montage edits.

**NEXT:** Inspect the new CI report and both MP4/frame artifacts. If it fails, fix the concrete default-renderer failure in a minimal follow-up commit; if it passes, extend the same acceptance path through source export/import and a human-operated editor, then independent review. Founder approval is still required before release.


## 16. Continuation — 2026-10-25 UTC (MM-08 default-worker MP4 proof and MM-04 quarantine)

**DECISION:** Repair the real default-worker failure without suppressing the HyperFrames craft gate, and quarantine the two blocks with recorded unreadable-text failures. Keep the gallery-first October 24 design, production hosting, `main`, sale state and Montage unchanged.

**CHANGES:** Commit `a5fdff1` replaces the unreadable split-flap smoke candidate with the mountable `lt-neon-border` lower-third composition, and strengthens the acceptance script to decode frames at 0.3s and 1.8s from **both** actual MP4s and require pixel changes. Commits `4e01d97` and `8af06f9` prevent `caret-swap` (failed CI 40193087103) and `split-flap-board` (failed CI 40193303487) from being auto-planned or explicitly selected until real craft requalification, with regression tests. The upstream catalogue and source/licence records remain intact.

**PROOF:** GitHub Actions [40196914978](https://github.com/executiveusa/motionmaster/actions/runs/40196914978) **SUCCESS** at `a5fdff1`; [artifact 12600372552](https://github.com/executiveusa/motionmaster/actions/runs/40196914978/artifacts/12600372552). The default, unmocked `runProjectJob` produced 1920×1080 H.264 MP4s at **3.5s** (SHA-256 `460e058185b5ef9e9fdbc5ed026bb4db2bd69513f9be7e095538cff7b4b1e541`) and **3.0s** (SHA-256 `d7583a9d894aedd728cc2b0dcf0464e35ec938d08ccb92840f6c8bb75e6a4147`). The project was reopened in a **new Node process** before saving the second revision. Both files decoded; early/late frame hashes differ, and the artifact report records `status: passed`. The archived MP4s and frames were independently downloaded, inspected, and rechecked with FFprobe. CI also passed desktop/mobile Chromium, English/es-MX selector and dynamic i18n, all four gallery playback controls, 15-second HyperFrames smoke, and the existing quality gates. The follow-up [40197172381](https://github.com/executiveusa/motionmaster/actions/runs/40197172381) **SUCCESS** at `8af06f9` verifies the new quarantine regressions together with the default-worker MP4 lifecycle.

**LIMITATIONS:** This proves a real shot-duration trim and saved revision with an actual renderer, **not** arbitrary text/color/asset editing, complete export/re-import within the same acceptance run, ten consecutive workflows, live user-authenticated browser creation, hosted persistent worker, independent design/security/accessibility council, or real Codex/Claude MCP calls. The rendered lower-third retains the upstream default name/role because editable text values are not yet wired from revisions. No new staging URL was deployed; Vercel's existing READY preview is still older commit `33aee7d`. The GitHub repository visibility is currently public; a private product workflow must not be mistaken for a private source repository.

**ROLLBACK:** Revert `8af06f9`, `4e01d97`, `a5fdff1` on the draft branch, or close PR #2. The source catalogue, generated test projects (temporary), historical projects, `main`, hosting and licence records are unchanged. No merge, force-push, production deploy, paid service or secret disclosure.

**NEXT:** Wire **editable text values** into the persisted shot revision and default render adapter, expose a minimal human-facing edit action, then run the full export/re-import sequence with actual artifacts. Separately verify owner-controlled staging and authenticated browser/MCP workflows. Do not request founder release approval until independent gauntlet and first-time-user gates pass.


## 17. Continuation — 2026-10-25 14:19 UTC (MM-08 actual visible text edit)

**DECISION:** Finish a bounded P0 rendering prerequisite: save a text edit in an immutable revision, apply only declared HyperFrames variables, and prove changed pixels in a real MP4. Keep the gallery-first October 24 homepage, draft PR #2, main, existing Vercel hosting and sale state unchanged.

**CHANGES:** Commits `7bc1f95`, `4b3aee1`, `69cc4c9`, `c56eaaa`, `42997da` add optional per-shot `values` to persisted revisions, bound and sanitize text/color values, reject unknown/non-text/non-color block variables and invalid hex colours at render time, preserve values through source import, and extend the default-worker smoke test to change the actual lower-third name from **Dr. Maya Chen** to **Ana Ruiz**. The original upstream block and its source/licence remain unchanged. No human-facing editor was added in this slice.

**PROOF:** GitHub Actions [run 40201406385](https://github.com/executiveusa/motionmaster/actions/runs/40201406385) **SUCCESS** on code head `42997dab04f6f57226f3646c48a690a100403275`. [Artifact 12602285516](https://github.com/executiveusa/motionmaster/actions/runs/40201406385/artifacts/12602285516) includes the original and edited 1920×1080 H.264 MP4s and early/late PNG frames. The real unmocked default worker rendered 3.5s and 3.0s films, reopened the persisted project in a separate Node process, saved the edited revision, and rerendered. The generated `brief.json` records `values.name = "Ana Ruiz"`. Independent visual inspection of the archived late frames confirms **Dr. Maya Chen → Ana Ruiz** on screen, not merely different file hashes. The artifact report has `status: passed`, `editedVariable: name`, `reopenedInNewProcess: true`. All seven completion quality gates passed, including MCP TypeScript and **134/134 tests**, site build, bridge checks and private sale lock. CI Chromium desktop/mobile, es-MX click/reload/dynamic translation and four playable gallery clips passed; a separate 15s HyperFrames smoke passed.

**LIVE / REVIEW:** The Vercel deployment inspection reports READY for the **old** static frontend commit `33aee7d`, not the current branch. No staging backend was deployed. Direct web-reader requests to the live preview and benchmark failed during this execution; do not substitute a screenshot or hosting READY status for a live browser walkthrough. The automated browser checks are branch CI evidence, not independent Landing Page Director or human approval.

**RISKS:** Overrides are a typed API/revision capability, **not yet a human-operated edit form**. The worker supports declared string and six-digit hex colour variables, but this run only visually verified the `name` string on one qualified block. Arbitrary colour, asset editing, complete source export/import in the same lifecycle, authenticated browser creation, hosted persistent worker, live Codex/Claude calls, backup/restore, 10 consecutive workflows and first-time-user tests remain unverified. The GitHub repository is public despite private product intent; visibility change requires owner review. No independent council approval. `onSale=false` remains enforced.

**ROLLBACK:** Revert the five commits on draft PR #2 or close it. Existing schema-1 revisions without `values` remain compatible; source records, main, hosting, licence, original hero and Montage are unchanged. No auto-merge, force-push, paid service, production deployment or secret disclosure.

**NEXT:** Add a minimal authenticated browser editor for a qualified shot (name, role, supported colours, duration), backed by revision-conflict handling and a clear Render / Download action. Verify the full human browser → saved revision → actual worker → changed MP4 → export → re-import sequence before owner-controlled staging and live host MCP smoke. Builder cannot approve release.


## 18. Continuation — 2026-10-25 15:34 UTC (MM-08 human browser editor; private, not released)

**DECISION:** Deliver a bounded human-facing editor on the existing gallery-first page, without replacing the October 24 hero, creating another dashboard, changing main, or deploying. The editor is collapsed below the creation console until explicitly opened. This is a real code slice, not a release approval.

**CHANGES:** Commits from `b41a36d` through `f097702` introduce `site/src/modules/project-editor.ts` and responsive styles, mount the editor after the existing console, and wire it to the existing authenticated project, revision, job, block, MP4 and source endpoints. A person can connect to their private agent with a bearer key held **only in page memory**, create a known-qualified `lt-neon-border` lower-third, reopen a saved project, edit declared text/colour variables and shot duration, save a new immutable revision with conflict detection, queue/cancel a render, watch a completed MP4 via an authenticated blob fetch, and request protected MP4/source downloads. The UI does not expose raw JSON or require code editing. Unknown block variables and palette defaults are not silently overwritten. Setup and creation forms collapse once the saved edit task is open; the owner can explicitly reopen them. Existing source prompts and licence records are not rewritten.

**I18N / TASTE:** English is still the fresh-browser default; es-MX covers the new editor's controls, statuses, template defaults and dynamic labels. A reused status element now correctly updates its translation key. User-entered project titles and upstream variable IDs are protected from chrome translation. The browser smoke checks both locales, actual reload, zero visible Han characters, and 390px width without horizontal overflow. The gallery remains first and four real MP4 controls still advance playback. The page does not add a dashboard to the first viewport.

**PROOF:** GitHub Actions [run 40207343216](https://github.com/executiveusa/motionmaster/actions/runs/40207343216) **SUCCESS** on PR code head `f09770276164714dfcbdf64ee7ad33a79daf673d`. [Artifact 12604825786](https://github.com/executiveusa/motionmaster/actions/runs/40207343216/artifacts/12604825786) contains seven passing quality gates, browser JSON with **17 checks**, real desktop and es-MX mobile editor screenshots, gallery playback proof for four clips, and the separate unmocked HyperFrames worker's 3.5s original / 3.0s text-edited 1920×1080 H.264 MP4s with different late frames. In Chromium, the **real local private HTTP API** rejected an invalid bearer, accepted the test bearer, created a project, persisted the visible text change to **Ana Ruiz** and a 3s trim as revision 2, reopened it via API, queued and cancelled a durable job, and did not put the test bearer in localStorage or leave it in the input. The separate default-worker smoke reopened a saved revision in a new Node process and produced actual original/edited MP4s. The CI runner now reuses installed FFmpeg/FFprobe instead of running apt unnecessarily.

**EVIDENCE LIMIT:** The authenticated Chromium edit/queue/cancel test deliberately has the worker disabled. The default-worker real MP4 test runs separately. Therefore **one uninterrupted human browser → worker → watch/download → export → re-import sequence has NOT yet passed**. Source download from the new browser control, browser video playback of a newly rendered private job, manual colour changes and upload/edit of arbitrary assets are not yet proven. The editor's known-qualified starter is intentionally narrow; this is not proof that every catalogue block renders.

**LIVE / REVIEW:** Vercel deployment metadata for `motionmaster-private-preview.vercel.app` still reports READY at old frontend commit `33aee7d`, not this branch. The direct external page fetch and MotionVideo benchmark fetch were unavailable through the web reader; CI Chromium proof is against the built branch, not hosted staging. No new deployment, live Claude/Codex MCP host smoke, independent Landing Page Director/taste/security/accessibility council, five uncoached users, ten consecutive complete trials, backup restore or rollback deployment test occurred. GitHub repository visibility remains **public**, a separate owner-review risk for a private product.

**COMMERCIAL / ROLLBACK:** Classification **USE — private development**. `licence.json.status.onSale=false` passed CI. PR #2 remains draft and unmerged; `main` remains `adc9685e6b4b995ab80db214ef237ac0f03d4486`. Revert the editor/site/i18n/browser/CI commits or close PR #2; no data migrations, original projects, licence/source records, existing hosting or Montage repository were changed. No force-push, production deploy, paid activation or credential disclosure.

**NEXT:** Connect the browser's saved revision to a **running owner-controlled persistent worker** and prove one real authenticated browser journey: create → edit → save → render → watch/download MP4 → export source → import → reopen. Then owner-controlled preview staging and real Codex/Claude MCP calls, followed by independent gauntlet, security/accessibility and human release approval. No sale activation or automatic merge.


## 19. Continuation — 2026-10-25 UTC (MM-08 save-before-render regression)

**DECISION:** Repair a concrete human-facing P1: the Render button previously queued the last saved revision even when the user had changed visible text, colour, duration or brief without clicking Save. Preserve the collapsed gallery-first editor, October 24 hero, source/licence records, main and live deployment.

**CHANGES:** Commits `8723e72` and `ade3e4f` update `site/src/modules/project-editor.ts` to compare the visible form with the open immutable revision, save changed fields before queueing, and fail closed on a revision conflict or validation error. Unchanged forms do not create redundant revisions. `scripts/locale-browser-smoke.mjs` now explicitly edits visible text to **Ana Ruiz Updated** and duration to **2.8s** after a prior Save, clicks Render without another Save, and checks that revision 3 and its queued/cancelled job reflect those changes. The existing browser proof still covers authentication, both languages, gallery playback, mobile layout and zero persisted bearer keys.

**PROOF STATUS:** New GitHub Actions [run 40207998444](https://github.com/executiveusa/motionmaster/actions/runs/40207998444) was **in progress** at ledger write. Do not report this slice as passed until the new run completes and its Chromium and TypeScript gates are checked. Earlier run [40207343216](https://github.com/executiveusa/motionmaster/actions/runs/40207343216) passed on `f097702`, before this regression fix. The latest editor changes have not been deployed; Vercel still reports READY at older `33aee7d`.

**RISKS:** This repairs unsaved-form loss but does not yet establish a single browser-to-running-worker-to-watch/export/re-import acceptance run. Render still requires an owner-controlled worker, manual source import UI is absent, hosted staging and live Claude/Codex MCP calls are unverified, and independent Landing Page Director/security/accessibility/user gauntlets remain outstanding. The repository is public. Sale remains off.

**ROLLBACK:** Revert `ade3e4f` and `8723e72` on draft PR #2, or close the draft PR. No schema migration, main merge, production deploy, paid activation, force-push, credential disclosure or Montage edit.

**NEXT:** Inspect CI for the auto-save regression and repair any failure. Then prove one uninterrupted authenticated browser create/edit/render/watch/download/export/import/reopen flow with the real default worker, followed by owner-controlled staging and independent release gates.


## Continuation — 2026-10-25 16:20 UTC (MM-09 browser source import)

**DECISION:** Continue private development, release blocked. The immediately preceding CI [40208050254](https://github.com/executiveusa/motionmaster/actions/runs/40208050254) completed **SUCCESS** for the prior save-before-render slice at `7abb6a3`. Do not confuse that success with the new import UI changes.

**CHANGES:** `4026d41` adds an authenticated, progressively disclosed `.json.gz` source-import form to the existing human editor, reusing `POST /api/v1/projects/import` rather than introducing another backend. The form rejects files over 64 MiB before upload, never persists the access key, creates a **new** project rather than overwriting the original, and opens the imported editable revision. `f013bdb` adds English and es-MX translations for the import flow and errors. `f94a99f` and `45c0581` extend the real Chromium test to reject malformed archives without mutating projects and to import/reopen a valid synthetic source archive through the actual authenticated browser file input.

**PROOF STATUS:** CI for `45c0581` [run 40210997653](https://github.com/executiveusa/motionmaster/actions/runs/40210997653) was queued when this ledger was written. No claim of a passing browser import or successful build until this run completes. The synthetic archive test is not evidence of a completed real-worker video-to-export-to-import journey.

**SITE:** Vercel deployment metadata still reports the READY alias `motionmaster-private-preview.vercel.app` on old SHA `33aee7d` (target: production); this branch's source-import UI is **not** deployed. Live site and benchmark HTML could not be independently fetched by the web reader. The gallery-first design, English default, Mexican Spanish toggle, and four prompt-backed videos are preserved in code; no hero rewrite.

**RISKS / REVIEW:** Source assets remain untrusted and require licence review; imported HTML is quarantined by the existing backend. Hosted persistent worker, real browser-to-default-worker edited MP4/export/reimport acceptance, live Codex/Claude MCP host invocations, independent design/security/accessibility gauntlet, 10 E2E repetitions, and 5 uncoached users remain open. The repository visibility is public despite private-v1 development. Builder review is not independent approval.

**ROLLBACK:** Revert `45c0581`, `f94a99f`, `f013bdb`, and `4026d41` on the draft branch. No schema migration, main merge, production deploy, paid service, secret disclosure, force-push, Montage edit or sale-state change.

**NEXT:** Inspect the final CI result, repair any failing Chromium/source-import test, then prove the full real-worker browser lifecycle on an owner-controlled persistent staging host. Founder approval is required before deployment or release.


## Continuation — 2026-10-25 17:23 UTC (MM-09 real edited-source export/import acceptance)

**DECISION:** Continue private development; release remains blocked. Extend the existing unmocked default-worker acceptance instead of introducing a second exporter or another dashboard. Preserve the October 24 gallery-first hero, English default/es-MX toggle, source/licence records, main and hosted preview.

**CHANGES:** Commit `ef0f47d` extends `scripts/default-worker-edit-smoke.mjs` after the real first/edited HyperFrames MP4 renders. It exports the **actual completed edited job** with `exportProjectSource`, archives `edited-source.json.gz`, inspects its checksums/provenance and both immutable revisions, imports it into a **distinct** private project with `importProjectSource`, reopens revision 2, verifies the saved `Ana Ruiz` text and duration survive, checks imported `index.html` bytes against the original archive checksum, and asserts that import neither overwrites the source project nor fabricates a completed render job. All tests run in the same isolated temporary workspace and retain a portable source archive and JSON report as evidence. The imported HTML remains inert and is not automatically executed.

**PROOF:** GitHub Actions [run 40215933047](https://github.com/executiveusa/motionmaster/actions/runs/40215933047) ran the real worker and logged `PASS: real HyperFrames MP4 edit/rerender and portable source export/import/reopen.` at 2026-10-25 17:22:43 UTC. The run also logged passing seven quality gates, desktop/mobile capture, Chromium English/es-MX and dynamic translations, four gallery MP4 playback/decoding checks, and the independent 15s HyperFrames render. [Artifact 12607696588](https://github.com/executiveusa/motionmaster/actions/runs/40215933047/artifacts/12607696588) was uploaded (50 files, including `edited-source.json.gz`, original/edited MP4s and frames, report). The CI log confirms the test passed; this ledger does not claim an independent manual inspection of each archived file.

**EVIDENCE LIMIT:** The real worker render/edit/export/import proof and the authenticated Chromium editor/import proof still run as **separate** tests. One uninterrupted human browser → actual running worker → watch/download changed MP4 → export → import → reopen workflow has **not** passed. Nor have 10 consecutive complete trials, hosted persistence/backup/restore, live Codex/Claude MCP host calls, five uncoached users, or independent Landing Page Director/security/accessibility/taste approval. No owner-controlled staging deployment was performed. External web-reader inspection of the live preview and motionvideo.xyz failed in this run; the existing preview is not claimed to contain these changes. The repository is public despite private-v1 development; owner must review visibility. `onSale=false` remains locked.

**ROLLBACK:** Revert `ef0f47d` from draft PR #2; it only changes a test script and temporary CI evidence. No schema migration, original project mutation, main merge, force-push, production deploy, paid service, secret disclosure or Montage edit.

**NEXT:** Prove the single uninterrupted authenticated Chromium editor → default worker → MP4 playback/download → actual source archive upload → reopened imported project on loopback with isolated storage. Only then request owner-controlled persistent staging, live host MCP smokes and independent release reviews.


## Continuation — 2026-10-25 18:25 UTC (MM-08/MM-09 uninterrupted browser-to-real-worker acceptance)

**DECISION:** Continue private development; do not merge or deploy. Close the specific missing integration-proof gap by driving the actual gallery-first human editor in Chromium against the authenticated local API and unmocked HyperFrames worker in **one session**. This is an engineering acceptance test, not independent release approval.

**CHANGES:** Commits `3def6a7`, `d833c39`, `f4c668c`, `01e9cd5`, and `d102702` add `scripts/browser-real-worker-smoke.mjs` and make it a mandatory CI step. The test creates an isolated temporary repository workspace (symlinked read-only source/library/site and copied HyperFrames runtime), starts the shipped MCP/HTTP server with `MOTION_MASTER_RENDER_WORKER=1` and a disposable fixture bearer, opens a fresh Chromium profile, creates a lower-third project, changes visible text to **Ana Ruiz** and duration to **3 seconds**, clicks Render without a separate Save, and waits for the actual default worker. It then plays the authenticated MP4 blob in Chromium, clicks the real Download MP4 and Export source buttons, verifies the downloaded MP4 with FFprobe and the gzip archive's real revision/source metadata, uploads that same archive through the browser Import control, and reopens a distinct editable project without inventing a completed job. A 390px screenshot and report are retained. No production or owner data is used.

**PROOF:** [GitHub Actions 40220862010](https://github.com/executiveusa/motionmaster/actions/runs/40220862010) **SUCCESS** at code commit `d1027021345da7c91292900b937d730d13a13137` (2026-10-25 18:24 UTC). The new required CI step logged: `PASS: uninterrupted Chromium -> real HyperFrames worker -> playable/downloadable MP4 -> source export/import/reopen`. The seven engineering gates, desktop/mobile homepage, English/es-MX dynamic translations, four actual gallery MP4 playback controls, independent 15-second HyperFrames render, and separate original/edited default-worker MP4 + source round-trip all also passed. [Artifact 12608658324](https://github.com/executiveusa/motionmaster/actions/runs/40220862010/artifacts/12608658324) includes the new browser-rendered MP4, its downloaded source archive, mobile imported-editor screenshot, JSON report, and earlier video/browser evidence (54 files total). This ledger records CI log and artifact metadata verification; it does **not** claim independent frame-by-frame review of the downloaded archive. The first required test attempt [40220518018](https://github.com/executiveusa/motionmaster/actions/runs/40220518018) failed because the **test helper** omitted a slash in its API URL, yielding HTTP 404; `d102702` corrects that harness defect. The passing run used the real API and renderer, not a mock.

**LIVE / REVIEW:** The Vercel deployment metadata still reports READY at **old** commit `33aee7d` for `motionmaster-private-preview.vercel.app`; it is not the branch under test and is not proof of a deployed backend. External web-reader fetches of both the preview and motionvideo.xyz were unavailable in this execution. Existing branch-level gallery-first, no-visible-Han, locale and mobile Chromium gates passed. There was no independent Landing Page Director or human taste/security/accessibility approval.

**RISKS / LIMITS:** This is **one** complete browser-driven local loopback trial, not 10 repetitions or an uncoached human usability test. Hosted persistent worker/database, backup/restore and rollback, live Codex and Claude host-to-MCP invocation, 5 uncoached users, independent security/accessibility/taste council, asset rights review, and founder release authorization remain blocked. Repository visibility is still **public** and requires owner review against private-source goals. Sale remains `licence.json.status.onSale=false`. No new production endpoint, paid service, secret disclosure or Montage edit.

**ROLLBACK:** Revert `d102702`, `01e9cd5`, `f4c668c`, `d833c39`, `3def6a7` on draft PR #2, or close the PR. These commits add/repair an isolated CI acceptance harness and workflow gate; they do not migrate existing data, edit product UI/source/licences, modify main, or change hosting. No auto-merge or force-push.

**NEXT:** Define owner-controlled persistent **staging** architecture with auth, durable volume, backups and tested restore; require explicit owner authorization before any staging deployment. Then execute the same browser test against staging, 10 repeated trials, real Codex/Claude host MCP smokes, and independent Landing Page Director/security/accessibility/first-time-user gauntlet. Do not request release approval or activate sales before those gates pass.


### Evidence refinement — 2026-10-25 18:30 UTC (independently inspected CI artifacts)

**CHANGES:** Commits `f9e9604` and `9384257` strengthen the same acceptance harness after inspection showed that the first mobile screenshot was of the gallery rather than the imported editor. The test now forces instant scrolling and **asserts the imported editor is inside the mobile viewport** before capturing; it also decodes early and late PNG frames from the actual browser-downloaded MP4 and rejects a motionless video. The initial incorrect screenshot is not represented as editor proof.

**PROOF:** [GitHub Actions 40221290218](https://github.com/executiveusa/motionmaster/actions/runs/40221290218) **SUCCESS** at code head `9384257a35c1845cf53e74e9cb6f440e9ae61126`. [Artifact 12609369545](https://github.com/executiveusa/motionmaster/actions/runs/40221290218/artifacts/12609369545) was independently downloaded and inspected. `browser-real-worker/report.json` reports `status: passed` with all seven checks. The downloaded MP4 independently probes as H.264 **1920×1080, 3.000s**, SHA-256 `ae77f7ace53e65b31adb1f051f6fef5dac8189a6664d246ea3adac2bb115f173`. Its late frame was opened and visibly reads **Ana Ruiz**. Early/late frames differ. The exported `.json.gz` archive was independently decompressed: two revisions, four source files, all four SHA-256 checksums valid, and final editable variable `name: Ana Ruiz`. The new mobile screenshot was opened and **does show the imported human editor** at 390px, with no horizontal overflow; the persistent bottom 'Watch videos' CTA still consumes some viewport height and remains a taste-review candidate. CI also passed all earlier gallery, locale, quality, and HyperFrames gates.

**LIMITS / NEXT:** This evidence remains one isolated CI loopback session, not staging, 10 repetitions, live Claude/Codex MCP host invocation, independent gauntlet approval, or uncoached human testing. Preserve main, draft PR #2, old live deployment and `onSale=false`. The next engineering slice is persistent owner-controlled staging design and rollback/backup verification, not another homepage rewrite.


## 2026-10-25 20:19 UTC — MM-10 mobile editor CTA and density repair

**DECISION:** Fix a concrete mobile P1 without redesigning the October 24 gallery-first hero, adding another dashboard, or touching production. Preserve the private v1 scope, main and `onSale=false`.

**CHANGES:** `f60f3aa`, `fe1b7a6`, `78698f7`, `7902016`, `7813ee6`, `44ead5e` keep the sticky "Watch videos" gallery CTA out of an expanded editor's viewport, initialize observation after editor mount, and condense five mobile toolbar buttons into a two-column layout. An initial Chromium screenshot showed the English authenticated editor correctly clear of the CTA but a separate Spanish screenshot still displayed the CTA; the second fix reads live editor geometry on scroll/toggle/resize instead of trusting a stale intersection callback. Both the full browser-worker acceptance and Spanish locale smoke now assert that the CTA is hidden over the active editor. Existing buttons, auth and translated copy are retained.

**PROOF:** [GitHub Actions run 40229971541](https://github.com/executiveusa/motionmaster/actions/runs/40229971541) **SUCCESS** at code head `44ead5ee1fe85654b308e41bd8be0e718ca57455`; [artifact 12612885178](https://github.com/executiveusa/motionmaster/actions/runs/40229971541/artifacts/12612885178) was downloaded and inspected. The 390px Spanish editor screenshot shows no sticky CTA covering the form. The 390px authenticated imported-editor screenshot shows the compact two-column toolbar, no bottom CTA and no horizontal overflow. The browser report passed 8 checks including real default HyperFrames rendering, 1920x1080 H.264 3.000s playback, download, editable source export/import/reopen. The MP4 was independently probed (SHA-256 `ae77f7ace53e65b31adb1f051f6fef5dac8189a6664d246ea3adac2bb115f173`). Existing seven quality gates, four playable gallery examples, English/es-MX round trip, no visible untranslated Han text, separate HyperFrames smoke, and offline staging recovery tests passed. This is local CI, not a deployed backend or an independent design approval.

**LIVE / RISK:** Vercel deployment metadata still reports READY on old SHA `33aee7d` at `motionmaster-private-preview.vercel.app`; branch changes are not hosted. Direct external page fetch of the live site and `motionvideo.xyz` failed, so no live A/B taste verdict is claimed. Owner-controlled persistent staging, real host rollback, 10 consecutive hosted journeys, live Codex/Claude MCP calls, independent Landing Page Director/security/accessibility review, five uncoached users, asset-rights review and public-repo visibility remain open. PR #2 is large and needs independent subsystem review.

**ROLLBACK:** Revert `44ead5e`, `7813ee6`, `7902016`, `78698f7`, `fe1b7a6`, `f60f3aa` in reverse order on the draft branch. No data migration, main change, merge, force-push, production deployment, paid service, credential disclosure, Montage edit or sale activation.

**NEXT:** MM-13 owner-approved private staging host with persistent single-writer workspace, HTTPS/auth, backups and rollback rehearsal. Then ten uninterrupted hosted journeys and actual Codex/Claude MCP host smokes; independent review and founder release decision remain mandatory.

## 2026-10-25 21:20 UTC — MM-13 private staging preflight (no deployment)

**DECISION:** Continue private v1; release and staging deployment remain blocked. A selected owner-controlled host is not yet authorized or configured. Rather than adding a dashboard or changing the gallery-first hero, add a small, read-only, fail-closed staging safety check.

**CHANGES:** `87eda2b` adds `scripts/staging-preflight.mjs`; `6f1a7b9` adds isolated positive/negative fixtures; `662bc39` makes the test mandatory in PR CI; `29cc76b` documents operator use and limits. The preflight checks an absolute pinned release root, built frontend/MCP entrypoints, owner-only workspace permissions outside the served site, disabled sale state, loopback-only listener, explicit render worker, minimum-length bearer configuration, valid port, exact HTTPS origin allowlist and a private HTTPS MCP endpoint. It prints check names and booleans, never the bearer. A passing report says `preflight-passed-not-deployed`, not staging-ready.

**PROOF:** Local Node syntax checks and disposable-fixture test passed; unconfigured CLI exited nonzero. [GitHub Actions 40234783265](https://github.com/executiveusa/motionmaster/actions/runs/40234783265) **SUCCESS** at code head `29cc76b`, including the new fail-closed preflight test, offline backup/restore, seven quality gates, desktop/mobile Chromium, English/es-MX dynamic i18n, four playable gallery videos/prompts, HyperFrames smoke, actual edited MP4, and the uninterrupted browser-to-default-worker render/watch/download/export/import/reopen test. [Artifact 12614537556](https://github.com/executiveusa/motionmaster/actions/runs/40234783265/artifacts/12614537556) was uploaded; this entry records CI metadata and logs, not an independent visual review of this new archive. The previous CI artifact was independently visually inspected.

**LIVE / LIMITS:** Vercel deployment metadata still reports the public preview alias READY at old SHA `33aee7d`; this code is not deployed. Direct web-reader access to the live preview and motionvideo.xyz was unavailable. The preflight cannot verify encryption, secret entropy, firewall/VPN, HTTPS termination, durable mounting, host backup/restore, live Codex/Claude calls, 10 hosted browser trials, or independent security/taste/accessibility/human approval. GitHub repository visibility remains public. No live staging URL exists in evidence.

**ROLLBACK:** Revert `29cc76b`, `662bc39`, `6f1a7b9`, `87eda2b` on draft PR #2. These add two scripts, a CI gate and documentation only. `main` remains `adc9685`; no schema migration, production deploy, paid service, auto-merge, force-push, secret disclosure, Montage change or sale activation.

**NEXT:** On an owner-selected private host, run the preflight with actual secret-store configuration, then prove the network perimeter, encrypted persistent volume, off-host backup/restore and rollback before any staging acceptance. Only after authorization run 10 hosted complete browser journeys and actual Codex/Claude MCP host invocations; obtain independent release approval.


## 2026-10-25 23:15 UTC — MM-13 public health information disclosure repair

**DECISION:** Continue private v1, release blocked. Keep the October 24 gallery-first UI, English/es-MX locale behavior, and rendering workflow unchanged. No staging host authorization or production deployment.

**INSPECT:** Draft PR #2 remained open/unmerged at head `9b5707b` before this slice, with 207 commits and 52 changed files. Previous run [40239117099](https://github.com/executiveusa/motionmaster/actions/runs/40239117099) passed. The unauthenticated `GET /health` response exposed local directory paths, MCP endpoint, token source, Montage tenant/base URL, brand path, tool inventory and licence metadata via `statusDocument`. The live preview and benchmark could not be directly fetched; no live design verdict is claimed. Repository visibility remains public.

**CHANGES:** `3de3bbe` adds a regression to `mcp/test/private-http-auth.test.mjs` requiring a public liveness-only JSON shape. `6939921` narrows `mcp/src/index.ts` `statusDocument()` to `name`, `version`, and `status: ok`, preserving the existing 200 status and basic health-monitor compatibility. Both `/health` and the non-site `/` fallback now use the minimal response. No authentication, API route, MCP protocol, user-facing UI or database changes.

**PROOF / LIMIT:** Code and regression were committed on `agent/completion-loop-v1`; CI for `6939921` was not yet available when this entry was written. The previous passing CI does **not** verify this new change. Real browser/video proof for this slice is inherited from the preceding successful branch run, not newly claimed. No host security or live staging proof is implied.

**RISKS:** Owner-controlled staging, encrypted persistent storage, host backup/restore, 10 consecutive hosted browser journeys, live Codex/Claude MCP host calls, independent taste/security/accessibility review, five uncoached users, asset rights, and public-repository visibility remain release blockers. Sale state remains false.

**ROLLBACK:** Revert `6939921` and `3de3bbe` on the draft branch. Main, deployed preview, credentials and owner data remain untouched; no force-push, merge, paid service or Montage edit.

**NEXT:** Verify CI on the code commit, then obtain explicit owner-controlled staging authorization before deploying. Continue only with evidence-backed, small slices.


### MM-13 health fix — CI regression repair and verified result (2026-10-25 23:20 UTC)

**FAILURE/REPAIR:** The first full run [40243880087](https://github.com/executiveusa/motionmaster/actions/runs/40243880087) failed 2 of 135 MCP tests and the tool-policy harness because legacy tests expected private licence/tool metadata in the unauthenticated health response. The fix intentionally did **not** restore that disclosure. Commits `d843b37`, `c825d71`, `1618d64` update the API/Montage tests and MCP tool verification to check minimal public liveness and read recorded licence/rendering/domain facts from the existing `/api/v1/licence` endpoint instead. The MCP route remains separately exercised. The security regression stays enforced.

**PROOF:** [GitHub Actions run 40244082534](https://github.com/executiveusa/motionmaster/actions/runs/40244082534) **SUCCESS** at code head `1618d648d97e46bb70f02b31df7727bf6201dd87`. Downloaded and inspected [artifact 12618026972](https://github.com/executiveusa/motionmaster/actions/runs/40244082534/artifacts/12618026972): 135/135 MCP tests, 46/46 MCP policy checks, seven completion quality gates, desktop/mobile Chromium, English/es-MX dynamic translations, four real playable gallery examples/prompts, HyperFrames smoke, default-worker edited MP4, and uninterrupted authenticated browser → render → watch/download → export/import/reopen all passed. The browser report records actual Chromium, default renderer, isolated workspace and 3-second MP4. This is CI/loopback proof, **not hosted staging or live user approval**.

**LIVE:** Owner-linked Vercel deployment metadata was read again and still reports READY on old `33aee7d`, not this branch. Live preview and motionvideo.xyz HTML fetch failed; no new live-site taste verdict. Repo remains public; `onSale=false` unchanged.

**ROLLBACK:** Revert `1618d64`, `c825d71`, `d843b37`, `6939921`, `3de3bbe` on draft PR #2; main, deployment, database and user assets unchanged. No production deployment, merge, force-push, paid service, credential disclosure or Montage edit.

**NEXT:** Stop adding preflight-only features. Obtain owner-controlled private staging authorization, then verify encrypted persistence, backup/restore, ten hosted browser runs, live Codex/Claude MCP calls and independent release reviews. Keep sale blocked.

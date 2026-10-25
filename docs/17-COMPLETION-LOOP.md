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

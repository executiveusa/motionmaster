# Prompt improvement in Motion Master

**State:** built into private creation console (review-first) and existing MCP `enhance_prompt` tool. The Hunyuan adapter is **optional, disabled by default and not release-approved**. This is a bounded addition to the existing Motion Master platform, not another product/workstream.

## Human workflow

1. Enter a brief or select a real video example.
2. Choose **Motion Master** (default) or **Hunyuan (local, opt-in)**.
3. Click **Improve prompt**. The server returns a suggestion, source attribution, assumptions and any fallback warning.
4. Edit the suggested text if needed; **Use this brief** replaces the local composer value only after explicit consent. **Keep original** discards it.
5. **Create** is a separate action. Improving does **not** render, create a job, change a project, or spend model credits.

The local browser source and full original prompt remain unchanged until the user accepts. If the composer changes while the preview is open, the previous preview cannot overwrite it. Errors keep the original. English and es-MX controls are supported.

## Backend surface

- `POST /api/v1/prompts/enhance` with JSON `{"prompt":"ACME launch title"}`
- Optional `{"prompt":"ACME launch title","provider":"hunyuan"}`
- Returns existing Motion Master `Enhancement` fields (original, enhanced, score, assumptions, checks, references), plus `provider`, `applied:false`, and optional `warning`.
- The default uses the **existing** deterministic `enhance` function already exposed by the MCP `enhance_prompt` tool. No duplicate prompt engine.
- Endpoint respects the existing API bearer-token middleware if `MOTION_MASTER_API_KEY` is set.
- Maximum prompt input: 6,000 characters. No text is logged intentionally.
- An invalid, missing or unavailable optional Hunyuan worker returns the same deterministic Motion Master brief, with an explicit warning. No fake inference claim.

## Hunyuan upstream status and license gate

Reference: https://github.com/Hunyuan-PromptEnhancer/PromptEnhancer

It is **primarily a text-to-image / image-editing prompt-rewriting research model**, not a proven video-motion prompt engine. The default Hunyuan 7B model is about **13 GB**. Its **Tencent Hunyuan Community License Agreement** has explicit territory exclusions (EU, UK and South Korea), distribution obligations, acceptable-use terms and potential commercial implications. Seek legal/owner approval before deploying it or offering it to users.

**This repo does not vendor upstream source, model weights, or dependencies.** No automated install, download, inference expense, telemetry, API-key forwarding, or commercial enablement is performed.

### Optional local setup (only after license and resource review)

1. Separately clone and pin a reviewed upstream commit on the owner-controlled Linux/GPU host. Read its LICENSE and usage terms.
2. Install its requirements in a separate environment, then manually download a compatible Hunyuan PromptEnhancer model (7B example documented upstream). Do **not** commit weights or credentials.
3. After explicit owner/license acceptance, configure the following on the owner host only:

```bash
export MOTION_MASTER_HUNYUAN_AGREE_LICENSE=1
export MOTION_MASTER_HUNYUAN_UPSTREAM=/opt/PromptEnhancer
export MOTION_MASTER_HUNYUAN_MODEL=/opt/models/promptenhancer-7b
python3 scripts/hunyuan-prompt-worker.py
```

4. On the private Motion Master API process, opt in:

```bash
export MOTION_MASTER_HUNYUAN_ENABLED=1
export MOTION_MASTER_HUNYUAN_WORKER_URL=http://127.0.0.1:8789/enhance
```

The worker binds **only** to `127.0.0.1:8789`, loads the upstream model once, and serves only `POST /enhance`. The Node adapter rejects non-loopback URLs, redirects and credential-bearing URLs. A timeout/unavailable worker falls back to deterministic improvement. This optional integration must receive independent license/security/performance review before any private-host activation.

Hunyuan produces a **visual-direction suggestion** appended to Motion Master's deterministic motion brief. The original subject, timing and requirements are retained; users must review the appendix before accepting.

## Evidence / rollback

Run `npm test --prefix mcp`, `npm run build --prefix site`, site/browser smoke and full completion gates. Test that brief improvement alone creates no render or job, rejects invalid prompts, preserves the ACME/NOVA text, and the user can reject/revise the suggestion.

Before-state: main `50c0a97482e2c218b89916c491984f8a7923794c`. On the **isolated feature branch only**, one-command rollback is `git reset --hard 50c0a97482e2c218b89916c491984f8a7923794c`. Never reset shared `main`. The rollback rehearsal must be evidenced before merge. The PR stays review-only: no production deployment, no sale activation, no model download.

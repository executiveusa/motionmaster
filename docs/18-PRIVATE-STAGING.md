# MM-13 — Owner-controlled private staging and recovery contract

**State: SPECIFIED / NOT DEPLOYED.** This document does not authorize a hosting change, paid resource, production deployment, repository visibility change, or release. Draft PR #2 remains unmerged and `licence.json.status.onSale=false`.

## Minimal architecture (no second dashboard)

Use **one owner-controlled Linux host** with a durable encrypted volume and a single running Motion Master API/HyperFrames worker process. Keep the existing gallery-first Vite frontend. Do not use a serverless function for FFmpeg jobs or place project records on ephemeral build storage. The existing `mcp/src/projects.ts` store is a **single-writer filesystem**; do not run two API/worker replicas against the same workspace. Multi-tenant hosting and distributed workers are outside private v1.

- Pin a reviewed Git SHA for the code. Keep `library/`, `plugins/`, `generator/`, `site/dist/` and `mcp/dist/` under that release. Mount persistent `workspace/` separately under the same repository root, outside the publicly served `site/dist/`.
- Keep the Node process on `127.0.0.1` behind an owner-controlled private HTTPS reverse proxy / authenticated access layer. No public unauthenticated render API. Restrict access at the network layer, not merely through CORS. The app's bearer key is a **single shared owner credential**, not end-user identity or tenant isolation.
- Set `MOTION_MASTER_API_KEY` in the host's secret store (not the repo), `MOTION_MASTER_RENDER_WORKER=1`, and `MOTION_MASTER_REPO_ROOT` to the pinned release root. Use `MOTION_MASTER_ALLOWED_ORIGINS` for the exact private HTTPS origin. Never print bearer tokens or export them in browser storage.
- Enforce one writer process and bounded job concurrency. Persist the entire `workspace/` tree, including projects, revisions, jobs, renders, imported source, uploads and artifacts. Observe disk capacity, render failures, API 401/403/5xx and process restarts.
- Preserve the existing Vercel alias until owner approval and live branch deployment verification. Its READY state at old commit `33aee7d` does **not** establish a working staging backend.

## Offline local snapshot and recovery

`scripts/staging-workspace.mjs` is an **offline integrity and recovery helper**, not an encrypted off-site backup system. Backups contain user content and rendered assets. Store only on owner-controlled encrypted media with restricted access, and separately maintain an encrypted off-host copy under an owner-managed retention policy. Do not upload a workspace snapshot as a public CI artifact.

Before backup or restore: stop the API, render worker and all workspace writers; verify the process is stopped. The `--confirm-stopped` flag is an operator acknowledgment, **not** an automated lock or proof of quiescence. Snapshot consistency is not guaranteed with concurrent writers.

```sh
# All paths below are placeholders. Never run against production without approval.
node scripts/staging-workspace.mjs backup /owner/release /owner/backups/mm-YYYYMMDD --confirm-stopped
node scripts/staging-workspace.mjs verify /owner/backups/mm-YYYYMMDD

# Restore into a SEPARATE existing release root with NO workspace/ directory.
node scripts/staging-workspace.mjs restore /owner/backups/mm-YYYYMMDD /owner/recovery-release --confirm-stopped
```

The helper rejects symlinks/special files, records SHA-256 checksums and sizes for every file, verifies exact snapshot contents, writes copied files with mode 0600, and refuses to overwrite an existing workspace. Restore copies to a temporary directory and renames only after checksum verification. The printed manifest SHA-256 is an integrity reference, **not a cryptographic signature**. Save it separately to detect malicious manifest replacement. The script does not back up secrets, DNS, host configuration or code, and it does not encrypt data.

## Recovery / deployment acceptance (not yet executed)

1. Owner selects the private host, durable volume, domain, access controls and secret storage; record the exact approved configuration without exposing credentials.
2. Freeze a reviewed SHA and prove build + TypeScript + tests + four gallery videos + English/es-MX switch + no user-visible Chinese on desktop/mobile.
3. With the worker stopped, create and verify an encrypted off-host backup. Restore into a **separate** empty staging release root. Confirm project IDs, immutable revisions, source checksums and actual MP4 playback; only then start the restored worker.
4. Rehearse rollback by stopping the process, reverting to the previous pinned release, and mounting the verified workspace only if schemas remain compatible. Never replace an active workspace in place.
5. Run **10 consecutive** real authenticated browser → create/edit/render/watch/download/export/import/reopen journeys against the private staging URL; capture FFprobe, video frames, timestamps, screenshots and failures.
6. Invoke the deployed MCP server from **actual Codex and Claude hosts**; record tool names, request/response shape, render artifacts and authorization failures. Local MCP unit tests do not satisfy this gate.
7. Require independent Landing Page Director, accessibility, security, asset-licence and uncoached-user approval. Builder cannot approve their own release.

**Rollback anchor:** `main` at `adc9685e6b4b995ab80db214ef237ac0f03d4486` remains untouched. For this focused slice revert commits adding `scripts/staging-workspace*.mjs`, this document and the CI gate. No deployed data migration occurred.

**Known limitation:** The current filesystem store does not support multi-writer or multi-tenant production use. The backup helper is tested with disposable fixtures, not an actual owner workspace or a live recovery exercise. Do not claim staging is ready or sale is enabled.

## Fail-closed staging preflight (MM-13)

Run `node scripts/staging-preflight.mjs` **on the selected owner-controlled host**, after building the pinned release and creating a private `workspace/` directory. It checks the pinned absolute release root, built site/MCP entrypoints, owner-only workspace permissions and location outside the served site, `onSale=false`, loopback-only API listener, explicit render worker, nonempty strong-length bearer configuration, valid port, exact HTTPS origin allowlist and a private HTTPS MCP URL. It emits only check names and pass/fail flags; never prints the bearer.

The script is **read-only** and returns a nonzero exit code when a check fails. A pass is labelled `preflight-passed-not-deployed`, not `ready`. It does **not** prove secret entropy, disk durability or encryption, HTTPS proxy configuration, firewall/private network reachability, actual host backup/restore, live MCP calls or user acceptance. Those require independent, owner-controlled evidence before deployment or release. CI runs `node scripts/staging-preflight-smoke.mjs` against disposable fixtures to test both safe and unsafe configurations; it does not run against a real host.

Do not place a real API key in a shell history, GitHub Actions artifact or issue comment. Configure secrets through the host's secret store. No new hosting resource or deployment is authorized by this preflight.

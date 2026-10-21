<!--
SPDX-License-Identifier: AGPL-3.0-only
Copyright (C) 2026 Motion Master
This directory is a separate AGPL-3.0 work that talks to a Montage instance
over its public HTTP/MCP interfaces. It is NOT part of the proprietary
Motion Master product and is excluded from its licence by design.
-->

# Deliverable — Motion Master → Montage bridge

## Summary

A clean-room TypeScript/Node **client** in `bridge/` that lets Motion Master
drive a user-run Montage instance over Montage's public surfaces: the board
HTTP API (`/api/projects`, `/api/project/{id}/state`, the `/events` SSE feed,
`/media/...`) for reads and watching, and the MCP studio tools
(`timeline_get`, `timeline_replace`, `project_validate`) for timeline writes.
No Montage code was copied, forked or vendored — the AGPL-3.0 repository was
read read-only, and this directory ships its own AGPL-3.0-only client with the
required header on every file. The bridge produces timeline documents; it
never renders anything (Montage renders).

**This revision closes the bridge out.** It (1) proves the three review
defects are fixed, (2) adds the licensing note `LICENSING.md` with the AGPL
posture that ships today and the commercial dual-licence upgrade path, (3)
makes the README configuration table truthful against the code, and (4)
refreshes this deliverable and `NOTES-FOR-DOCS.md`.

## Public API

```ts
const bridge = await createMontageBridge({ montageUrl: process.env.MONTAGE_URL });

bridge.listProjects(): Promise<MontageProjectSummary[]>   // GET /api/projects
bridge.getProjectState(id): Promise<MontageProjectState>   // GET /api/project/{id}/state
bridge.watchProject(id, cb): () => void                    // GET /api/project/{id}/events (SSE)
bridge.mediaUrl(id, path): string                         // GET /media/{id}/{path}
bridge.thumbUrl(id, path, w?): string                     // GET /thumb/{id}/{path}
bridge.health(): Promise<{ok: boolean}>                   // GET /api/health
bridge.getTimeline(id): Promise<MontageTimelineDocument>  // MCP timeline_get
bridge.replaceTimeline(id, t): Promise<MontageTimelineDocument> // MCP timeline_replace
bridge.validateTimeline(id): Promise<MontageProjectValidation> // MCP project_validate
bridge.buildExplainerTimeline(spec): ExplainerTimeline     // brief → cuts + overlays
bridge.loadTokens(): Promise<LoadedTokens>                 // motion-master/plugins tokens
```

Lower level exports: `MontageHttpClient`, `McpStdioClient`,
`MontageTimelineStore`, `McpTimelineTransport`, `HttpTimelineTransport`,
`toTimelineDocument()`, `fromTimelineDocument()`, `validateTimeline()`,
`formatValidationResult()`, `loadSchema()`, `INLINE_TOKENS`,
`themeConfigFromTokens()`, `attachLicense()`.

Configuration: `MONTAGE_URL` (default `http://127.0.0.1:8000`;
`montageUrlFromEnv()` throws when it is unset), `MONTAGE_TENANT_ID` (default
`tenant_owner`), `MONTAGE_MCP_COMMAND` (default `python`), `MONTAGE_MCP_ARGS`
(default `-m yappy_clipz.mcp_server`), `MONTAGE_TOKEN` (hosted auth only).
Every one of them is read by the code — see the table check below.

## Changed files in this revision

| File | Change |
|---|---|
| `bridge/LICENSING.md` | **New.** The licensing note: the AGPL posture that ships today, the commercial dual-licence upgrade path, and the licence text the Montage owner would add to the Montage repository. |
| `bridge/README.md` | Configuration table made truthful (with the code location and the real default for every variable); points at `LICENSING.md`; `LICENSING.md` and `test/regressions.test.ts` added to the file table; the HTTP transport UNVERIFIED note now states the two auth modes read from the Montage source. |
| `bridge/src/http-client.ts` | `requestWithAuth()` extracted and made public, so every HTTP path uses one auth code path. |
| `bridge/src/timeline-store.ts` | The studio HTTP transport now sends the bearer token (it called bare `fetch` before, so `MONTAGE_TOKEN` never reached it). |
| `bridge/test/regressions.test.ts` | One more regression test for the token on the studio HTTP transport. |
| `bridge/timeline.schema.json` | `$id` no longer points at an invented host — it uses the `motionmaster` label, so no product domain with a TLD is hard-coded in the bridge. |
| `bridge/NOTES-FOR-DOCS.md` | Bullets for the three fixes, the test result, the owner-owned Montage repo / commercial-licence path, and the corrected configuration facts. |
| `bridge/deliverable.md` | This file. |

Nothing outside `bridge/` was modified. Nothing was pushed to git.

## The three review defects — verified as fixed

All three were fixed by the build lead; this run proves they hold.

| # | Defect | Fix | Test (all green) |
|---|---|---|---|
| 1 | The write-back path returned a document whose `version` was one behind what Montage stores (Montage stores `expected_version + 1`). | `src/timeline-store.ts`: the fallback is now `{ ...document, version: expectedVersion + 1 }`. | `write-back reports the version Montage actually stored, not the one sent` (ok 11) |
| 2 | The Explainer → Timeline v1 → Explainer round trip silently dropped a cut's media path (the fallback expression collapsed to `""`). | `src/timeline-store.ts`: `source` falls back to `assetId`, and a cut with no recoverable source **throws** instead of round-tripping to an empty path. | `a cut keeps its media path across the Timeline v1 round trip` (ok 12), `a cut with no recoverable source is an error, not a silent empty path` (ok 13) |
| 3 | `MONTAGE_TOKEN` was documented in the README but never sent, so a hosted-auth instance would reject every call. | `src/http-client.ts`: the token is read and sent as `Authorization: Bearer`, including on the SSE streams. | `MONTAGE_TOKEN is sent as a bearer token when set` (ok 14), `no Authorization header is sent when no token is configured` (ok 16) |

Defect 1 was cross-checked against the Montage source: `yappy_clipz/service.py`
sets `updated_timeline["version"] = current_version + 1` before saving, so
`expected_version + 1` is the version the instance actually holds. Defect 3 was
cross-checked the same way: in hosted auth mode the Montage studio API
authenticates with `verify_bearer(request.headers.get("authorization"))`,
while local mode expects the `X-Yappy-Tenant` header.

### A fourth gap of the same class, found and fixed here

Checking defect 3 against every HTTP path turned up one path the fix had
missed: `HttpTimelineTransport` (the `transport: "http"` alternative to MCP)
called bare `fetch` and set only `X-Yappy-Tenant` and `Content-Type`, so
`MONTAGE_TOKEN` still never reached it. That matters more than it looks —
Montage's MCP server is local-stdio only (`yappy_clipz/mcp_server.py` refuses
to start in hosted mode), so the studio HTTP transport is the *only* way to
reach the timeline tools in hosted auth mode. With the token missing there,
the bridge could not work in hosted mode at all.

Fixed: `MontageHttpClient.requestWithAuth()` is now public and is the single
auth path; the studio transport goes through it and sends
`Authorization: Bearer <token>`. Covered by a new regression test,
`the studio HTTP transport sends the bearer token as well` (ok 15).

That is why the suite now reports **24** tests rather than 23: the 23 tests
the build lead shipped all still pass unchanged, and this is one added test
for the gap above.

## `npm test` output (real run)

```
$ cd bridge && npm test
> @motion-master/montage-bridge@0.1.0 test
> node --experimental-strip-types --test test/*.test.ts

ok 1 - a brief becomes a footage cut plus motion-graphics overlays
ok 2 - the built timeline passes validation
ok 3 - a brief without footage is refused
ok 4 - the theme override comes from the Motion Master tokens
ok 5 - the bridge reads the board API
ok 6 - mediaUrl points at the Montage media endpoint
ok 7 - watchProject consumes the change feed
ok 8 - the MCP client talks to a stdio server
ok 9 - the timeline store reads and replaces a timeline over MCP
ok 10 - a stale expected version is refused
ok 11 - write-back reports the version Montage actually stored, not the one sent
ok 12 - a cut keeps its media path across the Timeline v1 round trip
ok 13 - a cut with no recoverable source is an error, not a silent empty path
ok 14 - MONTAGE_TOKEN is sent as a bearer token when set
ok 15 - the studio HTTP transport sends the bearer token as well
ok 16 - no Authorization header is sent when no token is configured
ok 17 - a valid timeline passes the schema and the Montage rules
ok 18 - the shipped footage-title example is valid
ok 19 - a scene cut without its required field is rejected
ok 20 - overlapping cuts in the same layer are rejected
ok 21 - a cut with out_seconds before in_seconds is rejected
ok 22 - a non-object timeline is rejected
ok 23 - an empty cut list is rejected
ok 24 - an overlay that starts off the footage is a warning, not an error
# tests 24
# suites 0
# pass 24
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 2850.170684
```

(Real run; the per-test YAML diagnostic blocks are elided above, the `ok`/`not
ok` lines and the summary block are verbatim.) The build lead's 23 tests —
including the three defect regressions, ok 11–14 — are unchanged and green;
ok 15 is the new test for the studio HTTP transport token.

`npx tsc --noEmit` is clean:

```
$ cd bridge && npx tsc --noEmit
$ echo $?
0
```

(No output, exit code 0.)

## `npm run validate:example` output (real run)

```
$ cd bridge && npm run validate:example
> @motion-master/montage-bridge@0.1.0 validate:example
> node --experimental-strip-types validate-timeline.ts examples/footage-title.timeline.json

examples/footage-title.timeline.json
  OK     timeline is valid against the schema and the Montage rules.
```

exit=0

```
$ node --experimental-strip-types validate-timeline.ts --json examples/footage-title.timeline.json
{
  "ok": true,
  "files": [
    {
      "file": "examples/footage-title.timeline.json",
      "valid": true,
      "errors": [],
      "warnings": []
    }
  ]
}
exit=0
```

The four fixtures behave as intended (each exits non-zero with a useful
error):

```
$ node --experimental-strip-types validate-timeline.ts test/fixtures/missing-required-field.timeline.json
test/fixtures/missing-required-field.timeline.json
  ERROR  [SCHEMA_REQUIRED] /cuts/1: /cuts/1 must have required property 'text'
  ERROR  [SCHEMA_IF] /cuts/1: /cuts/1 must match "then" schema
  ERROR  [SCENE_FIELD_MISSING] cuts[1].text: cuts[1].text is required for scene type "text_card".
  FAILED 3 error(s), 0 warning(s).
1 of 1 timeline(s) failed validation.
exit=1

$ node --experimental-strip-types validate-timeline.ts test/fixtures/overlapping-cuts.timeline.json
test/fixtures/overlapping-cuts.timeline.json
  ERROR  [CUT_OVERLAP] cuts[1]: Cuts "cut-open" (0s → 5s) and "cut-overlap" (3s → 9s) overlap in layer "primary".
  FAILED 1 error(s), 0 warning(s).
1 of 1 timeline(s) failed validation.
exit=1

$ node --experimental-strip-types validate-timeline.ts test/fixtures/out-before-in.timeline.json
test/fixtures/out-before-in.timeline.json
  ERROR  [CUT_OUT_BEFORE_IN] cuts[1].out_seconds: cuts[1].out_seconds (6) must be greater than in_seconds (9).
  FAILED 1 error(s), 0 warning(s).
1 of 1 timeline(s) failed validation.
exit=1

$ node --experimental-strip-types validate-timeline.ts test/fixtures/valid.timeline.json
test/fixtures/valid.timeline.json
  OK     timeline is valid against the schema and the Montage rules.
exit=0
```

## Configuration table: checked against the code

The README table was rebuilt from the source, not from memory. Every
`process.env` read in `bridge/`:

```
$ grep -rn "process\.env" bridge/src bridge/test bridge/scripts bridge/validate-timeline.ts
bridge/src/http-client.ts:68:export function montageUrlFromEnv(env: Record<string, string | undefined> = process.env): string {
bridge/src/http-client.ts:88:      options.baseUrl ?? process.env.MONTAGE_URL?.trim() ?? "http://127.0.0.1:8000",
bridge/src/http-client.ts:92:    this.token = options.token ?? process.env.MONTAGE_TOKEN?.trim() ?? undefined;
bridge/src/index.ts:137:    const tenantId = options.tenantId ?? process.env.MONTAGE_TENANT_ID ?? "tenant_owner";
bridge/src/index.ts:150:      command: process.env.MONTAGE_MCP_COMMAND ?? options.mcp?.command ?? "python",
bridge/src/index.ts:151:      args: process.env.MONTAGE_MCP_ARGS
bridge/src/index.ts:152:        ? process.env.MONTAGE_MCP_ARGS.split(" ").filter(Boolean)
bridge/src/mcp-client.ts:109:      env: { ...process.env, ...(this.options.env ?? {}) },
bridge/src/timeline-store.ts:292:    this.tenantId = options.tenantId ?? process.env.MONTAGE_TENANT_ID ?? "tenant_owner";
```

Result: **all five documented variables are read by the code, and the code
reads no other variable.** Two corrections went into the README:

* `MONTAGE_URL` was documented as "required, no default". The code falls back
  to `http://127.0.0.1:8000`; only the exported `montageUrlFromEnv()` helper
  throws when it is unset. The table now states the real default and points
  at the fail-fast helper.
* `MONTAGE_TOKEN` was documented as "bearer token, hosted auth mode", which
  was true of the board API but not of the studio HTTP transport (see above).
  It now says exactly which requests carry the header, and notes that the MCP
  transport never does — Montage's MCP server is local-stdio only.

The `MONTAGE_MCP_ARGS` row now says the value is split on spaces, and the
`MONTAGE_TENANT_ID` row now says what it is used for (the `X-Yappy-Tenant`
header in local mode, the `tenant_id` argument of the MCP tools, and that in
hosted mode the tenant comes from the token).

## Licensing note (`bridge/LICENSING.md`)

New file. It states both postures:

1. **What ships today** — `bridge/` is AGPL-3.0-only, in its own directory,
   with the proprietary product in `site/`, `plugins/` and `mcp/` untouched by
   the copyleft. The product does not import, bundle or link the bridge; it
   ships its own clean-room Montage client in `mcp/`, so no AGPL code enters
   the proprietary tree.
2. **The upgrade path** — the Montage repository is owner-owned, so a
   commercial licence for the specific components the bridge talks to (the
   board API in `backlot/`, the studio HTTP API in `yappy_clipz/api.py`, the
   MCP tools in `yappy_clipz/mcp_tools.py` + `mcp_server.py`, and the
   `Explainer` composition contract in `remotion-composer/src/Explainer.tsx`)
   would let the bridge be relicensed, and the AGPL boundary in the shipped
   product would disappear.

The note includes the actual licence text the owner would add to the Montage
repository — a dual-licence notice (AGPL-3.0-or-later **or** a commercial
licence, with the covered components named) plus a short README pointer — and
states plainly that **Motion Master does not modify the Montage repository**:
the notice is a decision for the owner, not an action taken here. The AGPL
option is not withdrawn, the commercial licence does not retroactively
relicense anything, and no terms or price are set by the note.

The clean-room discipline is kept under both postures: a commercial licence
is permission to *use* Montage, not to copy it.

## Clean-room verification (re-checked, and still clean)

The Montage repository was fetched again for this pass
(`git clone --depth 1` of `executiveusa/pauli-montage-video-agent` into a
scratch directory outside the product) and the bridge was checked against it.

**Distinctive identifiers — none present in the bridge.** Grepped the
bridge's code, schema, example and fixtures (`src/`, `test/`, `scripts/`,
`validate-timeline.ts`, `timeline.schema.json`, `examples/` — the prose
documents are excluded on purpose, because they name the interfaces they
describe) for 35 identifiers taken from the three named sources:

* `backlot/server.py` (8): `ChangeHub`, `SSE_HEARTBEAT_SECONDS`, `THUMB_WIDTHS`,
  `_IGNORE_PARTS`, `PROJECTS_DIR`, `THUMB_CACHE_DIR`, `summarize_project`,
  `load_board_state` — **0 hits**.
* `yappy_clipz/mcp_tools.py` (4): `_positive_version`,
  `TimelineVersionConflict`, `YAPPY-CLIPZ` and `timeline_replace_tool` —
  **0 hits**. The module name `yappy_clipz` also has **0 hits** in the code
  scope; the only occurrences of it anywhere in the bridge are the MCP server
  invocation (`python -m yappy_clipz.mcp_server`), i.e. the name of a process
  to start, not code.
* `remotion-composer/src` (22): every component and helper name in that
  tree — `HeroTitle`, `SectionTitle`, `StatCard`, `CalloutBox`,
  `ParticleOverlay`, `AnimeScene`, `TitledVideo`, `CinematicRenderer`,
  `CollageBurst`, `LyricOverlay`, `TalkingHead`, `ProductReveal`,
  `ScreenshotScene`, `TerminalScene`, `TextCard`, `CaptionOverlay`,
  `ComparisonCard`, `EndTag`, `ProgressBar`, `ProviderChip`, `StatReveal`,
  `resolveAsset` — **0 hits**.

**Verbatim line overlap.** Every line of the 22 files in the code scope was
compared against every line of every `.py`/`.ts`/`.tsx`/`.js`/`.json`/`.md`/
`.yaml`/`.html`/`.css`/`.sql`/`.sh` file in the Montage repository (122,308
distinct lines of 30+ characters). 56 lines matched, and every one of them is
generic scaffolding or a public field name, not Montage implementation:
`import { test } from "node:test";`,
`import { readFileSync } from "node:fs";`,
`const controller = new AbortController();`,
`"in_seconds": { "type": "number", "minimum": 0 },`,
`extensions?: Record<string, unknown>;`, the JSON Schema `$schema` dialect
identifier, and the field names of the timeline documents (`durationSeconds`,
`sourceStartSeconds`, `kind: "asset" | "text" | …`). No algorithm, no Montage
function body, no Montage fixture and no Montage asset was found in the
bridge.

## Notes

- **AGPL boundary.** `executiveusa/pauli-montage-video-agent` is AGPL-3.0 and
  was read only (cloned into a scratch dir outside the product). No Montage
  source, schema file, fixture or asset was copied into `bridge/`. The bridge
  is an independent client of Montage's public HTTP and MCP interfaces, so it
  ships **AGPL-3.0-only** and lives in its own directory, excluded from the
  proprietary Motion Master licence by design. Every file in `bridge/`
  carries the required header (JSON files carry the notice in `_license` /
  `$comment`, because JSON has no comments). See `LICENSING.md`.
- **Owner-owned Montage.** The founder has confirmed the Montage repository is
  theirs, so a commercial dual-licence is available and the AGPL boundary is
  now a business choice rather than a legal constraint. The bridge keeps its
  clean-room discipline either way.
- **The bridge does not render.** Montage renders, with
  `npx remotion render src/index.tsx Explainer out/video.mp4` in the Montage
  `remotion-composer/` project. The bridge only produces the input document.
- **Two timeline shapes.** Montage stores a canonical *Timeline v1* document
  (`version`/`canvas`/`tracks`); the composer renders the *Explainer* document
  (`cuts`/`overlays`/`themeConfig`). The bridge speaks both and converts
  between them; the conversion is bridge-authored and marked UNVERIFIED.
- **UNVERIFIED items** (no live Montage instance exists in the sandbox; each
  was read from the Montage source instead): the render invocation and how
  props are passed; the MCP protocol version actually negotiated; the
  Explainer → Timeline v1 mapping and whether a render path reads
  `extensions.explainer`; the HTTP fallback transport
  (`PUT /api/v1/projects/{id}/timeline` + `X-Yappy-Tenant`, and the bearer
  token in hosted mode); IBM Plex font availability in the render container;
  relative `cut.source` resolution against the composer's `public/`; per-type
  overlay `position` values; and the studio rule "text must sit on visible
  media" (implemented as a warning, never an error). All are listed in
  `bridge/README.md`.
- **Tokens.** Read at runtime from
  `motion-master/plugins/motion-master/assets/motion-tokens.json` (v1.0.0),
  which exists; the inline fallback in `src/tokens.ts` is a duplicate and is
  flagged TODO for the integration worker.
- **No price, no invented URL, no domain.** Nothing in the bridge carries a
  price, and no product domain with a TLD is hard-coded anywhere in it; the
  licensing note refers to the Montage repository by its path and to Motion
  Master as `motionmaster` only. The one external reference left in the
  bridge is the JSON Schema dialect identifier in `timeline.schema.json`
  (`$schema`), which is a fixed specification identifier, not a product
  address.
- **Not written, on purpose:** `docs/MONTAGE-INTEGRATION.md` (owned by another
  worker). The facts it needs are in `bridge/NOTES-FOR-DOCS.md`.
- Nothing was pushed to git.

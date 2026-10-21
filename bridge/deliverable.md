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

Configuration: `MONTAGE_URL` (required), `MONTAGE_TENANT_ID` (default
`tenant_owner`), `MONTAGE_MCP_COMMAND` (default `python`), `MONTAGE_MCP_ARGS`
(default `-m yappy_clipz.mcp_server`), `MONTAGE_TOKEN` (hosted auth only).

## Changed files

Everything is new; nothing outside `bridge/` was modified.

| File | Purpose |
|---|---|
| `bridge/package.json` | ESM package, `npm test` / `typecheck` / `validate` scripts, deps: ajv. |
| `bridge/tsconfig.json` | Strict TS config (NodeNext, type stripping friendly). |
| `bridge/src/types.ts` | Cut / overlay / timeline / document types for both Montage timeline shapes. |
| `bridge/src/http-client.ts` | Board API client: projects, state, SSE watch, media + thumb URLs, health. |
| `bridge/src/mcp-client.ts` | Minimal MCP client (JSON-RPC 2.0 over stdio) — clean-room. |
| `bridge/src/timeline-store.ts` | `timeline_get` / `timeline_replace` / `project_validate` + Explainer ↔ Timeline v1 conversion. |
| `bridge/src/explainer.ts` | `buildExplainerTimeline()` — motion brief → footage cuts + motion-graphics overlays. |
| `bridge/src/tokens.ts` | Motion Master palette/type tokens read from `plugins/` at runtime, inline fallback. |
| `bridge/src/validate.ts` | JSON Schema validation + the real Montage rules (required fields, in/out sanity, overlap, durations). |
| `bridge/src/index.ts` | Public API + `MontageBridge` facade + `createMontageBridge()`. |
| `bridge/timeline.schema.json` | JSON Schema (draft 2020-12) for the emitted timeline subset. |
| `bridge/validate-timeline.ts` | Runnable validator: schema + rules, non-zero exit and useful errors. |
| `bridge/examples/footage-title.timeline.json` | The "footage mix" artifact: 3s clean cut, hero title + section title over the footage, ends at 0:16. |
| `bridge/scripts/generate-examples.ts` | Regenerates the example from the bridge code. |
| `bridge/test/validate.test.ts` | Schema + rule tests over the fixture set. |
| `bridge/test/explainer.test.ts` | Brief → timeline tests. |
| `bridge/test/http-client.test.ts` | Tests against a local mock board API (incl. SSE). |
| `bridge/test/mcp-client.test.ts` | Tests against a fake MCP stdio server (incl. version conflict). |
| `bridge/test/fixtures/valid.timeline.json` | Fixture: valid timeline. |
| `bridge/test/fixtures/missing-required-field.timeline.json` | Fixture: scene cut missing `text`. |
| `bridge/test/fixtures/overlapping-cuts.timeline.json` | Fixture: two cuts overlap in one layer. |
| `bridge/test/fixtures/out-before-in.timeline.json` | Fixture: `out_seconds` < `in_seconds`. |
| `bridge/test/fixtures/fake-mcp-server.mjs` | Fake MCP server used by the tests. |
| `bridge/README.md` | Licence boundary in plain words, configuration, how to run, UNVERIFIED list. |
| `bridge/NOTES-FOR-DOCS.md` | 15 bullet facts for the documentation writer. |
| `bridge/deliverable.md` | This file. |

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
ok 11 - a valid timeline passes the schema and the Montage rules
ok 12 - the shipped footage-title example is valid
ok 13 - a scene cut without its required field is rejected
ok 14 - overlapping cuts in the same layer are rejected
ok 15 - a cut with out_seconds before in_seconds is rejected
ok 16 - a non-object timeline is rejected
ok 17 - an empty cut list is rejected
ok 18 - an overlay that starts off the footage is a warning, not an error
# tests 18
# suites 0
# pass 18
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 2395.026759
```

`npx tsc --noEmit` is clean (0 errors).

## Schema validation output (real run)

```
$ node --experimental-strip-types validate-timeline.ts examples/footage-title.timeline.json
examples/footage-title.timeline.json
  OK     timeline is valid against the schema and the Montage rules.
exit=0

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
  ERROR  [SCHEMA_REQUIRED] /cuts/1: /cuts/1 must have required property 'text'
  ERROR  [SCHEMA_IF] /cuts/1: /cuts/1 must match "then" schema
  ERROR  [SCENE_FIELD_MISSING] cuts[1].text: cuts[1].text is required for scene type "text_card".
  FAILED 3 error(s), 0 warning(s).
exit=1

$ node --experimental-strip-types validate-timeline.ts test/fixtures/overlapping-cuts.timeline.json
  ERROR  [CUT_OVERLAP] cuts[1]: Cuts "cut-open" (0s → 5s) and "cut-overlap" (3s → 9s) overlap in layer "primary".
exit=1

$ node --experimental-strip-types validate-timeline.ts test/fixtures/out-before-in.timeline.json
  ERROR  [CUT_OUT_BEFORE_IN] cuts[1].out_seconds: cuts[1].out_seconds (6) must be greater than in_seconds (9).
exit=1

$ node --experimental-strip-types validate-timeline.ts test/fixtures/valid.timeline.json
  OK     timeline is valid against the schema and the Montage rules.
exit=0
```

## Notes

- **AGPL boundary.** `executiveusa/pauli-montage-video-agent` is AGPL-3.0 and
  was read only (GitHub API / raw / codeload into a scratch dir outside the
  product). No Montage source, schema file, fixture or asset was copied into
  `bridge/`. The bridge is an independent client of Montage's public HTTP and
  MCP interfaces, so it ships **AGPL-3.0-only** and lives in its own
  directory, excluded from the proprietary Motion Master licence by design.
  Every file in `bridge/` carries the required header (JSON files carry the
  notice in `_license` / `$comment`, because JSON has no comments).
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
  (`PUT /api/v1/projects/{id}/timeline` + `X-Yappy-Tenant`); IBM Plex font
  availability in the render container; relative `cut.source` resolution
  against the composer's `public/`; per-type overlay `position` values; and
  the studio rule "text must sit on visible media" (implemented as a warning,
  never an error). All are listed in `bridge/README.md`.
- **Tokens.** Read at runtime from
  `motion-master/plugins/motion-master/assets/motion-tokens.json` (v1.0.0),
  which exists; the inline fallback in `src/tokens.ts` is a duplicate and is
  flagged TODO for the integration worker.
- **Not written, on purpose:** `docs/MONTAGE-INTEGRATION.md` (owned by another
  worker). The facts it needs are in `bridge/NOTES-FOR-DOCS.md` (15 bullets).
- Nothing was pushed to git.

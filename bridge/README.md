<!--
SPDX-License-Identifier: AGPL-3.0-only
Copyright (C) 2026 Motion Master
This directory is a separate AGPL-3.0 work that talks to a Montage instance
over its public HTTP/MCP interfaces. It is NOT part of the proprietary
Motion Master product and is excluded from its licence by design.
-->

# Motion Master → Montage bridge

A small, clean-room **client** that lets Motion Master drive a **Montage**
instance you run yourself.

* It contains **no Montage code**. Nothing was copied, forked or vendored out
  of `executiveusa/pauli-montage-video-agent`; that repository was only read.
* It talks to Montage over Montage's own public surfaces: the **HTTP board API**
  and the **MCP studio tools**.
* **It never renders anything.** Montage renders. The bridge produces a
  timeline document and hands it over; the Montage composer does the render.
* This directory is **AGPL-3.0-only** because it links a GPL/AGPL interface
  (the Montage composition and MCP tools). It is deliberately kept **outside**
  the proprietary Motion Master product, and it is excluded from the product's
  licence by design. The rest of `motion-master/` is not AGPL.

## What it does

| Capability | Montage surface used |
|---|---|
| `listProjects()` | `GET /api/projects` |
| `getProjectState(id)` | `GET /api/project/{id}/state` |
| `watchProject(id, cb)` | `GET /api/project/{id}/events` (SSE) |
| `mediaUrl(id, path)` / `thumbUrl(id, path)` | `GET /media/{id}/{path}` / `GET /thumb/{id}/{path}` |
| `health()` | `GET /api/health` |
| `getTimeline(id)` | MCP tool `timeline_get` |
| `replaceTimeline(id, t)` | MCP tool `timeline_replace` |
| `validateTimeline(id)` | MCP tool `project_validate` |
| `buildExplainerTimeline(spec)` | pure function — no network |

The point of the bridge is the **footage mix**: real MP4 cuts with in/out
points, with Motion Master motion graphics (hero title, section title, stat
badge) composited over the footage, in the Motion Master palette and type.

## Configuration

| Variable | Read by | Required | Default | What it does |
|---|---|---|---|---|
| `MONTAGE_URL` | `src/http-client.ts` | no* | `http://127.0.0.1:8000` | Base URL of **your** Montage instance, e.g. `http://127.0.0.1:8000`. |
| `MONTAGE_TENANT_ID` | `src/index.ts`, `src/timeline-store.ts` | no | `tenant_owner` | Tenant that owns the projects. Sent as the `X-Yappy-Tenant` header (local auth mode) and as the `tenant_id` argument of the MCP studio tools. In hosted auth mode the tenant comes from the token instead. |
| `MONTAGE_MCP_COMMAND` | `src/index.ts` | no | `python` | Command that starts the Montage MCP server. |
| `MONTAGE_MCP_ARGS` | `src/index.ts` | no | `-m yappy_clipz.mcp_server` | Arguments for that command. Split on spaces. |
| `MONTAGE_TOKEN` | `src/http-client.ts` | no | – (none) | Bearer token, only needed if your instance runs in hosted auth mode. Sent as `Authorization: Bearer <token>` on every HTTP request: the board API, the SSE feeds and the studio HTTP transport. Not used by the MCP transport — Montage's MCP server is local-stdio only. |

\* `MONTAGE_URL` falls back to the local default `http://127.0.0.1:8000`. If
you want the bridge to fail fast instead of falling back, call
`montageUrlFromEnv()`, which throws when the variable is unset.

In practice you set `MONTAGE_URL` and nothing else. Every variable in this
table is read by the code — the table is checked against `process.env` in
`src/`, so a documented variable that does nothing cannot slip in.

## How to run it

```bash
cd bridge
npm install                 # ajv (schema validation) + typescript (typecheck)

export MONTAGE_URL="http://127.0.0.1:8000"    # your Montage instance
export MONTAGE_TENANT_ID="tenant_owner"       # optional

npm test                                     # unit tests, no Montage needed
npm run typecheck                            # tsc --noEmit
npm run validate:example                     # validate the shipped example
node --experimental-strip-types validate-timeline.ts path/to/timeline.json
```

Using it from code:

```ts
import { createMontageBridge } from "./src/index.ts";

const bridge = await createMontageBridge({ montageUrl: process.env.MONTAGE_URL });

const projects = await bridge.listProjects();
const timeline = bridge.buildExplainerTimeline({
  source: "assets/video/source.mp4",
  durationSeconds: 16,
  openingSeconds: 3,
  title: "MOTION MASTER",
  subtitle: "Your footage, in motion",
  sectionTitle: "SOURCE FOOTAGE",
});

await bridge.replaceTimeline(projects[0].project_id, timeline);
```

The MCP server is spawned lazily on the first timeline call, so the board API
can be used without a Montage MCP server running. If you prefer the studio
HTTP API over MCP, use `createMontageBridge({ transport: "http" })`.

## The two timeline shapes

Montage has two timeline documents, and the bridge speaks both:

1. **Timeline v1** — the canonical document the studio tools store
   (`{ version, canvas, tracks }`). `timeline_replace` is optimistic: the
   stored document's `version` must equal `expected_version`, and the saved
   document is stored as `version + 1`.
2. **Explainer timeline** — the input document of the Remotion `Explainer`
   composition (`{ cuts, overlays, themeConfig }`). This is the shape the
   footage mix needs.

`buildExplainerTimeline()` produces shape 2. `replaceTimeline()` accepts either
and projects shape 2 onto shape 1 (cuts → `video` track items, overlays →
`overlay` track items, the original document kept under `extensions.explainer`).

## Rendering

The bridge does not render. Montage does, with the composer in
`remotion-composer/`:

```bash
npx remotion render src/index.tsx Explainer out/video.mp4
```

The timeline JSON from this bridge is the `Explainer` composition's input
document (`cuts` / `overlays` / `themeConfig`).

## Files

| File | What it is |
|---|---|
| `src/index.ts` | Public API and the `MontageBridge` facade. |
| `src/http-client.ts` | Montage board API client (projects, state, SSE, media URLs). |
| `src/mcp-client.ts` | Minimal MCP client (JSON-RPC 2.0 over stdio). |
| `src/timeline-store.ts` | `timeline_get` / `timeline_replace` / `project_validate` + document conversion. |
| `src/explainer.ts` | `buildExplainerTimeline()` — brief → Montage timeline. |
| `src/tokens.ts` | Motion Master palette/type tokens, read from `plugins/` at runtime. |
| `src/validate.ts` | Schema validation + the Montage rules. |
| `timeline.schema.json` | JSON Schema for the timeline subset this bridge emits. |
| `validate-timeline.ts` | Runnable validator (schema + rules, non-zero exit on failure). |
| `examples/footage-title.timeline.json` | The "footage + title" artifact: 3s clean cut, then title over the footage, ending at 0:16. |
| `test/fixtures/*.timeline.json` | Fixture set: valid, missing field, overlapping cuts, out before in. |
| `test/regressions.test.ts` | Regression tests for the three defects found in review (stored version, cut media path on the round trip, bearer token). |
| `LICENSING.md` | Licensing note: the AGPL posture that ships today and the commercial dual-licence upgrade path. |
| `NOTES-FOR-DOCS.md` | Bullet facts for the documentation writer. |

Every file in this directory carries the AGPL header (JSON files carry it in a
`_license` / `$comment` field, because JSON has no comments). The two
generated artefacts — `package-lock.json` and `node_modules/` — are the
exception: npm rewrites them, so they cannot hold a comment header.

## Tokens

The palette and type tokens are **read from `motion-master/plugins/`** at
runtime — the current file is
`plugins/motion-master/assets/motion-tokens.json` (`motion-master.tokens`
v1.0.0). The inline values in `src/tokens.ts` are only a fallback, and a load
that falls back reports `source: "inline"`.

**TODO(integration-worker):** the inline fallback duplicates the palette and
the type scale. Keep it in sync with the token file, or drop it once the token
file always ships with the plugin.

## What is UNVERIFIED

Everything below was read from the Montage repository (read-only) but could
**not** be exercised against a live Montage instance — there is none in this
sandbox. Treat these as assumptions to re-check on a real machine.

* **UNVERIFIED — render command.** `npx remotion render src/index.tsx
  Explainer out/video.mp4` is the command the Montage composer package
  declares. How the props document is passed to it in a real pipeline (and
  whether the studio web app calls it the same way) was not observed.
* **UNVERIFIED — MCP handshake.** The bridge requests protocol version
  `2024-11-05` and accepts whatever the server answers. The version the
  Montage MCP server actually negotiates was not observed.
* **UNVERIFIED — the Explainer → Timeline v1 mapping.** That mapping is
  written by this bridge; Montage does not define one. Whether a given Montage
  render path reads `extensions.explainer` was not verified.
* **UNVERIFIED — HTTP fallback transport.** `PUT /api/v1/projects/{id}/timeline`
  with an `X-Yappy-Tenant` header was read from the Montage source and is
  implemented here, but never run against a live instance. Read from that
  source: in local auth mode the tenant header is required, in hosted auth
  mode the call is authenticated with `Authorization: Bearer` — which is why
  `MONTAGE_TOKEN` is sent on this path too.
* **UNVERIFIED — fonts.** `themeConfig` asks for `IBM Plex Sans` /
  `IBM Plex Mono`. The Montage composer loads Space Grotesk by default;
  whether the IBM Plex families are installed in your render container is up
  to that container.
* **UNVERIFIED — source paths.** Relative `cut.source` paths are resolved by
  the composer against its own `public/` directory (read from the composer's
  asset resolver). The example uses a project-relative path, so it must exist
  there — or be given as an absolute path.
* **UNVERIFIED — overlay positions.** The accepted `position` values per
  overlay type were read from the Montage components; a newer Montage may
  accept more.
* **UNVERIFIED — local review renderer.** The rule "text must sit on visible
  media" was read from the Montage studio web code. It is implemented here as
  a *warning*, never as an error, so a title over an empty tail is still legal.

## Licence boundary

The bridge is a separate AGPL-3.0-only work. It links Montage's GPL/AGPL
interfaces (the `Explainer` composition document shape and the MCP tools), so
it carries AGPL-3.0. It is **not** part of the proprietary Motion Master
product, it lives in its own directory, and it is excluded from the product's
licence by design. The source of the Montage repository was read, never
copied; no Montage code, assets or fixtures are redistributed here.

**See [`LICENSING.md`](./LICENSING.md)** for the full note: the AGPL posture
that ships today, the AGPL boundary in the shipped product, and the
commercial dual-licence upgrade path that is available because the Montage
repository is owner-owned — including the licence text the owner would add to
that repository. Motion Master does not modify the Montage repository; that
decision belongs to its owner.

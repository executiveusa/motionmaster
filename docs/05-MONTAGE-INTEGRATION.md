# MONTAGE INTEGRATION

How Motion Master drives a Montage instance to mix real footage with motion graphics.

**The rule that governs everything here:** `executiveusa/pauli-montage-video-agent` is
**AGPL-3.0** and is not ours to change. Motion Master never modifies it, never vendors it,
and never copies its code. It is a **client** that talks to a Montage instance the user
runs themselves, over Montage's public HTTP and MCP interfaces.

---

## 1. The verified Montage surface

Read directly from the repository on 2026-10-21. Everything in this section is a fact
about the code, not an assumption.

### HTTP API — the "Backlot" FastAPI server (`backlot/server.py`)

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/health` | Liveness. |
| GET | `/api/projects` | List projects on the board. |
| GET | `/api/project/{project_id}/state` | Full board state for one project, including its timeline. |
| GET | `/api/project/{project_id}/events` | SSE change feed — the board pushes a change whenever the project directory changes on disk. |
| GET | `/api/library/events` | SSE feed for the media library. |
| GET | `/thumb/{project_id}/{file_path}` | Thumbnails. |
| GET | `/media/{project_id}/{file_path}` | Media assets. |
| GET | `/p/{project_id}` | Project page. |
| GET | `/p/{project_path}` | Project page by path. |
| GET | `/` | Board UI. |

The server **never writes to project directories** — it only observes and serves.

### MCP tools (`yappy_clipz/mcp_tools.py`)

| Tool | What it does |
|---|---|
| `project_create` | Create a project. |
| `project_list` | List projects. |
| `project_get` | Fetch one project. |
| `project_validate` | Validate a project. |
| `timeline_get` | Read a project's timeline. |
| `timeline_replace` | Replace a project's timeline. |

### Rendering — `remotion-composer/`

A Remotion **4.0.484** project. The composition is named **`Explainer`**.

```bash
npx remotion render src/index.tsx Explainer out/video.mp4
```

### The timeline schema (`remotion-composer/SCENE_TYPES.md`)

A timeline is a list of **cuts** and **overlays**.

**Cuts.** A cut with no `type` is raw video, played with `OffthreadVideo`:

| Field | Meaning |
|---|---|
| `source` | path to an mp4 (or png/jpg for a still) |
| `source_in_seconds` | source in-point |
| `in_seconds` | timeline in-point |
| `out_seconds` | timeline out-point |
| `animation` | `zoom-in` or `ken-burns` |

Named cut types: `text_card`, `hero_title`, `stat_card`, `callout`, `comparison`,
`bar_chart`, `line_chart`, `pie_chart`, `kpi_grid`, `progress_bar`, `anime_scene`,
`terminal_scene`, `screenshot_scene`.

**Overlays:** `section_title`, `stat_reveal`, `hero_title`, `provider_chip`.

**The capability this product needs:** every scene type accepts `backgroundVideo` and
`backgroundOverlay`. That is how motion graphics get composited **over real footage** —
which is the whole "footage mix" claim on the landing page.

---

## 2. The licence boundary

```
motion-master/
├── site/          proprietary  — the landing page
├── plugins/       proprietary  — the agent plugin + skills
├── mcp/           proprietary  — the MCP server
└── bridge/        AGPL-3.0-only — the Montage client  ← isolated on purpose
```

The bridge ships under AGPL because it is the component that speaks to an AGPL
interface. Keeping it in one directory, with one licence, is what stops the copyleft
from reaching the proprietary product.

Every file in `bridge/` carries:

```ts
// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Motion Master
//
// This directory is a separate AGPL-3.0 work that talks to a Montage instance over
// its public HTTP/MCP interfaces. It is NOT part of the proprietary Motion Master
// product and is excluded from its licence by design.
```

**The bridge is clean-room.** It is written against Montage's *documented interfaces* —
the routes, the tool names, the field names. No implementation is copied, vendored or
transliterated. A reviewer checks this by diffing distinctive identifiers from
`backlot/server.py`, `yappy_clipz/mcp_tools.py` and `remotion-composer/src` against
everything in `bridge/`.

### If the founder owns the Montage repo — and they do

**Confirmed 2026-10-21: the Montage repo is the founder's.** That changes this from a legal
constraint into a business decision, and it means the better option is now available.

**The upgrade path, which is now live:** the owner can grant a commercial licence for the
specific components the bridge talks to. Once that exists, the bridge can ship under the
product's own licence and the AGPL boundary in the shipped product disappears. The exact
licence text the owner would add to the Montage repository is in `bridge/LICENSING.md`.

**What does not change, either way:**

- Motion Master still does not modify, fork or vendor the Montage repo. The bridge talks
  to a Montage instance the user runs.
- The bridge stays clean-room — written against documented interfaces, no copied
  implementation. A review checks this by diffing distinctive identifiers from
  `backlot/server.py`, `yappy_clipz/mcp_tools.py` and `remotion-composer/src`.
- The default posture stays (b) until the owner acts. `bridge/` ships AGPL-3.0-only and the
  proprietary product in `site/`, `plugins/` and `mcp/` is untouched by the copyleft.

**Why keep the AGPL default at all, if you own it?** Because the copyleft is a *feature* for
the users of the Montage instance. A thin bridge that can pull a user's Montage into a
commercial product is exactly the kind of thing AGPL was written to keep visible. The
cleanest end state is: the bridge stays AGPL, the commercial value stays in the skills, the
tokens, the storyboard engine and the product surface, and the founder grants the
commercial licence to whoever needs it.

---

## 3. The bridge API

```ts
import {
  listProjects,
  getProjectState,
  getTimeline,
  replaceTimeline,
  validateTimeline,
  watchProject,
  mediaUrl,
  buildExplainerTimeline,
} from "motion-master-bridge";
```

| Function | Talks to | Returns |
|---|---|---|
| `listProjects()` | `GET /api/projects` | project summaries |
| `getProjectState(id)` | `GET /api/project/{id}/state` | full board state |
| `getTimeline(id)` | `timeline_get` MCP tool | the timeline document |
| `replaceTimeline(id, t)` | `timeline_replace` MCP tool | validation result |
| `validateTimeline(id)` | `project_validate` MCP tool | validation result |
| `watchProject(id, cb)` | `GET /api/project/{id}/events` | SSE subscription |
| `mediaUrl(id, path)` | — | a `/media/...` URL |
| `buildExplainerTimeline(spec)` | — | a valid Montage timeline from a motion brief |

`buildExplainerTimeline` is the important one. It takes a brief and produces a timeline
that mixes **real footage cuts with motion-graphics overlays**, using the Motion Master
palette and type tokens, so the overlay is on-brand rather than a default title card.

### Configuration

| Variable | Required | Meaning |
|---|---|---|
| `MONTAGE_URL` | yes | Base URL of the user's Montage instance, e.g. `http://localhost:8787` |
| `MONTAGE_TENANT_ID` | no | Tenant id passed to the Studio service calls. |
| `MONTAGE_MCP_URL` | no | MCP endpoint, if it is not co-hosted with the HTTP API. |

---

## 4. The example artifact

`bridge/examples/footage-title.timeline.json` is the exact timeline the landing page's
"work with your own footage" section describes:

- a source mp4,
- cut 1 takes the first 3 seconds with no overlay,
- cut 2 continues from 0:03 to 0:14,
- a `hero_title` overlay ("Cut it. Title it.") and a `section_title` overlay
  ("Product update") in the Motion Master accent,
- the timeline ends at 0:16.

It is validated against `bridge/timeline.schema.json` and by
`bridge/validate-timeline.ts`, which additionally enforces the real Montage rules:
required fields per scene type, `out_seconds > in_seconds`, and non-overlapping cuts.

---

## 5. What the bridge does **not** do

- It does **not** render. Montage renders. The bridge produces a timeline; Montage's
  `remotion-composer` turns it into a file.
- It does not write into a Montage project directory. The Backlot server is read-only
  by design and the bridge does not fight that.
- It does not ship a copy of Montage, and it does not require the user to install
  anything for the *non-footage* path. Footage mixing is the Studio-tier feature that
  needs a Montage instance; plain motion generation does not.

<!--
SPDX-License-Identifier: AGPL-3.0-only
Copyright (C) 2026 Motion Master
This directory is a separate AGPL-3.0 work that talks to a Montage instance
over its public HTTP/MCP interfaces. It is NOT part of the proprietary
Motion Master product and is excluded from its licence by design.
-->

# Licensing note — Motion Master → Montage bridge

This note describes the licence posture of `bridge/` and the commercial
upgrade path that is now available. It is an engineering note about how the
code is distributed, not legal advice; the actual grants come from the
licence files themselves.

**Short version:** `bridge/` ships today as **AGPL-3.0-only**, isolated in its
own directory. The owner of the Montage repository can grant a commercial
licence for the specific components the bridge talks to, which would let
`bridge/` be relicensed and remove the AGPL boundary in the shipped product.
**Motion Master does not modify the Montage repository** — that licence
decision belongs to the Montage owner alone.

---

## 1. What ships today: the AGPL posture

`bridge/` is licensed **AGPL-3.0-only**. Every file in the directory carries
the `SPDX-License-Identifier: AGPL-3.0-only` header (JSON files carry the
notice in a `_license` / `$comment` field, because JSON has no comments).

### Why the bridge is AGPL

The bridge is a client of two GPL/AGPL-licensed interfaces in the Montage
project:

* the **Montage composition document shape** — the `Explainer` input document
  (`cuts` / `overlays` / `themeConfig`) that the Montage composer renders, and
* the **Montage MCP studio tool surface** (`timeline_get`, `timeline_replace`,
  `project_validate`, …) that the bridge calls over stdio.

Because it re-implements against those interfaces, the bridge is treated as a
derivative work and is published under the same copyleft. That is a
deliberate, conservative choice: it is the licence that is unambiguously
correct while the bridge talks to an AGPL project.

### How the boundary is kept

| | |
|---|---|
| `bridge/` | AGPL-3.0-only. A separate npm package, a separate process, never imported by the product. |
| `site/`, `plugins/`, `mcp/` | Proprietary. Untouched by the copyleft. No file in the product imports, bundles or links code from `bridge/`. |
| The bridge's own copy of the Montage client | The product ships its **own** clean-room Montage client (`mcp/`), written against the same public HTTP/MCP interfaces. It contains no Montage code either, so it never imports AGPL code into the proprietary tree. |

The practical effect: the AGPL copyleft reaches `bridge/` and stops at the
directory boundary. The proprietary product is not AGPL, because it neither
contains nor links AGPL code — it only *talks to* a Montage instance the user
runs themselves, over a network interface, which is the same relationship any
API client has with the service it calls.

The bridge never renders, never writes into a Montage project directory and
never modifies the Montage repository.

---

## 2. The upgrade path: a commercial dual-licence

The founder has confirmed that the Montage repository is theirs. That turns
the copyleft boundary from a legal constraint into a **business choice**:
the copyright holder of the Montage project can grant a commercial licence
for the components the bridge integrates with.

### What a commercial licence would have to cover

The bridge only ever touches these parts of the Montage repository:

| Component | Where | What the bridge uses it for |
|---|---|---|
| Board HTTP API | `backlot/` (`backlot/server.py`) | `GET /api/health`, `GET /api/projects`, `GET /api/project/{id}/state`, `GET /api/project/{id}/events` (SSE), `GET /media/…`, `GET /thumb/…` |
| Studio HTTP API | `yappy_clipz/api.py` and the routes it registers | `GET`/`PUT /api/v1/projects/{id}/timeline`, `POST /api/v1/projects/{id}/validate` |
| Studio MCP tools | `yappy_clipz/mcp_tools.py`, `yappy_clipz/mcp_server.py` | `timeline_get`, `timeline_replace`, `project_validate` over stdio |
| Explainer composition contract | `remotion-composer/src/Explainer.tsx` and the components it renders | the input document shape (`cuts`, `overlays`, `themeConfig`), the cut / overlay type names and the `position` values |

A commercial licence scoped to **these components** is enough for the bridge:
everything else in the Montage repository is irrelevant to the bridge.

### What changes if (and when) that licence is granted

1. The Montage owner adds the dual-licence notice below to the Montage
   repository and issues a commercial licence to Motion Master.
2. `bridge/` is relicensed — the SPDX headers in every file change from
   `AGPL-3.0-only` to the Motion Master product licence, in a single,
   clearly-labelled change with its own version bump.
3. **The AGPL boundary in the shipped product disappears.** `bridge/` can then
   be merged into the product tree, shipped as a first-class part of it, and
   released under the product's licence.

What does **not** change:

* **The clean-room discipline stays.** A commercial licence is a permission to
  *use* Montage; it is not a licence to copy Montage. The bridge continues to
  contain no copied Montage implementation, no vendored Montage source, no
  Montage fixtures and no Montage assets. The re-implementation stays
  independent and auditable, and the bridge keeps working against an
  AGPL-only Montage exactly as it does today.
* **The AGPL option is not withdrawn.** Anyone who wants it keeps it.
* **Nothing is granted retroactively.** The bridge's history stays AGPL.

This note sets no licence terms, scope, seat count or price. Those are agreed
directly between the Montage owner and Motion Master; this document only
describes the shape of the upgrade.

---

## 3. The licence text the Montage owner would add to the Montage repository

This is a proposal for the **owner** of the Montage repository to apply. It
is not applied by Motion Master, and Motion Master has not modified the
Montage repository in any way.

### 3.1 The notice (for the Montage `LICENSE` file, or a `LICENSE-DUAL` next to it)

```
Dual Licensing Notice
=====================

Copyright (C) 2026 the Montage project authors. All rights reserved.

This software is dual-licensed. You may use, copy, modify and redistribute it
under either of the following licences, at your option:

  1. The GNU Affero General Public License, version 3.0 or later
     (AGPL-3.0-or-later). The canonical licence text published by the Free
     Software Foundation applies and is reproduced in the LICENSE file in the
     root of this repository.

  2. A commercial licence, granted by the copyright holder, for any party
     that needs to use this software inside a proprietary or closed-source
     product, without the copyleft obligations of the AGPL.

The commercial licence is granted per component, and covers the following
parts of this repository:

  - the board HTTP API (backlot/),
  - the studio HTTP API (yappy_clipz/api.py and the routes it registers),
  - the studio MCP tools (yappy_clipz/mcp_tools.py, yappy_clipz/mcp_server.py),
  - the Explainer composition contract (remotion-composer/src/Explainer.tsx
    and the components it renders).

Terms of the commercial licence — scope, seats, support, updates — are agreed
directly with the copyright holder. Until a commercial licence is granted in
writing, option 1 (AGPL-3.0-or-later) applies to everyone.

The AGPL option is not withdrawn and remains available to anyone who wants it.
```

### 3.2 The short pointer (for the Montage `README.md`)

```
## Licensing

This project is dual-licensed: AGPL-3.0-or-later, or a commercial licence
granted by the copyright holder. See LICENSE (or the dual-licence notice next
to it) for the full terms and for the list of components the commercial
licence covers.
```

### 3.3 What the owner still has to do

* Decide whether to dual-licence at all — the AGPL-only status quo is a
  valid answer and needs no change.
* Apply the notice above to the Montage repository (or write an equivalent
  one — the text is a proposal, not a requirement).
* Issue the commercial licence itself, naming the components from §2 and the
  party it is granted to.

---

## 4. What Motion Master does and does not do

* **Motion Master does not modify the Montage repository.** Not now, not as
  part of this bridge, and not as a condition of the bridge working. The
  repository was read only, to learn its public interfaces.
* **Motion Master does not add a licence file to the Montage repository.** The
  notice in §3 is text *for the owner* to apply, if the owner chooses to.
  Applying it is the owner's decision and the owner's action.
* **Motion Master does not require the commercial licence to use the bridge.**
  The bridge works, as shipped, against an AGPL-only Montage instance.
* **Motion Master does not copy Montage code**, under either licence posture.
  The clean-room check behind this note is recorded in `deliverable.md`.

---

## 5. Where the licence headers live

| Place | Notice |
|---|---|
| `bridge/**.ts`, `bridge/**.md` | `// SPDX-License-Identifier: AGPL-3.0-only` header comment |
| `bridge/*.json` (schema, examples, fixtures) | `_license` / `$comment` field — JSON has no comments |
| `bridge/package.json` | `_license` field |
| `bridge/package-lock.json`, `bridge/node_modules/` | no header — npm rewrites them, so a comment cannot survive |

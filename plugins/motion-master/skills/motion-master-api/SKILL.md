---
name: motion-master-api
description: >
  Use the Motion Master API and the HyperFrames block pool from an agent. Covers
  the HTTP API (the library, the motion blocks, the sound shelf, the renderer),
  the MCP tools that mirror it, and the gate: `hyperframes check`, the lint and
  layout pass that catches a silent film, a stretched frame, text under the
  contrast floor and an element with no id. Load this when a brief needs real
  motion blocks, when a composition has to be checked before it is rendered, or
  when something other than an MCP client — a script, a CI job, a web app —
  has to reach Motion Master.
license: SEE LICENSE IN ../../LICENSE.md
metadata:
  author: Motion Master
  version: "1.0.0"
---

# The Motion Master API and the HyperFrames blocks

Motion Master has two surfaces and one set of files.

- **MCP** at `/mcp` — for agents. The tools are the product's tools.
- **HTTP** at `/api/v1` — for everything else: scripts, CI jobs, a web app, a
  second agent's tool belt.

Both read the same files in the repository, so an API response and an MCP tool
result can never disagree. Use whichever fits.

## The server

```bash
cd mcp && npm install && npm start      # http://127.0.0.1:8787
```

`MOTION_MASTER_MCP_PORT` moves the port. `MOTION_MASTER_API_KEY`, when set,
makes every `/api/v1` route need `Authorization: Bearer <key>`. When it is not
set the API is open, which is right for a server on your own machine.

```bash
curl http://127.0.0.1:8787/api/v1                      # the index
curl http://127.0.0.1:8787/api/v1/openapi.json         # the full description
```

## The motion blocks

There are **448 HyperFrames motion blocks** — real, working motion components
with editable variables, not prompt text. Each one has tags, dimensions, a
duration, a licence, and a list of files it is made of.

| what | endpoint | MCP tool |
|---|---|---|
| list blocks | `GET /api/v1/blocks?tag=&query=&limit=&offset=` | `list_motion_blocks` |
| one block in full | `GET /api/v1/blocks/{id}` | `get_motion_block` |
| fill a block from a brief | `POST /api/v1/blocks/fill` | `fill_block` |
| build a composition | `POST /api/v1/compositions/hyperframes` | `build_hyperframes_composition` |
| **run the gate** | — | `check_hyperframes` |

A block's variables are the editable surface: headline strings, image slots,
speed, colour. Filling a block from a brief sets those variables and reports
what it assumed, and leaves anything it could not resolve unresolved rather
than inventing it.

```bash
curl -X POST http://127.0.0.1:8787/api/v1/blocks/fill \
  -H 'content-type: application/json' \
  -d '{"brief":"a 14s launch title on a white canvas"}'
```

## The gate

**Run the gate before you render.** It is the check that catches what a render
cannot:

- a film with no motion in it (`film_silent`)
- a frame stretched to nothing (`dead_stretch`)
- text below the contrast floor (`text_below_floor`)
- an element with no `id` (`media_missing_id`)
- a property animated that should not be (`gsap_non_transform_motion`)
- an empty first frame (`first_frame_empty`)

```bash
npx hyperframes@0.8.186 check <project-dir>
```

From an agent, use the tool or the API:

```bash
curl -X POST http://127.0.0.1:8787/api/v1/compositions/hyperframes \
  -H 'content-type: application/json' -d @storyboard.json
# then, on the project it writes:
```

`check_hyperframes` takes the project directory and returns the findings with
**the file each one came from**. That is the difference between "the film
failed" and "this block failed". A block the gate blames is recorded in
`library/block-verdicts.json` and is never used again.

## The library and the sound

| what | endpoint |
|---|---|
| the nine collections | `GET /api/v1/library/collections` |
| every category, with its count | `GET /api/v1/library/categories` |
| browse items | `GET /api/v1/library/items?query=&collection=&category=&kind=` |
| one item | `GET /api/v1/library/items/{id}` |
| the sound vocabulary (35 kinds) | `GET /api/v1/sfx/kinds` |
| search the sound shelf | `GET /api/v1/sfx?kind=&query=&source=` |
| one sound | `GET /api/v1/sfx/{id}` |
| plan the sound for a set of beats | `POST /api/v1/sound/plan` |

Every library item carries its own licence. Keep it with the item when you
reuse it.

## Rendering

```bash
# MCP: the tool plans the shot list, builds the project and starts the render.
render_film  { brief, shots, sound }

# HTTP: same thing, and the render runs in the background.
curl -X POST http://127.0.0.1:8787/api/v1/films \
  -H 'content-type: application/json' \
  -d '{"brief":"a launch film for a new product","shots":3}'
# → 202 with a job; poll GET /api/v1/films/{id}
```

The render takes minutes. Do not wait on the request; start it, then poll.

The files land under `generator/films/<id>/`, and the server serves them:

```
/films/{id}/video      the mp4
/films/{id}/poster     a poster frame
/films/{id}/sheet      a contact sheet
```

## The rules that matter

- **The gate decides what ships.** If the gate fails a block, drop the block.
  Do not weaken the gate to make a render succeed.
- **Never invent what a block needs.** If a variable has no sensible value from
  the brief, leave it unresolved and say so.
- **Keep the licence with the work.** Library items and blocks each carry one.
- **Render locally.** There is no hosted render allowance, and nothing is ever
  billed automatically.

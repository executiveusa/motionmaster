# 27 — The in-house studio

Date: 2026-11-12. Status: design approved by the founder on three questions;
this document is the build order.

## The three decisions

The founder answered three questions on 2026-11-12, and the answers set the
shape of everything below:

1. **What the studio produces.** House library first, films assembled from it.
   So the reusable thing is a *composition*, not a prompt. An agent picks a
   house scene and fills it; it does not start from a blank page.
2. **Where renders execute.** A queue that can target either — the local
   machine for private work, a remote box for heavy renders.
3. **The taste gate.** Every render. Hard gate. A render that fails is not a
   render that finished; it is a render that did not pass.

## What is already true

This is not a plan to build a studio from nothing. Most of the studio is
already here:

| already built | where |
|---|---|
| 35 MCP tools, 47 skills | `mcp/src/`, `plugins/motion-master/skills/` |
| A deterministic planner, shot planner and prompt enhancer | `mcp/src/planner.ts`, `shots.ts`, `enhancer.ts` |
| 448 registry blocks, each mounted and gated; 75 pass | `library/blocks.json`, `library/block-verdicts.json` |
| 3,988 library items, 1,470 sounds | `library/catalogue.json`, `library/sfx.json` |
| A hard gate on the render path | `mcp/src/render.ts` → `gateProject()` → `hyperframes check` |
| One canonical token set | `plugins/motion-master/assets/motion-tokens.json` |
| Plugin manifests, an HTTP API, a page | `plugins/`, `mcp/src/api.ts`, `site/` |

The gate already blocks a HyperFrames render that fails. The queue already
records job state. The token file is already a single source of truth with a
generated twin and a staleness check.

So the studio is **four layers on top of a working machine**, and the first
one is a defect fix.

## Layer 0 — the contract (a defect, not a feature)

**The plugin still describes a product for sale.** `licence.json` says
`status.onSale = false`, personal use. The site reads that file. The plugin
does not:

- `plugins/motion-master/plugin.json` — *"paid, one-time licence: $99 Solo,
  $399 Studio… Studio can render on our machines with an allowance in your
  licence"*
- `plugins/motion-master/.codex-plugin/plugin.json` — the same, and it says
  **33 skills** where the truth is **47**
- `plugins/motion-master/README.md` — a price table and a hosted-rendering
  promise
- `plugins/motion-master/LICENSE.md` — "paid, one-time licence (Solo $99,
  Studio $399 — one payment, no subscription)"
- `plugins/motion-master/assets/brand.json` — a `rendering.hosted` block with
  an allowance note, *in a file whose own note says not to restate these*

An agent reads the manifest description before it reads anything else. Left
alone it learns that Motion Master is a thing you buy, with a hosted render
allowance nobody has decided the size of. In an in-house studio that is not
merely stale copy — it is the wrong instruction to every agent that loads it.

**The fix is the same pattern the repo already uses for everything else: one
source of truth, a generated twin, and a check that fails when they drift.**

- `scripts/sync-plugin-contract.mjs` reads `licence.json` and writes the
  offer-bearing text into the plugin manifests, the plugin README, the plugin
  LICENSE and `brand.json`.
- Markdown blocks are replaced between `<!-- mm:offer:start -->` and
  `<!-- mm:offer:end -->`, so the prose around them survives and the numbers
  cannot.
- The JSON manifests are fully generated, so a hand edit is a visible diff.
- The description text is rewritten to describe an **in-house motion studio**:
  the skills, the tools, the API, the gate. No price, no "paid", no allowance,
  no hosted rendering promise.
- A new gate, `plugin-contract`, fails the build if any of the five files
  restates a price that `licence.json` does not carry, or if a generated file
  is stale.

**Rule that falls out of it:** while `onSale` is false, the words "paid",
"$99", "$399", "buy" and "hosted render allowance" may not appear in any
file an agent can load. The gate says so in one place instead of in five.

## Layer 1 — brand kits (one global token set is not a studio)

Today every render gets the same palette, the same type, the same easing, the
same durations. That is fine for one brand and useless for a studio that
makes work for more than one.

A **brand kit** is a partial override of the canonical tokens. It may change
the palette, the type, the easing, the durations, the style durations and the
motion rules. It may not remove a token — an override only wins where it has
something to say.

Shape — `studio/kits/<id>.json`:

```json
{
  "id": "house",
  "name": "Motion Master house",
  "notes": "The studio's own identity. The default for every render.",
  "palette": { "accent": "#FF4A1C" },
  "typography": { "display": { "family": "Inter Tight" } },
  "easing": {},
  "duration": {},
  "styleDurations": {},
  "motion": {}
}
```

New module `mcp/src/brandkit.ts`:

- `listBrandKits(repoRoot)` — every kit, with the sections it overrides
- `getBrandKit(repoRoot, id)` — one kit, fully resolved against the base
- `resolveTokens(base, kit)` — deep merge per section, kit wins, base
  survives everywhere the kit is silent
- `saveBrandKit(repoRoot, kit)` — write a kit from a brand brief

Validation, because a kit is authored by an agent and a typo becomes a render
nobody can explain: palette values must be `#RRGGBB` or `#RRGGBBAA`; every
section must be a known token section; a kit may not change `id`, `version` or
`antiSlop`.

Wiring:

- `config.brandKitsPath` → `studio/kits`
- `get_motion_tokens` takes an optional `kit`
- `enhance_prompt` takes an optional `kit`
- `build_composition` and `build_hyperframes_composition` take an optional
  `kit` and resolve tokens before they build
- `render_film` and `compose_film` take an optional `kit` and pass it down

New MCP tools: `list_brand_kits`, `get_brand_kit`, `save_brand_kit`.

The house kit ships as `studio/kits/house.json` and is the default, so the
studio has a house look with no configuration at all.

## Layer 2 — the house library (compositions, not prompts)

The 3,988 library items are *prompts*. They are good for inspiration and
useless for assembly: an agent given one has to write the animation itself,
every time, and get a different result each time.

The house library is a curated set of **compositions**, each one:

- mounted from a block that has already passed the gate (from the 75)
- mapped to one of the ten shot roles, so the agent picks by intent
- bound to a brand kit, so it looks like the studio
- shipped with the prompt that produces it, so an agent can write the brief
  and get the scene

Shape — `studio/templates/<id>.json`:

```json
{
  "id": "title-card-ink",
  "name": "Ink title card",
  "role": "opening",
  "block": "<a gate-passing block id>",
  "kit": "house",
  "durationSeconds": 6,
  "prompt": "The brief that produces this scene.",
  "why": "What this scene is for."
}
```

Built by `scripts/build-house-library.mjs` from the role map
(`library/block-roles.json`) restricted to blocks with a recorded passing
verdict — so a template can never be built on a block that does not pass.

New MCP tools: `list_house_templates`, `get_house_template`,
`plan_house_template` (the brief plus the tokens plus the block, ready to
render).

## Layer 3 — the render queue

Agents will fire renders at once. On a two-core box that is how you lose the
box. The queue is:

- **one job at a time** by default (`MOTION_MASTER_RENDER_CONCURRENCY`)
- **keyed by a content hash** of the brief, the kit, the template and the
  tokens — the same request returns the same film instead of re-rendering it
- **resumable** — the job file already exists; the queue reads it and knows
  what was running
- **targetable** — `local` renders here, `remote` posts to another instance's
  `/api/v1/films`, so the heavy work can go to a box with a GPU

New module `mcp/src/queue.ts`; the queue sits in front of `renderProject()`,
which is already where the gate lives. A job that fails the gate is a failed
job — it is never published as a finished film.

## What is deliberately not built

- **No hosted rendering service.** The MCP server never renders; it hands
  over a command and, now, a queue slot.
- **No accounts, no tenants, no billing.** This is in-house. `licence.json`
  keeps the recorded terms so a later launch is one switch, but nothing in
  the studio path depends on them.
- **No model in the loop.** The enhancer stays deterministic. A model that
  rewrites a brief is a model that invents facts about the subject.
- **No new render engine.** HyperFrames renders, Remotion renders. The studio
  arranges and gates them; it does not add a third.

## The build order, and why

1. **Layer 0.** It is a defect, it is cheap, and it is the first thing every
   agent reads.
2. **Layer 1.** The brand kit is what makes a renderer into a studio, and it
   is the foundation the house templates bind to.
3. **Layer 2.** The house library is what the founder asked for first: house
   library, films assembled from it.
4. **Layer 3.** The queue. It is last because a queue that renders faster but
   renders badly is worse than no queue, and because the gate must be in
   front of it.

## How each layer is proved

- Layer 0: a gate that fails if any agent-readable file restates a price
  `licence.json` does not carry, or if a generated file is stale.
- Layer 1: `mcp/test/brandkit.test.mjs` — resolution, validation, that a kit
  never removes a base token, and that `get_motion_tokens` with a kit returns
  the overridden values.
- Layer 2: `mcp/test/house-library.test.mjs` — every template's block has a
  passing verdict and a role, and every role the studio claims is covered.
- Layer 3: `mcp/test/queue.test.mjs` — the same request hashes to the same
  job, concurrency never exceeds one, and a gate failure is a failure.
- All four: the tool policy check, the MCP suite, and the completion gates.

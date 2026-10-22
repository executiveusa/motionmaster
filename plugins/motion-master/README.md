# Motion Master — the agent plugin

**Describe the video. Get the file.**

Motion Master is a **paid, one-time licence** product. It teaches an AI agent —
ChatGPT, Codex, Claude, Cursor and a dozen more hosts — to storyboard, choreograph and
render motion design **in code**, and to hand a non-technical creator a finished
video, the project, and the source.

| Tier | Price | What you get |
| --- | --- | --- |
| **Solo** | **$99 one-time** | The plugin, 33 upstream motion skills, the MCP server (planner, tokens, clip library, composition generator). Every future update. |
| **Studio** | **$399 one-time** | Everything in Solo, plus footage mixing against your own Montage instance (`mix_footage`), priority support and the studio onboarding walkthrough. |

**One payment. No subscription. No per-render billing.** The licence key is delivered
by email after checkout; it activates the paid tier of the plugin.

**There is hosted rendering on Studio, with an allowance in your licence.** Motion Master never renders your video in the
cloud and never pretends to. Compositions are rendered on *your* machine with Remotion
(`npx remotion render …`), and real footage is mixed by a Montage instance *you* run.
What you get is the source, and the output is yours.

---

## What is in this package

```
plugins/motion-master/
├── plugin.json                    portable Agent Plugins manifest (root)
├── mcp.json                       portable MCP manifest (root)
├── .mcp.json                      MCP manifest (compat layout)
├── .claude-plugin/plugin.json     Claude Code manifest
├── .codex-plugin/plugin.json      Codex / ChatGPT manifest
├── LICENSE.md                     the licence split: proprietary layer + MIT upstream
├── assets/
│   ├── motion-tokens.json         the single source of truth for the tokens
│   ├── brand.json                 the product domain record (see “Domain” below)
│   └── icon.svg                   the plugin icon
└── skills/                        21 skills: the router + 20 upstream skills
    ├── motion-master/             ← start here: the router, the doctrine, the tokens
    │   ├── SKILL.md
    │   └── references/
    │       ├── motion-tokens.md   every easing curve, duration, spring, stagger value
    │       ├── palette.md         the palette, the accent budget, the contrast rules
    │       ├── typography.md      the type scale, the tracking, the line heights
    │       └── prompt-patterns.md six ready-made briefs and their expected beats
    ├── motion-design/             upstream, MIT (LottieFiles)
    ├── gsap-*/                    upstream, MIT (GreenSock) — 8 skills
    └── remotion-*/                upstream, MIT (Remotion) — 11 skills
```

---

## Install

The plugin is **paid**: buy the licence first ($99 Solo, $399 Studio, one-time). The
licence key arrives by email; the commands below install the package the key activates.
The plugin ships a marketplace catalog for each host. Clone the repository, then add
the marketplace directory as a source.

### Claude Code

```bash
git clone <your-motion-master-repo> motion-master
claude plugin marketplace add ./motion-master
claude plugin install motion-master@motion-master
```

### Codex / ChatGPT

```bash
git clone <your-motion-master-repo> motion-master
codex plugin marketplace add ./motion-master
```

The ChatGPT desktop app reads the same repository marketplace at
`.agents/plugins/marketplace.json`. Restart the app, pick **Motion Master** in the
Plugins Directory and install it.

### Cursor

```bash
git clone <your-motion-master-repo> motion-master
```

Cursor reads `.cursor-plugin/marketplace.json` from the repository. Open
**Customize → Plugins**, find Motion Master and install it to the project or user scope.

### The MCP server

The plugin talks to the Motion Master MCP server, which you run yourself:

```bash
cd mcp && npm install && npm run build && npm start
```

It listens on `http://127.0.0.1:8787/mcp` (override with `MOTION_MASTER_MCP_PORT`)
and serves a status document at `/health`.

---

## The skills

`skills/motion-master/SKILL.md` is the **router**: it carries the workflow
(brief → storyboard → choreography → code → render → review), the motion doctrine, the
palette and type rules, and the anti-slop rules. It names the specialised skills to
load for the brief at hand. Load only those.

| Group | Skills | Licence |
| --- | --- | --- |
| Motion Master | `motion-master` (router + 4 reference files) | proprietary |
| Motion doctrine | `motion-design` | MIT (LottieFiles) |
| GSAP | `gsap-core`, `gsap-timeline`, `gsap-scrolltrigger`, `gsap-utils`, `gsap-plugins`, `gsap-react`, `gsap-frameworks`, `gsap-performance` | MIT (GreenSock) |
| Remotion | `remotion-create`, `remotion-markup`, `remotion-render`, `remotion-studio`, `remotion-captions`, `remotion-interactivity`, `remotion-maps`, `remotion-multimedia`, `remotion-docs`, `remotion-saas`, `remotion-upgrade` | MIT (Remotion) |

Every upstream skill keeps its own MIT licence and attribution. Nothing upstream was
relicensed. See `LICENSE.md`.

---

## The MCP tools

| Tool | Signature | What it does |
| --- | --- | --- |
| `list_skills` | `(group?: "all" \| "motion-master" \| "motion-design" \| "gsap" \| "remotion", name?: string)` | Lists the bundled skills, their group, their licence and what each one teaches. |
| `get_motion_tokens` | `(group?: "all" \| "palette" \| "typography" \| "easing" \| "duration" \| "styleDurations" \| "spring" \| "stagger" \| "motion")` | Returns the token set: easing curves, durations, springs, stagger budget, palette, typography. |
| `list_clips` | `(id?: string, stack?: string)` | Lists the rendered example clips with the exact prompt behind each one. |
| `get_clip_prompt` | `(id: string)` | Returns one clip's prompt, stack and duration. |
| `plan_video` | `(brief: string, duration_seconds?, style?, fps?, width?, height?, element_count?, hold_seconds?)` | Turns a brief into a deterministic storyboard: numbered beats, in/out times and frames, easing role per beat, stagger plan. |
| `build_composition` | `(brief?, storyboard?, id?, filename?, fps?, width?, height?, duration_seconds?, style?)` | Emits runnable Remotion TSX with a real `<Composition>` registration and the tokens inlined. |
| `mix_footage` | `(timeline: {cuts?, overlays?, scenes?}, project_id?, dry_run?, fps?, width?, height?)` | Validates a Montage timeline and hands it to **your** Montage instance over its public API. |

`plan_video` is deterministic: the same brief always returns the same storyboard, so a
re-run never silently changes the shot list.

---

## The tokens

`assets/motion-tokens.json` is the single source of truth. The skills, the MCP server
and the composition generator all read it — read it, never retype it. `get_motion_tokens`
returns the same values as JSON.

The doctrine it encodes: **entrance eases out** `cubic-bezier(0.05, 0.7, 0.1, 1)`,
**exit eases in** `cubic-bezier(0.3, 0, 1, 1)`, **on-screen eases in-out**
`cubic-bezier(0.2, 0, 0, 1)`, the **total stagger of a group stays under 500ms**, and
premium durations are critically damped with no overshoot.

---

## Domain

The product domain is recorded in exactly one place: `assets/brand.json`. Its TLD has
not been chosen and the domain has not been purchased, so **no URL is published yet** —
this package deliberately contains no `https://` address for the product itself. Do not
add one until DNS points at the site.

---

## Licence

This package is proprietary and sold as a paid, one-time licence, **except** the
bundled upstream skills, which stay under their original MIT licences with their
attribution intact. See `LICENSE.md`.

The Montage bridge is not part of this package: it lives in `bridge/` under
**AGPL-3.0-only**, isolated on purpose, and this plugin neither contains nor imports
it.

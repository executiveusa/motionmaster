# Motion Master plugin — deliverable

The portable agent plugin: the manifests, the marketplace catalogs for all three
hosts, the Motion Master router and its references, the token assets, and the MCP
server that goes with it.

Everything in this document was produced by running the commands shown, in this
repository, in this sandbox. Anything that could not be verified is marked
**UNVERIFIED**.

---

## 1. What is in this deliverable

| Piece | Where | Licence |
| --- | --- | --- |
| The plugin package | `plugins/motion-master/` | proprietary (MIT upstream skills, attributed) |
| The marketplace catalogs | `.agents/plugins/marketplace.json`, `.claude-plugin/marketplace.json`, `.cursor-plugin/marketplace.json` | proprietary |
| The MCP server | `mcp/` | proprietary (see `mcp/deliverable.md`) |
| The plugin README | `plugins/motion-master/README.md` | proprietary |
| The licence split | `plugins/motion-master/LICENSE.md` | proprietary + MIT attributions |

**The offer, stated plainly:** Motion Master is a **paid, one-time licence** —
**$99 Solo**, **$399 Studio**. One payment, no subscription, no per-render billing.
The licence key is delivered by email after checkout. **There is no hosted render
service**: compositions are rendered on the buyer's own machine with Remotion, and
real footage is mixed by a Montage instance the buyer runs themselves. The README says
exactly this, in those words, in the first screen of the document.

---

## 2. The marketplace catalogs (created in this pass)

Three catalogs, one per host, at the repository root. Each has a `name`, an `owner`
(where the host requires one), a `plugins[]` entry for `motion-master` with a `source`
pointing at `./plugins/motion-master`, an `interface` (`displayName`,
`shortDescription`, `longDescription`), a `policy` (`installation`, `authentication`)
and a `category`.

### 2.1 `.agents/plugins/marketplace.json` — Codex + ChatGPT

Shape copied from a working reference (the universal plugin directory format:
`{ "source": { "source": "local", "path": "./plugins/my-plugin" } }`):

```json
{
  "name": "motion-master",
  "interface": { "displayName": "Motion Master" },
  "plugins": [
    {
      "name": "motion-master",
      "source": { "source": "local", "path": "./plugins/motion-master" },
      "interface": {
        "displayName": "Motion Master",
        "shortDescription": "Storyboard, choreograph and render motion design in code",
        "longDescription": "Motion Master teaches an agent to write motion design in code. … Motion Master is a paid, one-time licence: $99 Solo, $399 Studio. It is not a subscription and there is no hosted render service."
      },
      "policy": { "installation": "AVAILABLE", "authentication": "ON_INSTALL" },
      "category": "Productivity"
    }
  ]
}
```

`plugins[].source.path` is `./plugins/motion-master`, resolved from the **marketplace
root** (the repository root), not from `.agents/plugins/`.

### 2.2 `.claude-plugin/marketplace.json` — Claude Code / Claude.ai

Shape follows Claude Code's marketplace format: `name`, `owner.name`, `description`,
`metadata`, and a `plugins[]` entry whose `source` is a relative path string from the
marketplace root.

```json
{
  "name": "motion-master",
  "description": "Motion Master — … A paid, one-time licence: $99 Solo, $399 Studio.",
  "owner": { "name": "Motion Master" },
  "metadata": { "description": "…", "version": "1.0.0" },
  "plugins": [
    {
      "name": "motion-master",
      "source": "./plugins/motion-master",
      "description": "Motion design for AI agents: …",
      "displayName": "Motion Master",
      "category": "Productivity",
      "interface": { "displayName": "…", "shortDescription": "…", "longDescription": "…" },
      "policy": { "installation": "AVAILABLE", "authentication": "ON_INSTALL" }
    }
  ]
}
```

`owner.url` is **omitted**: the domain has no TLD yet, so there is no URL to put
there. The entry `name` matches the manifest `name` (`motion-master`), as Claude Code
requires for the install id.

### 2.3 `.cursor-plugin/marketplace.json` — Cursor

Shape follows Cursor's marketplace format (`name`, `owner`, `metadata`, `plugins[]`
with a relative-path `source` string) — the same layout Cursor's own plugin template
uses.

### 2.4 The catalogs, validated

```
$ python3 - <<'PY'   # parse each catalog, check the required fields, resolve the paths
.agents/plugins/marketplace.json: entry=motion-master source={"source": "local", "path": "./plugins/motion-master"} -> /…/motion-master/plugins/motion-master exists=True
.claude-plugin/marketplace.json: entry=motion-master source="./plugins/motion-master" -> /…/motion-master/plugins/motion-master exists=True
.cursor-plugin/marketplace.json: entry=motion-master source="./plugins/motion-master" -> /…/motion-master/plugins/motion-master exists=True
all three catalogs valid
```

Every entry carries `name`, `source`, `interface.displayName`,
`interface.shortDescription`, `interface.longDescription`, `policy.installation`,
`policy.authentication` and `category`; every `source` starts with `./`; every
`source.path` resolves to the plugin directory that exists.

> **Why the `source` shape differs between the catalogs.** The Codex/ChatGPT catalog
> uses the object form `{"source": "local", "path": "./plugins/motion-master"}` because
> that is the form the universal plugin directory expects. Claude Code and Cursor
> expect a *relative path string* (`"./plugins/motion-master"`) for a plugin that sits
> inside the marketplace directory — an object there would mean a remote source and
> would not resolve locally. The path is the same in all three; only the form the host
> expects differs.

---

## 3. The plugin package — every file

```
plugins/
├── motion-master/
│   ├── .claude-plugin/
│   │   └── plugin.json
│   ├── .codex-plugin/
│   │   └── plugin.json
│   ├── assets/
│   │   ├── brand.json
│   │   ├── icon.svg
│   │   └── motion-tokens.json
│   ├── skills/
│   │   ├── gsap-core/
│   │   │   └── SKILL.md
│   │   ├── gsap-frameworks/
│   │   │   └── SKILL.md
│   │   ├── gsap-performance/
│   │   │   └── SKILL.md
│   │   ├── gsap-plugins/
│   │   │   └── SKILL.md
│   │   ├── gsap-react/
│   │   │   └── SKILL.md
│   │   ├── gsap-scrolltrigger/
│   │   │   └── SKILL.md
│   │   ├── gsap-timeline/
│   │   │   └── SKILL.md
│   │   ├── gsap-utils/
│   │   │   └── SKILL.md
│   │   ├── motion-design/
│   │   │   ├── director/
│   │   │   │   ├── choreography.md
│   │   │   │   ├── context-adaptation.md
│   │   │   │   ├── core-philosophy.md
│   │   │   │   ├── decision-framework.md
│   │   │   │   ├── disney-principles.md
│   │   │   │   ├── emotion-mapping.md
│   │   │   │   ├── motion-personality.md
│   │   │   │   └── narrative-structure.md
│   │   │   ├── patterns/
│   │   │   │   ├── ambient-continuous.md
│   │   │   │   ├── entrance-exit.md
│   │   │   │   ├── multi-element.md
│   │   │   │   └── state-feedback.md
│   │   │   ├── reference/
│   │   │   │   ├── property-selection.md
│   │   │   │   ├── quality-checklist.md
│   │   │   │   ├── timing-easing-tables.md
│   │   │   │   └── troubleshooting.md
│   │   │   └── SKILL.md
│   │   ├── motion-master/
│   │   │   ├── references/
│   │   │   │   ├── motion-tokens.md
│   │   │   │   ├── palette.md
│   │   │   │   ├── prompt-patterns.md
│   │   │   │   └── typography.md
│   │   │   └── SKILL.md
│   │   ├── remotion-captions/
│   │   │   ├── agents/
│   │   │   │   └── openai.yaml
│   │   │   ├── assets/
│   │   │   │   └── remotion-icon.svg
│   │   │   ├── SKILL.md
│   │   │   ├── display-captions.md
│   │   │   ├── import-srt-captions.md
│   │   │   └── transcribe-captions.md
│   │   ├── remotion-create/
│   │   │   ├── agents/
│   │   │   │   └── openai.yaml
│   │   │   ├── assets/
│   │   │   │   └── remotion-icon.svg
│   │   │   ├── SKILL.md
│   │   │   ├── tailwind.md
│   │   │   └── video-layout.md
│   │   ├── remotion-docs/
│   │   │   ├── agents/
│   │   │   │   └── openai.yaml
│   │   │   ├── assets/
│   │   │   │   └── remotion-icon.svg
│   │   │   └── SKILL.md
│   │   ├── remotion-interactivity/
│   │   │   ├── agents/
│   │   │   │   └── openai.yaml
│   │   │   ├── assets/
│   │   │   │   └── remotion-icon.svg
│   │   │   ├── SKILL.md
│   │   │   ├── inline-effects.md
│   │   │   └── timeline-structure.md
│   │   ├── remotion-maps/
│   │   │   ├── agents/
│   │   │   │   └── openai.yaml
│   │   │   ├── assets/
│   │   │   │   └── remotion-icon.svg
│   │   │   ├── techniques/
│   │   │   │   ├── cesium/
│   │   │   │   │   ├── assets/
│   │   │   │   │   │   ├── CesiumFlythrough.tsx
│   │   │   │   │   │   ├── cesium-path.json
│   │   │   │   │   │   ├── city-path.json
│   │   │   │   │   │   ├── example-Root.tsx
│   │   │   │   │   │   ├── flight-path.ts
│   │   │   │   │   │   └── sample-river.geojson
│   │   │   │   │   ├── references/
│   │   │   │   │   │   ├── 3d-data-sources.md
│   │   │   │   │   │   ├── 3d-flyover-architecture.md
│   │   │   │   │   │   └── 3d-troubleshooting.md
│   │   │   │   │   ├── scripts/
│   │   │   │   │   │   └── prep-cesium-path.mjs
│   │   │   │   │   └── TECHNIQUE.md
│   │   │   │   ├── mapbox/
│   │   │   │   │   ├── references/
│   │   │   │   │   │   └── render-stability.md
│   │   │   │   │   └── TECHNIQUE.md
│   │   │   │   ├── maplibre/
│   │   │   │   │   ├── references/
│   │   │   │   │   │   └── render-stability.md
│   │   │   │   │   └── TECHNIQUE.md
│   │   │   │   ├── maptiler/
│   │   │   │   │   ├── assets/
│   │   │   │   │   │   ├── sample-data/
│   │   │   │   │   │   │   ├── country-meta.json
│   │   │   │   │   │   │   └── yarlung-flow.json
│   │   │   │   │   │   ├── CountryLabel.tsx
│   │   │   │   │   │   ├── MapTilerVectorElement.ts
│   │   │   │   │   │   ├── RiverReveal.tsx
│   │   │   │   │   │   ├── example-Root.tsx
│   │   │   │   │   │   └── tokens.ts
│   │   │   │   │   ├── references/
│   │   │   │   │   │   ├── map-data-sources.md
│   │   │   │   │   │   ├── map-explainer-architecture.md
│   │   │   │   │   │   ├── map-geo-prep.md
│   │   │   │   │   │   └── render-stability.md
│   │   │   │   │   ├── scripts/
│   │   │   │   │   │   └── prep-geo.mjs
│   │   │   │   │   └── TECHNIQUE.md
│   │   │   │   └── static-map/
│   │   │   │       └── TECHNIQUE.md
│   │   │   └── SKILL.md
│   │   ├── remotion-markup/
│   │   │   ├── agents/
│   │   │   │   └── openai.yaml
│   │   │   ├── assets/
│   │   │   │   └── remotion-icon.svg
│   │   │   ├── remotion-maps/
│   │   │   │   ├── agents/
│   │   │   │   │   └── openai.yaml
│   │   │   │   ├── assets/
│   │   │   │   │   └── remotion-icon.svg
│   │   │   │   ├── techniques/
│   │   │   │   │   ├── cesium/
│   │   │   │   │   │   ├── assets/
│   │   │   │   │   │   │   ├── CesiumFlythrough.tsx
│   │   │   │   │   │   │   ├── cesium-path.json
│   │   │   │   │   │   │   ├── city-path.json
│   │   │   │   │   │   │   ├── example-Root.tsx
│   │   │   │   │   │   │   ├── flight-path.ts
│   │   │   │   │   │   │   └── sample-river.geojson
│   │   │   │   │   │   ├── references/
│   │   │   │   │   │   │   ├── 3d-data-sources.md
│   │   │   │   │   │   │   ├── 3d-flyover-architecture.md
│   │   │   │   │   │   │   └── 3d-troubleshooting.md
│   │   │   │   │   │   ├── scripts/
│   │   │   │   │   │   │   └── prep-cesium-path.mjs
│   │   │   │   │   │   └── TECHNIQUE.md
│   │   │   │   │   ├── mapbox/
│   │   │   │   │   │   ├── references/
│   │   │   │   │   │   │   └── render-stability.md
│   │   │   │   │   │   └── TECHNIQUE.md
│   │   │   │   │   ├── maplibre/
│   │   │   │   │   │   ├── references/
│   │   │   │   │   │   │   └── render-stability.md
│   │   │   │   │   │   └── TECHNIQUE.md
│   │   │   │   │   ├── maptiler/
│   │   │   │   │   │   ├── assets/
│   │   │   │   │   │   │   ├── sample-data/
│   │   │   │   │   │   │   │   ├── country-meta.json
│   │   │   │   │   │   │   │   └── yarlung-flow.json
│   │   │   │   │   │   │   ├── CountryLabel.tsx
│   │   │   │   │   │   │   ├── MapTilerVectorElement.ts
│   │   │   │   │   │   │   ├── RiverReveal.tsx
│   │   │   │   │   │   │   ├── example-Root.tsx
│   │   │   │   │   │   │   └── tokens.ts
│   │   │   │   │   │   ├── references/
│   │   │   │   │   │   │   ├── map-data-sources.md
│   │   │   │   │   │   │   ├── map-explainer-architecture.md
│   │   │   │   │   │   │   ├── map-geo-prep.md
│   │   │   │   │   │   │   └── render-stability.md
│   │   │   │   │   │   ├── scripts/
│   │   │   │   │   │   │   └── prep-geo.mjs
│   │   │   │   │   │   └── TECHNIQUE.md
│   │   │   │   │   └── static-map/
│   │   │   │   │       └── TECHNIQUE.md
│   │   │   │   └── REFERENCE.md
│   │   │   ├── 3d.md
│   │   │   ├── SKILL.md
│   │   │   ├── arabic-text.md
│   │   │   ├── audio-visualization.md
│   │   │   ├── audio.md
│   │   │   ├── calculate-metadata.md
│   │   │   ├── color-correction.md
│   │   │   ├── compositions.md
│   │   │   ├── connected-compositions.md
│   │   │   ├── cropping.md
│   │   │   ├── effects.md
│   │   │   ├── embedding-videos.md
│   │   │   ├── ffmpeg.md
│   │   │   ├── gifs.md
│   │   │   ├── google-fonts.md
│   │   │   ├── html-in-canvas.md
│   │   │   ├── images.md
│   │   │   ├── light-leaks.md
│   │   │   ├── local-fonts.md
│   │   │   ├── lottie.md
│   │   │   ├── measuring-dom-nodes.md
│   │   │   ├── measuring-text.md
│   │   │   ├── motion-blur.md
│   │   │   ├── multi-scene-video.md
│   │   │   ├── parameters.md
│   │   │   ├── sequencing.md
│   │   │   ├── sfx.md
│   │   │   ├── silence-detection.md
│   │   │   ├── text-highlights.md
│   │   │   ├── timing-props.md
│   │   │   ├── timing.md
│   │   │   ├── transitions.md
│   │   │   ├── video-editing.md
│   │   │   └── voiceover.md
│   │   ├── remotion-multimedia/
│   │   │   ├── agents/
│   │   │   │   └── openai.yaml
│   │   │   ├── assets/
│   │   │   │   └── remotion-icon.svg
│   │   │   ├── SKILL.md
│   │   │   ├── get-audio-duration.md
│   │   │   ├── get-video-dimensions.md
│   │   │   └── get-video-duration.md
│   │   ├── remotion-render/
│   │   │   ├── agents/
│   │   │   │   └── openai.yaml
│   │   │   ├── assets/
│   │   │   │   └── remotion-icon.svg
│   │   │   ├── SKILL.md
│   │   │   └── transparent-videos.md
│   │   ├── remotion-saas/
│   │   │   ├── agents/
│   │   │   │   └── openai.yaml
│   │   │   ├── assets/
│   │   │   │   └── remotion-icon.svg
│   │   │   ├── SKILL.md
│   │   │   ├── framework.md
│   │   │   ├── player.md
│   │   │   └── rendering.md
│   │   ├── remotion-studio/
│   │   │   ├── agents/
│   │   │   │   └── openai.yaml
│   │   │   ├── assets/
│   │   │   │   └── remotion-icon.svg
│   │   │   └── SKILL.md
│   │   └── remotion-upgrade/
│   │       ├── agents/
│   │       │   └── openai.yaml
│   │       ├── assets/
│   │       │   └── remotion-icon.svg
│   │       └── SKILL.md
│   ├── .mcp.json
│   ├── LICENSE.md
│   ├── README.md
│   ├── mcp.json
│   └── plugin.json
└── _tree.txt
```

181 files. The 20 upstream skills are byte-identical to the upstream copies: their
`license: MIT` frontmatter, their attribution lines and their internal links are
untouched. The only upstream-adjacent file that was edited is the Motion Master
**router** (`skills/motion-master/SKILL.md`), which is the proprietary layer.

### 3.1 The manifests

| File | Host | What it declares |
| --- | --- | --- |
| `plugin.json` | portable Agent Plugins | `name`, `version`, `description`, `author.name`, `license`, `keywords`, and `extensions["com.openai"].interface` |
| `.claude-plugin/plugin.json` | Claude Code | `name`, `version`, `description`, `author.name`, `license`, `keywords` |
| `.codex-plugin/plugin.json` | Codex / ChatGPT | the above plus `skills: "./skills/"` and `mcpServers: "./.mcp.json"` and the `interface` block |
| `mcp.json` | portable | `mcpServers["motion-master"] = { type: "streamable-http", url: "http://127.0.0.1:8787/mcp" }` |
| `.mcp.json` | compat | `mcpServers["motion-master"] = { type: "http", url: "http://127.0.0.1:8787/mcp" }` |

**No URL for the product itself appears in any manifest.** The `homepage`,
`repository` and `author.url` fields were **removed** rather than pointed at an
invented address; `author` is now `{ "name": "Motion Master" }`. The `websiteURL`
field of the OpenAI `interface` was removed for the same reason.

### 3.2 The assets

| File | What it is |
| --- | --- |
| `assets/motion-tokens.json` | the single source of truth for the palette, the type scale, the easing curves, the durations, the springs, the stagger budget and the anti-slop list. The MCP server, the skills and the composition generator all read it. |
| `assets/brand.json` | **the one place the product domain is recorded**: `"domain": "motionmaster"`, `"tld": null`, `"website": null`, with the note that the TLD is not chosen and the domain has not been purchased. It also records the rendering policy: local rendering is always available, hosted rendering is a Studio feature, and the size of the hosted render allowance is `null` because it has not been decided — so no number is published anywhere. |
| `assets/icon.svg` | the plugin icon (`brandColor: #FF4A1C`). |

The `$schema` of the token file was an invented URL with a TLD on it. It is now the non-URL identifier
`"motion-master.tokens/v1"`, and the generated mirror in `mcp/src/tokens.generated.ts`
was regenerated to match.

### 3.3 The skills

`skills/motion-master/SKILL.md` is the **router**: the brief → storyboard →
choreography → code → render → review workflow, the motion doctrine table, the
palette and type rules, the 14 anti-slop rules, and the pointers to the specialised
skills. It names the files to load and nothing else — it does not duplicate the
upstream skills.

It now also states, in the first screen:

> Motion Master is a **paid, one-time licence**: **$99 Solo**, **$399 Studio**. One
> payment, no subscription, no per-render billing — the licence key is delivered by
> email. … **There is no hosted render service.** … The domain is recorded once, in
> `assets/brand.json`; its TLD is not chosen yet, so no URL may be published.

and, at the end:

> All twenty are MIT-licensed and carry their upstream attribution. The Motion Master
> layer (this router, the token files, the prompt library and the MCP server) is the
> paid product: **$99 Solo, $399 Studio, one-time**.

The four reference files next to it:

| File | What it holds |
| --- | --- |
| `references/motion-tokens.md` | every easing curve, duration, spring and stagger value, with the doctrine tables |
| `references/palette.md` | the palette, the accent budget (≤ 8% of a frame), the contrast rules |
| `references/typography.md` | the type scale, the tracking, the line heights |
| `references/prompt-patterns.md` | six ready-made briefs, each with the beats `plan_video` returns and the stack to build it with |

---

## 4. The public API

### 4.1 The skill contract

Every skill is a directory with a `SKILL.md` whose YAML frontmatter carries `name`
and `description`; upstream skills keep their own `license` and `version` fields.
The MCP tool `list_skills` reads that frontmatter off disk and returns:

```ts
{ name: string; description: string; group: "motion-master" | "motion-design" | "gsap" | "remotion";
  license: string | null; version: string | null; path: string; upstream: string | null; loads: string[] }
```

### 4.2 The MCP tools this plugin ships

The server lives in `mcp/`; the full reference is `mcp/deliverable.md`. The tools, with
their parameter signatures:

| Tool | Signature | Returns |
| --- | --- | --- |
| `list_skills` | `(group?: "all" \| "motion-master" \| "motion-design" \| "gsap" \| "remotion", name?: string)` | the bundled skills, read from `skills/` |
| `get_motion_tokens` | `(group?: "all" \| "palette" \| "typography" \| "easing" \| "duration" \| "styleDurations" \| "spring" \| "stagger" \| "motion")` | the token set, read from `assets/motion-tokens.json` |
| `list_clips` | `(id?: string, stack?: string)` | the four gallery clips with their prompts |
| `get_clip_prompt` | `(id: string)` | one clip's prompt, stack and duration |
| `plan_video` | `(brief: string, duration_seconds?: number, style?: "premium" \| "calm" \| "energetic" \| "snappy", fps?: number, width?: number, height?: number, element_count?: number, hold_seconds?: number)` | a deterministic storyboard |
| `build_composition` | `(brief?: string, storyboard?: Storyboard, id?: string, filename?: string, fps?: number, width?: number, height?: number, duration_seconds?: number, style?: "premium" \| "calm" \| "energetic" \| "snappy")` | runnable Remotion TSX with a `<Composition>` registration and the tokens inlined |
| `mix_footage` | `(timeline: { cuts?, overlays?, scenes? }, project_id?: string, dry_run?: boolean, fps?: number, width?: number, height?: number)` | the validated timeline, and the result of handing it to your Montage instance |

All seven were called against the running server; the transcript is in
`mcp/deliverable.md` §6 and in `mcp/verification/verify-output.txt`.

### 4.3 The HTTP surface the plugin expects

| Endpoint | What it is |
| --- | --- |
| `http://127.0.0.1:8787/mcp` | the MCP endpoint (`mcp.json` and `.mcp.json` point here) |
| `http://127.0.0.1:8787/health` | the status document: tools, skill count, token source, montage configuration, licence, domain record, rendering facts |

---

## 5. Install, per host

```bash
# 1. get the package
git clone <your-motion-master-repo> motion-master
cd motion-master

# 2. start the MCP server (one terminal)
cd mcp && npm install && npm run build && npm start
```

### Claude Code

```bash
claude plugin marketplace add ./motion-master
claude plugin install motion-master@motion-master
```

### Codex (CLI) / ChatGPT (desktop app)

```bash
codex plugin marketplace add ./motion-master
```

The ChatGPT desktop app reads the same repository marketplace at
`.agents/plugins/marketplace.json`. Restart the app, open the Plugins Directory,
choose the **Motion Master** marketplace and install **Motion Master**.

### Cursor

```bash
# Cursor reads .cursor-plugin/marketplace.json from the repository.
# Open Customize → Plugins, find Motion Master, install it (project or user scope).
```

### Without a marketplace

```bash
claude --plugin-dir ./plugins/motion-master          # Claude Code, local development
cp -R plugins/motion-master ~/.cursor/plugins/local/  # Cursor, local development
```

---

## 6. Build and test — real output

The plugin package itself has no build step: it is JSON, Markdown and SVG. What has
to be true is that the JSON parses, the catalogs point at a directory that exists, the
token mirror is in sync, and the MCP server the plugin ships builds and passes.

```
$ python3 -c "import json,glob; [json.load(open(p)) for p in glob.glob('plugins/**/*.json', recursive=True)]"
(no output = every JSON file in the plugin parses)

$ cd mcp && npm run check:tokens
tokens.generated.ts is in sync with plugins/motion-master/assets/motion-tokens.json

$ cd mcp && npm run build
> motion-master-mcp@1.0.0 build
> tsc -p tsconfig.json
(no output = no type errors)

$ cd mcp && npm test
ok 1 - mix_footage hands the timeline to the Montage instance over its public API
ok 2 - mix_footage refuses a timeline that would break the Montage rules
ok 3 - the health document states the paid one-time licence and no hosted render service
ok 4 - the server advertises every tool
ok 5 - list_skills returns the bundled skills
ok 6 - get_motion_tokens returns the doctrine
ok 7 - list_clips reads the site clip manifest
ok 8 - get_clip_prompt returns the real prompt
ok 9 - get_clip_prompt fails honestly for an unknown id
ok 10 - plan_video produces a doctrine-compliant, deterministic storyboard
ok 11 - plan_video keeps a big stagger group under the budget
ok 12 - build_composition emits runnable TSX with a Composition registration
ok 13 - mix_footage validates a Montage timeline and reports honestly
ok 14 - mix_footage rejects an invalid Montage timeline
ok 15 - the generated TSX parses as a TSX module
# tests 15
# pass 15
# fail 0
```

And the end-to-end proof — the server started, every tool called, `plan_video` called
twice and byte-identical:

```
$ cd mcp && node scripts/verify-tools.mjs
…
first  response: 5241 bytes
second response: 5241 bytes
byte-identical: true
sha256(first)  = 05527df027c38ccc02dc4f93f080927e7912f4d89cacc9985e826f894d53e830
sha256(second) = 05527df027c38ccc02dc4f93f080927e7912f4d89cacc9985e826f894d53e830
…
27/27 checks passed
```

Full transcript: `mcp/verification/verify-output.txt`.

### 6.1 Licence, attribution and secrets

* Every upstream skill keeps its `license: MIT` frontmatter and its attribution. The
  attribution table is in `plugins/motion-master/LICENSE.md`, together with the MIT
  licence text and the statement that the Motion Master layer (this package's own
  files) is the proprietary, paid part. **No upstream work was relicensed.**
* `plugins/motion-master/LICENSE.md` is the file the manifests point at
  (`"license": "SEE LICENSE IN LICENSE.md"`) — it did not exist before this pass and
  does now.
* The AGPL-3.0 `bridge/` is **not** in this package and is not imported by it. The
  plugin talks to a Montage instance over Montage's public API; it contains no
  Montage code and none of the bridge's code.
* No API key, token, password or secret is committed anywhere in `plugins/` or
  `mcp/`. The only environment file is `mcp/.env.example`, and every value in it is a
  placeholder.

---

## 7. The domain, in one place

`plugins/motion-master/assets/brand.json` is the **only** file in the repository that
records the product domain:

```json
{
  "productName": "Motion Master",
  "domain": "motionmaster",
  "tld": null,
  "domainStatus": "The domain word is confirmed. The TLD has not been chosen and the domain has not been purchased, so no URL with a TLD may be published yet. …",
  "website": null,
  "rendering": { "hostedRenderService": false, "note": "…" }
}
```

Checked over the whole repository:

```
$ grep -rn "motionmaster\.[a-z]\{2,\}" --include='*' -I . | grep -v node_modules
(no output — no domain with a TLD anywhere in the repository)

$ grep -rn "motionmaster" plugins mcp -I | grep -v node_modules | grep -v /dist/
plugins/motion-master/assets/brand.json:3:  "domain": "motionmaster",
```

The only `https://` addresses left in `plugins/` and `mcp/` are the upstream
documentation links inside the MIT skills (`gsap.com`, `remotion.dev`, `maptiler.com`,
…) and `127.0.0.1` for the local MCP server. They are upstream's, and they stay.

---

## 8. Changes made in this finishing pass

| Path | Change |
| --- | --- |
| `.agents/plugins/marketplace.json` | **new** — the Codex + ChatGPT catalog |
| `.claude-plugin/marketplace.json` | **new** — the Claude Code / Claude.ai catalog |
| `.cursor-plugin/marketplace.json` | **new** — the Cursor catalog |
| `plugins/motion-master/README.md` | **new** — the plugin README: the paid one-time licence with the prices, the install commands per host, the file map, the tool table, the token doctrine, the domain note, the licence |
| `plugins/motion-master/LICENSE.md` | **new** — the licence split and the upstream MIT attributions (the manifests already pointed at it) |
| `plugins/motion-master/assets/brand.json` | **new** — the single record of the domain, the TLD pending, and the "no hosted render service" fact |
| `plugins/motion-master/assets/motion-tokens.json` | `$schema` changed from an invented TLD URL to `"motion-master.tokens/v1"` |
| `plugins/motion-master/plugin.json`, `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json` | the invented `homepage` / `repository` / `author.url` / `websiteURL` removed; the interface now states the paid one-time licence and that there is no hosted render service |
| `plugins/motion-master/skills/motion-master/SKILL.md` | the router now states $99 Solo / $399 Studio one-time, that there is no hosted render service, and that the domain lives in one file |

---

## 9. UNVERIFIED

* **The install flow on each host.** The `claude`, `codex` and `cursor` CLIs are not
  installed in this sandbox, so `claude plugin validate`, `claude plugin install`,
  `codex plugin marketplace add` and the Cursor install were **not** run. The three
  catalogs are **VERIFIED** as JSON, as field shapes against the published schemas
  (Claude Code's marketplace reference, Cursor's plugin template, the universal
  plugin directory format) and as paths that resolve to the plugin directory. The
  actual install on each host is **UNVERIFIED**.
* **The marketplace names.** The catalogs are named `motion-master`. The final name
  each host shows in its picker, and the exact install id on Claude Code
  (`motion-master@motion-master`), depend on the host reading the file; that was not
  exercised.
* **The generated composition was not rendered to a video.** `build_composition`
  returns TSX that **parses** (checked with the TypeScript compiler) and registers a
  real `<Composition>`; Remotion itself was not installed here, so the rendered mp4 is
  **UNVERIFIED**.
* **The Montage handover was not run against a real Montage instance.** It was proven
  against a local test double of the documented routes. See `mcp/deliverable.md` §9.
* **The licence key is not enforced anywhere.** The pricing is stated in the README,
  the router, the catalogs and the MCP server's output; the entitlement check and
  the checkout are not part of this repository. **UNVERIFIED** by design.
* **The clip gallery's provenance.** `list_clips` and `get_clip_prompt` return the
  real prompts, stacks and durations from `site/src/clips.json`; that each clip was
  rendered by the skills that claim to have rendered it was proven by the clips task,
  not by this one. **UNVERIFIED** here.

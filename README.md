# Motion Master

**Motion graphics plug-in for Claude and Codex** — and for ChatGPT, Cursor and a dozen
more hosts.

**Describe the video. Get the file.**

Motion Master is a motion-design agent. It teaches an AI agent — ChatGPT, Codex,
Claude, Cursor and a dozen more hosts — to storyboard, choreograph and render motion
design **in code**, and hands back a finished video, the project, and the source.

Remotion · GSAP · HyperFrames · ffmpeg. You own the output.

**It is not on sale.** The founder is using it in-house. The terms it would ship
under are recorded in `licence.json` — $99 Solo, $399 Studio, one payment, no
subscription — so a launch is one edit rather than a rebuild. Nothing in this
repository may present a purchase as available.

---

## Run the private human + agent MVP on one machine

The public MiniMax page is static. For **real local use**, build the existing site
and server and let the Node agent serve both. This is local-only while private
API authentication, durable hosting and remote worker deployment are unfinished.

```bash
npm ci --prefix site
npm ci --prefix mcp
npm run build --prefix site
npm run build --prefix mcp
MOTION_MASTER_SERVE_SITE=1 npm start --prefix mcp
```

In Windows PowerShell set `$env:MOTION_MASTER_SERVE_SITE="1"` first, then run
`npm --prefix mcp start`. Open **http://127.0.0.1:8787/** in the browser.
The same process serves `/chat`, `/api/v1`, `/mcp`, `/health` and MP4s.
A local Codex/Claude MCP client can connect to **http://127.0.0.1:8787/mcp**
once that server is running; actual supported-host setup still needs testing.

The page's OpenRouter sign-in needs the user's own authorized model access.
Never put API credentials in the repository, browser screenshots or CI logs.

**Security:** Do not set `MOTION_MASTER_MCP_HOST=0.0.0.0` to expose the
combined mode. It explicitly rejects non-loopback bindings. The private file,
job and rendering APIs require a stronger authorization boundary before a
remote public launch. This local mode is not proof of a deployed SaaS.


## What is in this repository

| Path | What it is | Licence |
|---|---|---|
| `site/` | The landing page. Vite + TypeScript + GSAP. | proprietary |
| `plugins/motion-master/` | The portable agent plugin: manifests, 38 motion skills, the Motion Master router. | proprietary (MIT / Apache / CC-BY upstream skills, attributed) |
| `mcp/` | The MCP server — `plan_video`, `build_composition`, `build_hyperframes_composition`, `mix_footage`, the prompt library and the prompt enhancer. | proprietary |
| `library/` | **The open-source motion library.** Nine upstream collections normalised into one index: 3,988 items, 756 categories, 448 motion blocks. Every item carries its licence. | see `library/README.md` |
| `generator/` | The HyperFrames render path: compositions, the render script, and the gate that catches what a render will not. | proprietary (HyperFrames is Apache-2.0) |
| `bridge/` | The client that drives a Montage instance over its public HTTP/MCP interfaces. | **AGPL-3.0-only**, isolated on purpose |
| `clips/` | The Remotion project that renders the proof clips. | proprietary |
| `licence.json` | **The offer and its status.** Prices, tier lists, the rendering policy, and whether it is on sale at all. The site imports it; the MCP server generates from it. One copy, so the two cannot disagree. | proprietary |
| `docs/` | The lock documents. Read these before changing anything. | proprietary |

### Marketplace catalogs

| Path | Ecosystem |
|---|---|
| `.agents/plugins/marketplace.json` | Codex + ChatGPT |
| `.claude-plugin/marketplace.json` | Claude Code / Claude.ai |
| `.cursor-plugin/marketplace.json` | Cursor |

---

## The lock documents

These are not notes. They are the contract, and the build follows them.

| Doc | What it settles |
|---|---|
| [`docs/00-PROJECT-LOCK.md`](docs/00-PROJECT-LOCK.md) | Audience, offer, CTA, objections, constraints, decisions taken. |
| [`docs/01-VALIDATION-CARD.md`](docs/01-VALIDATION-CARD.md) | The Proven-Better-New analysis. What is proven, what is better, what is unproven, and what the market actually pays. |
| [`docs/02-EVIDENCE-LEDGER.md`](docs/02-EVIDENCE-LEDGER.md) | Every claim the site may make, and every claim it may not. |
| [`docs/03-DESIGN-LOCK.md`](docs/03-DESIGN-LOCK.md) | Territory, tokens, type scale, motion philosophy, mobile contract, anti-slop blacklist. |
| [`docs/04-WIREFRAMES.md`](docs/04-WIREFRAMES.md) | Section-by-section layout, desktop and mobile. |
| [`docs/05-MONTAGE-INTEGRATION.md`](docs/05-MONTAGE-INTEGRATION.md) | The verified Montage surface and the AGPL boundary. |
| [`docs/06-GO-TO-MARKET.md`](docs/06-GO-TO-MARKET.md) | Who we sell to, the channels, the unit economics, the risks. |
| [`docs/07-GAUNTLET-PLAN.md`](docs/07-GAUNTLET-PLAN.md) | The bar, the measurable half, the reviewer council, the release gates. |
| [`docs/08-GAUNTLET-RESULT.md`](docs/08-GAUNTLET-RESULT.md) | The run. What was measured, what was won, what is still open, and the $29–$49 price the market actually charges. |
| [`docs/09-RELEASE-REPORT.md`](docs/09-RELEASE-REPORT.md) | What exists, what is proven, what was wrong and got fixed, and the decisions that are the founder's. |

---

## Build

```bash
# the landing page
cd site && npm install && npm run build && npm run preview

# the proof clips (needs a Chrome Headless Shell; see the script header)
cd clips && npm install && ./render-all.sh

# the MCP server
cd mcp && npm install && npm run build && npm start

# the Montage bridge (AGPL)
cd bridge && npm install && npm run build && npm test
```

## Licence

Proprietary, except `bridge/`, which is **AGPL-3.0-only** by design, and the bundled
upstream skills, which remain under their original MIT licences with attribution intact.
See `docs/05-MONTAGE-INTEGRATION.md` for why the split is where it is.

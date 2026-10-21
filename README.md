# Motion Master

**Describe the video. Get the file.**

Motion Master is a paid, one-time-licence agent product. It teaches an AI agent —
ChatGPT, Codex, Claude, Cursor and a dozen more hosts — to storyboard, choreograph and
render motion design **in code**, and hands a non-technical creator a finished video, the
project, and the source.

Remotion · GSAP · ffmpeg. No subscription for the software. You own the output.

---

## What is in this repository

| Path | What it is | Licence |
|---|---|---|
| `site/` | The landing page. Vite + TypeScript + GSAP. | proprietary |
| `plugins/motion-master/` | The portable agent plugin: manifests, the 20 motion skills, the Motion Master router. | proprietary (MIT upstream skills, attributed) |
| `mcp/` | The MCP server — `plan_video`, `build_composition`, `mix_footage`, and the clip library. | proprietary |
| `bridge/` | The client that drives a Montage instance over its public HTTP/MCP interfaces. | **AGPL-3.0-only**, isolated on purpose |
| `clips/` | The Remotion project that renders the proof clips. | proprietary |
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

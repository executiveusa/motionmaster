# Product wiring + gauntlet evidence contract — PR #8

Release candidate branch: `agent/mm-approved-product-wireframe`.

## Human journey
1. Hero -> Start Creating -> real console.
2. Hero -> Browse Examples -> real gallery.
3. Search/category controls -> the four real rendered examples.
4. Start from this prompt -> the canonical prompt is loaded into the real console composer.
5. Console -> existing Motion Master chat/tools.
6. Private editor -> authenticated `/api/v1` project/revision/job routes.
7. Render -> existing worker -> playable MP4.
8. Edit -> immutable revision -> rerender.
9. Export -> MP4 + editable source; source can be imported/reopened.
10. Claude/Codex -> shipped plugin manifests -> same local MCP endpoint.

## Visible-control wiring

| Surface | Visible control | Executable path | Proof |
|---|---|---|---|
| Header | Examples | `#proof` | Chromium nav-target assertion |
| Header | Create / Start Creating | `#console` | Chromium nav-target assertion |
| Header | Sign in | real `[data-console-signin]` | Chromium focus assertion |
| Header | Library | `#library` | Chromium nav-target assertion |
| Header | MCP / Plugins | `#agents` | Chromium nav-target assertion |
| Header | Docs | `#docs` | Chromium nav-target assertion |
| Hero | Watch Demo | first real gallery player | Chromium `aria-pressed=true` assertion |
| Gallery | Search | filters existing example DOM | Chromium 4 -> 1 result assertion |
| Gallery | Product UI | filters tagged real examples | Chromium 2-result assertion |
| Gallery | Copy prompt | canonical prompt clipboard path | existing clips module |
| Gallery | Start from this prompt | canonical prompt -> console textarea | exact prompt equality assertion |
| Create | Connect OpenRouter | existing OpenRouter auth gate | existing browser smoke |
| Create | Create | existing `/chat` + tool path | existing browser/worker smoke |
| Edit | Open/create/save | authenticated `/api/v1/projects` | existing browser smoke |
| Edit | Render/cancel | authenticated job API + worker | existing browser/worker smoke |
| Export | Download MP4 | authenticated artifact endpoint | existing browser/worker smoke |
| Export | Export source | source export endpoint | existing browser/worker smoke |
| Return | Reopen | persisted project/revision/job | reload/reconnect assertions |
| Agents | Copy MCP endpoint | shipped `/mcp` URL | shell clipboard control + manifests |

## Anti-slop / product constraints
- Full-bleed hero; no wavy filter.
- Real work before explanation.
- No generic feature-grid section.
- No pricing or checkout while `licence.json.status.onSale=false`.
- No fake connected state for the agent.
- MotionVideo's proven discovery mechanic is borrowed; its visual expression and copy are not.
- Motion Master must continue beyond discovery into create/edit/render/export/reopen.

## Gauntlet hard gates
- Build/content contract green.
- 320–1440 no horizontal overflow.
- EN + es-MX Chromium smoke green.
- All four gallery MP4s decode/play.
- Byte-range media behavior green.
- HyperFrames render green.
- Edit/rerender/export/import/reopen green.
- Browser -> worker E2E green.
- Independent code review has no unresolved P0/P1.
- Visual comparison against MotionVideo is recorded; builder does not self-approve.

## Rollback
Before-state: `265c85502e375e6a0d09b73bbc36648d8219d980`.

```bash
git reset --hard 265c85502e375e6a0d09b73bbc36648d8219d980
```

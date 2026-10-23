# 13 — The console that makes a film

**Status:** built and verified on this machine. The model path needs a key the founder holds; the render path does not.

---

## What was asked

> Embed a chat bot that makes the app simpler — the user can just CLICK and CHAT and create motion graphics.

The test of that is not "is there a chat box". It is: **does clicking and typing end in a file you can play?**

## What was built

```
site/index.html              the console section
site/src/modules/chat.ts     the console: SSE parser, artifacts, film card, polling
site/src/lib/openrouter-auth.ts   BYO key over PKCE; the key never reaches our server
mcp/src/chat.ts              the chat route: model + our own tools + artifacts
mcp/src/model.ts             the model, verified against the live OpenRouter catalogue
mcp/src/film.ts              brief → shot list → project on disk
mcp/src/render.ts            the gate, the render, the job, the files
mcp/src/verdicts.ts          the blocks the gate rejected, and why
mcp/src/files.ts             multi-modal intake
generator/hf.sh              the one place that knows where Chrome is
scripts/proof-console.mjs    the browser checks
```

### The route a brief takes

```
brief  →  enhance_prompt      a complete brief, scored
       →  render_film         blocks installed, project written, gate run, MP4 encoded
       →  artifact            the console shows the file, the stills and the contact sheet
```

The model calls the tools. **The artifact is built by the server from the real tool result**, so the console can never show a description of something that did not happen. The model never writes an artifact; it can only trigger one.

### The tools the console reaches

The console's tools are the product's tools. The chat connects to our own `/mcp` endpoint over HTTP with `createMCPClient` — the same endpoint an external agent uses. Nineteen tools:

| | |
|---|---|
| **Library** | `browse_library` `get_library_item` `list_library_collections` `list_library_categories` |
| **Blocks** | `list_motion_blocks` `fill_block` `compose_film` |
| **The film** | `render_film` `film_status` `list_films` |
| **Planning** | `plan_video` `build_composition` `build_hyperframes_composition` `enhance_prompt` |
| **The house** | `list_skills` `get_motion_tokens` `list_clips` `get_clip_prompt` |
| **Montage** | `mix_footage` |

---

## The decisions, and why

### 1. The console was built natively, not embedded

thepopebot's chat component is coupled to its app shell — it fetches `/code/repositories`, renders a repo picker, a workspace bar and a diff viewer. popebot has no MCP client and no `.mcp.json` support. Embedding it would import popebot's product, and popebot cannot run in this sandbox (no Docker), so it could not have been verified here.

Instead the console is vanilla TypeScript with **zero runtime dependencies**, 32.3 kB built, no external requests. popebot gets a Motion Master *scope* as a second door — configured, not forked. That is Phase 2 and it is not built.

### 2. The key never sits on our server

`sign-in-with-openrouter` — OpenRouter holds the model, the user's key stays in the browser and is sent per request. `OPENROUTER_API_KEY` is an optional server fallback for the founder's own machine. The model is **never silently substituted**: the id is checked against the live OpenRouter catalogue (468 models, cached an hour), an unknown id is an error with near-miss suggestions, and the default is pinned to `openrouter/auto`.

### 3. The page is static; the agent is not

The site is a static bundle. The agent is a Node process. So the console shows the agent's address, probes it, and says plainly when nothing is listening:

> `● agent connected · 19 tools`  `http://127.0.0.1:8787`

The address is a setting kept in `localStorage`. This is what makes "click and chat" work from a deployed page: the page is anywhere, the agent is on the machine.

CORS is handled by the server (`MOTION_MASTER_ALLOWED_ORIGINS` narrows it; it binds to `127.0.0.1` by default).

### 4. A render is a job, not a call

A render takes a minute or two. An MCP tool call times out at sixty seconds. So `render_film` returns at once with the job's id, the render runs on its own, and the console polls `/films/:id` until the file is there. `film_status` asks from a terminal; `wait: true` blocks for a CLI.

### 5. The gate decides what ships

`hyperframes check` is not decoration. It is what makes a rendered file trustworthy: it catches a silent film, a text below the contrast floor, a stretched frame, a clipped label. The gate ran against the first real film this way and **rejected it** — two upstream components clipped their own text and sat under 3:1 contrast.

So the pipeline now:

1. installs the matched blocks,
2. runs the gate,
3. reads the gate's own report, which names the file each finding came from,
4. drops the block the gate blamed, records it in `library/block-verdicts.json`, rebuilds and re-gates,
5. repeats up to three times, one block at a time.

A block that fails is never used again. The verdicts file is the memory.

### 6. The blocks are made to look like this film

The registry's components are written to read `--brand`, `--fg` and `--bg` from whatever hosts them, and fall back to their own colours only when those are missing. The host sets them from the Motion Master tokens:

```css
:root {
  --brand: #FF4A1C;   /* the accent */
  --fg:    #F4F4F2;   /* the canvas, as type */
  --bg:    #0E0E10;   /* the player */
}
```

That is the whole difference between an upstream component and a Motion Master film. The first coffee film this produced was green on black — off-brand and generic. The second was the accent orange on the player ground.

### 7. A film has a shape

The matcher returns blocks by tag weight. Left alone, a coffee brief produced a progress ring, a star rating and a logo — data blocks, because the brief said "a number proves the point". Two rules were added:

- **the shot list opens on something that names the thing and closes on something that signs it off** — a title card first, a logo last, never in the middle where a second of type is a pause;
- **the headline is the brand** — "a launch film for ACME" used to put the word *launch* on screen in the biggest type. Now the subject wins: "ACME". When the brief names no subject, the headline falls back to the block's own default instead of printing the instruction back.

---

## What was verified, and how

| Check | Result |
|---|---|
| MCP suite (`npm test`, serial) | **55/55** |
| Tool harness (`node scripts/verify-tools.mjs`) | **32/32** |
| Bridge suite | **24/24** |
| Site build + content gate | green, JS 32.3 kB |
| Console in a real browser (`scripts/proof-console.mjs`) | **9/9** |
| A real brief → a real MP4 | `acme-launch`, 10.2 s, 1920×1080, h264, gate passed |

The browser checks: the agent is found; the console opens; nothing widens the page at 320, 390, 768 or 1440; the console's text clears the contrast floor; the brief field takes the keyboard; every control has a name.

### Defects found and fixed on the way

| | |
|---|---|
| The MCP server **silently exited** when started through a symlink — the entrypoint check compared paths without resolving them | `mcp/src/index.ts` |
| The artifact carried the **raw MCP envelope**, so the console could not read `payload.items` | `mcp/src/chat.ts` — `unwrapResult()` |
| The startup banner and the health document **under-reported the tools** (15 of 16) | `mcp/src/index.ts` |
| An unknown model produced "Unknown model" with no explanation | `mcp/src/model.ts` |
| The console's **"Stop" button was visible when idle** — `.btn { display: inline-flex }` beats the user agent's `[hidden]` | `site/src/styles/base.css` |
| The agent row **overflowed at 320 px** | `site/src/styles/sections.css` |
| A film **ran past its own content** and ended on a black frame — the host used a guessed duration instead of the block's `data-duration` | `mcp/src/film.ts` |
| `npm test` **hung and raced** — the test files share fixed ports | `mcp/package.json` — `--test-concurrency=1` |

---

## What is not done

- **The model round-trip needs a key.** The chat, the tools, the artifacts and the render are all verified; the model's own turn is verified against a mock and against the live OpenRouter catalogue, but not against a live model. That needs the founder's key.
- **The deployed page has no agent behind it.** The static host cannot run the Node server. The console says so honestly rather than pretending.
- **The matcher is still weak.** It is tag-weighted over 448 blocks. "A coffee brief" reached a progress ring because the brief mentioned a number. The film shape and the brand rules help; a real brief-to-film mapping needs the enhancer to carry a shot plan, not just a stronger brief.
- **The block pool is not qualified.** The verdicts file learns one block at a time, from films that actually failed. A bulk pass over the whole registry would find the bad ones before a user does.
- **popebot scope and the ICM workspace** are not built.

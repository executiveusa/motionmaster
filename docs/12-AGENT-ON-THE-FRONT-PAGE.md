# 12 — THE AGENT ON THE FRONT PAGE

**Status: PLAN.** 2026-10-23. Written under `GLOBAL_DESIGN_GOVERNANCE_v2.md`.
Nothing in this document has been built yet.

---

## 1. WHAT WAS ASKED

Make `stephengpope/thepopebot` control Motion Master and put its chat on the
front page. Add OpenRouter. Use what is needed from `OpenRouterTeam/repositories`.

## 2. WHAT WAS FOUND

| Source | What it is | What it gives us |
| --- | --- | --- |
| `stephengpope/thepopebot` | A Next.js personal-agent platform. Chat (web, Telegram), live coding workspaces in Docker, background agent jobs that open PRs, a provider abstraction for Anthropic / OpenAI / Google / DeepSeek / MiniMax / Mistral / xAI / Kimi / **OpenRouter** / NVIDIA / any OpenAI-compatible endpoint. | The agent runtime, the provider list, the **scope** system (a subdirectory with its own `SYSTEM.md` + `skills/`), and the Vercel AI SDK chat pattern. |
| `OpenRouterTeam/skills` | 19 skills: `openrouter-decisions` (which model to pick), `openrouter-oauth`, `openrouter-typescript-sdk`, `openrouter-models`, `openrouter-analytics`, `create-agent-tui`, `create-headless-agent`, `openrouter-images`, `openrouter-video`, `openrouter-stt`, `openrouter-tts`, and more. | The model-selection and auth doctrine, and a TUI/headless-agent pattern. |
| `OpenRouterTeam/sign-in-with-openrouter` | A framework-agnostic PKCE OAuth sign-in. "No client registration, no backend, no secrets." Key in `localStorage`. | **Sign in with OpenRouter** on the front page. The founder's own key, never on our server. |
| `OpenRouterTeam/ai-sdk-provider` | `@openrouter/ai-sdk-provider` v3.1.0 (peer: `ai` ^7, `zod` ^3.25/^4.1). | The first-class OpenRouter provider for the AI SDK. |
| `stephengpope/no-code-architects-toolkit` | A Flask media API: ffmpeg compose, audio transcribe/translate, captions, image and video processing, cloud file management. | Optional. We already have ffmpeg and our own render path. |
| `icm-architect` | A skill that structures any process into a **workspace**: numbered folders carry sequencing, plain markdown carries state, one agent walks the building. | A structure for the new agent subsystem. **Not** a whole-repo restructure. |

## 3. THE HONEST CONSTRAINTS

These are facts about this environment, not opinions.

1. **There is no Docker in this sandbox.** `docker` is not installed and
   `/var/run/docker.sock` does not exist. popebot's two most distinctive
   features — live coding workspaces and background agent jobs — are both
   Docker-bound. popebot therefore **cannot be run or verified here.**
2. **PyPI is blocked.** The no-code-architects-toolkit is Flask. It cannot be
   installed or run here. It is also not required: our render path is
   ffmpeg + headless Chrome, and it already works.
3. **There is no OpenRouter key.** The chat can be built and its plumbing
   tested against a stub provider, but a real model round-trip needs the
   founder's key. `sign-in-with-openrouter` is the answer: the key arrives
   through PKCE in the browser and is never held by our server.
4. **popebot's chat is not embeddable as-is.** `lib/chat/components/chat.jsx`
   uses `useChat` from `@ai-sdk/react`, but it also fetches `/code/repositories`
   and `/code/branches`, and it renders popebot's repo picker, workspace bar,
   diff viewer and scope picker. It is coupled to popebot's app shell, its
   database and its session model. Dropping it into our page would import
   popebot's product into ours.
5. **popebot has no MCP client.** Its tools are its own (`docker`, `github`,
   `telegram`, `create-agent-job`, `assemblyai`). There is no `.mcp.json`
   support anywhere in the codebase.

Point 5 is the real design problem, and it is the reason the plan below does
not simply "embed popebot".

## 4. RECOMMENDATION

> **Build the front-page chat natively, on the AI SDK, with OpenRouter, bound
> to the Motion Master MCP tools — and give popebot a Motion Master scope so
> the same agent is reachable from Telegram and a live terminal.**

Two doors, one brain, which is popebot's own architecture. But the doors are
not the same door.

**Why not embed popebot's chat.** Three reasons, in order of weight:

1. **Our tools are already an MCP server.** `mcp/` is a tested HTTP server
   with 16 tools. "The bot controls the product" is only true if the bot's
   tools *are* the product's tools. Popebot has no MCP client, so embedding it
   means re-implementing all sixteen as popebot-native tools — duplicating the
   product's surface into a fork of a third-party app.
2. **The design lock applies.** The page is "The Film Lab": a contact sheet on
   a light bench, ink on neutral paper, one signal orange, a live frame rail
   carrying a real timecode. A chat column of bubbles is a different product
   wearing our header. Governance's brownfield rule forbids that.
3. **It cannot be verified here.** No Docker means no popebot. Shipping an
   embed we cannot run would be exactly the kind of unverified claim this
   project has spent its life refusing to make.

**What popebot still contributes.** Its scope system is a gift: a scope is a
directory with its own `SYSTEM.md` and `skills/`, resolved at runtime
(`lib/ai/scope.js`, `lib/ai/system-prompt.js`). Motion Master already has
`plugins/motion-master/skills/` and a router. A popebot scope pointed at the
Motion Master repo is a small, additive change to a third-party repo — and it
gives us Telegram and a live terminal for free.

**What OpenRouter contributes.** The model catalogue and the auth. The
`openrouter-decisions` skill tells us how to choose; `sign-in-with-openrouter`
means the founder brings their own key and we never hold a secret.

## 5. THE ARCHITECTURE

```
                    ┌──────────────────────────────────────┐
                    │  the front page — one origin          │
                    │                                      │
  founder ─────────▶│  chat panel (vanilla TS, Film Lab)   │
                    │        │                             │
                    │        │ POST /chat  (SSE)            │
                    │        ▼                             │
                    │  agent service (Node)                │
                    │    ├─ OpenRouter via AI SDK v7        │
                    │    ├─ tools bound from the MCP server │
                    │    └─ SSE back to the page            │
                    └───────────────┬──────────────────────┘
                                    │ same origin
                    ┌───────────────▼──────────────────────┐
                    │  Motion Master MCP server             │
                    │  16 tools · /mcp · already tested    │
                    │  browse_library · enhance_prompt ·    │
                    │  compose_film · fill_block · …        │
                    └──────────────────────────────────────┘

  popebot (elsewhere, with Docker)
    └─ scope: agents/motion-master/
         SYSTEM.md        ← our router, as the agent prompt
         skills/          ← our 38 skills
         .mcp.json        ← points at the Motion Master MCP server
```

### Where the chat service lives

**In the MCP server.** One service, one origin, one set of tools. `mcp/`
already speaks Streamable HTTP; it gains a `/chat` route that runs the AI SDK
`streamText` with the OpenRouter provider and the MCP tools bound in. No new
deployable, no duplicated tool surface.

### Where the chat lives on the page

A panel in the existing page, not a new page. Per the design lock it is a
**lab console**, not a chat app — see the Visual World Brief below.

### The two auth paths

| | how | when |
| --- | --- | --- |
| **Bring your own key** | `sign-in-with-openrouter` PKCE in the browser. The key is sent per request as an `Authorization` header and never touches our server. | The default. Nothing to deploy a secret for. |
| **Server key** | `OPENROUTER_API_KEY` in the service environment. | Optional, for a hosted instance. Never committed; the config table check already enforces that every `MONTION_MASTER_*` variable is documented. |

### The model

`openrouter-decisions` chooses it. The plan does not hardcode a model id: the
service reads a model name from the request, validated against
`openrouter-models`, with a sensible default. The founder picks in the UI; the
service never silently substitutes.

## 6. VISUAL WORLD BRIEF — THE CHAT

Required by governance §4 before design work. Motion Master already has a
locked identity, so this brief covers **the chat as an addition to that
identity**, not a new brand.

### 1. WORLD
The film lab bench. A contact sheet on a light bench, ink on neutral paper,
one signal orange. The chat is the **console at the bench**: a call sheet
where a brief becomes a shot list, not a messenger where a person becomes a
transcript.

### 2. EMOTIONAL TARGET
First five seconds: *this is a tool, and it is mine.* After five minutes:
*it made me a file I can use.* Not delight; competence with a film-lab calm.

### 3. AUDIENCE + CONTEXT
The founder, at a desk, at night, with footage to cut and no patience for
setup. Desktop first, phone second. They already understand video and
prompts. They do **not** want to learn a new tool's vocabulary.

### 4. CULTURAL SOURCES
The film lab contact sheet. The shot list. The call sheet with its
"time / scene / notes" columns. The editing bay. The slate. The EDL. The
slate's clapboard, used as a form — not as a decoration.

### 5. TYPOGRAPHY LOGIC
IBM Plex Sans and IBM Plex Mono, already the lock. The chat's own voice is
**mono**: every machine value (block id, timecode, variable, path) is set in
mono at 13px, exactly as the film rail sets timecode. Prose is sans. The
mono/sans split *is* the human/machine distinction, and it already exists in
the design system.

### 6. COLOR BEHAVIOR
`--accent` is a mark: the send affordance, the active state, one rule under
the live shot. `--player-zone` `#0E0E10` is the console's own ground — the
chat panel is the one dark region on a light page, because it is the region
where the machinery runs. Canvas, ink, muted and hairline carry everything
else. No new colours.

### 7. SPATIAL DENSITY
Operational. Two columns: a narrow conversation rail and a wide output
column. Dense enough that a shot list fits on one screen. This is a console,
not a reading surface.

### 8. COMPOSITION LOGIC
Conversation-driven, then artifact-driven. Every assistant turn that produced
something is followed by **the artifact**, not by more prose. The artifact is
the point.

### 9. IMAGE LANGUAGE
No imagery. The output is code, timecode and file paths. A rendered frame
appears when there is one, at the size of a contact-sheet cell, with its
timecode under it — the same treatment as the gallery clips.

### 10. MOTION LANGUAGE
Timecode-derived. The frame rail advances while the agent works; the console
shows a *rendering* state, not a typing indicator. Reduced motion freezes the
rail and shows the state as text. No bounce, no spring, no shimmer — the
existing doctrine, unchanged.

### 11. INTERACTION CHARACTER
Immediate and instrumental. Enter sends, `⌘↵` sends with the film context
attached, `Esc` cancels a running job. The control is never ambiguous and
never decorative.

### 12. ANTI-REFERENCES
ChatGPT's bubble column. A purple or indigo gradient panel. Rounded pill
buttons in a row. A sparkle or ✨ avatar. A "typing…" dot. A floating action
button. A "Welcome to the AI assistant!" greeting card. Any of these, if the
page ever grows one, is a defect.

### 13. PORTFOLIO NEIGHBORS
- **motionvideo.xyz** — a directory with a card grid and a countdown. Nearest
  in category. Its chat does not exist; our console is the opposite of a grid.
- **Higgsfield / Runway / Descript** — dark, cinematic, credit-metered. We
  are choosing *against* the dark-cinematic default, and the console is the
  one dark region precisely because it is the machine, not the brand.
- **popebot itself** — a full product with its own shell. Not a reference for
  the console's appearance; a reference for the agent behaviour.

### 14. REQUIRED DIFFERENTIATORS (≥3 dimensions)
1. **Composition** — a contact sheet of shots with timecode, not a transcript.
   The conversation is a rail; the artifact is the page.
2. **Interaction model** — the assistant's output is machine-actionable: copy
   the composition, render it, open the file. One sentence to a rendered MP4.
3. **Motion language** — the console's motion is timecode, and its busy state
   is a render, not a typing dot.
4. **Visual texture** — mono for every machine value, sans for prose. A
   reader can tell what the machine said without reading it.

### 15. ACCESSIBILITY + CLARITY CONSTRAINTS
Contrast stays at AA or better (the existing checker covers every visible text
node). Every action has a visible label, not an icon alone. The stream is
announced to assistive tech through the existing live region. The console is
usable at 320px, where it becomes a single column. Keyboard-only operation
for send, cancel and copy.

### 16. PROOF PLAN
- The existing overflow checker at 320/390/768/1440 with the panel open.
- The existing contrast checker over the console.
- A real render from a real brief, captured as a contact sheet.
- The MCP tool trace: the console's output must be the actual tool result, not
  a re-description of it.

---

## 7. BUILD PLAN

### Phase 0 — the missing piece in the MCP server: an MCP client
popebot has none, and neither do we. But we do not need one for the chat: the
MCP server *owns* its tools, so the chat binds them in-process. The one thing
worth taking from popebot is the **scope** idea, and the one thing worth
taking from OpenRouter is the model catalogue.

- [ ] `mcp/src/chat.ts` — the AI SDK v7 route: `streamText` with
      `@openrouter/ai-sdk-provider`, the 16 MCP tools bound as tool
      definitions, SSE out.
- [ ] `mcp/src/tools.ts` — export the tool *definitions* separately from the
      MCP registration, so the chat and the MCP server share one source of
      truth. Today the tools are registered inline; they need a shared
      descriptor shape.
- [ ] `mcp/src/model.ts` — model selection: read the requested model, validate
      it against the OpenRouter catalogue, fall back to a documented default.
      Never silently substitute.
- [ ] Config: `OPENROUTER_API_KEY`, `MOTION_MASTER_CHAT_MODEL`, the public
      URL. All added to the config table that `bridge/scripts/check-config-table.mjs`
      enforces, so the README cannot drift from the code.

### Phase 1 — the console on the page
- [ ] `site/src/modules/chat.ts` — the panel: a conversation rail and an
      output column, SSE consumption, a cancel control, copy-to-clipboard, and
      the artifact treatment (a rendered frame at contact-sheet size with its
      timecode).
- [ ] `site/src/styles/sections.css` — the console's styles, derived from the
      Film Lab tokens. **No new colours, no new type family, no rounded
      pills.**
- [ ] `sign-in-with-openrouter` — the sign-in button and the PKCE client,
      vendored with its licence. The key lives in `localStorage`.
- [ ] The panel is honest when unconfigured: it says the agent is not
      connected and names the one command that connects it. It never fakes a
      reply.

### Phase 2 — popebot as a second door
- [ ] `agents/motion-master/SYSTEM.md` in the popebot repo — the Motion Master
      router as the agent's system prompt.
- [ ] `agents/motion-master/skills/` — a symlink or copy of
      `plugins/motion-master/skills/`.
- [ ] `.mcp.json` — the Motion Master MCP server, so a popebot coding agent
      gets the same sixteen tools.
- [ ] OpenRouter as the provider: popebot already supports it
      (`lib/llm-providers.js`), so this is configuration, not code.
- [ ] **Not verified here.** No Docker. This phase ships as a documented
      configuration with an explicit "unverified in this environment" note.

### Phase 3 — the agent workspace (ICM)
- [ ] `agent/` as a self-contained ICM workspace — `CONTEXT.md`, node cards,
      its own `SKILL.md` — using the icm-architect pattern for the *new
      subsystem only*.
- [ ] The repo is **not** restructured. It is a working brownfield product
      with a locked identity, a rollback path and 14 unpushed commits.
      Governance §13 says preserve identity; governance §14 is about
      greenfield.

### Phase 4 — proof
- [ ] A real brief, a real render, a contact sheet.
- [ ] Overflow, contrast and keyboard checks with the console open.
- [ ] The gauntlet re-run against the new front page.

---

## 8. WHAT I NEED FROM THE FOUNDER

1. **An OpenRouter key** — or use Sign in with OpenRouter and no key is needed
   on our side at all. This is the only hard blocker for a real model
   round-trip.
2. **A decision on the public surface.** The site is currently deployed
   publicly at a minimax URL, and the product is not on sale. A console that
   costs money per token should not be a public door. Three options:
   (a) the console is visible but only works when a founder-held key is
   present; (b) the console is removed from the public deployment and kept in
   a local build; (c) the console is public and the spend is the founder's
   problem. **I recommend (a).**
3. **Whether popebot should be forked or configured.** A fork lets us add an
   MCP client properly. Configuration is a smaller change and less to own.
   **I recommend configuration first**, with a fork only if the scope system
   proves too limited.
4. **Docker.** If the founder has a machine with Docker, Phase 2 becomes
   verifiable rather than documented-and-hoped.

## 9. WHAT THIS PLAN DOES NOT DO

- It does not restructure the repository into an ICM workspace.
- It does not run the no-code-architects-toolkit. We have ffmpeg and our own
  render path, and the toolkit is Flask and unrunnable here.
- It does not reimplement the sixteen tools.
- It does not put a chat bubble column on a landing page.
- It does not claim anything it has not measured. The popebot integration
  ships labelled unverified, because there is no Docker here to verify it.

# Motion Master MCP server — deliverable

The server that gives an agent the Motion Master motion doctrine, the token set, the
clip library, a deterministic storyboard planner, a Remotion composition generator and
a Montage handover.

Everything in this document was produced by running the commands shown, in this
repository, in this sandbox. Anything that could not be verified is marked
**UNVERIFIED**.

---

## 1. What it is

| | |
| --- | --- |
| Package | `motion-master-mcp` (ESM, TypeScript, Node ≥ 20) |
| Transport | MCP Streamable HTTP at `POST/GET /mcp` |
| Status document | `GET /health` (and `GET /`) |
| Tools | 7 — `list_skills`, `get_motion_tokens`, `list_clips`, `get_clip_prompt`, `plan_video`, `build_composition`, `mix_footage` |
| Data sources | the plugin package on disk (`skills/`, `assets/motion-tokens.json`) and the site's clip manifest (`site/src/clips.json`) |
| Renders anything? | **No.** It never renders and there is no hosted render service. Remotion renders on the buyer's machine; Montage renders footage on the buyer's own instance. |
| Licence | paid, one-time: **$99 Solo / $399 Studio**. The server states this in its instructions, in `/health` and in the `mix_footage` output. |

---

## 2. Every file

```
mcp/
├── .env.example                placeholders only — never a real token, key or URL
├── .gitignore                  node_modules/, dist/, .env (but .env.example)
├── package.json                scripts: build, start, dev, typecheck, sync:tokens, check:tokens, test
├── package-lock.json
├── tsconfig.json               strict, NodeNext, ES2022, src → dist
├── scripts/
│   ├── sync-tokens.mjs         mirrors plugins/motion-master/assets/motion-tokens.json
│   │                          → src/tokens.generated.ts  (npm run sync:tokens / check:tokens)
│   └── verify-tools.mjs        proof harness: starts the real server, calls every tool,
│                               proves plan_video is byte-identical, parses the generated TSX
├── src/
│   ├── index.ts                HTTP server, /mcp + /health, MCP server bootstrap, status document
│   ├── tools.ts                the seven tool definitions (zod input schemas)
│   ├── planner.ts              the deterministic storyboard planner (pure function, no RNG)
│   ├── composer.ts             the Remotion TSX generator
│   ├── skills.ts               reads the bundled skills + their frontmatter
│   ├── clips.ts                reads the site's clip manifest
│   ├── tokens.ts               reads the canonical token file (generated mirror as fallback)
│   ├── tokens.generated.ts     GENERATED mirror of the token file — do not edit by hand
│   ├── montage.ts              the Montage HTTP client + the timeline validator
│   ├── montage-timeline.ts     projection of an explainer timeline onto Montage's canonical
│   │                           timeline document (independent implementation, clean room)
│   ├── licence.ts              the offer: $99 Solo / $399 Studio, one-time, no hosted render
│   └── config.ts               every runtime value, read from the environment only
├── test/
│   ├── server.test.mjs         12 end-to-end tests against the real server
│   ├── montage.test.mjs        3 tests: the real handover against a Montage test double
│   └── fixtures/
│       └── fake-montage-server.mjs   a test double for the documented Montage routes
└── verification/               the evidence produced by the commands below
    ├── build-and-test.txt
    ├── tool-schemas.txt        tools/list, exactly as the server reports it
    ├── verify-output.txt       the full proof transcript
    └── src/index.tsx           the composition build_composition actually emitted
```

`dist/` is build output and is not committed (`.gitignore`).

---

## 3. The public API

### 3.1 HTTP

| Method | Path | Returns |
| --- | --- | --- |
| `POST` / `GET` | `/mcp` | the MCP Streamable HTTP endpoint (stateless: a fresh server per request) |
| `GET` | `/health`, `/` | a JSON status document: name, version, tools, skill count, token source, montage configuration, **licence**, **domain**, **rendering** |
| anything else | — | `404 {"error":"Not found","endpoints":["/mcp","/health"]}` |

### 3.2 The seven tools

Every tool returns a JSON text block **and** a `structuredContent` object with the same
payload. The full JSON Schemas the server advertises are in
`verification/tool-schemas.txt`.

| Tool | Parameters | Result |
| --- | --- | --- |
| `list_skills` | `group?: "all" \| "motion-master" \| "motion-design" \| "gsap" \| "remotion"`, `name?: string` | `{ count, total, source, router, note, skills: [{ name, description, group, license, version, path, upstream, loads }] }` — read from the plugin package on disk |
| `get_motion_tokens` | `group?: "all" \| "palette" \| "typography" \| "easing" \| "duration" \| "styleDurations" \| "spring" \| "stagger" \| "motion"` | `{ source, canonicalPath, version, name, doctrine: { entrance, exit, onScreen, staggerBudgetMs }, tokens }` — read from `assets/motion-tokens.json` |
| `list_clips` | `id?: string`, `stack?: string` | `{ available, source, note, count, clips: [{ id, title, prompt, stack, duration, durationSeconds, src, poster, alt, renderedWith, bridgeDemo }] }` — read from `site/src/clips.json` |
| `get_clip_prompt` | `id: string` (required) | the one clip's `{ id, title, prompt, stack, duration, durationSeconds, src, poster, alt, renderedWith, bridgeDemo, source }`; an unknown id returns `isError: true` with the available ids |
| `plan_video` | `brief: string` (required), `duration_seconds?: number`, `style?: "premium" \| "calm" \| "energetic" \| "snappy"`, `fps?: number`, `width?: number`, `height?: number`, `element_count?: number`, `hold_seconds?: number` | a full `Storyboard` — see §3.3 |
| `build_composition` | `brief?: string`, `storyboard?: Storyboard`, `id?: string`, `filename?: string`, `fps?: number`, `width?: number`, `height?: number`, `duration_seconds?: number`, `style?: "premium" \| "calm" \| "energetic" \| "snappy"` | `{ filename, tsx, composition: { id, width, height, fps, durationInFrames }, dependencies, commands, notes, storyboard, tokensSource }` |
| `mix_footage` | `timeline: { cuts?, overlays?, scenes? }` (required), `project_id?: string`, `dry_run?: boolean`, `fps?: number`, `width?: number`, `height?: number` | `{ delivered, reason, licence, montage: { baseUrl, tenant, health, projectId, expectedVersion, storedVersion, response, validate }, validation, timeline, nextSteps }` — see §6 |

### 3.3 The `Storyboard` shape

```ts
{
  brief: string;
  template: string;            // "launch-title" | "title-sequence" | "showreel" | …
  style: "premium" | "calm" | "energetic" | "snappy";
  fps: number; width: number; height: number;
  duration: { seconds: number; frames: number };
  doctrine: { entrance: string; exit: string; onScreen: string; staggerBudgetMs: number; note: string };
  beats: [{
    index: number;             // 1-based, contiguous
    key: string; label: string; role: string;
    easingRole: "entrance" | "exit" | "onScreen";
    easing: { name: string; role: string; cubicBezier: [number, number, number, number] };
    inSeconds: number; outSeconds: number; inFrame: number; outFrame: number;
    durationSeconds: number; animationMs: number; holdMs: number;
    elements: { name: string; type: "text" | "shape" | "clip" | "graphic"; note?: string }[];
    stagger: { pattern: string; elementCount: number; intervalMs: number; totalMs: number;
               budgetMs: number; withinBudget: boolean; clamped: boolean; note?: string };
    transition: { type: "cut" | "hold"; easing: string; note: string };
    notes: string[];
  }];
  staggerPlan: { budgetMs: number; maxTotalMs: number; allWithinBudget: boolean;
                 groups: { beat: number; pattern: string; intervalMs: number; totalMs: number }[] };
  tokensUsed: string[];
  notes: string[];
}
```

### 3.4 Environment

Every value is read from the process environment. The server never writes a secret to
disk and never sends one anywhere except the Montage instance you point it at.

| Variable | Default | Meaning |
| --- | --- | --- |
| `MOTION_MASTER_MCP_HOST` | `127.0.0.1` | listen address |
| `MOTION_MASTER_MCP_PORT` | `8787` | listen port |
| `MOTION_MASTER_MCP_URL_PUBLIC` | `http://<host>:<port>/mcp` | the URL advertised to clients |
| `MOTION_MASTER_REPO_ROOT` | discovered by walking up from the package | the repository root |
| `MOTION_MASTER_SKILLS_DIR` | `<repo>/plugins/motion-master/skills` | the bundled skills |
| `MOTION_MASTER_TOKENS_PATH` | `<repo>/plugins/motion-master/assets/motion-tokens.json` | the canonical tokens |
| `MOTION_MASTER_CLIPS_PATH` | `<repo>/site/src/clips.json` | the clip manifest |
| `MOTION_MASTER_BRAND_PATH` | `<repo>/plugins/motion-master/assets/brand.json` | where the domain is recorded |
| `MOTION_MASTER_MONTAGE_URL` | *(unset)* | your Montage instance. Unset ⇒ `mix_footage` says so instead of pretending to deliver |
| `MOTION_MASTER_MONTAGE_TOKEN` | *(unset)* | bearer token, only for hosted-auth Montage instances |
| `MOTION_MASTER_MONTAGE_TENANT` | `tenant_owner` (or `MONTAGE_TENANT_ID`) | the `X-Yappy-Tenant` header |
| `MOTION_MASTER_MONTAGE_TIMEOUT_MS` | `8000` | request timeout |

`mcp/.env.example` lists all of them with placeholders only.

---

## 4. Build — real output

```
$ cd mcp && npm install
up to date, audited 99 packages in 642ms

34 packages are looking for funding

found 0 vulnerabilities

$ npm run build

> motion-master-mcp@1.0.0 build
> tsc -p tsconfig.json

(no output = no type errors; exit code 0)
```

`npm run check:tokens` also passes — the generated mirror in `src/tokens.generated.ts`
is in sync with `plugins/motion-master/assets/motion-tokens.json`.

---

## 5. Test — real output

```
$ npm test

> motion-master-mcp@1.0.0 test
> npm run build && node --test test/*.mjs

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
# duration_ms 7597.303253
```

Nothing in the suite is mocked except the Montage instance (a local test double for
the documented routes). The server under test is the real `node dist/index.js`,
reached over the real MCP client transport.

> The test script was `node --test test/`, which fails on Node 22.19 in this sandbox
> (`Error: Cannot find module '…/mcp/test'`). It is now `node --test test/*.mjs`,
> which runs the same two files.

---

## 6. Proof — the server was started and every tool was called

```
$ node scripts/verify-tools.mjs
```

Full transcript: `verification/verify-output.txt`. Summary of what it does and what it
found:

### 6.0 Start-up

```
Motion Master MCP 1.0.0 listening on http://127.0.0.1:8799
  MCP endpoint : http://127.0.0.1:8799/mcp
  health       : http://127.0.0.1:8799/health
  tools        : list_skills, get_motion_tokens, list_clips, get_clip_prompt, plan_video, build_composition, mix_footage
  skills       : 21 bundled in …/plugins/motion-master/skills
  tokens       : …/plugins/motion-master/assets/motion-tokens.json
  montage      : http://127.0.0.1:36757
  licence      : Motion Master is a paid, one-time licence: $99 Solo or $399 Studio. One payment, no subscription, no per-render billing.
  rendering    : local (Remotion) — no hosted render service
```

### 6.1 `list_skills` — 21 skills, read off disk

```
count=21 total=21 source=…/plugins/motion-master/skills
  gsap-core [gsap] MIT
  gsap-frameworks [gsap] MIT
  gsap-performance [gsap] MIT
  gsap-plugins [gsap] MIT
  gsap-react [gsap] MIT
  gsap-scrolltrigger [gsap] MIT
  gsap-timeline [gsap] MIT
  gsap-utils [gsap] MIT
  motion-design [motion-design] MIT
  motion-master [motion-master] SEE LICENSE IN ../../LICENSE.md
  remotion-captions [remotion] —
  remotion-create [remotion] —
  remotion-docs [remotion] —
  remotion-interactivity [remotion] —
  remotion-maps [remotion] —
  remotion-markup [remotion] —
  remotion-multimedia [remotion] —
  remotion-render [remotion] —
  remotion-saas [remotion] —
  remotion-studio [remotion] —
  remotion-upgrade [remotion] —
```

### 6.2 `get_motion_tokens` — the real token set

```
entrance=ease-out exit=ease-in onScreen=ease-in-out budget=500ms
easing.entrance=[0.05,0.7,0.1,1] accent=#FF4A1C
```

### 6.3 `list_clips` — the four gallery clips

```
- launch-title · Launch title · remotion · 0:14
- kinetic-type · Kinetic type · remotion · 0:09
- product-loop · Product loop · remotion + ffmpeg · 0:21
- footage-title · Footage + title · remotion + montage bridge · 0:16
```

### 6.4 `get_clip_prompt` — the real prompt behind a clip

```
id=launch-title
stack=remotion duration=0:14 (14s)
prompt=A 14s launch title. The wordmark rises into a masked reveal, an accent rule draws in beneath it, the card holds for 2s, then fades out and lifts. One accent, no decoration, hairline rules top and bottom.
```

### 6.5 `plan_video` — called twice, byte-identical

Brief: `"15s launch film, name reveal, hold 2s, calm exit"`

```
first  response: 5241 bytes
second response: 5241 bytes
byte-identical: true
sha256(first)  = 05527df027c38ccc02dc4f93f080927e7912f4d89cacc9985e826f894d53e830
sha256(second) = 05527df027c38ccc02dc4f93f080927e7912f4d89cacc9985e826f894d53e830
```

The two hashes are equal, and the run was repeated in a **second, separate server
process** with the same two hashes. The planner is a pure function: no clock, no
randomness, no I/O beyond reading the token file.

The storyboard it returns:

```
template=launch-title style=calm fps=30 duration=15s (450 frames)
  1. Establish     — setup  — onScreen (standard)   0s→4.9s   f0→f147   stagger 45ms × 1 = 0ms
  2. Wordmark reveal — reveal — entrance (emphasized) 4.9s→9.9s f147→f297  stagger 45ms × 1 = 0ms
  3. Hold          — hold  — onScreen (standard)   9.9s→12.4s f297→f372  stagger 45ms × 2 = 45ms
  4. Exit          — exit  — exit (accelerate)     12.4s→15s  f372→f450  stagger 45ms × 2 = 45ms
stagger plan: budget=500ms max=45ms allWithinBudget=true
```

Doctrine check: the entrance beat uses `cubic-bezier(0.05, 0.7, 0.1, 1)` (ease-out),
the exit beat uses the ease-in curve, the on-screen beats use ease-in-out, and the
largest total stagger is 45ms — under the 500ms budget. The requested 2s hold is
honoured as `holdMs: 2000` on beat 3.

### 6.6 `build_composition` — TSX that parses

```
file=src/index.tsx id=launch-title
composition=1920x1080 @30fps, 450 frames
tsx=10777 bytes
parse errors: none
PASS  the TSX contains a Composition registration
PASS  the TSX calls registerRoot
PASS  the TSX carries the motion tokens
PASS  the TSX parses
```

The parse is done with the TypeScript compiler itself
(`ts.createSourceFile(…, ts.ScriptKind.TSX)`), so "it parses" is a compiler fact, not
a substring match. The emitted file is kept at `verification/src/index.tsx`. It
contains a real `<Composition id="launch-title" … />`, a `registerRoot(MotionMasterRoot)`
call, the palette (`#FF4A1C`), the type tokens and the three doctrine curves built
with `Easing.bezier`.

### 6.7 `mix_footage` — a real handover to a Montage instance

```
delivered=true
montage={"projectId":"demo-project","expectedVersion":3,"storedVersion":4,"health":{"ok":true,"app":"backlot"}}
requests the Montage instance actually received:
  GET /api/health
  GET /api/projects
  GET /api/v1/projects/demo-project/timeline
  PUT /api/v1/projects/demo-project/timeline
  POST /api/v1/projects/demo-project/validate
```

The instance in this run is `test/fixtures/fake-montage-server.mjs`, a local test
double that implements the routes documented in `docs/05-MONTAGE-INTEGRATION.md` and
in `bridge/`. The requests above are the requests it actually received, recorded by
the double — the write is not simulated, it is a real HTTP `PUT` whose body carries
`{ expected_version: 3, timeline: { … } }` and the `X-Yappy-Tenant: tenant_owner`
header. The test asserts the projected document: two items on the `video` track with
the right sources and durations, two items on the `overlay` track with the right text.

The handover in full:

1. `GET /api/health` — is the instance up?
2. `GET /api/projects` — which project? (`project_id` wins when given)
3. `GET /api/v1/projects/{id}/timeline` — read the version the instance holds
4. `PUT /api/v1/projects/{id}/timeline` — body `{ expected_version, timeline }`; the
   instance stores it as `version + 1`
5. `POST /api/v1/projects/{id}/validate` — validate the project afterwards

`timeline` may be an explainer timeline (`{ cuts, overlays }`) or an already-canonical
Montage document. An explainer timeline is projected onto Montage's canonical document
(`{ version, canvas, tracks }`) by `src/montage-timeline.ts`.

`mix_footage` is honest about what it did not do: with `dry_run: true` it validates
and contacts nothing; with no `MOTION_MASTER_MONTAGE_URL` it says the timeline was
validated but not sent and lists the next steps. It never claims a delivery that did
not happen.

### 6.8 The status document — the licence is stated, not implied

```json
"licence": {
  "type": "paid-one-time",
  "currency": "USD",
  "cadence": "one-time",
  "tiers": [
    { "id": "solo",   "price": 99,  "currency": "USD", "cadence": "one-time", "label": "Solo — $99 one-time",   "includes": [ … ] },
    { "id": "studio", "price": 399, "currency": "USD", "cadence": "one-time", "label": "Studio — $399 one-time", "includes": [ … ] }
  ],
  "summary": "Motion Master is a paid, one-time licence: $99 Solo or $399 Studio. One payment, no subscription, no per-render billing.",
  "licenceKey": "The licence key is delivered by email after checkout. …",
  "hostedRenderService": false,
  "renderingNote": "Motion Master does not run a hosted render service. …"
},
"domain": { "recordedIn": "…/plugins/motion-master/assets/brand.json", "tld": null, "url": null, "note": "…" },
"rendering": { "hostedRenderService": false, "note": "…" }
```

The final line of the harness: **27/27 checks passed** (`node scripts/verify-tools.mjs`
exits 0).

---

## 7. The Montage surface this server uses

Taken from `docs/05-MONTAGE-INTEGRATION.md` and `bridge/` — no endpoint is invented.

| Method | Route | Use |
| --- | --- | --- |
| `GET` | `/api/health` | liveness |
| `GET` | `/api/projects` | list projects |
| `GET` | `/api/project/{project_id}/state` | board state of one project |
| `GET` | `/api/v1/projects/{project_id}/timeline` | the stored timeline document (its `version`) |
| `PUT` | `/api/v1/projects/{project_id}/timeline` | the handover — body `{ expected_version, timeline }` |
| `POST` | `/api/v1/projects/{project_id}/validate` | validate the project |

The equivalent Montage MCP tools are `project_create`, `project_list`, `project_get`,
`project_validate`, `timeline_get`, `timeline_replace`.

**Licence boundary.** This server implements the handover itself, as an independent
client written against Montage's *documented public interface*. It does not import,
link or vendor the AGPL-3.0 `bridge/` package, and it contains none of that package's
code. `bridge/` stays AGPL and stays out of the proprietary product.

---

## 8. Changes made in this finishing pass

| File | Change |
| --- | --- |
| `package.json` | test script fixed to `node --test test/*.mjs`; an invented author URL with a TLD removed |
| `src/licence.ts` | **new** — the offer ($99 Solo / $399 Studio, one-time) and the "no hosted render service" statement, in one place |
| `src/montage-timeline.ts` | **new** — the projection onto Montage's canonical timeline document |
| `src/montage.ts` | the studio timeline routes (`GET`/`PUT`/`api/v1/.../timeline`, `POST .../validate`) and the `X-Yappy-Tenant` header |
| `src/tools.ts` | `mix_footage` now **delivers** the timeline instead of returning it for someone else to deliver; `licence` added to its output |
| `src/config.ts` | `MOTION_MASTER_MONTAGE_TENANT` and `MOTION_MASTER_BRAND_PATH` |
| `src/index.ts` | the licence, the domain record and the rendering facts in the instructions, the banner and the status document |
| `src/tokens.generated.ts` | regenerated from the canonical token file |
| `test/server.test.mjs` | added the "the generated TSX parses" test |
| `test/montage.test.mjs`, `test/fixtures/fake-montage-server.mjs` | **new** — the end-to-end handover proof |
| `scripts/verify-tools.mjs` | **new** — the proof harness |
| `.env.example` | **new** — placeholders only |
| `.gitignore` | **new** — `node_modules/`, `dist/`, `.env` |

---

## 9. UNVERIFIED

* **The real Montage instance.** The handover was proven against a local test double
  that implements the documented routes and the documented `expected_version` /
  `version + 1` semantics. It was **not** proven against a running
  `executiveusa/pauli-montage-video-agent` instance — that repository is not
  available in this sandbox, and the real instance's response bodies are therefore
  **UNVERIFIED** against the real server. The routes, the header and the body shape
  come from `docs/05-MONTAGE-INTEGRATION.md` and `bridge/`.
* **The generated composition was not rendered.** `build_composition` emits TSX that
  parses and registers a real `<Composition>`, but `npx remotion render` was not run
  here: Remotion and a Chrome binary are not installed in this sandbox. The video
  output is **UNVERIFIED**; the TSX is **VERIFIED** (it parses, and the tests assert
  its structure).
* **The clip gallery.** `list_clips` / `get_clip_prompt` read `site/src/clips.json`
  and return the real prompts, stacks and durations from it. Whether each clip file
  was rendered by the skills that claim to have rendered it is **UNVERIFIED** — that
  was proven by the clips task, not by this one.
* **The licence key.** Nothing in this server checks a licence key. The key is
  delivered by email by the checkout, which is not part of this repository. The
  **pricing** is stated; the **entitlement enforcement** is **UNVERIFIED** and
  deliberately out of scope for an offline server.
* **The marketplace install flow** was not exercised — the `claude`, `codex` and
  `cursor` CLIs are not installed in this sandbox. The catalogs are **VERIFIED** as
  JSON and as field shapes against the published schemas; the actual install is
  **UNVERIFIED**.

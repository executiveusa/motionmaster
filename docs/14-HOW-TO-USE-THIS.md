# 14 — How to use this, and what is still open

**Status:** the product works today on this machine. The remaining decisions are the founder's, and none of them block use.

---

## The loop, in four commands

```bash
cd motion-master/mcp && npm install && npm start
```

That is the whole agent. It listens on `127.0.0.1:8787` and serves:

| | |
|---|---|
| `/health` | what it is, how many tools, what it can and cannot do |
| `/mcp` | the MCP endpoint — the same one an external agent connects to |
| `/chat` | the console's route |
| `/files` | your own footage, logos and stills |
| `/films` | what has been rendered here, with the URLs to play and download them |

Then open the site, put your OpenRouter key in the console's address field if it is not `http://127.0.0.1:8787`, and ask for a film.

**Without a key, nothing is faked.** The console shows the sign-in gate; the server returns a 401 with a note on how to fix it. There is no placeholder model, no canned answer.

---

## What the founder can do with it right now

1. **Ask for a film and get an MP4.** "A launch film for ACME coffee: the name arrives, the product appears, and a number proves the point." That renders a real film from real motion blocks, through the gate, on this machine.
2. **Click a starting point** instead of typing a prompt. The six buttons are generated from the library, so they are always real.
3. **Drop in their own footage** and hand it to their own Montage instance.
4. **Read the library** — 3,988 prompts, 756 categories, nine collections, every item carrying its own licence.

---

## The four decisions that are still the founder's

### 1. The OpenRouter key

**What I recommend:** sign in with OpenRouter in the console (PKCE, no client registration, no backend). The key stays in the browser and travels with each request.

**Why:** the alternative — a key on our server — means the key is a shared secret in an environment we do not control, and it costs money per call from a place nobody is watching.

**What it costs:** one sign-in, once, per browser. And the model path cannot be verified here without a key, so that one link in the chain is verified against a mock and against the live model catalogue, not against a live model.

### 2. The public surface

**What I recommend:** keep the deployed site public, with the console visible and honest. The console says `no agent here — start it with: cd mcp && npm start`, and the agent's address is a field.

**Why:** the alternative — hiding the console until an agent is reachable — hides the product. A visitor who is not going to run a Node server learns nothing either way; a visitor who is going to run one learns exactly what to do.

**What it costs:** a public page that shows a disconnected console. I think that is the right trade for a tool in its own lab, but it is a call about the front door.

### 3. popebot: configure, or fork?

**What I recommend:** configure. Give popebot a `agents/motion-master/` scope — `SYSTEM.md`, `skills/`, `.mcp.json` pointing at our `/mcp` — and let it be the second door (Telegram, a terminal) rather than the front page.

**Why:** popebot's chat component is welded to its app shell and popebot has no MCP client, so forking means maintaining a fork of somebody else's product. A scope is a directory.

**What it costs:** I cannot run or verify popebot here — no Docker. Whatever ships that way ships **labelled unverified**, and that label stays until someone runs it.

### 4. A machine that can render

The render needs Chrome and about two minutes per film. This sandbox has both, and a founder's laptop has both. What it does not have is a *server* — so the "hosted render" that the licence describes is still a plan, not a product.

**What I recommend:** do not build it until the in-house use is real. Right now the bottleneck is not rendering; it is that the block matcher is weak and the block pool is unqualified.

---

## The two things I would work on next

### A. Qualify the whole block pool, once

The gate is the best thing in this build, and right now it only learns about a block when a film actually fails. `library/block-verdicts.json` starts with two entries because two components clipped their own text.

A bulk pass over the 448 blocks — install, gate, record — would find every bad block before a user does, and the matcher could then choose only from blocks that pass. At roughly eight seconds a block on two cores, that is about an hour of machine time and no new code. **This is the highest-value hour in the project.**

### B. Give the enhancer a shot plan

The enhancer strengthens a brief. It does not say what the film should be. So the matcher has to guess from tags, and a coffee brief reached a progress ring because the brief mentioned a number.

If `enhance_prompt` returned a shot plan — *opens on a title card, the product appears, a number proves it, ends on the wordmark* — the matcher would be choosing, not guessing. The blocks already carry the vocabulary for this (title, product, data, brand, transition). It is one more field on an enhancer that already scores the brief.

---

## What is deliberately not built

| | Why |
|---|---|
| A hosted render service | No server, no queue, no allowance figure. The licence records the idea; the product does not pretend to have it. |
| Payment, domain, launch | `licence.json` has `status.onSale = false`. A launch is one edit, not a rebuild. |
| A second chat implementation | One console, one model path, one set of tools. |
| Claims about other products | The gauntlet's visual half is still unverified and says so. |

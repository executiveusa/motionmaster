# 10 — OPEN-SOURCE PROMPT LIBRARIES FOR MOTION GRAPHICS

**Date of survey: 2026-10-22.** Every library below was fetched and read, not
taken from a search snippet. Licence and item counts are as stated by the
repository at the time of the check.

## The short answer

There is no single best one, because the biggest collections are **not open
source** — they are web galleries. The largest *open* libraries on GitHub sit
between 57 and 637 items. If you want range and clean data, those are the
shortlist; if you want raw volume, you are looking at a gallery with an MCP
server bolted on.

## The open-source shortlist

| Library | Items | Licence | What it is actually good for |
|---|---|---|---|
| **`HiAPIAI/awesome-opus-5-5-video-styles`** | **425 prompts, 12 styles** | **CC-BY-4.0** | The best organised one. Sorted by visual style, each with a ready-to-paste **style recipe**. |
| **`guanmo-ai/awesome-ai-motion`** | **637 techniques, 581 cases** | MIT | The best as a *technique* reference. 15 families, each effect with a definition, a clip and parameters. **Already shipped in this plugin.** |
| **`LeaddeOpenLab/awesome-opus-5-5-video-prompts`** | **398 prompts** | **none — all rights reserved** | Best provenance. Grouped by production path; each entry carries disclosure, verification status and source text range, plus a CSV of prompt overlap, length and style. |
| **`Li-Evan/awesome-opus-5.5-video-prompts`** | **334 prompts, 302 creators** | not stated | Verified prompts copied word for word from each creator's post, with tools, inputs and cost notes. |
| **`maning636/motion-prompts`** | 379 prompts, 1,004 templates | **custom, non-OSI** | Single-file GSAP HTML. Chinese. **The licence forbids repackaging or re-uploading.** |
| **`cindyxu1030/motion-graphics-prompt-bank`** | 57 prompts with GIFs | **CC BY-NC-SA 4.0** | HyperFrames prompts with placeholders; 15 launch-trailer scenes reverse-engineered from real launch films. **Non-commercial — cannot ship in a paid product.** |
| **`zhuyansen/awesome-claude-video-skills`** | 180 skills | CC0 | A security-graded *index* of skills, not prompts. |
| **`phy041/claude-motion-playbook`** | 137 techniques | notes only | No videos, no full prompts. The best orientation document in the ecosystem, and it reviews 13 open-source motion skills. |

### The one to start with

**`HiAPIAI/awesome-opus-5-5-video-styles`.** Its premise is the correct one for
agent-driven motion:

> Opus does not output video: it writes code that draws every frame. So the same
> prompt can come out as kinetic type one run and 3D or pixel art the next. To get
> a look, you have to name it.

Twelve styles, each with a recipe — cartoon (43 prompts), cinematic 3D (82),
kinetic typography (52), generative & neon (34), low-poly (32), hand-drawn (22),
pixel art (22), product UI, explainer, retro, collage (6), photoreal. Stills only,
no video. **CC-BY-4.0, so it ships with attribution** — which we already do for
every upstream skill.

### What we already have

`guanmo-ai/awesome-ai-motion` is **already in the plugin** (MIT, 34 skills in the
package). It is the largest open technique library: 637 effects across entrance
and exit, emphasis, typography, transitions, camera, data, UI demo, explainer,
shape and path, texture and style, generative, 3D and depth, loop and ambient,
captions. Its weakness is honesty about provenance — of 581 cases, only 83 are
original prompts, 118 are briefs and 380 are unknown.

`lemomo-ai/lemo-opuscar` is not a prompt library but is the best *style* library:
60 complete film styles, each a style prompt plus a demo film made entirely in
code.

## Bigger, but not open source

| Collection | Items | Prompts | What it offers |
|---|---|---|---|
| **Oneshotted** | 6,164 recipes from 3,716 creators | 3,838 | Filters by framework (Remotion, HyperFrames, GSAP, Three.js, Motion Canvas, Manim). **MCP server and an agent skill.** |
| **24fps** | 4,607 clips, 2,540 creators | 1,073 | Clear rights per clip; 395 are open-licensed with source. **MCP, JSON API, `llms-full.txt`.** |
| **prompt-motion.com** | 233 films | 1,252 in the library | The gallery motionvideo.xyz mirrors. |
| **TopView** | 12,430 prompts | — | Mostly for generative-video models (Seedance, Grok), not code. |

## The thing that matters for us: HyperFrames

The survey turned up a renderer we do not use: **HyperFrames**
(`heygen-com/hyperframes`) — an open-source HTML-to-video renderer built for
agents. Scenes are HTML/CSS/GSAP, captured frame by frame in headless Chrome and
encoded with ffmpeg.

**That is the same architecture as `hero/film.js` and `demos/`**, which we wrote
this week. It is installable as a skill (`npx skills add heygen-com/hyperframes`).
Worth evaluating against our own renderer: ours has no dependency and already
produces the four films we ship, but HyperFrames is a maintained upstream with a
community around it.

## What I would do

1. **Import the 12 style recipes** from `HiAPIAI/awesome-opus-5-5-video-styles`
   into `skills/motion-master/references/styles/` — CC-BY-4.0, attribution kept.
   Twelve named looks an agent can be told to hit, which is the gap between
   "make a motion graphic" and "make *this* motion graphic".
2. **Keep `awesome-ai-motion`** as the technique reference — it is already in.
3. **Do not import** `motion-graphics-prompt-bank` (non-commercial) or
   `maning636/motion-prompts` (forbids repackaging). Neither may go in a paid
   product.
4. **Evaluate HyperFrames** as a renderer. If it holds up, our `hero/film.js`
   pipeline could be replaced by it, and the demos would ship with an upstream
   renderer instead of our own.
5. **Point the MCP at Oneshotted or 24fps** if a search-over-prompts tool is
   wanted. Both have MCP servers and both state their limits. But check the
   terms before shipping a paid product on top of either.

## Caveats worth stating plainly

- Counts move daily. Every number here was stated by the repository and may be
  stale by the time you read it.
- "Open source" is doing a lot of work in this list. Four of the nine have
  licences that would stop us shipping them inside a paid product: one is
  non-commercial, one forbids repackaging, one has no licence at all, and one
  is CC-BY with attribution obligations.
- A prompt is only as good as the renderer. Every one of these libraries is
  written for an agent that writes code and renders it. None of them produce
  pixels by themselves.

# WIREFRAMES — MOTION MASTER landing

Notation: `[rail]` = 56px frame rail · `│` = hairline rule · `▓` = signal orange accent
`[CLIP]` = motion clip with poster + real duration + copyable prompt
Low-fidelity on purpose. Copy shown is the *direction* of the copy, final words come in the
copy pass — but every headline here is already slop-checked against the blacklist.

---

## A. DESKTOP — 1440 × 900

```
┌──┬──────────────────────────────────────────────────────────────────────────────┐
│  │  MOTION MASTER                                      Examples  How it works  │  ← 72px bar
│  │                                                                  [ Buy the license ]│
├──┼──────────────────────────────────────────────────────────────────────────────┤
│r │                                                                              │
│a │  AGENT SKILLS FOR MOTION DESIGN                                               │
│i │                                                                              │
│l │  Describe the video.                                                          │
│  │  Get the file.                                                                │
│  │                                                                              │
│0 │  Motion Master teaches an AI agent to storyboard, choreograph and render      │
│0 │  motion design in code. You get the video, the project, and the source.        │
│: │                                                                              │
│0 │  [ Buy the license — $149 ]   [ See it make one ↓ ]                          │
│  │                                                                              │
│0 │  ✓ One payment, no subscription   ✓ Renders on your machine   ✓ You own it   │
│1 │                                                                              │
│2 │  ┌────────────────────────────────────────────┐  ← live in-browser motion      │
│: │  │                                            │    canvas, GSAP, not a        │
│0 │  │            [ LIVE MOTION CANVAS ]          │    <video> file. Real time.    │
│0 │  │                                            │                              │
│0 │  │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │                              │
│: │  └────────────────────────────────────────────┘                              │
│  │  00:00:04:12  ·  1920×1080  ·  remotion + gsap                               │
└──┴──────────────────────────────────────────────────────────────────────────────┘
```

**Hero notes**
- Headline is 6 words. No serif, no italic word, no colour swap. "Get the file." is the
  product truth: the output is a file you own.
- The canvas is the product, running. Not a video, not a GIF, not a mock.
- The three ✓ lines are the three top objections answered pre-emptively, in mono, small.
- Rail on the far left carries frame ticks + live timecode synced to the canvas.

---

## B. PROOF — "made with the shipped skills"

```
┌──┬──────────────────────────────────────────────────────────────────────────────┐
│  │  EVERY CLIP BELOW SHIPS WITH THE PROMPT THAT MADE IT.        00:00:12:00     │
├──┼──────────────────────────────────────────────────────────────────────────────┤
│  │                                                                              │
│  │  ┌────────────────────┐┌────────────────────┐┌────────────────────┐           │
│  │  │  [CLIP 00:14]      ││  [CLIP 00:09]      ││  [CLIP 00:21]      │           │
│  │  │                    ││                    ││                    │           │
│  │  └────────────────────┘└────────────────────┘└────────────────────┘           │
│  │  Launch title          Kinetic type          Product loop                     │
│  │  ▓ 0:14 · remotion     ▓ 0:09 · gsap         ▓ 0:21 · remotion+ffmpeg        │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐            │
│  │  │ "A 14s launch    │  │ "Kinetic type    │  │ "Product loop    │            │
│  │  │  title: name     │  │  reveal, 9 words"│  │  demo, 3 beats"  │            │
│  │  │  reveal, hold    │  │  ← copy          │  │  ← copy          │            │
│  │  │  2s on logo"     │  │                  │  │                  │            │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘            │
│  │         ↑ monospace prompt block, copyable, one click                        │
│  │                                                                              │
│  │  [ Start from this prompt ]                                                 │
└──┴──────────────────────────────────────────────────────────────────────────────┘
```

**Proof notes**
- NOT a card grid. A contact sheet: media blocks on a shared baseline, hairline rules,
  4px radius only on the media frame.
- The prompt is the product. It is printed under each clip in mono, copyable.
- One primary action for the whole strip: "Start from this prompt" — that is the
  zero-install path (paste into ChatGPT). It is the CTA doctrine: say what happens.
- Clips are the ones WE rendered with the shipped skills. Labelled, not passed off as
  customer work.

---

## C. MECHANISM — "how it works", 3 numbered blocks (not 3 cards)

```
┌──┬──────────────────────────────────────────────────────────────────────────────┐
│  │  01  YOU DESCRIBE IT                                                         │
│  │  ┌──────────────────────────────┐                                          │
│  │  │ "15s launch film, name       │  ← real artifact, not an icon            │
│  │  │  reveal, hold 2s, calm exit" │                                          │
│  │  └──────────────────────────────┘                                          │
│  │  A sentence, or a brief, or a screenshot of what you want.                   │
│  │  ────────────────────────────────────────────────────────────────────────    │
│  │  02  IT WRITES THE SHOT LIST                                                │
│  │  ┌──────────────────────────────┐                                          │
│  │  │ beat 1  0:00  title in       │  ← real storyboard artifact             │
│  │  │ beat 2  0:14  subtitle      │                                          │
│  │  │ beat 3  0:31  cards stagger  │                                          │
│  │  └──────────────────────────────┘                                          │
│  │  Beats, timing, easing and stagger — decided before a line of code.          │
│  │  ────────────────────────────────────────────────────────────────────────    │
│  │  03  IT WRITES AND RENDERS THE VIDEO                                        │
│  │  ┌──────────────────────────────┐                                          │
│  │  │ <Timeline/>                   │  ← real code, syntax-highlighted        │
│  │  │ interpolate(frame, ...)       │                                          │
│  │  └──────────────────────────────┘                                          │
│  │  Remotion for the render, GSAP for the choreography, ffmpeg for the encode.   │
└──┴──────────────────────────────────────────────────────────────────────────────┘
```

**Mechanism notes**
- Vertical rhythm with hairline separators — **explicitly not three identical cards**
  (blacklist #7). Each step carries a real artifact.
- The code panel is code-native, which is allowed and encouraged: this IS a code product.

---

## D. IN THE BOX — the file tree, interactive

```
┌──┬──────────────────────────────────────────────────────────────────────────────┐
│  │  WHAT'S IN THE BOX                                                          │
│  │                                                                              │
│  │  motion-master/                                                              │
│  │  ├── skills/                        ▓ 20 skills, MIT + attribution          │
│  │  │   ├── motion-design/             timing, easing, choreography            │
│  │  │   ├── remotion-markup/           compositions, timing, typography         │
│  │  │   ├── remotion-render/           render + codec settings                 │
│  │  │   ├── gsap-timeline/             sequencing, position parameters          │
│  │  │   └── … 16 more                                                          │
│  │  ├── tokens/                        springs, easings, durations              │
│  │  ├── starters/                      showreel · title · launch · changelog     │
│  │  ├── plugin.json                    ChatGPT + Codex, one package              │
│  │  └── mcp.json                       one URL, 16 hosts                         │
│  │                                                                              │
│  │  [ Install in ChatGPT ]  [ Install in Codex ]  [ Install in Claude ]  +13   │
└──┴──────────────────────────────────────────────────────────────────────────────┘
```

**In-the-box notes**
- A file tree is the honest representation. It is also the proof of "it's a real thing."
- The install row is the "works everywhere" claim, made concrete, no logos.
- Hovering a skill reveals what it teaches — the real proof that a skill has substance.

---

## E. FOOTAGE MIX — the Montage bridge (Studio tier only)

```
┌──┬──────────────────────────────────────────────────────────────────────────────┐
│  │  WORK WITH YOUR OWN FOOTAGE                                                  │
│  │  ┌───────────────────────┐   ┌───────────────────────┐                     │
│  │  │  raw clip            │   │  + motion title       │   → plain-language     │
│  │  │  (real footage)      │   │  sequence burned in   │     edit request      │
│  │  └───────────────────────┘   └───────────────────────┘                     │
│  │  "cut the first 3 seconds, add a title card in our brand type"               │
│  │                                                                              │
│  │  Runs against a Montage instance you control.  Bridge is AGPL.                │
│  │  Studio tier.                                                                  │
└──┴──────────────────────────────────────────────────────────────────────────────┘
```

**Footage notes**
- Before → action → after, the Landing Page Director's demonstration standard.
- The AGPL notice is *shown*, not buried. That is a trust signal, not a weakness.
- Never in the hero. This is a Studio-tier feature, and the copy says so.

---

## F. OBJECTIONS — 4, not 8

```
┌──┬──────────────────────────────────────────────────────────────────────────────┐
│  │  STRAIGHT ANSWERS                                                            │
│  │                                                                              │
│  │  "AI video is $15 a month. Why $149 once?"                                  │
│  │  You pay once and the file is yours forever. No credits, no watermark,        │
│  │  no model that can be retired underneath you. Your project renders on your   │
│  │  own machine, so the twelfth video costs nothing.                            │
│  │  ─────────────────────────────────────────────────────────────────────────   │
│  │  "I don't know how to code."                                                 │
│  │  You don't. You paste a sentence into ChatGPT and it comes back with a       │
│  │  video. If you want to change a word later, you type the change.             │
│  │  ─────────────────────────────────────────────────────────────────────────   │
│  │  "Won't it look like AI?"                                                    │
│  │  The motion rules are ours and they're opinionated: fixed durations,         │
│  │  fixed easing roles, stagger budgets, one accent. Read the rules in the      │
│  │  skills — they're in the box, not behind a login.                            │
│  │  ─────────────────────────────────────────────────────────────────────────   │
│  │  "Do I own it?"                                                              │
│  │  The video, the project, the code. Use it commercially, including for        │
│  │  clients. No attribution required.                                           │
└──┴──────────────────────────────────────────────────────────────────────────────┘
```

---

## G. PRICING — 2 tiers, because the product has 2 tiers

```
┌──┬──────────────────────────────────────────────────────────────────────────────┐
│  │  ONE PAYMENT. NO SUBSCRIPTION FOR THE SOFTWARE.                             │
│  │                                                                              │
│  │  ┌──────────────────────────┐   ┌──────────────────────────┐               │
│  │  │ SOLIO                     │   │ STUDIO                    │               │
│  │  │ $149 once                 │   │ $599 once                 │               │
│  │  │                           │   │                           │               │
│  │  │ · 20 motion skills        │   │ · everything in Solo      │               │
│  │  │ · plugin: 16 hosts        │   │ · Montage bridge (AGPL)   │               │
│  │  │ · local render, unlimited │   │ · 40 hosted renders / mo  │               │
│  │  │ · tokens + starters       │   │ · team seats              │               │
│  │  │ · lifetime updates        │   │ · commercial licence      │               │
│  │  │ · commercial use          │   │ · priority support         │               │
│  │  │                           │   │                           │               │
│  │  │ [ Buy Solo ]              │   │ [ Buy Studio ]            │               │
│  │  └──────────────────────────┘   └──────────────────────────┘               │
│  │  Hosted renders are an allowance, not a subscription. You are never charged   │
│  │  automatically. Top up when you want more.                                  │
└──┴──────────────────────────────────────────────────────────────────────────────┘
```

**Pricing notes**
- 2 tiers, not 3 (blacklist #17). A third tier would be a decoy.
- The hosted-render line is stated honestly and *unmissably* — no hiding the recurring bit.
  "You are never charged automatically" is the sentence that makes a one-time price credible.
- Studio is the only place the Montage bridge appears.
- **Note:** the "40 hosted renders / mo" figure is UNVERIFIED pending founder confirmation
  that it is fundable. It must not ship until it is.

---

## H. FOOTER

```
┌──┬──────────────────────────────────────────────────────────────────────────────┐
│  │  MOTION MASTER            Product   Skills   Pricing   Docs   Repo           │
│  │                           © 2026 · Licence · Terms · Privacy                │
│  │  Built with Remotion, GSAP and ffmpeg. Skill packs by LottieFiles, GreenSock  │
│  │  and Remotion, used under their licences.                                   │
└──┴──────────────────────────────────────────────────────────────────────────────┘
```

---

# MOBILE — 390 × 844

```
┌──────────────────────────┐  ┌──────────────────────────┐
│ ▬▬  2px progress line    │  │                          │
│ MOTION MASTER      ☰     │  │  390 wide                │
├──────────────────────────┤  │  24px margins            │
│                          │  │                          │
│ AGENT SKILLS FOR MOTION  │  │  NO frame rail (becomes  │
│                          │  │  the 2px top line)       │
│ Describe the video.      │  │                          │
│ Get the file.            │  │  Headline 40px, not 104  │
│                          │  │  (clamp mid-range)       │
│ Motion Master teaches…   │  │                          │
│                          │  │  ✓ one payment           │
│ [ Buy the license — $149]│  │  ✓ you own it            │
│ [ See it make one ]      │  │  (2 of 3; third scrolls) │
├──────────────────────────┤  │                          │
│ ┌──────────────────────┐ │  │  LIVE CANVAS full-bleed  │
│ │  LIVE MOTION CANVAS  │ │  │  (below CTA — proof      │
│ │                      │ │  │   before the ask)        │
│ └──────────────────────┘ │  │                          │
│ 00:00:04:12              │  │  ┌──────────────────────┐ │
├──────────────────────────┤  │  │ ▓ Start from this     │ │
│ 01  02  03  04  05  06   │  │  │   prompt             │ │
│  ↑ clips stacked, each   │  │  └──────────────────────┘ │
│    with prompt beneath   │  │                          │
│    1 column, no cards    │  │  sticky CTA bar (56px)   │
└──────────────────────────┘  └──────────────────────────┘
```

**Mobile contract summary**
- Frame rail → 2px top progress line (position: fixed).
- Timecode stays visible under the canvas.
- Clips stack to 1 column. Prompts are NOT collapsed — they are the product.
- The 3 ✓ lines become 2 visible + 1 scrolled; they are not critical path.
- Sticky bottom CTA appears after the hero scrolls past, 56px + safe-area inset.
- Nav: full-height panel, focus trap, Escape closes, focus returns to trigger.
- No horizontal scroll at 320. Code blocks scroll horizontally *inside* their own
  container with a visible affordance, never the page.
- Touch targets ≥ 48px everywhere. Press = 2% scale, 120ms.
- `prefers-reduced-motion`: canvas freezes on its poster frame, reveals become visible
  immediately, the progress line becomes a static position indicator.

---

# Section order & the Golden Conversion Slice

**HERO → LIVE PROOF → MECHANISM → WHAT'S IN THE BOX → FOOTAGE MIX → OBJECTIONS → PRICE → FAQ**

Golden slice (minimum complete converting path):
**HERO → one real clip + its prompt → "Start from this prompt" → price → checkout.**
Everything above is supported by research; nothing below the FAQ is required to buy.

Claims that must earn their place: every section above maps to an objection or to proof.
Nothing is included because landing pages usually have it.

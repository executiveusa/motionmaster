# PROJECT LOCK — MOTION MASTER

Locked 2026-10-21. Derived from founder delegation ("use all of your recommendations"),
Grill Round 1, and researched market evidence.

**Mode:** GREENFIELD (`executiveusa/motion-master-` contains only a README)

---

**Product:** MOTION MASTER — an agent that writes motion design in code (Remotion / GSAP / ffmpeg) and hands the creator the project, the render, and the source.

**Audience:** Primary = non-technical creators (small-business owners, indie founders, marketers) who need branded video and cannot animate. Secondary = technical creators (devs, motion designers) who arrive free via the plugin and upgrade.

**Awareness stage:** Problem-aware. They know they need video, they know AI video exists, they do not know "motion design as code" exists.

**Visitor trigger:** They saw a clip they liked, or they have a launch/announcement date and no designer.

**Problem:** Making video that looks designed requires either a designer (money, scheduling) or a tool that takes years to learn (After Effects, Premiere). Generative AI video tools produce content that reads as AI slop and cannot be edited as a system.

**Desired outcome:** A finished, editable, on-brand motion piece they can publish — without learning a timeline tool and without hiring anyone.

**Offer:** One-time license: the skill pack + portable agent plugin (ChatGPT, Codex, + 12 more hosts) + motion tokens + scene starters + local rendering. Optional hosted render allowance.

**Commercial value:** One-time cash revenue, low churn, no per-minute cost for the local path.

**Primary CTA:** `Buy the license` (live checkout, Dodo/Lemon Squeezy). Success state = license key delivered + plugin install command shown.

**Post-click result:** Checkout → email with license key + one-line install per host + the GitHub access link.

**Existing proof:** Only what we build. The competitor's proof is a free catalog of AI-made clips; ours is a working pipeline plus clips rendered by the shipped skills.

**Primary objections:**
1. "AI video is $15/month — why pay $99 once?"
2. "Do I need to know how to code?"
3. "Will it look like AI slop?"
4. "Do I own the output, and can I edit it later?"
5. "What if it needs my footage?"

**Brand assets to preserve:** Name "MOTION MASTER". Nothing else exists yet — brand is greenfield.

**Technical constraints:**
- Build repo: `executiveusa/motion-master-` (MIT/proprietary, ours).
- `executiveusa/pauli-montage-video-agent` is **AGPL-3.0** and must NOT be modified. Integration is via its public API/MCP only.
- Sandbox has 2 CPU cores, no GPU, blocked egress to most non-GitHub domains. Render pipeline: software GL, Chrome Headless Shell fetched from the Chrome-for-Testing bucket.

**Things that must not change:** The montage repo (read-only). Honest claims. The real-prompt-behind-every-clip rule.

**Primary KPI:** Paid licenses sold (one-time). Secondary: plugin installs from the public plugin directory; gallery→checkout click rate.

**Definition of success:** A stranger understands in 2 seconds what it is, who it's for, and what to do; can play a real clip; sees the exact prompt behind it; can buy without a terminal; and the claim ledger survives adversarial review.

---

## Decisions locked in Grill Round 1

| # | Decision | Locked |
|---|---|---|
| Q1 | Paid buyer = non-technical creator. Technical creator = free evaluator funnel. | ✅ |
| Q2 | Hybrid: one-time license + hosted render allowance. Not unlimited. | ✅ |
| Q3 | Cloud rendering = paid default. Local rendering = power-user path. | ✅ |
| Q4 | Bridge to montage ships AGPL, isolated in `bridge/`. Proprietary elsewhere. | ✅ |
| Q5 | Crew is internal architecture. Customer sees one agent. "Orchestrate" is a later paid tier, not v1 marketing. | ✅ |
| Q6 | Every gallery clip shows its exact prompt, stack, and duration. Live checkout, product-tour framing. | ✅ |

## Open decisions (deliberately deferred, flagged in Evidence Ledger)

- Domain — **"motionmaster"** (founder confirmed 2026-10-21). The TLD is not chosen and the
  domain is not yet purchased. Copy says "Motion Master"; a URL with a TLD may only appear
  once DNS points at the site.
- Payment processor — Dodo Payments (competitor uses it, verified live) vs Lemon Squeezy vs
  Stripe. Choose one; needs a founder account.
- ~~Whether the founder owns the montage repo~~ — **RESOLVED 2026-10-21: the founder owns
  it.** The commercial dual-licence path is therefore live, which means the AGPL boundary
  on `bridge/` is now a business choice rather than a legal constraint. Default posture
  (b) still ships until the owner acts; see `docs/05-MONTAGE-INTEGRATION.md` §2 and
  `bridge/LICENSING.md`.
- Final price point after the first 5 customer conversations. **$99 is the founder's
  decision** (2026-10-21) after the validation card recommended it. Still a hypothesis,
  not a finding — test $99 against $149 and $249.

## Confirmed by the founder (2026-10-21)

| Question | Answer | Consequence |
|---|---|---|
| Do you own the Montage repo? | **Yes** | Dual-licence path available. Bridge stays AGPL by default; a commercial licence from the owner removes the copyleft from the shipped product. Motion Master still does not modify the Montage repo. |
| Domain | **motionmaster** (TLD pending) | Copy may use the word. No URL with a TLD until purchased. |
| Price | **$99 for Solo, one-time** | Early buyers buy a lifetime download. $99 is under one season of Runway and under one freelance motion designer. Studio set at $399. |

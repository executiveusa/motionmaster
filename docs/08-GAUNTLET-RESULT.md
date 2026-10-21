# 08 — GAUNTLET RESULT

**Status: PASS on the measurable half. UNVERIFIED on the visual half.**
**Date of run: 2026-10-21.**

The bar is the public marketing surface of motionvideo.xyz. The founder's words: *beat
motionvideo.xyz*. A round count is not a win. A blind win is.

---

## 1. What was actually reachable

`motionvideo.xyz` does not resolve from this sandbox. The TLS handshake fails
(`SSL_ERROR_SYSCALL`), `web_fetch` times out at 15s, and the extractor's own fetcher
throws `TypeError: fetch failed`. It was unreachable on every attempt.

**motionvideo.xyz is open source.** `github.com/motionvideohq/motionvideo.xyz` is public
and was cloned at HEAD. Their landing copy, their navigation, their card catalogue and
their real prices were all read from source. So:

- Their **copy and structure** were audited directly, from their own source of truth.
- Their **rendered pixels** were never seen. That half of the bar is **UNVERIFIED**, and
  this report does not claim otherwise.

The reconstruction script is `scripts/build-bar-reconstruction.mjs`. It is a text
reconstruction, not a screenshot. It reproduces the words and the structure — which is
what the anti-slop rules read — and nothing else.

---

## 2. The measurable half

Same tool, same rules, same input shape (an HTML file) for both sides. The tool is
`the-extractor` (the-extractor, MIT), audited at HEAD.

| | Motion Master | motionvideo.xyz |
|---|---|---|
| High-severity signals | **0** | 0 |
| Medium-severity signals | **1** | **2** |
| Headings on the page | 25 | 37 |
| Links on the page | 26 | 93 |
| Cards on the landing page | 4 (real, rendered) | 35 (of 247 in the catalogue) |

Findings against ours:

- `X-S01` **Long-page hierarchy burden** (medium) — 25 headings.

Findings against theirs:

- `X-S01` **Long-page hierarchy burden** (medium) — 37 headings.
- `X-S02` **Choice density** (medium) — 93 links.

**We win the measurable half.** Fewer signals, fewer headings, fewer links. The one
signal we do trip is real and I am not going to pretend otherwise: a 25-heading page
is still a long page. It is a product page that has to carry proof, mechanism,
contents, pricing, objections and FAQ, so it cannot be cut to a poster — but the
finding is on the record and `X-S01` should be watched as the page grows.

**Their copy passes the copy rules.** That is worth saying plainly: their writing has no
"elevate / unlock / empower / reimagine" in it, and the tool confirms it. We did not beat
them on wording. We beat them on density and on honesty.

---

## 3. What the extractor does not measure — and what I found anyway

The extractor's rules are about wording and structure. Two things about their page are
visible in their source and are not in the ruleset. Both are things we deliberately do
not do.

**3.1 Manufactured urgency.** Their pricing block ships a live counter: a 100-tick
visual, the label "spots remaining", and the line *"The launch offer ends after the first
100 purchases. Then the price is $49."* (source: `apps/web/src/components/pricing.tsx`,
`apps/web/src/constants/pricing.ts` — `BASE_PRICE_CENTS = 4900`,
`LAUNCH_PRICE_CENTS = 2900`, `LAUNCH_LIMIT = 100`.) A countdown to a price that has not
changed in nine months is a pressure tactic. The brief bans fake urgency. We do not
publish a countdown, a "spots left" number, or any deadline we have not set.

**3.2 The real prices.** $29 during the launch offer, $49 after the first 100 purchases.
This is the single most important competitive fact found in this run, and it was not in
the plan. See §5.

---

## 4. The visual half — UNVERIFIED

A blind critic with fresh context is supposed to put our screenshot next to theirs with
the labels stripped and say which is better. **That did not happen**, because their page
cannot be loaded here. Recording it as a win would be the exact failure the gauntlet
exists to prevent.

What exists instead:

- `scripts/gauntlet.sh` performs the blind capture when the domain is reachable. It
  screenshots both pages at 1440 and 390, with the same flags, into
  `.review/gauntlet/`. Run it from a machine that can load motionvideo.xyz.
- Their page height is known from a public screenshot of their own TrustMRR profile:
  **12,831px at 1920 wide**. Ours is roughly 7,000px. Their page is a wall; ours is a
  page. That is a structural difference, not a pixel judgment, and it is the only
  structural claim this report makes about how their page looks.

**The gauntlet is not closed.** The measurable half is won; the taste half is open and
must be closed on a machine that can load the domain, before launch.

---

## 5. The pricing problem this run exposed

| | Motion Master | motionvideo.xyz |
|---|---|---|
| Price | $99 Solo / $399 Studio | $29 launch, $49 after 100 sales |
| What you get | skills + plugin for 16 hosts + MCP server + the Montage footage bridge + hosted rendering | the skill bundle |
| Licence | one-time, unlimited projects | one-time, "unlimited personal and client projects" |

They are **$29–$49 for skills**. We are **$99–$399 for skills plus an MCP server, a
plugin, a footage bridge and a hosted render path.** That is a 2×–8× price gap for a
bundle that is strictly larger.

Three facts make the gap survivable, and one makes it dangerous:

1. **They have an audience we do not.** Their founder shipped this to an audience and
   their verified all-time revenue is **$58** — about two launch sales. The market is not
   proven. A price is not a moat, and neither is a bigger bundle.
2. **They do not sell to the buyer we sell to.** Their page is a free directory of 247
   clips. We sell a one-time licence to someone with a deadline. Different buyers.
3. **Our product proof is stronger.** Four real rendered clips with the exact prompts
   that made them, against a catalogue of 247 cards where the prompt is behind a click.
4. **The danger:** if a non-technical buyer compares the two pages, ours looks like the
   expensive one and does less visible work for the money — 4 examples against 35. The
   fix is not to drop the price. The fix is to make the four examples unmistakable, and
   to make the "what $99 actually buys" argument on the page.

**Founder decision, still open:** keep $99/$399, or move the Solo tier. This report does
not change the price. The founder set it, and the GTM doc treats $99 as a hypothesis to
test against $149 and $249, not a finding. The new information is that the reference
point in the market is $29–$49, which was not in the hypothesis set.

---

## 6. How to close the gauntlet

```bash
# on a machine that can load motionvideo.xyz
cd motion-master
BAR=https://motionvideo.xyz/ scripts/gauntlet.sh
```

It builds, serves ours, runs the extractor on both, measures overflow at seven
viewports from 320px up, and captures both pages at 1440 and 390. Then give the two
images to a critic with no context and no labels and ask one question: **which page do
you believe, and which page do you want to pay for?**

The exit condition is unchanged and it is not a round count: a blind critic picks ours.
If the critic picks theirs, the page goes back and the loop runs again.

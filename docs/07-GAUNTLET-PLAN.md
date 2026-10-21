# THE GAUNTLET — Motion Master vs motionvideo.xyz

How we know we actually beat the site we are replacing, instead of believing we did.

---

## 1. The bar

**Bar:** the public marketing surface of **motionvideo.xyz** — the home page, the `/skills`
directory, and the `/motionvideo-skill` offer page.

**Why this bar and not another:** it is the *named, fetchable, comparable* thing the user
told us to surpass. It is a real product page in the exact category, sold at a one-time
price to a similar audience. A judge can put our page and theirs side by side at the same
viewport and pick one. That is the only kind of bar that produces an honest result.

**Why not the "target clone" the user pointed at**
(`motionvideo.xyz/dashboard/bookmarks?video=jacksonfall-54b2ac`): that route is behind an
email-code sign-in. It is not fetchable by anyone, including a paying customer, so it
cannot be captured comparably and cannot serve as a bar. It is an authenticated product
UI, not a marketing page. The bar is the part a stranger actually sees before paying.

### Capture status — honest, partial

| Page | Captured? | How |
|---|---|---|
| `/` | **Partial** | Hero and section titles captured via search index: *"Motion worth making. / AI-made motion videos with the prompts and skills behind them. Find one and make it your own."* Sections: "Claude motion designer showreel", "Cinetic skill launch film". |
| `/skills` | **Yes** | Full page captured 2026-10-21: nav, search, category filters (Motion graphics 17, AI video 7, Product films 5), all 29 skill cards, footer. |
| `/motionvideo-skill` | **Yes** | Full page captured 2026-10-21: hero, 5-step "How it works", "What's in the pack", pricing ($29 launch / $49, "LIVE 94 left"), FAQ, footer. |
| `/creatives` | **No** | Network timeouts from this sandbox across repeated attempts. |
| `/dashboard/bookmarks` | **No** | Auth-walled. Not fetchable by anyone. |

**Per the taste gauntlet's own rule, a partially captured reference yields
`GAUNTLET_INCOMPLETE` on the `/creatives` gallery specifically.** The bar stands for the
marketing surface — captured — and the gallery comparison is reported as unverifiable
rather than quietly assumed. We do not claim to have beaten a page we could not load.

**Mitigation:** if the sandbox network stays blocked, re-capture the two missing pages
from an unrestricted machine before launch and re-run the gallery comparison. Until then
the finding is marked UNVERIFIED.

---

## 2. The measurable half

Taste alone drifts upward every round and flatters itself. So the loop carries a number.

### 2.1 `the-extractor` — objective slop signal count

`executiveusa/the-extractor` is a real, runnable anti-slop auditor (MIT) with 7 signal
rules for copy and 3 for UI, each with a severity, a "why" and a required "action". It
takes a **file or a URL**, so it audits both pages on the same axis.

```bash
node extractor.mjs audit <url> --format json
```

**Pass condition:** Motion Master produces **zero high-severity** signals and fewer
medium signals than the bar, at the same point in the loop. A high-severity finding is
an automatic block regardless of taste.

### 2.2 The hard measurements

| Measurement | Target | Tool |
|---|---|---|
| Horizontal overflow at 320px | `scrollWidth <= innerWidth` | headless Chrome, JS eval |
| Body text contrast | ≥ 4.5:1 | computed in-page, every text/background pair |
| Accent orange on canvas | large text / non-text only, ≥ 3:1 | computed |
| JS payload (gzip) | < 90KB excluding GSAP | build output |
| LCP | < 1.8s on 4G | Lighthouse or measured |
| CLS | 0 | layout-shift observer |
| Two-second comprehension | a stranger can say what it is, who it is for, what to do | human panel, 5 people, no coaching |
| Unsupported claims | 0 | every claim against `docs/02-EVIDENCE-LEDGER.md` |

### 2.3 The 10-dimension taste score

The taste gauntlet's dimensions, scored 0–10 by the reviewer panel: clarity, visual
design, originality, mobile, accessibility, performance, product proof, conversion path,
trust, craft. **Overall ≥ 8.5, conversion path ≥ 9.0, and no dimension below 7.5.**

---

## 3. The reviewer council

Each reviewer is a **separate session with fresh context**. It does not see the builder's
reasoning, only the artefact. Builders cannot approve their own work.

| # | Reviewer | Attacks |
|---|---|---|
| 1 | Conversion prosecutor | Two-second test, offer, CTA, friction, time-to-value, funnel |
| 2 | Krug / clarity | What is this, where am I, what can I do, what happens next, what looks clickable but is not |
| 3 | Creative director | Governing idea, visual sameness, composition, typography, scale, hierarchy, authorship. Asks: **"could this page belong to anybody?"** If yes, it fails. |
| 4 | Slop & taste hunter | Every item on the anti-slop blacklist, plus the extractor's signal output |
| 5 | Mobile director | Content order, thumb reach, crops, navigation, CTA persistence, overflow, density, safe areas, keyboard behaviour |
| 6 | Accessibility reviewer | Semantics, keyboard flow, focus, contrast, labels, reflow, motion, interactive states |
| 7 | Truth & evidence auditor | Every public claim against the Evidence Ledger. Fake proof fails the page. |
| 8 | Production engineer | Performance, responsiveness, broken routes, hydration errors, media loading, SEO, metadata |
| 9 | Security & privacy reviewer | Secrets, external scripts, trackers, data handling |
| 10 | Sovereignty & rollback reviewer | The owner keeps the code, hosting, domain, destinations and a rollback path |

---

## 4. The loop

```
BUILD → ATTACK → TRIAGE → REPAIR → RETEST → ATTACK AGAIN
```

1. Merge reviewer findings; deduplicate overlaps.
2. Sort P0 → P1 → P2. **P0 and P1 must be fixed before the loop can end.**
3. Repair. Rerun the automated checks and the extractor.
4. Re-render the page.
5. Re-run the **whole** council on the P0/P1 repairs, not just the fixed part.
6. Repeat.

**The blind comparison.** For the round that decides the bar:

> Put our page and motionvideo.xyz side by side at the same viewport with the labels
> stripped. Which one is better? A harsh critic. Praise is not useful. If ours does not
> win, it keeps going.

**The exit is winning the comparison, or the founder stopping the run.** Never a round
count. Scores out of 10 drift upward every round and prove nothing.

**Severity**

| Level | Examples | Ship? |
|---|---|---|
| P0 | Core page broken, primary CTA fails, false claim, data exposed, critical a11y failure | **No** |
| P1 | Two-second test fails, mobile overflow, unclear CTA, serious performance defect, product proof missing, page feels template-generated | **No** |
| P2 | Spacing inconsistency, copy tightening, subtle crop issue, transition refinement | Fix when reasonable |

---

## 5. Release gates

All must pass or we do not ship:

| Gate | Condition |
|---|---|
| Two-second test | PASS — 5 strangers, no coaching |
| Single primary conversion | PASS |
| Primary CTA functional | PASS — real checkout, real success state |
| Evidence audit | PASS — 0 unsupported claims |
| Extractor high-severity signals | **0** |
| P0 issues | 0 |
| P1 issues | 0 |
| Broken controls | 0 |
| Mobile overflow (320/375/390/430/768/1024/1440) | 0 |
| Critical accessibility failures | 0 |
| Contrast | every pair passes |
| Blind comparison vs the bar | **ours wins** |
| Rollback | documented |

---

## 6. Anti-shortcut rules for this loop

- The builder never reviews itself. Every critique comes from a session that did not
  write the code.
- No finding is "explained away" without a repair. A documented finding that is not
  fixed is a failure, not a footnote.
- A screenshot is supporting evidence, never the only test. The scrollWidth check, the
  contrast computation and the console output are the proof.
- The bar is re-fetched, not described from memory. If the reference cannot be captured,
  the comparison for that surface is reported as UNVERIFIED — not quietly skipped.
- We do not claim to have beaten a page we could not load.

# Motion tokens

Every value here comes from `plugins/motion-master/assets/motion-tokens.json` — the
single source of truth. If a number in your code disagrees with that file, the file
wins. The MCP tool `get_motion_tokens` returns the same values in JSON.

---

## 1. Easing — the directional rules

| Role | Curve | Cubic bezier | Use it for |
| --- | --- | --- | --- |
| **entrance** | emphasized | `cubic-bezier(0.05, 0.7, 0.1, 1)` | anything entering the frame |
| **exit** | accelerate | `cubic-bezier(0.3, 0, 1, 1)` | anything leaving the frame |
| **onScreen** | standard | `cubic-bezier(0.2, 0, 0, 1)` | anything that stays and changes state |
| **loop** | sine | `cubic-bezier(0.37, 0, 0.63, 1)` | ambient and continuous loops |
| **linear** | linear | `cubic-bezier(0, 0, 1, 1)` | counters, progress bars, anything read as a measurement |

The rule in one line: **entrance eases out, exit eases in, on-screen eases in-out.**

Exit lasts 65–75% of the matching entrance. A thing that flew in over 500ms should
leave over 350–375ms. Anything longer feels sticky.

**Material scale** (when the surface is a physical metaphor): rigid ×1.2, paper ×1.0,
glass ×0.9, fluid ×1.5, gas ×2.0.

---

## 2. Durations

### By element

| Element | Duration |
| --- | --- |
| Micro-feedback (tooltip) | 80–120ms |
| Button / toggle | 120–180ms |
| Icon transition | 150–250ms |
| Card enter / exit | 200–350ms |
| Modal / dialog | 300–400ms |
| Page transition | 400–600ms |
| Dramatic reveal | 600–1200ms |
| Ambient | 2000–20000ms |

### By personality

| Personality | Quick | Standard | Slow |
| --- | --- | --- | --- |
| Premium | 350ms | 500ms | 800ms |
| Corporate | 200ms | 300ms | 450ms |
| Energetic | 100ms | 180ms | 300ms |
| Playful | 150ms | 250ms | 400ms |

Motion Master ships four timing styles. `plan_video` picks one from the brief:

| Style | Entrance | On-screen | Exit | Stagger pattern |
| --- | --- | --- | --- | --- |
| `premium` (default) | 500ms | 400ms | 350ms | standard |
| `calm` | 600ms | 500ms | 400ms | wave |
| `energetic` | 240ms | 180ms | 160ms | standard |
| `snappy` | 320ms | 240ms | 200ms | microCascade |

### Distance scales the duration

Travel further, take longer: 50px → ×0.8, 100px → ×1.0, 200px → ×1.3, 300px → ×1.5,
400px → ×1.6, full screen → ×1.8–2.0.

### Interaction latency ceilings

| Interaction | Max latency |
| --- | --- |
| Hover | <100ms |
| Press / tap | <150ms |
| Release / settle | 200–300ms |
| Error shake | 300–400ms |
| Long press | 500–800ms |
| Drag start | <50ms |

---

## 3. Springs

| Feel | Stiffness | Damping | Mass |
| --- | --- | --- | --- |
| Very stiff | 400+ | 25–30 | 1 |
| Standard | 250–350 | 18–24 | 1 |
| Bouncy | 150–250 | 10–15 | 1 |
| Very bouncy | 100–200 | 5–10 | 1 |
| Gentle | 100–150 | 20–25 | 1 |

Damping ratio: below 1.0 oscillates, 1.0 is the fastest clean stop, above 1.0 settles
slowly. **Premium work uses the critically damped default — `stiffness 170, damping 26,
mass 1` — with 0% overshoot.**

Named tokens in the token file: `standard` (260 / 22 / 1), `stiff` (400 / 28 / 1),
`gentle` (120 / 22 / 1), `noBounce` (170 / 26 / 1).

---

## 4. Stagger

| Pattern | Interval | Budget |
| --- | --- | --- |
| Micro cascade | 20–40ms | <200ms |
| Standard | 50–100ms | <400ms |
| Dramatic | 100–200ms | <600ms |
| Wave | 30–60ms | <500ms |

**The total stagger of a group must stay under 500ms.** The total is
`(elementCount − 1) × interval`, not the interval. When a group is too large, shorten
the interval — never exceed the budget. `plan_video` does this automatically and marks
the beat as `clamped` when it had to shorten the interval.

Directions: top-to-bottom (lists), left-to-right (horizontal), center-out (a hero),
random (organic), reverse (exits).

---

## 5. Overshoot budget

| Context | Overshoot |
| --- | --- |
| Success | 5–10% |
| Error | 0% |
| Feedback | 2–5% |
| Celebration | 15–25% |
| **Premium** | **0%** |

---

## 6. Reduced motion

Under `prefers-reduced-motion`: freeze on the final frame, drop the reveals, keep
state changes instant and legible, and keep the 2px progress indicator as a static
position marker. A reduced-motion path is not a degraded path — it is a different
render of the same truth.

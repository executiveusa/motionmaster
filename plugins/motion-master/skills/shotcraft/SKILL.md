---
name: shotcraft
description: The shot vocabulary — 124 authored shot cards covering openings, typography, camera, data, effects, interaction, UI entrances, rhythm, transitions and outros. Each card says what the shot is for, how long it runs, how much energy it spends and the traps its author already hit. Use this to choose the shape of a film before writing any animation code, and to answer "what shot does this brief need?".
license: Apache-2.0
---

# The shot vocabulary

A motion brief says what the film is about. It does not say what the film
*is*: where it opens, how the words land, where the camera moves, how the
beat falls, how it ends. Without that, every brief renders as the same
five seconds of a headline sliding in.

This skill is that missing half. **124 shot cards**, each one a technique
somebody worked out — where it came from, what it costs, and the trap that
made them rebuild it once.

## The cards

Cards live in `references/shots/`, filed by role:

| role | what it is for |
|---|---|
| `opening` | Names the subject before showing it. Spends little energy so the rest has room to climb. |
| `typography` | Words as the subject. Title cards, and choreography made of type. |
| `camera` | The frame moves; the subject does not. Push, pull, tilt, crane, flyover. |
| `data` | A number becomes a story. Charts, gauges, timelines, before-and-after. |
| `effects` | The moment something lands. Impacts, light, bloom, feedback. |
| `interaction` | The product being used. A thing operated, a choice made. |
| `ui-entrance` | Elements arriving. The interface assembling itself out of order. |
| `rhythm` | Cut on the beat. Timing is the structure, not the decoration. |
| `transition` | Between two shots. How one becomes the next. |
| `outro` | The end. Wordmark, product release, sign-off. |

Every card has the same frontmatter, so they can be read mechanically:

- `name` — the card's own name, and its id
- `一句话` — one line: what the shot does
- `适用` — when to reach for it, and what it is not for
- `时长` — how long it runs, with the frame count
- `能量` — how much energy it spends: 低 / 低中 / 中 / 中高 / 高
- `标签` — its own tags

And every card body has the same sections: **意图** (the intent), **动效核心**
(the mechanics), **参数表** (the parameters and how to tune them), **声音**
(the sound), **已知坑** (the known traps) and **参考实现** (the reference
implementation).

## How to use it

**Do not paraphrase a card.** The card *is* the technique. Read the card at
its path, take the parameters from it, and build that shot. The parameters
are where the craft is: "the brand hold is 46→76 frames, a full second" is
the difference between a title card and a wordmark.

**Plan before you compose.** The order of a film is not arbitrary:

```
opening  →  the shots the brief asks for  →  transition  →  outro
```

The opening must spend little energy. The cards are explicit about this:
a film that opens on its best trick has nowhere to climb. The work climbs.
The transition changes gear. The outro lands.

**Keep the energy curve in mind.** The cards carry it because it is how a
film holds attention — low at the top, peak at the end.

**Watch the traps.** `已知坑` is the most valuable part of a card. "The hold
belongs to the moment the wordmark lands, not to any old content card" is
the kind of thing that costs a rebuild.

## The sound and the beat

- `references/music-beat-sync.md` — cutting to the beat.
- `references/sound-design.md` — how the sound is planned across a film.
- `references/sfx-sourcing.md` — where effects come from.

Motion Master has its own sound library — 1,470 sounds across 35 kinds, each
one searchable by an agent and playable on the site. Use that; it is the
same vocabulary the site and the agent share.

## Attribution

The cards are imported from
[github.com/Vincentwei1021/video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft)
under the Apache License 2.0. The licence is in this directory.

`references/shots/ATTRIBUTION.md` records, per research batch, which public
work each technique was studied from. The implementations were written from
scratch, with no original footage, screenshots, art or brand elements, and
the wording, colour and UI content are neutral placeholders. **Keep it that
way**: the techniques are the reusable part, the specific expression of
someone's film is not.

## Related

- `motion-master-api` — the HTTP API and the block library.
- `pixelfx` — small reusable effects: wipes, dissolves, impacts, counters.

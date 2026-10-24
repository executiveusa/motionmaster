# 15 — The sound

**Status:** built. The library, the tools, the shelf on the site, and a film that carries sound.

---

## What was asked

> Add the sound effect options and build it in so humans and AI agents can reason over them and use them in the motion. Its own buttons and user interface, built from these three sources: Openverse, clipwing's real-sfx skill, and earshot.

The test of that is not "there is a sound page". It is: **can a person click a button, and can an agent ask for the same thing in words, and does the sound end up in the film?**

---

## The three sources, and why they are different on purpose

| source | what it gives | how | licence |
|---|---|---|---|
| **earshot** (Leon Lin) | 252 sounds that are **recipes — code, not recordings** | the bank is JSON; `scripts/render-earshot.py` renders each one | MIT |
| **uisfx** (via Clipwing's real-sfx skill) | 936 interface sounds: 78 semantic cues × 12 timbres | vendored from the skill's own `vendor/` | MIT code, **CC0-1.0 audio** |
| **Openverse** | real recordings of openly licensed audio, from many providers | the public API, `api.openverse.org` | per item, recorded on every sound |

1,465 sounds in one index. Each one carries what it sounds like, when it belongs, how it is shaped, and what licence it is under.

### Why three

They fail in different ways, which is exactly why they are worth having together:

- **earshot** knows *what a sound is for* — "a short sub hit with a kick, on a cut (0.2–0.5 s)" — and can be re-rendered at another length or pitch, because the catalogue keeps the recipe.
- **uisfx** knows *what a sound means* — 78 semantic cues, each with a category and a description: `hover` is "fine-pointer discovery without commitment"; `drag-start` is "an object is picked up".
- **Openverse** is *real*: cloth, motors, rooms, people. Tagged, licensed and attributed, but not designed.

---

## The vocabulary — the reason it works for both

Every sound in the library is given a **canonical kind**: `whoosh`, `hit`, `impact`, `confirm`, `error`, `type`, `pick`, `toggle`, `hover`, `notify`, `swish`, `sweep`, `drop`, `knock`, `tap`, `pop`, `glitch`, `riser`, `shimmer`, `note`, `sting`, `drip`, `shutter`, `drag`, `open`, `close`, `start`, `stop`, `progress`, `media`, `undo`, `transition`, `foley`, `zap`, `other`.

Thirty-five kinds, and each one says what it means in words:

> `whoosh` — a fast move through air; a whip pan, a fly-in
> `confirm` — accepted, done, successful; the good ending
> `reveal`-grade sounds land *after* the cut, so the ear follows the eye

**Those are the buttons on the site and the words the agent searches with.** A sound found by clicking and a sound found by asking land in the same place. The source's own label is kept as well, because `toggle-on` is more precise than `toggle`.

### The line an agent reads

Every sound carries one plain-language line, assembled from the facts:

> `whoosh: a fast move through air — a whip pan, a fly-in; for whip pans, fast fly-ins, element moves; 0.80 s; attack 12 ms; brightness 1800 Hz; timbre cinematic`

That line is what the search runs over. It is why "a short bright pop for a button" finds the pop.

### The search scores rather than filters

A person asking for "a short bright pop for a button" is not going to use the catalogue's words. So the words that only join the sentence together are ignored, the rest are scored, and the closest sounds come first — with the words that matched reported, so the caller can see how close an answer is.

```
"a short bright pop for a button"  → pop:cartoon-pop-or-drip        matched: short, bright, pop
"a deep hit for the big reveal"     → hit:movie-trailer-boom         matched: deep, hit, big
"a whoosh that lands on the cut"    → whoosh:swipe-whoosh           matched: whoosh, cut
```

---

## The shelf — the site's own buttons

A new section, `#sound`, with its own vocabulary:

- a row of **kind buttons** — the whole vocabulary, each with its count, each explaining itself on hover
- a **source** filter: made in code / interface / recorded
- a **search box** that takes a sentence
- one row per sound: a **play button**, its title, its kind, its measured shape (length, attack, brightness), where it came from, its licence, and a **copy button** for its id
- nothing is fetched until a sound is played

The page keeps its rules: no emoji, no indigo, mono for every machine value, the buttons are the same rectangle as everywhere else.

---

## The kit — sounds in the motion

A film's sound is a **kit**: takes with a time, a level, a role and a reason.

```json
{ "id": "whoosh:melee-combat-whoosh", "atSeconds": 4.06, "level": 0.5, "role": "reveal",
  "reason": "Something arrives. The move lands just after the cut, so the ear follows the eye." }
```

The grammar is written out so it can be argued with:

| the picture is doing | the ear gets | level | why |
|---|---|---|---|
| `setup` | swish, whoosh, riser | 0.22 | a light move leads in without announcing anything |
| `reveal` | whoosh, sweep, hit, impact | 0.50 | the move lands just after the cut |
| `develop` | tap, click, pop, note | 0.24 | a small sound marks the step without taking over |
| `resolve` | note, confirm, shimmer | 0.38 | a tone closes the phrase |
| `hold` | shimmer | 0.14 | silence would do; a breath of texture is kinder |
| `exit` | sting, sweep, note | 0.55 | the sound ends the film rather than stopping it |

`render_film` plans the kit from the shot list when the caller does not supply one, writes one `<audio>` element per take into the composition, copies the files into the project's own `assets/`, and mixes them in.

**The gate checked the first one and rejected it** — `data-end` is deprecated and must not disagree with `data-duration`. That is the gate doing exactly its job on audio it had never been asked about.

---

## The tools

| tool | what it is for |
|---|---|
| `list_sfx_kinds` | the vocabulary, with what each kind means and how many sounds are in it |
| `browse_sfx` | filter by kind, source, timbre, tag, length |
| `search_sfx` | search in words; returns the closest and says which words matched |
| `get_sfx` | one sound in full, including the recipe when it is code |
| `plan_sound` | put sound under a storyboard; returns a kit with reasons |

Nineteen tools become twenty-four.

---

## The level reference

A library where one file is at -6 dBFS and the next at -30 has no use: the mix decides how loud a sound is, not the file. Every sound is normalised to **-1 dBFS peak** — the reference earshot's own bank uses — and its measured level is written into `library/sfx-levels.json`.

Peak, not integrated loudness: most of these are a tenth of a second long, and an integrated reading over a tenth of a second is a number about the gate, not about the sound.

### mp3, not WAV

earshot's bank is **code**, so the WAV is a master and the catalogue keeps the **recipe** — the render function, its parameters and its seed. What ships is the mp3: a fifth of the bytes (23 MB of WAV became 4.5 MB of mp3), and the browser plays it without a decoder. The same sound can be re-rendered at another length or pitch whenever it is wanted.

---

## Verified

| | |
|---|---|
| MCP suite | **65/65** (10 new sound tests) |
| Tool harness | **44/44** (12 new sound checks) |
| Sound tests | every sound has a licence, a file and a line an agent can read; every kind button leads to sounds; a plain question finds the right sound; a kit puts a sound on every beat, timed against the beat |
| A film with sound | `acme-sound-final` — 10.2 s, 1920×1080, h264 **+ AAC 48 kHz stereo**, three takes placed against the cuts |

The mix, measured on the finished film:

| | at the cut | loudness | peak |
|---|---|---|---|
| the setup — a soft swish | 0.00 s | -34.0 LUFS | -14.5 dBFS |
| the reveal — a fast whoosh | 4.06 s | -23.4 LUFS | -8.3 dBFS |
| the exit — a logo sting | 8.00 s | -18.7 LUFS | -6.5 dBFS |

The level rises through the film, which is the grammar working, and the loudest point keeps six decibels of headroom for the music bed that is not there yet.

---

## What is not done

- **The search is lexical.** It scores words over the catalogue's plain-language line. It does not understand "the same sound as the button click but heavier" — that needs embeddings, or earshot's own model, which needs torch and a model download.
- **The kit is one take per beat.** A real mix stacks: a low impact under a whoosh, a riser under a build. The grammar has one slot per role.
- **Openverse is a snapshot.** 282 sounds fetched with 33 requests against a 200-a-day anonymous limit. The vocabulary can be widened; the script takes a list of terms.
- **No ducking.** A film with a music bed needs the effects to sit under the voice; there is no music bed in the generated films yet.
- **The search is lexical, and the kit is one take per beat.** Both are stated above.
- **Openverse's rate limit is 200 requests a day** for an anonymous client. The fetch used 33 of them. Widening the vocabulary costs one request per term.

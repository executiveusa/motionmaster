# Motion Master Studio

**This folder is the studio. An agent of any kind can drive it by reading the
files, with no API and no plugin.**

Every folder here does one job. Numbering is the order. A `CONTEXT.md` in a
folder says what that folder reads, what it does, what it writes and what a
person checks. State is the files on disk. Nothing is hidden in a database or
a framework.

## The map

| where | what it is |
|---|---|
| `_shared/` | the factory: the rules that do not change between runs |
| `_templates/` | the stamps: a new campaign is a copy, not a blank page |
| `_index/log.md` | the catalog: one line per campaign |
| `01_meta-ad/` | a paid social ad, made for a Meta placement |
| `02_brand-film/` | a brand film or commercial |
| `03_cutdown/` | cut a recording or a film into short pieces |
| `04_explainer/` | a technical diagram that draws itself |
| `records/` | one folder per brand: its kit, its voice, its campaigns |

## Where do I go for task X

| the task | the folder |
|---|---|
| a Facebook, Instagram or Reels ad | `01_meta-ad/` |
| a brand film, a launch film, a commercial | `02_brand-film/` |
| cut a video into shorts, remove silences or mistakes | `03_cutdown/` |
| an architecture diagram, a concept explainer | `04_explainer/` |
| a new brand or client | `records/<brand>/` — copy `_templates/campaign/` |
| the house look, the type, the motion rules | `_shared/house-style.md` |
| Meta's sizes, safe zones and character limits | `_shared/ad-specs.md` |
| how to write the words | `_shared/copy-rules.md` |

## The rules that hold everywhere

1. **The gate is hard.** A render that fails it is not finished; it is
   failed. The house gate checks contrast, the type floor, occlusion,
   overlap, the motion budget and the first frame.
2. **Meta's numbers come from Meta.** The placements, the safe zones and the
   character limits live in `_shared/ad-specs.md` with the date they were
   read. Do not guess a size.
3. **One accent, one thing at a time.** The accent marks, it does not
   decorate. Never more than eight per cent of a frame.
4. **Words live in the platform.** The creative carries the brand. The
   primary text and the headline live in the ad's JSON.
5. **Never fabricate.** No invented numbers, no invented logos, no invented
   statistics. If a fact is not in the brief, ask.

## The tools

The same studio is behind the MCP server and the HTTP API, if you would
rather drive it that way:

```bash
cd mcp && npm start          # the server, on http://127.0.0.1:8787/mcp
curl http://127.0.0.1:8787/api/v1/meta/placements
```

Both give the same tools the folders do. The folders are the interface; the
API is the shortcut.

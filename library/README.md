# The motion library

Nine open-source collections, normalised into one index, plus the HyperFrames
block library. Built by `node scripts/build-library.mjs`; the output is
`library/catalogue.json` and `library/blocks.json`.

| | |
| --- | --- |
| Items | 3,988 |
| Collections | 9 |
| Categories | 756 |
| Motion blocks | 448 |

## How to use it

**As an agent**, over MCP:

```
list_library_collections   the nine collections, with licences
list_library_categories     every category, with counts
browse_library             search and filter; returns prompts with author and licence
get_library_item           one item in full
list_motion_blocks         the 448 installable HyperFrames components
enhance_prompt             turn a weak brief into a complete one
```

**As a human**, on the landing page, under **The library**.

**As code**, import `library/catalogue.json` directly. Every item has the same
shape:

```ts
{
  id: string;            // "<collection>:<local-id>"
  collection: string;
  kind: "prompt" | "style" | "skill" | "case";
  title: string;
  titleZh: string;
  summary: string;
  prompt: string;         // the usable text
  partial: boolean;       // the source says this is a fragment
  categories: string[];
  tags: string[];
  author: string;
  source: string;         // the original post
  tools: string[];
  metrics: Record<string, unknown>;
  license: string;        // carried on every single item
}
```

## The collections

| id | items | licence | upstream |
| --- | --- | --- | --- |
| `hiapi-styles` | 437 | CC-BY-4.0 | github.com/HiAPIAI/awesome-opus-5-5-video-styles |
| `leadde-prompts` | 728 | all rights reserved (no licence file) | github.com/LeaddeOpenLab/awesome-opus-5-5-video-prompts |
| `lian-verified` | 334 | CC-BY-4.0 | github.com/Li-Evan/awesome-opus-5.5-video-prompts |
| `maning-prompts` | 389 | custom, non-OSI | github.com/maning636/motion-prompts |
| `cindy-prompt-bank` | 58 | CC BY-NC-SA 4.0 | github.com/cindyxu1030/motion-graphics-prompt-bank |
| `zhuyansen-skills` | 333 | CC0-1.0 | github.com/zhuyansen/awesome-claude-video-skills |
| `phy-playbook` | 233 | CC-BY-4.0 | github.com/PHY041/claude-motion-playbook |
| `guanmo-ai-motion` | 1,417 | MIT | github.com/guanmo-ai/awesome-ai-motion |
| `lemo-opuscar` | 59 | MIT + CC BY 4.0 | github.com/lemomo-ai/lemo-opuscar |

`library/collections/<id>/` holds the vendored source data and each collection's
licence file. No media is vendored: two of the upstream repositories are more
than 90% video and none of it is usable in a product.

## The licence rule

Every item carries its own licence, so nothing can move into a shipped product
without reading its own licence first.

**Safe to redistribute:** `hiapi-styles` (attribution required), `lian-verified`
(attribution required), `phy-playbook` (attribution required), `guanmo-ai-motion`
(MIT), `lemo-opuscar` (MIT + CC BY 4.0), `zhuyansen-skills` (CC0).

**Not safe to redistribute without a change:** `maning-prompts` (forbids
repackaging and re-uploading), `cindy-prompt-bank` (non-commercial),
`leadde-prompts` (no licence file — all rights reserved).

Motion Master is not on sale at the moment, so the last group is in use
in-house. That is a use, not a redistribution.

## Rebuilding

```
node scripts/build-library.mjs              # vendor + normalise
node site/scripts/sync-library.mjs          # the browser payload
node site/scripts/sync-library.mjs --check  # fail if the payload is stale
```

The build needs the upstream repositories cloned to `../.research/libs` by
default; pass `--src <dir>` to point it somewhere else. It is deterministic —
run it twice and the bytes are the same.

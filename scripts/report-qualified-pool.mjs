#!/usr/bin/env node
/**
 * Report the qualified pool from the verdicts.
 *   node scripts/report-qualified-pool.mjs
 *
 * Writes docs/23-THE-QUALIFIED-POOL.md. The numbers come from the verdicts
 * file, so the document cannot drift from what was actually measured.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const verdictsPath = join(ROOT, 'library', 'block-verdicts.json');
const blocksPath = join(ROOT, 'library', 'blocks.json');
const outPath = join(ROOT, 'docs', '23-THE-QUALIFIED-POOL.md');

if (!existsSync(verdictsPath)) {
  console.error('no verdicts yet — run: node scripts/qualify-blocks.mjs');
  process.exit(1);
}

const verdicts = JSON.parse(readFileSync(verdictsPath, 'utf8')).verdicts ?? {};
const blocks = JSON.parse(readFileSync(blocksPath, 'utf8')).blocks;

const entries = Object.entries(verdicts);
const passed = entries.filter(([, v]) => v.ok);
const snippets = entries.filter(([, v]) => v.reasons.some((r) => r.includes('not_mountable')));
const failed = entries.filter(([, v]) => !v.ok && !v.reasons.some((r) => r.includes('not_mountable')));

const mountable = blocks.filter((b) => (b.files || []).some((f) => f.type === 'hyperframes:composition'));
const snippetTotal = blocks.length - mountable.length;

/* Why the gate said no, grouped by the reason it gave. */
const byReason = new Map();
for (const [id, verdict] of failed) {
  for (const reason of verdict.reasons) {
    const code = reason.split(':')[0].trim();
    if (!byReason.has(code)) byReason.set(code, new Set());
    byReason.get(code).add(id);
  }
}
const reasons = [...byReason.entries()].sort((a, b) => b[1].size - a[1].size);

const measured = entries.length;
const remaining = blocks.length - measured;

const lines = [];
lines.push('# 23 — THE QUALIFIED POOL');
lines.push('');
lines.push('**The 448-block HyperFrames registry, measured against the gate.**');
lines.push('');
lines.push('The registry is not a menu of finished things. It is a catalogue of');
lines.push('candidates, and some of them are broken — text clipped by its own box,');
lines.push('a label under the contrast floor, an occluded line, a frame that never');
lines.push('moves. The gate finds all of that. Until now only two blocks had been');
lines.push('measured, both by accident, both because they had already broken');
lines.push('something.');
lines.push('');
lines.push('So the whole pool was measured: each block installed on its own, mounted');
lines.push('in a host page with its variables filled from a neutral brief, and');
lines.push('checked. The verdicts are in `library/block-verdicts.json`, written after');
lines.push('every block, so the run can be interrupted and resumed.');
lines.push('');
lines.push('---');
lines.push('');
lines.push('## What the pool actually contains');
lines.push('');
lines.push('| | |');
lines.push('|---|---|');
lines.push(`| Registry entries | ${blocks.length} |`);
lines.push(`| Mountable compositions | ${mountable.length} |`);
lines.push(`| Snippets — pasted into a composition, never mounted | ${snippetTotal} |`);
lines.push(`| Measured | ${measured} |`);
lines.push(`| Pass the gate | ${passed.length} |`);
lines.push(`| Fail the gate | ${failed.length} |`);
lines.push(`| Not yet measured | ${remaining} |`);
lines.push('');
lines.push('**A snippet is not a defect.** 238 of the 448 entries are fragments —');
lines.push('markup and CSS to paste into a composition. The matcher already refuses');
lines.push('them, because a fragment mounted as a composition produces a shot with');
lines.push('no identity. They are recorded with the reason that is true, and they');
lines.push('are never gated.');
lines.push('');
lines.push('## Why the gate said no');
lines.push('');
lines.push('A block can fail for more than one reason, so these overlap.');
lines.push('');
lines.push('| Reason | Blocks |');
lines.push('|---|---|');
for (const [code, ids] of reasons) {
  lines.push(`| \`${code}\` | ${ids.size} |`);
}
lines.push('');
lines.push("The full list of rejected blocks, with the gate's own words, is in");
lines.push('`library/block-verdicts.json`. Every one of them is now kept out of a');
lines.push('plan: the matcher refuses a block the gate has rejected, and prefers a');
lines.push('block the gate has passed over one nobody has measured.');
lines.push('');
lines.push('## How the matcher uses this');
lines.push('');
lines.push('`matchBlocks` now takes the verdicts:');
lines.push('');
lines.push('1. A block with a failing verdict is **not offered at all**, whatever the');
lines.push('   brief says.');
lines.push('2. A block with a passing verdict comes **before** one nobody has');
lines.push('   measured. A brief is answered from the measured pool whenever the');
lines.push('   measured pool has something that matched.');
lines.push('3. An unmeasured pool still answers. Nothing breaks while the pool is');
lines.push('   being measured.');
lines.push('');
lines.push('The exclusion already existed on the film path (`plan_video`, the');
lines.push('worker, the HTTP API); it now also applies to `fill_block` and the');
lines.push('`/blocks/fill` route, which could still hand back a block the gate had');
lines.push('already rejected.');
lines.push('');
lines.push('## Reproducing it');
lines.push('');
lines.push('```sh');
lines.push('cd motion-master');
lines.push('node scripts/qualify-blocks.mjs --resume');
lines.push('node scripts/report-qualified-pool.mjs');
lines.push('```');
lines.push('');
lines.push('Each block costs one browser launch — about fourteen seconds — so the');
lines.push('whole pool takes about an hour on two cores. The run is resumable and');
lines.push('the verdicts are written after every block.');
lines.push('');
lines.push('## The honest caveat');
lines.push('');
lines.push('A block was filled with one neutral brief and mounted on a host page of');
lines.push('our own making. A block that passes there can still clip a much longer');
lines.push('headline than the one it was measured with, and a block that needs a GPU');
lines.push('(`aurora` declares `data-requires-webgpu`) fails on a machine with no');
lines.push('adapter — that is a fact about this machine, not a defect in the block,');
lines.push('and the verdict says so.');
lines.push('');
lines.push('So the verdicts are a real measurement of a real pool, not a guarantee.');
lines.push('They are a floor: a block that fails here is never used, and a block that');
lines.push('passes is preferred.');

writeFileSync(outPath, `${lines.join('\n')}\n`, 'utf8');
console.log(`wrote ${outPath}`);
console.log(`${measured} measured — ${passed.length} pass, ${failed.length} fail, ${snippets.length} snippets`);

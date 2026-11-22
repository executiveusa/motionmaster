#!/usr/bin/env node
/**
 * Map the blocks that passed the gate to the shot roles they can serve.
 *
 *   node scripts/map-block-roles.mjs
 *
 * The shot vocabulary has ten roles and the block pool has 448 entries. A
 * film is a sequence of roles — an opening, some typography, a camera move, a
 * number, an end — and each of those wants a block that can actually do it.
 *
 * Until now the two systems never met: the matcher scored blocks against the
 * wording of the brief and nothing else, so a brief that asked for a camera
 * move could be answered with a chart.
 *
 * This builds the bridge from the real registry tags. The table below is
 * ours — it is a judgement about what a tag means in a film — and it is
 * written down here rather than hidden in the matcher, so it can be argued
 * with. Only blocks that passed the gate are mapped: a block that clips its
 * own text cannot serve any role well.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const blocksPath = join(ROOT, 'library', 'blocks.json');
const verdictsPath = join(ROOT, 'library', 'block-verdicts.json');
const outPath = join(ROOT, 'library', 'block-roles.json');

/**
 * The ten roles, and the tags that serve each one.
 *
 * A tag is matched with `includes`, so `title-card` also matches
 * `carousel-title-card`. The lists are deliberately not exhaustive: a role
 * with a loose tag serves everything, and a role with a tight tag serves
 * only what it means.
 */
const ROLE_TAGS = {
  opening: ['title-card', 'logo', 'intro', 'hero', 'title', 'opening', 'two-headlines'],
  typography: ['typography', 'kinetic-text', 'code-animation', 'handwritten', 'write-on', 'title-card', 'bold', 'two-headlines', 'highlight'],
  camera: ['camera', 'depth', 'turntable', '3d-object', '3d-motion', 'camcorder', 'webgl', 'travel', 'map', 'three-js', 'orbit', 'path', 'cinematic'],
  data: ['data', 'chart', 'statistics', 'data-viz', 'instrument', 'ranking', 'count', 'diff', 'diagram'],
  effects: ['effect', 'vfx', 'light-leak', 'flash', 'particles', 'starfield', 'snow', 'cinemagraph', 'optical', 'liquid', 'displacement', 'shader', 'glow'],
  interaction: ['mock-ui', 'chat', 'share-sheet', 'instagram', 'tiktok', 'spotify', 'youtube', 'ad-template', 'creator', 'avatar', 'promotion', 'social', 'showcase', 'ai'],
  'ui-entrance': ['mock-ui', 'overlay', 'hud', 'carousel', 'gallery', 'lower-third', 'speech-bubble', 'background', 'media-treatment-overlay'],
  rhythm: ['carousel', 'orbit', 'path', 'beat-driven', 'music', 'loop', 'loopable', 'scroll', 'morph', 'refactor', 'split'],
  transition: ['transition', 'wipe', 'flip', 'tiles', 'dissolve', 'morph', 'freeze-frame', 'cutout', 'code-slice'],
  outro: ['logo', 'title-card', 'promotion', 'ad-template', 'showcase', 'brand', 'end'],
};

const blocks = JSON.parse(readFileSync(blocksPath, 'utf8')).blocks;
const verdicts = JSON.parse(readFileSync(verdictsPath, 'utf8')).verdicts ?? {};

const roles = {};
const uncovered = [];
for (const block of blocks) {
  const verdict = verdicts[block.id];
  if (!verdict || !verdict.ok) continue;
  const tags = block.tags ?? [];
  const served = Object.entries(ROLE_TAGS)
    .filter(([, wanted]) => tags.some((tag) => wanted.some((w) => tag.includes(w))))
    .map(([role]) => role);
  if (!served.length) {
    uncovered.push(block.id);
    continue;
  }
  roles[block.id] = served;
}

const byRole = {};
for (const [id, served] of Object.entries(roles)) {
  for (const role of served) {
    byRole[role] = (byRole[role] ?? 0) + 1;
  }
}

writeFileSync(outPath, `${JSON.stringify({
  generated: 'scripts/map-block-roles.mjs',
  note:
    'Which shot roles each gate-passing block can serve, read from its registry tags. The ' +
    'matcher prefers a block that fits the role of the shot it is filling. A block that ' +
    'failed the gate is not here.',
  roles,
}, null, 2)}\n`, 'utf8');

console.log(`${Object.keys(roles).length} blocks mapped to roles`);
for (const [role, count] of Object.entries(byRole).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(count).padStart(3)}  ${role}`);
}
if (uncovered.length) {
  console.log(`\n${uncovered.length} passing blocks serve no role: ${uncovered.join(', ')}`);
}
console.log(`\nwrote ${outPath}`);

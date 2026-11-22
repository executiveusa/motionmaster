#!/usr/bin/env node
/**
 * import-video-repos.mjs — vendor the two video repos worth having.
 *
 * Both were pointed at by "10 GitHub Repos to 10x Your AI Motion Graphics"
 * (Matt Penny, Applied AI). We take the knowledge, not the sample galleries
 * and render output — a skill is a document an agent reads; a 66 MB video
 * gallery is not.
 *
 *   video-shotcraft (Apache-2.0)  124 shot recipe cards, beat sync, sound design
 *   pixelfx        (MIT)         244 pixel-art effects, each a small piece of code
 *
 * Every imported file keeps its upstream licence and attribution. The plugin
 * is a commercial product; the upstream work stays under its own terms.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = '/workspace/.research';
const DST = '/workspace/motion-master/plugins/motion-master/skills';

const IMPORTS = [
  {
    repo: 'video-shotcraft',
    name: 'shotcraft',
    licence: 'Apache-2.0',
    author: 'Vincentwei1021',
    url: 'https://github.com/Vincentwei1021/video-shotcraft',
    // The cards are the point; the template, gallery and demo videos are not.
    take: [
      ['LICENSE', 'LICENSE'],
      ['README.md', 'references/UPSTREAM-README.md'],
      ['SKILL.md', 'references/UPSTREAM-SKILL.md'],
      ['references/shots', 'references/shots'],
      ['references/music-beat-sync.md', 'references/music-beat-sync.md'],
      ['references/sound-design.md', 'references/sound-design.md'],
      ['references/sfx-sourcing.md', 'references/sfx-sourcing.md'],
      ['references/aesthetic-rules.md', 'references/aesthetic-rules.md'],
    ],
  },
  {
    repo: 'pixelfx',
    name: 'pixelfx',
    licence: 'MIT',
    author: 'patch-gg',
    url: 'https://github.com/patch-gg/pixelfx',
    // The effects are code an agent can compose with. The gallery is a browser app.
    take: [
      ['LICENSE', 'LICENSE'],
      ['NOTICE.md', 'NOTICE.md'],
      ['skills/pixelfx/SKILL.md', 'SKILL.md'],
      ['src', 'src'],
      ['docs/CATALOG.md', 'docs/CATALOG.md'],
      ['docs/AUTHORING.md', 'docs/AUTHORING.md'],
    ],
  },
];

function copy(from, to) {
  if (!existsSync(from)) throw new Error(`missing upstream path: ${from}`);
  mkdirSync(join(to, '..'), { recursive: true });
  cpSync(from, to, { recursive: true });
}

function countFiles(dir) {
  let n = 0;
  let bytes = 0;
  const walk = (d) => {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry);
      if (statSync(full).isDirectory()) walk(full);
      else {
        n += 1;
        bytes += statSync(full).size;
      }
    }
  };
  if (existsSync(dir)) walk(dir);
  return { n, bytes };
}

for (const imp of IMPORTS) {
  const from = join(SRC, imp.repo);
  const to = join(DST, imp.name);
  if (!existsSync(from)) {
    console.error(`skip ${imp.name}: ${from} is not cloned`);
    continue;
  }
  mkdirSync(to, { recursive: true });
  for (const [a, b] of imp.take) copy(join(from, a), join(to, b));

  const upstream = `# Upstream

${imp.name} is imported from **${imp.url}**.

- Licence: ${imp.licence}
- Author: ${imp.author}
- Imported: 2026-11-10

The upstream licence file is included in this directory and applies to every file
imported from it. Attribution is kept intact.

Only the knowledge ships: the reference material and the source code. The
upstream sample galleries, demo videos and render output are not vendored.
`;
  writeFileSync(join(to, 'UPSTREAM.md'), upstream);

  const size = countFiles(to);
  console.log(
    `${imp.name.padEnd(10)} ${String(size.n).padStart(4)} files  ${(size.bytes / 1024).toFixed(0).padStart(6)} KB  ${imp.licence}`,
  );
}

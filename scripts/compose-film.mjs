#!/usr/bin/env node
/**
 * compose-film.mjs — build a real film from a brief.
 *
 *   node scripts/compose-film.mjs "<brief>" [--out <dir>] [--shots 3] [--render]
 *
 * The brief is turned into a shot list of HyperFrames blocks — real motion
 * components that already work — with their variables filled from the brief
 * and the Motion Master tokens. The blocks are installed, mounted in one host
 * composition, checked with the HyperFrames gate, and (with --render) encoded
 * to an MP4.
 *
 * The point is that the block knows how the motion behaves. The brief only
 * has to say what the film is about.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, cpSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : dflt;
};

const brief = argv.find((a) => !a.startsWith('--') && argv[argv.indexOf(a) - 1]?.startsWith('--') !== true);
if (!brief) {
  console.error('usage: compose-film.mjs "<brief>" [--out <dir>] [--shots 3] [--render]');
  process.exit(1);
}

const outDir = resolve(ROOT, opt('out', 'generator/films/film'));
const shotCount = Number(opt('shots', 3));
const shouldRender = flag('render');
const FPS = Number(opt('fps', 30));

/* ---------------------------------------------------------- the motion core */

const { matchBlocks, fillBlock, headlineFrom } = await import(
  join(ROOT, 'mcp', 'dist', 'blocks.js')
).catch(async () => {
  // The MCP package may not be built; build it on demand.
  execFileSync('npm', ['run', 'build'], { cwd: join(ROOT, 'mcp'), stdio: 'inherit' });
  return import(join(ROOT, 'mcp', 'dist', 'blocks.js'));
});

const blocksFile = JSON.parse(readFileSync(join(ROOT, 'library', 'blocks.json'), 'utf8'));
const tokens = JSON.parse(
  readFileSync(join(ROOT, 'plugins', 'motion-master', 'assets', 'motion-tokens.json'), 'utf8'),
);

/* ---------------------------------------------------------------- the shots */

const matched = matchBlocks(blocksFile, brief, { limit: shotCount * 5, requireVariables: true });
if (!matched.length) {
  console.error('No block matched that brief. Try naming a look: title card, kinetic type, transition, product demo, data.');
  process.exit(1);
}

const chosen = [];
const usedFamilies = new Set();
for (const candidate of matched) {
  if (chosen.length >= shotCount) break;
  const family = candidate.block.id.replace(/-\d+$/, '');
  if (usedFamilies.has(family)) continue;
  usedFamilies.add(family);
  chosen.push(candidate.block);
}

const headline = headlineFrom(brief);
const shots = chosen.map((block, index) => {
  const filled = fillBlock(block, { brief, tokens, headline });
  // A block and a component install to different places. The registry says
  // where, so ask it rather than assuming.
  const composition = block.files.find((f) => f.type === 'hyperframes:composition') ??
    block.files.find((f) => f.path.endsWith('.html'));
  return {
    index,
    id: block.id,
    title: block.title,
    src: composition?.target ?? `compositions/${block.id}.html`,
    duration: block.duration ?? 5,
    dimensions: block.dimensions ?? { width: 1920, height: 1080 },
    values: filled.values,
    unresolved: filled.unresolved,
    // A block's text colour falls back to near-white, so it assumes a dark
    // ground. Some blocks declare their own; the rest need the player's.
    ground:
      (typeof filled.values.background === 'string' && filled.values.background) ||
      (typeof filled.values.bg === 'string' && filled.values.bg) ||
      (typeof filled.values.ground === 'string' && filled.values.ground) ||
      tokens.palette.playerZone,
  };
});

/* ------------------------------------------------------------ the project */

if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

// Install the blocks. They bring their own assets.
for (const shot of shots) {
  execFileSync(
    'npx',
    ['--yes', 'hyperframes@0.8.186', 'add', shot.id, '--dir', outDir, '--no-clipboard'],
    { stdio: ['ignore', 'ignore', 'inherit'] },
  );
}

/*
 * Local GSAP, so the render never depends on a CDN being reachable — and so a
 * render is reproducible. The upstream blocks load GSAP from jsdelivr; in a
 * sandbox whose certificate authority is not trusted, that request fails and
 * the whole film comes out broken.
 */
const gsap = join(ROOT, 'generator', 'vendor', 'gsap-3.14.2.min.js');
if (existsSync(gsap)) {
  cpSync(gsap, join(outDir, 'gsap-3.14.2.min.js'));
  const compositions = join(outDir, 'compositions');
  const stack = existsSync(compositions) ? [compositions, join(compositions, 'components')] : [];
  let rewritten = 0;
  for (const dir of stack) {
    if (!existsSync(dir)) continue;
    // The path is relative to the block's own directory: a block in
    // compositions/ is one level down, one in compositions/components/ is two.
    const depth = dir.endsWith('components') ? '../../' : '../';
    for (const name of readdirSync(dir)) {
      if (!name.endsWith('.html')) continue;
      const file = join(dir, name);
      const before = readFileSync(file, 'utf8');
      const after = before.replace(
        /<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/gsap@[^"]*"><\/script>/g,
        `<script src="${depth}gsap-3.14.2.min.js"></script>`,
      );
      if (after !== before) {
        writeFileSync(file, after);
        rewritten += 1;
      }
    }
  }
  if (rewritten) console.log(`localised GSAP in ${rewritten} block files`);
}

const total = shots.reduce((sum, s) => sum + s.duration, 0);
let cursor = 0;

const mounts = shots
  .map((shot) => {
    const start = cursor;
    cursor += shot.duration;
    const values = Object.fromEntries(
      Object.entries(shot.values).filter(([, v]) => v !== null && v !== undefined),
    );
    return `      <div
        id="${shot.id}"
        data-composition-id="${shot.id}"
        data-composition-src="${shot.src}"
        data-start="${start}"
        data-duration="${shot.duration}"
        data-track-index="${shot.index + 1}"
        data-width="${shot.dimensions.width}"
        data-height="${shot.dimensions.height}"
        data-variable-values='${JSON.stringify(values).replace(/'/g, '&#39;')}'
        style="position: absolute; inset: 0; background: ${shot.ground};"
      ></div>`;
  })
  .join('\n');

const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" width="1920" height="1080" />
    <title>${headline}</title>
    <script src="./gsap-3.14.2.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      /* The host's ground is the player's, not a brand colour: a block that
         does not declare its own assumes a dark ground. */
      html, body { margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: ${tokens.palette.playerZone}; }
      #root { position: relative; width: 100%; height: 100%; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${total}" data-width="1920" data-height="1080">
${mounts}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = gsap.timeline({ paused: true });
      window.__timelines["main"].seek(0);
    </script>
  </body>
</html>
`;

writeFileSync(join(outDir, 'index.html'), indexHtml);

writeFileSync(
  join(outDir, 'hyperframes.json'),
  `${JSON.stringify(
    {
      $schema: 'https://hyperframes.heygen.com/schema/hyperframes.json',
      registry: 'https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry',
      paths: { blocks: 'compositions', components: 'compositions/components', assets: 'assets' },
      media: { autoProxy: false },
    },
    null,
    2,
  )}\n`,
);

writeFileSync(
  join(outDir, 'brief.json'),
  `${JSON.stringify({ brief, headline, shots, generated: 'scripts/compose-film.mjs' }, null, 2)}\n`,
);

/* ------------------------------------------------------------------ report */

console.log(`\nbrief:    ${brief}`);
console.log(`headline: ${headline}`);
console.log(`duration: ${total}s at ${FPS}fps\n`);
for (const shot of shots) {
  const unresolved = shot.unresolved.length ? ` — ${shot.unresolved.length} unresolved` : '';
  console.log(`  ${shot.index + 1}. ${shot.id.padEnd(28)} ${String(shot.duration).padStart(5)}s  ${shot.title}${unresolved}`);
  for (const u of shot.unresolved) console.log(`       · ${u.id}: ${u.reason}`);
}
console.log(`\nproject:  ${outDir}`);

if (shouldRender) {
  const script = join(ROOT, 'generator', 'render.sh');
  console.log('\nrunning the gate…');
  execFileSync(
    'npx',
    ['--yes', 'hyperframes@0.8.186', 'check', outDir],
    { stdio: 'inherit', env: { ...process.env } },
  );
  console.log('\nrendering…');
  execFileSync(script, [outDir, join(outDir, 'film.mp4'), '-f', String(FPS), '-q', 'delivery'], {
    stdio: 'inherit',
  });
  console.log(`\nfilm: ${join(outDir, 'film.mp4')}`);
}

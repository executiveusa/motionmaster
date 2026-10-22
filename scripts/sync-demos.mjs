#!/usr/bin/env node
/**
 * Copy the three demo films and their posters into the site, and web-encode
 * them. The masters in demos/ are large and lossless; the site gets the
 * encoded versions.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = '/workspace/motion-master';
const OUT = join(ROOT, 'site/public/demos');
mkdirSync(OUT, { recursive: true });

const DEMOS = [
  { id: 'blueprint', src: 'demos/blueprint/blueprint.mp4', posterAt: 26 },
  { id: 'ink', src: 'demos/ink/ink.mp4', posterAt: 17 },
  { id: 'whiteboard', src: 'demos/whiteboard/whiteboard.mp4', posterAt: 25 },
];

for (const d of DEMOS) {
  const master = join(ROOT, d.src);
  if (!existsSync(master)) {
    console.log(`  skip ${d.id} — ${d.src} not rendered yet`);
    continue;
  }
  const out = join(OUT, `${d.id}.mp4`);
  execFileSync('ffmpeg', [
    '-v', 'error', '-nostdin', '-y', '-i', master,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '25',
    '-maxrate', '1800k', '-bufsize', '3600k',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    out,
  ]);
  execFileSync('ffmpeg', [
    '-v', 'error', '-nostdin', '-y', '-ss', String(d.posterAt), '-i', master,
    '-vframes', '1', '-vf', 'scale=1280:-1', '-q:v', '4',
    join(OUT, `${d.id}.jpg`),
  ]);
  console.log(
    `  ${d.id.padEnd(10)} ${(statSync(master).size / 1024 / 1024).toFixed(1)} MB master -> ` +
      `${(statSync(out).size / 1024 / 1024).toFixed(1)} MB web`,
  );
}

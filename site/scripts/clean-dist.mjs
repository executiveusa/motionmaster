#!/usr/bin/env node
// clean-dist.mjs — remove the build output directory before Vite writes to it.
//
// Vite empties `dist` itself, but it cannot remove a directory that is not empty.
// On a network filesystem a file that is deleted while another process still has
// it open is kept as a `.nfs…` placeholder, which is exactly the state that
// makes `rmdir` fail with ENOTEMPTY and the build die with a message that says
// nothing about the cause.
//
// So: clear the directory ourselves, first, and if something is holding it,
// say so plainly instead of letting Vite fail cryptically later.

import { existsSync, rmSync, readdirSync, renameSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = fileURLToPath(new URL('..', import.meta.url));
const dist = join(siteRoot, 'dist');

if (!existsSync(dist)) {
  process.exit(0);
}

/*
 * Renaming the directory is the move that always works on a network
 * filesystem: a file that another process still has open is only unlinked
 * when that process lets go of it, but the directory itself can still be
 * renamed out of the way. So the old build is moved aside, the new one is
 * written into a clean `dist`, and the old one is deleted afterwards —
 * whenever the holder lets go of it.
 */
const aside = join(siteRoot, `.dist-old-${process.pid}`);
let moved = false;
try {
  renameSync(dist, aside);
  moved = true;
} catch {
  /* could not move it — fall through to the direct removal below */
}

if (moved) {
  try {
    rmSync(aside, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
  } catch {
    // Something still holds a file inside it. That is fine: the directory is
    // out of the way, the build can proceed, and the leftovers are removed on
    // the next build.
    console.warn(
      '\nNote: the previous build is still open by another process and was left at\n' +
        `  ${aside.replace(siteRoot, 'site/')}\n` +
        '  Most often this is a preview server serving the old build:\n' +
        '    pkill -f "vite preview"\n',
    );
  }
  process.exit(0);
}

try {
  rmSync(dist, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
} catch (err) {
  // Work out what is stuck, so the message can name it.
  const stuck = [];
  const walk = (dir) => {
    let entries = [];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      const full = join(dir, name);
      try {
        if (statSync(full).isDirectory()) walk(full);
        else stuck.push(full);
      } catch {
        /* raced with a deletion — ignore */
      }
    }
  };
  walk(dist);

  console.error('\nCould not clear site/dist.\n');
  if (stuck.length) {
    console.error('These files are still open by another process:');
    for (const file of stuck.slice(0, 5)) {
      console.error(`  ${file.replace(siteRoot, 'site/')}`);
    }
    if (stuck.length > 5) console.error(`  …and ${stuck.length - 5} more`);
    console.error(
      '\nMost often this is a preview server still serving the old build:\n' +
        '  pkill -f "vite preview"\n'
    );
  } else {
    console.error(String(err && err.message ? err.message : err));
  }
  process.exit(1);
}

process.exit(0);

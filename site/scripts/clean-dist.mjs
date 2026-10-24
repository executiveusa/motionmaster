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

import { existsSync, rmSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = fileURLToPath(new URL('..', import.meta.url));
const dist = join(siteRoot, 'dist');

if (!existsSync(dist)) {
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

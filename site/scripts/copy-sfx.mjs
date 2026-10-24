#!/usr/bin/env node
/**
 * copy-sfx.mjs — put the sound library into the built site.
 *
 * The audio lives once, in `library/sfx`. The site copies it into the build
 * rather than keeping a second copy of several thousand megabytes of sound
 * in the repository.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SITE = resolve(HERE, "..");
const SOURCE = resolve(SITE, "..", "library", "sfx");
const TARGET = join(SITE, "dist", "sfx");

if (!existsSync(SOURCE)) {
  console.log("no library/sfx — the site is built without sound");
  process.exit(0);
}

mkdirSync(TARGET, { recursive: true });
cpSync(SOURCE, TARGET, { recursive: true });

let files = 0;
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else files += 1;
  }
};
walk(TARGET);
console.log(`sound: ${files} files copied into dist/sfx`);

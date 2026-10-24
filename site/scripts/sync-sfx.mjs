#!/usr/bin/env node
/**
 * sync-sfx.mjs — put the sound library in the site.
 *
 *   node scripts/sync-sfx.mjs
 *
 * The index becomes `public/sfx.json`: one compact row per sound, with the
 * facts a browser needs to show it. The audio is copied to `public/sfx/`, so
 * a sound plays from the same origin as the page.
 *
 * The audio is a lot of bytes, so none of it is fetched until somebody plays
 * something.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SITE = resolve(HERE, "..");
const REPO = resolve(SITE, "..");
const LIBRARY = join(REPO, "library");
const CATALOGUE = join(LIBRARY, "sfx.json");
const OUT_JSON = join(SITE, "public", "sfx.json");
const OUT_AUDIO = join(SITE, "public", "sfx");

if (!existsSync(CATALOGUE)) {
  console.error("library/sfx.json is missing — run: node scripts/build-sfx.mjs");
  process.exit(1);
}

const catalogue = JSON.parse(readFileSync(CATALOGUE, "utf8"));

mkdirSync(OUT_AUDIO, { recursive: true });

let copied = 0;
let missing = 0;

const sounds = catalogue.entries.map((entry) => {
  // The audio is copied into the build by scripts/copy-sfx.mjs, so the
  // repository holds one copy of it and not two.
  const from = join(LIBRARY, entry.file);
  if (!existsSync(from)) missing += 1;
  return {
    i: entry.id,
    k: entry.kind,
    s: entry.source,
    t: entry.timbre,
    n: entry.title,
    d: entry.description,
    u: entry.use,
    g: (entry.tags ?? []).slice(0, 8),
    ms: entry.durationMs,
    at: entry.attackMs ?? null,
    hz: entry.centroidHz ?? null,
    l: entry.licence,
    a: entry.author ?? entry.creator ?? "",
    p: entry.sourceUrl ?? "",
    f: `sfx/${entry.file.replace(/^sfx\//, "")}`,
    r: entry.renderable ? 1 : 0,
    // The same plain-language line the agent searches, so a sound found by
    // clicking and a sound found by asking are found the same way.
    x: entry.text ?? "",
  };
});

const payload = {
  generated: catalogue.generated,
  counts: catalogue.counts,
  kinds: catalogue.kindVocabulary,
  sounds,
};

writeFileSync(OUT_JSON, `${JSON.stringify(payload)}\n`, "utf8");

const bytes = Buffer.byteLength(JSON.stringify(payload));
console.log(
  `sfx.json: ${sounds.length} sounds · ${catalogue.kindVocabulary.length} kinds · ${(bytes / 1024).toFixed(0)} kB`,
);
console.log(`audio: ${missing ? `${missing} files missing` : "every file is there"}`);

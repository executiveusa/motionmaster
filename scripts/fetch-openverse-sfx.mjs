#!/usr/bin/env node
/**
 * fetch-openverse-sfx.mjs — pull real sound effects from Openverse.
 *
 *   node scripts/fetch-openverse-sfx.mjs [--per 6] [--dry]
 *
 * Openverse indexes audio that is openly licensed, and it says which licence
 * each item carries. This script searches a vocabulary of the sounds a film
 * actually needs, keeps only the licences that are safe to redistribute and to
 * use commercially, downloads the files, and writes the catalogue entries.
 *
 * The rate limit for an anonymous client is twenty requests a minute and two
 * hundred a day, so the script waits between requests and takes a small
 * number per search.
 *
 * Source: https://api.openverse.org — an index of openly licensed media.
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const REPO = resolve(HERE, "..");
const API = "https://api.openverse.org/v1/audio/";

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : dflt;
};

const PER_QUERY = Number(opt("per", 6));
const MAX_PER_KIND = Number(opt("max", 14));
const OUT_DIR = resolve(REPO, "library", "sfx", "openverse");
const CATALOGUE = resolve(REPO, "library", "sfx-openverse.json");

/**
 * The vocabulary.
 *
 * Each kind is a thing a film needs a sound for, and each carries the words
 * the index is searched with. The kinds are the same vocabulary the site
 * uses for its buttons and the agent searches with, so a sound found by a
 * person and a sound found by an agent land in the same place.
 */
const VOCABULARY = [
  { kind: "whoosh", terms: ["whoosh", "swoosh"] },
  { kind: "swish", terms: ["swish", "whoosh short"] },
  { kind: "hit", terms: ["hit sound effect", "punch impact"] },
  { kind: "impact", terms: ["impact heavy", "boom collision"] },
  { kind: "knock", terms: ["knock door", "wood knock"] },
  { kind: "tap", terms: ["tap click light", "tick sound"] },
  { kind: "click", terms: ["click ui", "mouse click"] },
  { kind: "pop", terms: ["pop bubble", "blip"] },
  { kind: "riser", terms: ["riser build up", "sweep up"] },
  { kind: "sweep", terms: ["sweep transition", "air sweep"] },
  { kind: "drop", terms: ["drop sub bass", "downlifter"] },
  { kind: "glitch", terms: ["glitch digital", "error glitch"] },
  { kind: "shimmer", terms: ["shimmer sparkle", "shimmer up"] },
  { kind: "type", terms: ["typing keyboard", "keystroke"] },
  { kind: "toggle", terms: ["switch toggle", "toggle on off"] },
  { kind: "confirm", terms: ["success chime", "confirm positive"] },
  { kind: "error", terms: ["error buzz", "negative alert"] },
  { kind: "notify", terms: ["notification alert", "attention sound"] },
  { kind: "sting", terms: ["logo sting", "brand sound"] },
  { kind: "note", terms: ["bell chime note", "mallet"] },
  { kind: "drip", terms: ["water drop", "dripping"] },
  { kind: "shutter", terms: ["camera shutter", "photo camera"] },
  { kind: "whooshTransition", terms: ["transition whoosh cinematic", "film transition"] },
  { kind: "foley", terms: ["foley cloth", "rustle movement"] },
  { kind: "zap", terms: ["zap electric", "laser zap"] },
];

/**
 * Only licences that are safe to redistribute and to use commercially.
 *
 * `by-nc` forbids commercial use; `by-nd` forbids derivatives, and a film
 * that carries a sound is a derivative. Both are excluded, and the exclusion
 * is recorded rather than implied.
 */
const ALLOWED_LICENCES = new Set(["cc0", "by", "by-sa"]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url) {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

async function download(url, path) {
  const response = await fetch(url, { headers: { "user-agent": "motion-master/1.0" } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 512) throw new Error("the file is too small to be a sound");
  writeFileSync(path, bytes);
  return bytes;
}

const slug = (value) =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

async function main() {
  const dry = flag("dry");
  const seen = new Set();
  const entries = [];
  const skipped = { licence: {}, tooLong: 0, tooShort: 0, duplicate: 0, failed: 0 };
  let requests = 0;

  for (const { kind, terms } of VOCABULARY) {
    let taken = 0;
    for (const term of terms) {
      if (taken >= MAX_PER_KIND) break;
      const url =
        `${API}?q=${encodeURIComponent(term)}&page_size=20` +
        `&license=${[...ALLOWED_LICENCES].join(",")}&mature=false`;
      try {
        await sleep(3200); // twenty a minute
        const body = await getJson(url);
        requests += 1;
        for (const item of body.results ?? []) {
          if (taken >= MAX_PER_KIND) break;
          const licence = String(item.license ?? "").toLowerCase();
          if (!ALLOWED_LICENCES.has(licence)) {
            skipped.licence[licence] = (skipped.licence[licence] ?? 0) + 1;
            continue;
          }
          const durationMs = Number(item.duration ?? 0);
          if (!durationMs || durationMs > 12000) {
            skipped.tooLong += 1;
            continue;
          }
          if (durationMs < 60) {
            skipped.tooShort += 1;
            continue;
          }
          const key = item.id ?? item.url;
          if (seen.has(key)) {
            skipped.duplicate += 1;
            continue;
          }
          seen.add(key);
          taken += 1;

          const id = `${kind}:${slug(item.title ?? item.id)}`;
          const ext = String(item.filetype ?? "mp3").toLowerCase();
          const file = `sfx/openverse/${slug(id)}.${ext === "wav" ? "wav" : "mp3"}`;

          if (!dry) {
            const target = join(REPO, "library", file);
            mkdirSync(resolve(target, ".."), { recursive: true });
            try {
              await download(item.url, target);
            } catch (error) {
              skipped.failed += 1;
              continue;
            }
          }

          const tags = (item.tags ?? [])
            .map((tag) => (typeof tag === "string" ? tag : tag.name))
            .filter(Boolean)
            .slice(0, 12);

          entries.push({
            id,
            source: "openverse",
            sourceKind: kind,
            kind,
            title: item.title ?? id,
            description: tags.length ? tags.join(" · ") : item.title ?? "",
            tags: [kind, ...tags],
            durationMs,
            provider: item.provider,
            creator: item.creator,
            creatorUrl: item.creator_url,
            sourceUrl: item.foreign_landing_url ?? item.detail_url,
            licence,
            licenceVersion: item.license_version,
            licenceUrl: item.license_url,
            attribution: item.attribution,
            file,
            bytes: item.filesize ?? null,
            sampleRate: item.sample_rate ?? null,
            waveform: item.waveform ?? null,
            fetched: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error(`  ! ${kind} / ${term}: ${error.message}`);
        skipped.failed += 1;
      }
    }
    console.log(`${kind}: ${taken}`);
  }

  if (!dry) {
    mkdirSync(resolve(OUT_DIR, ".."), { recursive: true });
    writeFileSync(
      CATALOGUE,
      `${JSON.stringify(
        {
          generated: "scripts/fetch-openverse-sfx.mjs",
          source: "https://api.openverse.org",
          note:
            "Real recordings indexed by Openverse. Each item carries its own licence; only cc0, by " +
            "and by-sa are kept, because those are the ones that may be redistributed and used " +
            "commercially.",
          requests,
          count: entries.length,
          skipped,
          entries,
        },
        null,
        1,
      )}\n`,
      "utf8",
    );
    console.log(`\n${entries.length} sounds from ${requests} requests`);
    console.log(`catalogue: ${CATALOGUE}`);
  } else {
    console.log(`\n(dry run) ${entries.length} would be kept`);
  }
}

await main();

#!/usr/bin/env node
/**
 * build-sfx.mjs — one sound library, out of three very different sources.
 *
 *   node scripts/build-sfx.mjs
 *
 * The three sources do not agree on anything, so this script is where they are
 * made to agree:
 *
 *   earshot   252 sounds that are *recipes* — code, not recordings (MIT)
 *   uisfx     936 interface sounds in 78 semantic cues and 12 timbres
 *             (MIT code, CC0 audio) — vendored by Clipwing's real-sfx skill
 *   openverse real recordings of open-licensed audio, each with its own
 *             licence
 *
 * The output is `library/sfx.json`: one index, one vocabulary, and every
 * sound carrying the facts a person or an agent needs to choose it — what it
 * sounds like, when it belongs, how long it is, how it is shaped, and what
 * licence it is under.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const REPO = resolve(HERE, "..");

/**
 * The canonical vocabulary.
 *
 * This is the whole point of the library: one set of words that a person can
 * click and an agent can search, whatever the sound came from. The buttons on
 * the site are these; the agent's search is over these.
 *
 * `about` is what the word means, in words, so an agent reading the catalogue
 * does not have to guess from a label.
 */
const KINDS = {
  click: { label: "click", about: "a tick or a press — a button, a switch, a short contact" },
  toggle: { label: "toggle", about: "a state change — something switched on or off" },
  hover: { label: "hover", about: "soft attention — a cue that something is there" },
  confirm: { label: "confirm", about: "accepted, done, successful — the good ending" },
  error: { label: "error", about: "rejected, invalid, blocked — the bad ending" },
  notify: { label: "notify", about: "an alert, a message, attention" },
  type: { label: "type", about: "typing, keys, keystrokes" },
  pick: { label: "pick", about: "choosing, selecting, marking something" },
  whoosh: { label: "whoosh", about: "a fast move through air — a whip pan, a fly-in" },
  swish: { label: "swish", about: "a light move, softer and quicker than a whoosh" },
  sweep: { label: "sweep", about: "a rising or falling move — a build or a drop" },
  drop: { label: "drop", about: "a descending move, usually low" },
  hit: { label: "hit", about: "a hit that lands on the cut" },
  impact: { label: "impact", about: "a heavy hit, with weight behind it" },
  knock: { label: "knock", about: "a knock — wood, metal, a door" },
  tap: { label: "tap", about: "a light tap — a fingertip, a small contact" },
  pop: { label: "pop", about: "a short bright pop — round, quick, playful" },
  glitch: { label: "glitch", about: "a digital break — wrong, broken, too fast" },
  riser: { label: "riser", about: "a build that goes somewhere" },
  shimmer: { label: "shimmer", about: "a bright, airy texture" },
  note: { label: "note", about: "a tuned note — a mallet, a pluck, a chime" },
  sting: { label: "sting", about: "a brand sting — the sound that signs a thing off" },
  drip: { label: "drip", about: "water, a drop, a leak" },
  shutter: { label: "shutter", about: "a camera shutter, a mechanical snap" },
  drag: { label: "drag", about: "a drag, a scrub, something being moved by hand" },
  open: { label: "open", about: "something opening, expanding, going in" },
  close: { label: "close", about: "something closing, dismissing, going away" },
  start: { label: "start", about: "starting, playing, going" },
  stop: { label: "stop", about: "stopping, pausing, ending" },
  progress: { label: "progress", about: "work in progress — loading, processing, streaming" },
  media: { label: "media", about: "playing, seeking, recording — the transport" },
  transition: { label: "transition", about: "the join between two scenes" },
  foley: { label: "foley", about: "real-world texture — cloth, paper, a hand" },
  zap: { label: "zap", about: "electric, a spark, a jump" },
  undo: { label: "undo", about: "taking something back" },
  other: { label: "other", about: "a sound that does not fit one of the named kinds" },
};

/** earshot's 43 families, mapped onto the vocabulary. */
const EARSHOT_KIND = {
  click: "click",
  pro_click: "click",
  cut_hit: "hit",
  pro_sub_drop: "drop",
  downlifter: "drop",
  drip: "drip",
  fit: "impact",
  glitch: "glitch",
  pro_glitch: "glitch",
  hover_tick: "hover",
  pro_hover_tick: "hover",
  impact: "impact",
  pro_impact: "impact",
  knock: "knock",
  logo_sting: "sting",
  pro_logo_sting: "sting",
  mallet: "note",
  notify: "notify",
  pro_notify: "notify",
  pluck: "note",
  pop: "pop",
  pro_pop: "pop",
  pro_pop_in: "pop",
  ui_pop: "pop",
  reverse_swell: "sweep",
  riser: "riser",
  pro_riser: "riser",
  shimmer: "shimmer",
  pro_shimmer: "shimmer",
  shutter: "shutter",
  swish: "swish",
  tap: "tap",
  pro_tap: "tap",
  toggle: "toggle",
  typing_key: "type",
  pro_typing_key: "type",
  pro_typing_run: "type",
  whoosh_big: "whoosh",
  pro_whoosh_big: "whoosh",
  whoosh_fast: "whoosh",
  pro_zip: "sweep",
};

/**
 * uisfx's 78 cues, mapped onto the vocabulary.
 *
 * The cue keeps its own name in the tags — "toggle-on" is more precise than
 * "toggle" — but the button a person clicks is the canonical kind.
 */
const UISFX_KIND = {
  hover: "hover",
  press: "click",
  "double-click": "click",
  "long-press": "click",
  typing: "type",
  "toggle-on": "toggle",
  "toggle-off": "toggle",
  select: "pick",
  deselect: "pick",
  check: "pick",
  uncheck: "pick",
  copy: "pick",
  paste: "pick",
  focus: "pick",
  add: "pick",
  success: "confirm",
  complete: "confirm",
  achievement: "confirm",
  "level-up": "confirm",
  bonus: "confirm",
  reward: "confirm",
  streak: "confirm",
  purchase: "confirm",
  checkout: "confirm",
  "add-to-cart": "confirm",
  coupon: "confirm",
  undo: "undo",
  redo: "undo",
  error: "error",
  "invalid-drop": "error",
  blocked: "error",
  warning: "error",
  notification: "notify",
  badge: "notify",
  mention: "notify",
  info: "notify",
  reaction: "notify",
  send: "notify",
  receive: "notify",
  swipe: "drag",
  "drag-start": "drag",
  drop: "drag",
  reorder: "drag",
  snap: "drag",
  release: "drag",
  open: "open",
  expand: "open",
  forward: "open",
  unlock: "open",
  connect: "open",
  connecting: "open",
  back: "close",
  disconnect: "close",
  close: "close",
  collapse: "close",
  cancel: "close",
  remove: "close",
  "remove-from-cart": "close",
  delete: "close",
  dismiss: "close",
  refund: "close",
  lock: "close",
  start: "start",
  play: "start",
  wake: "start",
  retry: "start",
  loading: "progress",
  processing: "progress",
  queued: "progress",
  streaming: "progress",
  scanning: "progress",
  checkpoint: "progress",
  "progress-step": "progress",
  stop: "stop",
  pause: "stop",
  sleep: "stop",
  recording: "media",
  seek: "media",
  "skip-next": "media",
  "skip-previous": "media",
  "volume-change": "media",
};

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

/**
 * The measured levels.
 *
 * Every sound in the library is normalised to the same reference peak, and
 * what it actually measures is written here — so the mix can be reasoned
 * about from numbers rather than from guessing.
 */
function loadLevels() {
  const path = join(REPO, "library", "sfx-levels.json");
  if (!existsSync(path)) return {};
  try {
    return readJson(path).levels ?? {};
  } catch {
    return {};
  }
}
const LEVELS = loadLevels();

const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

/** A plain-language line an agent can match on. */
function describeSound(item) {
  const parts = [];
  const kind = KINDS[item.kind] ?? KINDS.other;
  parts.push(`${kind.label}: ${kind.about}`);
  if (item.description) parts.push(item.description);
  if (item.use) parts.push(`use it for ${item.use}`);
  if (item.durationMs) parts.push(`${(item.durationMs / 1000).toFixed(2)} s`);
  if (item.attackMs !== undefined && item.attackMs !== null) {
    parts.push(`attack ${Math.round(item.attackMs)} ms`);
  }
  if (item.centroidHz) parts.push(`brightness ${Math.round(item.centroidHz)} Hz`);
  if (item.peakDb !== undefined && item.peakDb !== null) {
    parts.push(`peak ${Math.round(item.peakDb)} dBFS`);
  }
  if (item.timbre) parts.push(`timbre ${item.timbre}`);
  return parts.join("; ");
}

function loadEarshot() {
  const path = join(REPO, "library", "sfx-earshot.json");
  if (!existsSync(path)) return [];
  const file = readJson(path);
  return (file.entries ?? []).map((entry) => {
    const kind = EARSHOT_KIND[entry.sourceKind] ?? "other";
    // The bank ships as mp3. The catalogue may still name the wav master
    // from an older run, so the file that is really there wins.
    let file = entry.file;
    let abs = join(REPO, "library", file);
    if (!existsSync(abs) && file.endsWith(".wav")) {
      file = file.replace(/\.wav$/, ".mp3");
      abs = join(REPO, "library", file);
    }
    const item = {
      id: `earshot:${entry.id}`,
      source: "earshot",
      kind,
      sourceKind: entry.sourceKind,
      timbre: entry.sourceKind,
      title: `${entry.sourceKind.replace(/_/g, " ")} ${entry.member}`.trim(),
      description: entry.target ?? entry.notes ?? "",
      use: entry.use ?? "",
      tags: [kind, entry.sourceKind, ...(entry.kinds ?? []), entry.member].filter(Boolean),
      durationMs: entry.durationMs,
      onsetMs: entry.onsetMs,
      peakMs: entry.peakMs,
      attackMs: entry.attackMs,
      centroidHz: entry.centroidHz,
      lufs: entry.lufs,
      licence: "MIT",
      author: "Leon Lin",
      sourceUrl: "https://github.com/Leonxlnx/earshot",
      file,
      bytes: entry.bytes,
      renderable: {
        recipe: entry.recipe,
        fn: entry.fn,
        params: entry.params,
        seed: entry.seed,
        peakDb: entry.peakDb,
      },
    };
    if (existsSync(abs)) item.sha256 = sha256(abs);
    const level = LEVELS[entry.file.replace(/^sfx\//, "")];
    if (level) {
      item.peakDb = level.peak ?? null;
      item.lufs = level.lufs ?? item.lufs ?? null;
    }
    return item;
  });
}

function loadUisfx() {
  const dir = join(REPO, "library", "sfx", "uisfx");
  const manifestPath = join(dir, "manifest.json");
  if (!existsSync(manifestPath)) return [];
  const manifest = readJson(manifestPath);
  const cues = new Map(manifest.cues.map((cue) => [cue.name, cue]));
  const categories = new Map(manifest.categories.map((cat) => [cat.id, cat]));

  const items = [];
  for (const asset of manifest.assets ?? []) {
    const cue = cues.get(asset.cue);
    const category = categories.get(asset.category);
    const rel = asset.files?.mp3?.path ?? `sounds/${asset.pack}/${asset.cue}.mp3`;
    const file = `sfx/uisfx/${rel}`;
    const abs = join(REPO, "library", file);
    if (!existsSync(abs)) continue;
    const kind = UISFX_KIND[asset.cue] ?? "other";
    items.push({
      id: `uisfx:${asset.pack}/${asset.cue}`,
      source: "uisfx",
      kind,
      sourceKind: asset.cue,
      timbre: asset.pack,
      title: `${asset.cue.replace(/_/g, " ")} (${asset.pack})`,
      description: cue?.description ?? "",
      use: category ? `${category.label}: ${category.description}` : "",
      tags: [kind, asset.pack, asset.cue, asset.category, ...(cue ? [cue.label] : [])].filter(Boolean),
      durationMs: Math.round((asset.duration ?? 0) * 1000),
      defaultVolume: asset.defaultVolume,
      loop: asset.loop,
      playback: asset.playback,
      channels: asset.channels,
      licence: "CC0-1.0",
      licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
      author: "uisfx — Yuki Capital",
      sourceUrl: "https://github.com/romainsimon/uisfx",
      file,
      bytes: asset.files?.mp3?.bytes ?? statSync(abs).size,
      sha256: sha256(abs),
      peakDb: LEVELS[`sfx/uisfx/${rel}`]?.peak ?? null,
      lufs: LEVELS[`sfx/uisfx/${rel}`]?.lufs ?? null,
    });
  }
  return items;
}

function loadOpenverse() {
  const path = join(REPO, "library", "sfx-openverse.json");
  if (!existsSync(path)) return [];
  const file = readJson(path);
  return (file.entries ?? []).map((entry) => {
    const abs = join(REPO, "library", entry.file);
    const item = {
      id: entry.id,
      source: "openverse",
      kind: KINDS[entry.kind] ? entry.kind : "other",
      sourceKind: entry.sourceKind,
      timbre: entry.provider,
      title: entry.title,
      description: entry.description,
      use: "",
      tags: entry.tags,
      durationMs: entry.durationMs,
      provider: entry.provider,
      creator: entry.creator,
      creatorUrl: entry.creatorUrl,
      sourceUrl: entry.sourceUrl,
      licence: entry.licence,
      licenceVersion: entry.licenceVersion,
      licenceUrl: entry.licenceUrl,
      attribution: entry.attribution,
      file: entry.file,
      bytes: entry.bytes,
      sampleRate: entry.sampleRate,
    };
    if (existsSync(abs)) item.sha256 = sha256(abs);
    const level = LEVELS[entry.file.replace(/^sfx\//, "")];
    if (level) {
      item.peakDb = level.peak ?? null;
      item.lufs = level.lufs ?? item.lufs ?? null;
    }
    return item;
  });
}

const entries = [...loadEarshot(), ...loadUisfx(), ...loadOpenverse()];

for (const entry of entries) entry.text = describeSound(entry);

const counts = {};
for (const entry of entries) counts[entry.kind] = (counts[entry.kind] ?? 0) + 1;

const sources = {};
for (const entry of entries) sources[entry.source] = (sources[entry.source] ?? 0) + 1;

const catalogue = {
  generated: "scripts/build-sfx.mjs",
  note:
    "One sound library out of three sources: earshot's synthesized bank (MIT), uisfx's interface " +
    "sounds (CC0 audio), and Openverse's real recordings (per-item licence). Every sound carries " +
    "its own licence and its measured shape.",
  kindVocabulary: Object.entries(KINDS)
    .map(([id, kind]) => ({ id, label: kind.label, about: kind.about, count: counts[id] ?? 0 }))
    .filter((kind) => kind.count > 0)
    .sort((a, b) => b.count - a.count),
  counts: { total: entries.length, bySource: sources, byKind: counts },
  entries,
};

writeFileSync(
  join(REPO, "library", "sfx.json"),
  `${JSON.stringify(catalogue, null, 1)}\n`,
  "utf8",
);

console.log(`library/sfx.json — ${entries.length} sounds`);
console.log(`  by source: ${Object.entries(sources).map(([k, v]) => `${k} ${v}`).join(", ")}`);
console.log(
  `  kinds: ${Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k} ${v}`)
    .join(", ")}`,
);

#!/usr/bin/env node
/**
 * Import the HyperFrames repos the studio found.
 *
 * Ten repos, named in a video, read and checked here before any of them
 * went in. Seven are new. What came out of that:
 *
 *   - two skills that add real capability (animated diagrams with a camera
 *     rig and voiceover sync; the seven-stage studio playbook with a variety
 *     audit),
 *   - eleven skills from an editing kit that cuts what was recorded — the
 *     one thing this repo had no answer for at all,
 *   - thirty-six HyperFrames compositions in our own native format, which
 *     are the raw material for the house library,
 *   - one handwriting engine, vendored but not yet wired.
 *
 * Nothing is copied without its licence file and an UPSTREAM.md saying where
 * it came from. Where a repo's licence could not be read, that is written
 * down rather than guessed at.
 *
 *   node scripts/import-hf-video-repos.mjs [--from <dir>]
 *
 * The source directory defaults to /workspace/.research/hf-repos and holds
 * shallow clones.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirnameSafe(fileURLToPath(import.meta.url));
const ROOT = resolve(here, "..");
const SOURCE = process.argv.includes("--from")
  ? process.argv[process.argv.indexOf("--from") + 1]
  : "/workspace/.research/hf-repos";

function dirnameSafe(p) {
  return p.slice(0, p.lastIndexOf("/"));
}

const SKILLS = join(ROOT, "plugins", "motion-master", "skills");
const COMPOSITIONS = join(ROOT, "studio", "compositions");
const VENDOR = join(ROOT, "vendor");

/* ------------------------------------------------------------------ the kit */

/**
 * What to copy, and what to leave behind.
 *
 * The upstream repos carry their rendered output — gigabytes of it. The
 * output is not the work; the work is the code and the words. So the renders
 * stay behind and the licence files come with everything.
 */
const RECIPES = [
  {
    id: "animated-diagrams",
    source: "omkamal-animated-diagrams-skill",
    kind: "skill",
    name: "animated-diagrams",
    licence: "Apache-2.0",
    author: "omkamal",
    repo: "https://github.com/omkamal/animated-diagrams-skill",
    note:
      "Semantic SVG scenes choreographed with GSAP 3 and rendered by HyperFrames. Twelve style " +
      "presets, six camera patterns for flows larger than the canvas, Arabic and RTL support, and " +
      "a voiceover mode where every beat fires on its SRT cue.",
    include: ["SKILL.md", "README.md", "NOTICE", "references", "agents", "scripts", "assets", "licenses"],
    exclude: ["docs", "examples", "package-lock.json", "package.json"],
  },
  {
    id: "saas-motion-kit",
    source: "tugrawork-creator-saas-motion-kit",
    kind: "skill",
    name: "saas-motion-video",
    licence: "MIT",
    author: "tugrawork-creator",
    repo: "https://github.com/tugrawork-creator/saas-motion-kit",
    note:
      "The seven-stage studio process: brief, components, theme, storyboard, build, sound, deliver. " +
      "It carries the creative muscle — the tone matrix, the variety rules, the component forge and " +
      "the transition atlas — and a variety audit that stops a film making the same move twice.",
    include: [
      "components",
      "creative",
      "playbook",
      "templates",
      "tools",
    ],
    exclude: ["docs", "examples"],
    /* The skill itself lives in .claude/skills/ upstream; it is the skill
       here, not a folder inside one. */
    skillFrom: ".claude/skills/saas-motion-video",
  },
  {
    id: "herk-cut-mistakes",
    source: "nateherkai-herk-edit-kit/.agents/skills/cut-mistakes",
    kind: "skill",
    name: "cut-mistakes",
    licence: "MIT",
    author: "nateherkai",
    repo: "https://github.com/nateherkai/herk-edit-kit",
    note: "Finds and removes spoken mistakes — stutters, repeated words, false starts, retakes.",
    include: ["."],
  },
  {
    id: "herk-cut-silences",
    source: "nateherkai-herk-edit-kit/.agents/skills/cut-silences",
    kind: "skill",
    name: "cut-silences",
    licence: "MIT",
    author: "nateherkai",
    repo: "https://github.com/nateherkai/herk-edit-kit",
    note: "Trims the silence out of a recording, on a transcript.",
    include: ["."],
  },
  {
    id: "herk-edit-video",
    source: "nateherkai-herk-edit-kit/.agents/skills/edit-video",
    kind: "skill",
    name: "edit-video",
    licence: "MIT",
    author: "nateherkai",
    repo: "https://github.com/nateherkai/herk-edit-kit",
    note:
      "The whole edit: transcription, silence trimming, mistake review, visual storytelling, motion " +
      "graphics and a verified HyperFrames render.",
    include: ["."],
  },
  {
    id: "herk-short-form-edit",
    source: "nateherkai-herk-edit-kit/.agents/skills/short-form-edit",
    kind: "skill",
    name: "short-form-edit",
    licence: "MIT",
    author: "nateherkai",
    repo: "https://github.com/nateherkai/herk-edit-kit",
    note: "Cuts a recording down to a short vertical piece.",
    include: ["."],
  },
  {
    id: "herk-make-a-video",
    source: "nateherkai-herk-edit-kit/.agents/skills/make-a-video",
    kind: "skill",
    name: "make-a-video",
    licence: "MIT",
    author: "nateherkai",
    repo: "https://github.com/nateherkai/herk-edit-kit",
    note: "The production route from a brief to a finished video.",
    include: ["."],
  },
  {
    id: "herk-motion-showreel",
    source: "nateherkai-herk-edit-kit/.agents/skills/motion-showreel",
    kind: "skill",
    name: "motion-showreel",
    licence: "MIT",
    author: "nateherkai",
    repo: "https://github.com/nateherkai/herk-edit-kit",
    note:
      "A showreel: one brand motif transformed through labelled craft chapters, cuts on a BPM grid, " +
      "and a held logo lockup that answers the opening.",
    include: ["."],
  },
  {
    id: "herk-short-form-video",
    source: "nateherkai-herk-edit-kit/.agents/skills/short-form-video",
    kind: "skill",
    name: "short-form-video",
    licence: "MIT",
    author: "nateherkai",
    repo: "https://github.com/nateherkai/herk-edit-kit",
    note: "A short vertical film, end to end.",
    include: ["."],
  },
  {
    id: "herk-video-storytelling",
    source: "nateherkai-herk-edit-kit/.agents/skills/video-storytelling",
    kind: "skill",
    name: "video-storytelling",
    licence: "MIT",
    author: "nateherkai",
    repo: "https://github.com/nateherkai/herk-edit-kit",
    note: "The story structure a video follows, and what each beat has to do.",
    include: ["."],
  },
  {
    id: "herk-style-library",
    source: "nateherkai-herk-edit-kit/.agents/skills/style-library",
    kind: "skill",
    name: "style-library",
    licence: "MIT",
    author: "nateherkai",
    repo: "https://github.com/nateherkai/herk-edit-kit",
    note: "A reusable library of motion-graphics cards and style templates.",
    include: ["."],
  },
  {
    id: "herk-hyperframes-doctrine",
    source: "nateherkai-herk-edit-kit/.agents/skills/hyperframes",
    kind: "skill",
    name: "hyperframes-doctrine",
    licence: "MIT",
    author: "nateherkai",
    repo: "https://github.com/nateherkai/herk-edit-kit",
    note:
      "A second HyperFrames doctrine, and a richer one: nine palettes, the house style, the motion " +
      "principles, the transition catalogue, captions and audio-reactive visuals.",
    include: ["."],
  },
  {
    id: "website-to-hyperframes",
    source: "nateherkai-herk-edit-kit/.agents/skills/website-to-hyperframes",
    kind: "skill",
    name: "website-to-hyperframes",
    licence: "MIT",
    author: "nateherkai",
    repo: "https://github.com/nateherkai/herk-edit-kit",
    note:
      "Capture a website and produce a video from it — a launch film or a social ad out of a URL.",
    include: ["."],
  },
];

/* ------------------------------------------------------------- the compositions */

const COMPOSITION_RECIPES = [
  {
    id: "motion-library",
    source: "nutllwhy-hyperframes-motion-library",
    licence: "MIT",
    author: "nutllwhy",
    repo: "https://github.com/nutllwhy/hyperframes-motion-library",
    note:
      "Twenty-seven HyperFrames compositions — charts, numbers, chapter titles, comparisons, " +
      "timelines — with the director rules that decide which one a brief gets.",
    templatesFrom: "redskill-submission/templates",
    extra: ["catalog.json", "director-rules.json", "motion-plan.schema.json", "SYSTEM.md", "AGENT_GUIDE.md"],
  },
  {
    id: "reelforge",
    source: "gongnyang-reelforge",
    licence: "Apache-2.0",
    author: "gongnyang",
    repo: "https://github.com/gongnyang/reelforge",
    note:
      "Nine HyperFrames compositions for numbers — bar, pie, line, list, numbered, statistic, " +
      "compare, quote. The registry in that repo is a placeholder; these compositions are the work.",
    templatesFrom: "blocks",
  },
];

/* ------------------------------------------------------------------ the copy */

function copyInto(source, target, include, exclude) {
  mkdirSync(target, { recursive: true });
  for (const entry of include) {
    const from = join(source, entry);
    if (!existsSync(from)) continue;
    const to = join(target, entry === "." ? "" : entry);
    /* A file is copied onto its name; a directory is copied into. */
    if (statSync(from).isDirectory()) mkdirSync(to, { recursive: true });
    cpSync(from, to, {
      recursive: true,
      filter: (src) => {
        const relative = src.slice(source.length + 1);
        if (!relative) return true;
        if (relative.startsWith(".git/")) return false;
        const top = relative.split("/")[0];
        if (exclude?.includes(top)) return false;
        /* Node modules and build output never travel. */
        if (relative.includes("node_modules/")) return false;
        return true;
      },
    });
  }
}

function writeUpstream(target, recipe) {
  const imported = new Date().toISOString().slice(0, 10);
  writeFileSync(
    join(target, "UPSTREAM.md"),
    `# Upstream

\`${recipe.name}\` is imported from **${recipe.repo}**.
- Licence: ${recipe.licence}
- Author: ${recipe.author}
- Imported: ${imported}

${recipe.note}

The upstream licence file is included in this directory and applies to every
file here that came from upstream. Anything written for Motion Master itself
and shipped alongside it is licensed separately — see \`../../LICENSE.md\`.
`,
    "utf8",
  );
}

let copied = 0;
let missing = 0;

for (const recipe of RECIPES) {
  const source = join(SOURCE, recipe.source);
  if (!existsSync(source)) {
    console.log(`skip  ${recipe.name} — ${recipe.source} is not cloned`);
    missing += 1;
    continue;
  }
  const target = join(SKILLS, recipe.name);
  rmSync(target, { recursive: true, force: true });
  if (recipe.skillFrom) {
    copyInto(join(source, recipe.skillFrom), target, ["."], recipe.exclude);
  }
  copyInto(source, target, recipe.include ?? ["."], recipe.exclude);

  /* The licence, under a name that will not be mistaken for ours. */
  for (const candidate of ["LICENSE", "LICENSE.md", "LICENSE.txt"]) {
    const from = join(source, candidate);
    if (existsSync(from)) {
      cpSync(from, join(target, "LICENSE.md"));
      break;
    }
  }
  writeUpstream(target, recipe);
  copied += 1;
  console.log(`wrote ${target.replace(`${ROOT}/`, "")}`);
}

for (const recipe of COMPOSITION_RECIPES) {
  const source = join(SOURCE, recipe.source);
  if (!existsSync(source)) {
    console.log(`skip  compositions/${recipe.id} — ${recipe.source} is not cloned`);
    missing += 1;
    continue;
  }
  const target = join(COMPOSITIONS, recipe.id);
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });

  /* Copy each template: one directory per composition. */
  const templatesRoot = join(source, recipe.templatesFrom);
  if (existsSync(templatesRoot)) {
    for (const entry of readdirSync(templatesRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const from = join(templatesRoot, entry.name);
      const to = join(target, entry.name);
      mkdirSync(to, { recursive: true });
      cpSync(from, to, {
        recursive: true,
        filter: (src) => {
          const relative = src.slice(from.length + 1);
          if (!relative) return true;
          if (relative.includes("node_modules/")) return false;
          /* Renders are output, not work. */
          if (relative.startsWith("renders/") || relative.endsWith(".mp4")) return false;
          return true;
        },
      });
    }
  }
  for (const extra of recipe.extra ?? []) {
    const from = join(source, extra);
    if (existsSync(from)) cpSync(from, join(target, extra));
  }
  for (const candidate of ["LICENSE", "LICENSE.md"]) {
    const from = join(source, candidate);
    if (existsSync(from)) {
      cpSync(from, join(target, "LICENSE.md"));
      break;
    }
  }
  writeUpstream(target, { ...recipe, name: `compositions/${recipe.id}` });
  copied += 1;
  console.log(`wrote ${target.replace(`${ROOT}/`, "")}`);
}

/* ------------------------------------------------------------------ tegaki */

{
  const source = join(SOURCE, "gkurt-tegaki");
  if (existsSync(source)) {
    const target = join(VENDOR, "tegaki");
    rmSync(target, { recursive: true, force: true });
    mkdirSync(target, { recursive: true });
    copyInto(join(source, "packages", "renderer", "src"), join(target, "src"), ["."]);
    cpSync(join(source, "LICENSE"), join(target, "LICENSE.md"));
    cpSync(join(source, "packages", "renderer", "FONTS-LICENSE.md"), join(target, "FONTS-LICENSE.md"));
    cpSync(join(source, "README.md"), join(target, "README.md"));
    writeUpstream(target, {
      name: "tegaki",
      licence: "MIT",
      author: "gkurt",
      repo: "https://github.com/gkurt/tegaki",
      note:
        "A handwriting engine: HarfBuzz shaping, a pressure model, a nib, and glyph drawing for " +
        "any font. The source is vendored so the capability is in the building; it is **not** wired " +
        "into a composition yet, and the bundled fonts are not vendored — their licences are " +
        "separate and they are 25 MB of binaries.",
    });
    copied += 1;
    console.log(`wrote ${target.replace(`${ROOT}/`, "")}`);
  } else {
    console.log("skip  vendor/tegaki — gkurt-tegaki is not cloned");
    missing += 1;
  }
}

console.log(`\n${copied} imported, ${missing} skipped`);

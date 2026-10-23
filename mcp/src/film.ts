/**
 * Build a real film from a brief.
 *
 * A brief is turned into a shot list of HyperFrames motion blocks — real,
 * working components — with their variables filled from the brief and the
 * Motion Master tokens. The blocks are installed into a project, mounted in
 * one host composition, and written to disk.
 *
 * The blocks know how the motion behaves. The brief only has to say what the
 * film is about. That is the whole idea, and it is why the console can end
 * in a file.
 */
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { fillBlock, headlineFrom, matchBlocks, type BlockFile, type MotionBlock } from "./blocks.js";
import type { TokenShape } from "./enhancer.js";

export const HYPERFRAMES_VERSION = "0.8.186";

export interface FilmShot {
  index: number;
  id: string;
  title: string;
  /** Where the block's composition lives inside the project. */
  src: string;
  duration: number;
  dimensions: { width: number; height: number };
  values: Record<string, unknown>;
  unresolved: { id: string; reason: string }[];
  /** The colour the shot sits on. A block that declares no ground is a block
   *  that assumes a dark one. */
  ground: string;
}

export interface FilmPlan {
  brief: string;
  headline: string;
  shots: FilmShot[];
  total: number;
}

/** Read the blocks catalogue. */
export function loadBlockCatalogue(path: string): {
  blocks: MotionBlock[];
  tags: string[];
  count: number;
  source?: string;
  generated?: string;
} {
  const file = JSON.parse(readFileSync(path, "utf8")) as {
    blocks: MotionBlock[];
    tags?: string[];
    count?: number;
    source?: string;
    generated?: string;
  };
  return {
    blocks: file.blocks,
    tags: file.tags ?? [],
    count: file.count ?? file.blocks.length,
    source: file.source,
    generated: file.generated,
  };
}

/**
 * Choose the shots.
 *
 * Variants of one idea are one idea, so a family of near-identical blocks
 * contributes a single shot.
 */
export function planFilm(
  brief: string,
  options: {
    blocks: BlockFile;
    tokens: TokenShape;
    count?: number;
    tags?: string[];
    /** Blocks the gate has already rejected. They are not tried again. */
    exclude?: string[];
  },
): FilmPlan {
  const count = options.count ?? 3;
  const query = `${brief} ${(options.tags ?? []).join(" ")}`.trim();
  const excluded = new Set(options.exclude ?? []);

  const matched = matchBlocks(options.blocks, query, {
    limit: count * 8,
    requireVariables: true,
  })
    .filter((candidate) => !excluded.has(candidate.block.id))
    // The registry marks a handful of entries as ports: markup to paste into
    // a composition, not a composition to mount. Every one of them is a
    // fragment, and mounting a fragment produces a shot with no identity.
    .filter((candidate) => !candidate.block.tags.includes("transitions-dev-port"));

  const chosen: MotionBlock[] = [];
  const usedFamilies = new Set<string>();
  for (const candidate of matched) {
    if (chosen.length >= count) break;
    const family = candidate.block.id.replace(/-\d+$/, "");
    if (usedFamilies.has(family)) continue;
    usedFamilies.add(family);
    chosen.push(candidate.block);
  }

  /*
   * A film has a shape: it opens on something that names the thing, and it
   * closes on something that signs it off. If the brief brought a title card
   * or an end card along, it belongs at the front or the back — not in the
   * middle, where a second of type is just a pause.
   */
  const OPENING = ["title-card", "titlecard", "typography", "title", "orient", "intro", "opening"];
  const CLOSING = ["logo", "brand", "end", "outro", "sting", "cta", "closing"];

  const hasTag = (block: MotionBlock, tags: string[]): boolean =>
    block.tags.some((tag) => tags.some((wanted) => tag.includes(wanted)));

  const opening = chosen.find((block) => hasTag(block, OPENING) && !hasTag(block, CLOSING));
  const closing = chosen.find(
    (block) => block !== opening && hasTag(block, CLOSING) && !hasTag(block, OPENING),
  );

  if (opening) {
    const at = chosen.indexOf(opening);
    if (at > 0) {
      chosen.splice(at, 1);
      chosen.unshift(opening);
    }
  }
  if (closing) {
    const at = chosen.indexOf(closing);
    if (at !== -1 && at !== chosen.length - 1) {
      chosen.splice(at, 1);
      chosen.push(closing);
    }
  }

  const headline = headlineFrom(brief);
  const shots: FilmShot[] = chosen.map((block, index) => {
    const filled = fillBlock(block, {
      brief,
      tokens: options.tokens,
      headline,
    });
    // A block and a component install to different places. The registry says
    // where, so ask it rather than assuming.
    const composition =
      block.files.find((f) => f.type === "hyperframes:composition") ??
      block.files.find((f) => f.path.endsWith(".html"));

    return {
      index,
      id: block.id,
      title: block.title,
      src: composition?.target ?? `compositions/${block.id}.html`,
      duration: block.duration ?? 5,
      dimensions: block.dimensions ?? { width: 1920, height: 1080 },
      values: filled.values as Record<string, unknown>,
      unresolved: filled.unresolved,
      ground:
        (typeof filled.values.background === "string" && filled.values.background) ||
        (typeof filled.values.bg === "string" && filled.values.bg) ||
        (typeof filled.values.ground === "string" && filled.values.ground) ||
        options.tokens.palette.playerZone,
    };
  });

  return {
    brief,
    headline,
    shots,
    total: shots.reduce((sum, shot) => sum + shot.duration, 0),
  };
}

/**
 * Install the blocks into the project.
 *
 * Each block brings its own assets, so this is the only step that needs the
 * network.
 *
 * Not every installable thing is mountable. Some registry entries are markup
 * to paste into a composition rather than a composition of their own, and
 * mounting one produces a sub-composition with no identity — which the
 * HyperFrames gate rejects. So each block is checked after it lands, and a
 * block that cannot be mounted is left out rather than shipped broken.
 */
export function installBlocks(
  repoRoot: string,
  shots: FilmShot[],
  outDir: string,
): { installed: FilmShot[]; skipped: { id: string; reason: string }[] } {
  const installed: FilmShot[] = [];
  const skipped: { id: string; reason: string }[] = [];

  for (const shot of shots) {
    try {
      execFileSync(
        "npx",
        ["--yes", `hyperframes@${HYPERFRAMES_VERSION}`, "add", shot.id, "--dir", outDir, "--no-clipboard"],
        { cwd: repoRoot, stdio: ["ignore", "ignore", "inherit"] },
      );
    } catch (error) {
      skipped.push({
        id: shot.id,
        reason: `it could not be installed: ${error instanceof Error ? error.message : String(error)}`,
      });
      continue;
    }

    const file = join(outDir, shot.src);
    if (!existsSync(file)) {
      skipped.push({ id: shot.id, reason: `it installed no file at ${shot.src}` });
      continue;
    }
    const contents = readFileSync(file, "utf8");
    if (!contents.includes("data-composition-id")) {
      skipped.push({
        id: shot.id,
        reason: "it is a fragment to paste into a composition, not a composition of its own",
      });
      continue;
    }

    /*
     * The block knows how long it is. The registry's metadata does not always
     * say, and a guessed length leaves the film running past its own content
     * — which is how a film ends on a black frame.
     */
    const declared = contents.match(/data-duration="([0-9.]+)"/);
    const duration = declared ? Number(declared[1]) : undefined;
    installed.push(
      duration && Number.isFinite(duration) && duration > 0 ? { ...shot, duration } : shot,
    );
  }

  return { installed, skipped };
}

/**
 * Point the blocks at a local GSAP.
 *
 * The upstream blocks load GSAP from a CDN. A render that depends on a CDN is
 * not reproducible, and in a machine whose certificate authority is not
 * trusted the request fails and the whole film comes out broken.
 */
export function localiseGsap(repoRoot: string, outDir: string): number {
  const gsap = join(repoRoot, "generator", "vendor", "gsap-3.14.2.min.js");
  if (!existsSync(gsap)) return 0;
  cpSync(gsap, join(outDir, "gsap-3.14.2.min.js"));

  const compositions = join(outDir, "compositions");
  const stack = existsSync(compositions) ? [compositions, join(compositions, "components")] : [];
  let rewritten = 0;
  for (const dir of stack) {
    if (!existsSync(dir)) continue;
    // The path is relative to the block's own directory: a block in
    // compositions/ is one level down, one in compositions/components/ is two.
    const depth = dir.endsWith("components") ? "../../" : "../";
    for (const name of readdirSync(dir)) {
      if (!name.endsWith(".html")) continue;
      const file = join(dir, name);
      const before = readFileSync(file, "utf8");
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
  return rewritten;
}

/** Write the host composition that mounts the shots. */
export function writeHostComposition(
  plan: FilmPlan,
  outDir: string,
  tokens: TokenShape,
): void {
  let cursor = 0;
  const mounts = plan.shots
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
        data-variable-values='${JSON.stringify(values).replace(/'/g, "&#39;")}'
        style="position: absolute; inset: 0; background: ${shot.ground};"
      ></div>`;
    })
    .join("\n");

  const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" width="1920" height="1080" />
    <title>${plan.headline}</title>
    <script src="./gsap-3.14.2.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      /*
       * The brand tokens.
       *
       * The blocks in the registry are written to read --brand, --fg and --bg
       * from whatever hosts them, and fall back to their own colours only when
       * those are missing. Setting them here is what makes an upstream
       * component look like it belongs to this film: the same accent, the
       * same near-black ground, the same off-white type.
       */
      :root {
        --brand: ${tokens.palette.accent};
        --fg: ${tokens.palette.canvas};
        --bg: ${tokens.palette.playerZone};
        --ink: ${tokens.palette.ink};
        --paper: ${tokens.palette.canvas};
        --hairline: ${tokens.palette.hairline};
      }
      /* The host's ground is the player's, not a brand colour: a block that
         does not declare its own assumes a dark ground. */
      html, body { margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: ${tokens.palette.playerZone}; }
      #root { position: relative; width: 100%; height: 100%; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${plan.total}" data-width="1920" data-height="1080">
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

  writeFileSync(join(outDir, "index.html"), indexHtml);
  writeFileSync(
    join(outDir, "hyperframes.json"),
    `${JSON.stringify(
      {
        $schema: "https://hyperframes.heygen.com/schema/hyperframes.json",
        registry: "https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry",
        paths: { blocks: "compositions", components: "compositions/components", assets: "assets" },
        media: { autoProxy: false },
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    join(outDir, "brief.json"),
    `${JSON.stringify(
      { brief: plan.brief, headline: plan.headline, shots: plan.shots, generated: "motion-master" },
      null,
      2,
    )}\n`,
  );
}

/**
 * Build the whole project on disk.
 *
 * Nothing is written until the shots are chosen, and the project directory is
 * replaced so a rebuild never mixes two films.
 */
export function buildFilmProject(
  repoRoot: string,
  outDir: string,
  plan: FilmPlan,
  tokens: TokenShape,
): { plan: FilmPlan; skipped: { id: string; reason: string }[] } {
  if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  const { installed, skipped } = installBlocks(repoRoot, plan.shots, outDir);

  // The shots that survived, renumbered and re-timed so the film has no gap
  // where a dropped block used to be.
  const kept = installed.map((shot, index) => ({ ...shot, index }));
  const total = kept.reduce((sum, shot) => sum + shot.duration, 0);
  const finalPlan: FilmPlan = { ...plan, shots: kept, total };

  localiseGsap(repoRoot, outDir);
  writeHostComposition(finalPlan, outDir, tokens);
  return { plan: finalPlan, skipped };
}

/**
 * Rewrite the host composition with a shorter shot list.
 *
 * When the gate rejects a block, the film is rebuilt without it. The shots
 * are re-timed so there is no gap where the dropped block used to be.
 */
export function rebuildHost(
  outDir: string,
  plan: FilmPlan,
  tokens: TokenShape,
  drop: string[],
): FilmPlan {
  const dropped = new Set(drop);
  const kept = plan.shots
    .filter((shot) => !dropped.has(shot.id))
    .map((shot, index) => ({ ...shot, index }));
  const total = kept.reduce((sum, shot) => sum + shot.duration, 0);
  const finalPlan: FilmPlan = { ...plan, shots: kept, total };
  writeHostComposition(finalPlan, outDir, tokens);
  return finalPlan;
}

/** The tokens, read from the plugin's asset file. */
export function readTokens(path: string): TokenShape {
  return JSON.parse(readFileSync(path, "utf8")) as TokenShape;
}

export { resolve as resolvePath };

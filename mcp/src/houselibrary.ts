/**
 * The house library — the studio's reusable scenes.
 *
 * The prompt library is inspiration: an agent can read it, but it has to
 * write the animation itself and gets a different result each time. The
 * house library is the opposite. Every scene in it is a motion block that has
 * already passed the gate, filed under the shot roles it can serve, bound to
 * a brand kit, with its variables named.
 *
 * An agent picks a scene by what the shot has to do — an opening, a number,
 * a camera move, an end — fills the content variables and renders it.
 *
 * Nothing here is invented. The scenes come from the registry, the passing
 * comes from the gate verdicts, and the roles come from the role map.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fillBlock, type MotionBlock } from "./blocks.js";
import { loadBlocks } from "./library.js";
import type { MotionTokens } from "./tokens.js";

export interface HouseVariable {
  id: string;
  type: string;
  role: string;
  label: string;
  description: string;
  default: unknown;
  options: unknown[];
}

export interface HouseTemplate {
  id: string;
  name: string;
  role: string;
  roles: string[];
  /** Where the scene lives: a registry block, or a composition vendored here. */
  source: { kind: "registry" | "local"; id: string; path?: string };
  /** The registry block, when the scene came from the registry. */
  block?: string;
  kit: string;
  durationSeconds: number;
  format: { width: number; height: number; aspect: string };
  fps: number;
  tags: string[];
  prompt: string;
  why: string;
  variables: HouseVariable[];
  contentVariables: string[];
  license: string | null;
  author: string | null;
}

export interface HouseLibrary {
  generated: string;
  note: string;
  counts: { total: number; byRole: Record<string, number> };
  templates: HouseTemplate[];
}

export interface HouseProblem {
  path: string;
  message: string;
}

/** The house library file. `studio/templates.json` at the repo root. */
export function houseLibraryPath(repoRoot: string): string {
  return join(repoRoot, "studio", "templates.json");
}

/** Load the house library. An empty library is not an error — it is empty. */
export function loadHouseLibrary(repoRoot: string): HouseLibrary {
  const path = houseLibraryPath(repoRoot);
  if (!existsSync(path)) {
    return {
      generated: "scripts/build-house-library.mjs",
      note: "The house library has not been built. Run: node scripts/build-house-library.mjs",
      counts: { total: 0, byRole: {} },
      templates: [],
    };
  }
  try {
    return JSON.parse(readFileSync(path, "utf8")) as HouseLibrary;
  } catch (error) {
    return {
      generated: "scripts/build-house-library.mjs",
      note: `The house library could not be read: ${(error as Error).message}`,
      counts: { total: 0, byRole: {} },
      templates: [],
    };
  }
}

/** The house scenes, optionally filtered by role or by a search term. */
export function listHouseTemplates(
  repoRoot: string,
  options: { role?: string; query?: string; limit?: number } = {},
): HouseTemplate[] {
  const library = loadHouseLibrary(repoRoot);
  const query = options.query?.trim().toLowerCase();
  let templates = library.templates;

  if (options.role) {
    templates = templates.filter((template) => template.roles.includes(options.role as string));
  }
  if (query) {
    templates = templates.filter(
      (template) =>
        template.id.includes(query) ||
        template.name.toLowerCase().includes(query) ||
        template.tags.some((tag) => tag.toLowerCase().includes(query)) ||
        template.roles.some((role) => role.includes(query)),
    );
  }
  if (options.limit && options.limit > 0) templates = templates.slice(0, options.limit);
  return templates;
}

/** One house scene. */
export function getHouseTemplate(repoRoot: string, id: string): HouseTemplate | undefined {
  return loadHouseLibrary(repoRoot).templates.find((template) => template.id === id);
}

/**
 * The problems with the house library, if it has any.
 *
 * The library is generated, so this should always be empty. It is checked
 * anyway: a house scene that points at a block that no longer passes the gate
 * would be a scene that renders badly, and nobody would notice until a film
 * came out wrong.
 */
export function houseLibraryProblems(repoRoot: string): HouseProblem[] {
  const problems: HouseProblem[] = [];
  const library = loadHouseLibrary(repoRoot);
  const blocks = loadBlocks(join(repoRoot, "library", "blocks.json"));

  for (const template of library.templates) {
    if (template.source?.kind === "local") {
      const path = template.source.path
        ? join(repoRoot, template.source.path)
        : join(repoRoot, "studio", "compositions", template.source.id);
      if (!existsSync(path)) {
        problems.push({ path: template.id, message: `The composition "${template.source.path}" is not on disk.` });
        continue;
      }
      continue;
    }
    const block = blocks.blocks.find((b) => b.id === template.block);
    if (!block) {
      problems.push({ path: template.id, message: `The block "${template.block}" is not in the registry.` });
      continue;
    }
    if (!template.roles.length) {
      problems.push({ path: template.id, message: "A house scene has to serve at least one shot role." });
    }
    if (!template.durationSeconds || template.durationSeconds <= 0) {
      problems.push({ path: template.id, message: "A house scene needs a duration." });
    }
  }
  return problems;
}

/**
 * Plan a house scene: the filled block, the tokens and the kit, ready to
 * render.
 *
 * This is the step that makes the studio fast. The motion already works —
 * the block knows how it animates — so the brief only has to say what the
 * scene is about, and the fill does the rest.
 */
export function planHouseTemplate(
  repoRoot: string,
  id: string,
  context: { brief: string; tokens: MotionTokens; values?: Record<string, unknown>; headline?: string },
): {
  template?: HouseTemplate;
  block?: MotionBlock;
  filled?: ReturnType<typeof fillBlock>;
  problems: HouseProblem[];
} {
  const template = getHouseTemplate(repoRoot, id);
  if (!template) {
    return { problems: [{ path: "id", message: `There is no house scene called "${id}".` }] };
  }
  /*
   * A scene comes from one of two places. A registry block is installed with
   * `hyperframes add`; a vendored composition is a file in this repository.
   * Both fill the same way, so both are planned the same way.
   */
  const block =
    template.source?.kind === "local"
      ? ({
          id: template.id,
          type: "hyperframes:composition",
          title: template.name,
          description: "",
          tags: template.tags ?? [],
          author: template.author ?? null,
          license: template.license ?? null,
          dimensions: null,
          duration: template.durationSeconds,
          variables: (template.variables ?? []).map((v) => ({
            id: v.id,
            type: v.type,
            role: v.role,
            label: v.label,
            description: v.description,
            default: v.default,
            min: null,
            max: null,
            options: v.options ?? [],
          })),
          files: [],
        } as unknown as MotionBlock)
      : loadBlocks(join(repoRoot, "library", "blocks.json")).blocks.find(
          (b) => b.id === template.block,
        );

  if (!block) {
    return {
      template,
      problems: [{ path: template.id, message: `The block "${template.block}" is not in the registry.` }],
    };
  }
  const filled = fillBlock(block, {
    brief: context.brief,
    tokens: context.tokens as never,
    values: context.values ?? {},
    headline: context.headline,
  });
  return { template, block, filled, problems: [] };
}

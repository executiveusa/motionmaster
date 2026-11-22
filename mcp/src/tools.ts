/**
 * Motion Master MCP tool definitions.
 *
 * Every tool returns real, structured data:
 *   - the skills come from the plugin package on disk,
 *   - the tokens come from plugins/motion-master/assets/motion-tokens.json,
 *   - the clips come from site/src/clips.json,
 *   - the storyboard is produced by a deterministic planner,
 *   - the composition is real, runnable Remotion TSX.
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Config } from "./config.js";
import { loadTokens, tokenSource, type MotionTokens } from "./tokens.js";
import { listSkills } from "./skills.js";
import { readGallery } from "./clips.js";
import { planVideo, type Storyboard } from "./planner.js";
import { buildComposition, normalizeStoryboard } from "./composer.js";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { MontageClient, validateTimeline } from "./montage.js";
import { toMontageDocument, isTimelineDocument } from "./montage-timeline.js";
import { LICENCE, licenceSentence } from "./licence.js";
import {
  browse,
  getItem,
  listCategories,
  loadBlocks,
  loadCatalogue,
} from "./library.js";
import { enhance, type TokenShape } from "./enhancer.js";
import { requestHunyuanVisual } from "./hunyuan-prompt.js";
import {
  PLACEMENTS,
  placement,
  checkCopy,
  cropLoss,
  safeAreaOf,
  safeZoneFractions,
  preflight,
  type PlacementId,
} from "./meta.js";
import { execFileSync } from "node:child_process";
import {
  Supervisor,
  defaultLedgerPath,
  readLedger,
  supervisorMain,
} from "./supervisor.js";
import { inboxDir, submitBrief } from "./inbox.js";
import { readMetrics } from "./metrics.js";
import { statSync } from "node:fs";
import {
  fillBlock,
  headlineFrom,
  matchBlocks,
  type MotionBlock,
} from "./blocks.js";
import { buildHyperFramesProject, GSAP_FILE } from "./hyperframes-composer.js";
import {
  planFilm,
  buildFilmProject,
  rebuildHost,
  writeHostComposition,
  copyKitFiles,
  type FilmPlan,
  type KitTake,
} from "./film.js";
import {
  filmsDir,
  filmSlug,
  listFilms,
  renderProject,
  videoSeconds,
  writeFilmMeta,
  readJob,
  writeJob,
  type RenderJob,
} from "./render.js";
import { loadVerdicts, recordVerdict } from "./verdicts.js";
import { loadBlockRoles } from "./roles.js";
import { gateProject } from "./render.js";
import { isAbsolute } from "node:path";
import {
  BOARD_SYNC_ARTIFACTS, BoardSyncError, cancelBoardSyncJob, checkReadiness, listBoardSyncJobs, readBoardSyncJob, startBoardSyncJob,
} from "./board-sync.js";
import {
  getShot,
  loadShots,
  matchShots,
  planShots,
  SHOT_ROLES,
  type ShotRole,
} from "./shots.js";
import {
  getEffect,
  loadEffectCategories,
  loadEffects,
  matchEffects,
} from "./effects.js";
import { browseSfx, getSfx, loadSfx, planSound, sfxFile } from "./sfx.js";
import {
  getBrandKit,
  listBrandKits,
  resolveTokens,
  saveBrandKit,
  type BrandKit,
  type KitProblem,
} from "./brandkit.js";
import {
  acquireSlot,
  cachedFilm,
  queueDirectoryName,
  queueKey,
  queueState,
  reconcileJobs,
  releaseSlot,
  renderRemotely,
} from "./queue.js";
import {
  getHouseTemplate,
  houseLibraryPath,
  houseLibraryProblems,
  listHouseTemplates,
  loadHouseLibrary,
  planHouseTemplate,
} from "./houselibrary.js";

type TextContent = { type: "text"; text: string };

function ok(payload: unknown): {
  content: TextContent[];
  structuredContent: Record<string, unknown>;
} {
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload as Record<string, unknown>,
  };
}

function fail(message: string, extra: Record<string, unknown> = {}): {
  content: TextContent[];
  structuredContent: Record<string, unknown>;
  isError: true;
} {
  return {
    content: [{ type: "text", text: JSON.stringify({ error: message, ...extra }, null, 2) }],
    structuredContent: { error: message, ...extra },
    isError: true,
  };
}

const GROUP_SCHEMA = z
  .enum(["all", "motion-master", "motion-design", "gsap", "remotion", "hyperframes"])
  .optional()
  .describe("Only return skills from this group.");

/** The schema every kit-aware tool shares. */
const BRAND_KIT_SCHEMA = z
  .string()
  .optional()
  .describe(
    "A brand kit id, for example \"house\". The kit overrides the canonical tokens for this work. " +
      "Call list_brand_kits to see what there is.",
  );

const PLANNED_ELEMENT_SCHEMA = z.object({
  name: z.string(),
  type: z.enum(["text", "shape", "clip", "graphic"]),
  note: z.string().optional(),
});

const PLANNED_STAGGER_SCHEMA = z.object({
  pattern: z.string(),
  elementCount: z.number(),
  intervalMs: z.number(),
  totalMs: z.number(),
  budgetMs: z.number(),
  withinBudget: z.boolean(),
  clamped: z.boolean(),
});

const PLANNED_BEAT_SCHEMA = z.object({
  index: z.number(),
  key: z.string(),
  label: z.string(),
  role: z.string(),
  easingRole: z.enum(["entrance", "exit", "onScreen"]),
  easing: z.object({
    name: z.string(),
    role: z.string(),
    cubicBezier: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  }),
  inSeconds: z.number(),
  outSeconds: z.number(),
  inFrame: z.number(),
  outFrame: z.number(),
  durationSeconds: z.number(),
  animationMs: z.number(),
  holdMs: z.number(),
  elements: z.array(PLANNED_ELEMENT_SCHEMA),
  stagger: PLANNED_STAGGER_SCHEMA,
  transition: z.object({
    type: z.string(),
    easing: z.string(),
    note: z.string(),
  }),
  notes: z.array(z.string()),
});

const STORYBOARD_SCHEMA = z.object({
  brief: z.string().optional(),
  template: z.string().optional(),
  style: z.string().optional(),
  fps: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  duration: z
    .object({ seconds: z.number().optional(), frames: z.number().optional() })
    .optional(),
  beats: z.array(PLANNED_BEAT_SCHEMA).optional(),
});

const TOKEN_GROUP_SCHEMA = z
  .enum([
    "all",
    "palette",
    "typography",
    "easing",
    "duration",
    "styleDurations",
    "spring",
    "stagger",
    "motion",
  ])
  .optional()
  .describe("Which part of the token set to return. Defaults to everything.");

/**
 * Read a local copy of GSAP so a generated project never reaches for a CDN.
 * Falls back to an empty string, which the tool reports rather than hides.
 */
function readGsap(repoRoot: string): string {
  const candidates = [
    join(repoRoot, "generator", "vendor", GSAP_FILE),
    join(repoRoot, "node_modules", "gsap", "dist", GSAP_FILE),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return readFileSync(c, "utf8");
  }
  return "";
}

export function registerTools(server: McpServer, config: Config): void {
  const tokens = () => loadTokens(config.tokensPath);

  /**
   * Resolve a brand kit id into the tokens a render should actually use.
   *
   * A kit that does not exist, or that has problems, falls back to the
   * canonical tokens rather than throwing: a missing brand must not be able
   * to stop a render. The problems are reported alongside the result so the
   * caller can see that the brand was not applied.
   */
  const kitProblems = (id?: string): { kit?: BrandKit; problems: KitProblem[] } => {
    if (!id) return { problems: [] };
    const found = getBrandKit(config.repoRoot, id, tokens());
    return { kit: found.kit, problems: found.problems };
  };

  const tokensFor = (kitId?: string): { tokens: MotionTokens; kit?: BrandKit; problems: KitProblem[] } => {
    const base = tokens();
    if (!kitId) return { tokens: base, problems: [] };
    const found = kitProblems(kitId);
    if (!found.kit) return { tokens: base, problems: found.problems };
    return { tokens: resolveTokens(base, found.kit), kit: found.kit, problems: found.problems };
  };

  server.registerTool(
    "list_skills",
    {
      title: "List motion skills",
      description:
        "List the motion skills bundled with the Motion Master plugin and what each one teaches. " +
        "Use this to decide which specialised skill to load before writing animation code.",
      inputSchema: {
        group: GROUP_SCHEMA,
        name: z.string().optional().describe("Return only the skill with this name."),
      },
    },
    async ({ group, name }) => {
      const all = listSkills(config.skillsDir);
      if (all.length === 0) {
        return fail(
          `No skills were found at ${config.skillsDir}. The plugin package may be missing its skills/ directory.`,
        );
      }
      const filtered = all.filter((skill) => {
        if (name && skill.name !== name) return false;
        if (group && group !== "all" && skill.group !== group) return false;
        return true;
      });
      return ok({
        count: filtered.length,
        total: all.length,
        source: config.skillsDir,
        router: "skills/motion-master/SKILL.md",
        note:
          "Start at the router (skills/motion-master/SKILL.md) and load only the specialised skills it names.",
        skills: filtered,
      });
    },
  );

  server.registerTool(
    "get_motion_tokens",
    {
      title: "Get motion tokens",
      description:
        "Return the Motion Master timing, easing, duration, spring, stagger, palette and typography tokens. " +
        "These are the values every generated composition must use.",
      inputSchema: {
        group: TOKEN_GROUP_SCHEMA,
        brand_kit: BRAND_KIT_SCHEMA,
      },
    },
    async ({ group, brand_kit }) => {
      const resolved = tokensFor(brand_kit);
      const all = resolved.tokens;
      const groups = group && group !== "all" ? [group] : Object.keys(all);
      const selected: Record<string, unknown> = {};
      for (const key of groups) {
        if (key in all) selected[key] = (all as Record<string, unknown>)[key];
      }
      return ok({
        source: tokenSource(config.tokensPath),
        canonicalPath: config.tokensPath,
        kit: resolved.kit ? { id: resolved.kit.id, name: resolved.kit.name } : undefined,
        kitProblems: resolved.problems,
        version: all.version,
        name: all.name,
        doctrine: {
          entrance: all.easing.entrance.role,
          exit: all.easing.exit.role,
          onScreen: all.easing.onScreen.role,
          staggerBudgetMs: all.stagger.budgetMs,
        },
        tokens: selected,
      });
    },
  );

  /* ---- brand kits ------------------------------------------------------ */

  server.registerTool(
    "list_brand_kits",
    {
      title: "List brand kits",
      description:
        "List the brand kits: the named, per-project overrides of the Motion Master tokens. A kit changes the " +
        "palette, the type, the easing or the timing for one brand without touching the canonical token file. " +
        "Call this before a render when the work is for a particular brand.",
      inputSchema: {},
    },
    async () => {
      const kits = listBrandKits(config.repoRoot);
      return ok({
        path: config.brandKitsPath,
        count: kits.length,
        note:
          "A kit overrides the canonical tokens. It may not remove a token and it may not change the system " +
          "identity. The house kit is the default for every render.",
        kits,
      });
    },
  );

  server.registerTool(
    "get_brand_kit",
    {
      title: "Get a brand kit",
      description:
        "Return one brand kit with the tokens it overrides and the resolved result, so a caller can see what " +
        "the render will actually use.",
      inputSchema: {
        id: z.string().describe("The kit id, for example \"house\"."),
      },
    },
    async ({ id }) => {
      const base = tokens();
      const { kit, problems } = getBrandKit(config.repoRoot, id, base);
      if (!kit) {
        return fail(`There is no usable kit called "${id}".`, {
          problems,
          available: listBrandKits(config.repoRoot).map((k) => k.id),
        });
      }
      const resolved = resolveTokens(base, kit);
      return ok({
        id: kit.id,
        name: kit.name,
        notes: kit.notes,
        path: join(config.brandKitsPath, `${kit.id}.json`),
        problems,
        overrides: kit,
        resolved: {
          palette: resolved.palette,
          typography: resolved.typography,
          easing: resolved.easing,
          duration: resolved.duration,
          styleDurations: resolved.styleDurations,
          motion: resolved.motion,
        },
      });
    },
  );

  server.registerTool(
    "save_brand_kit",
    {
      title: "Save a brand kit",
      description:
        "Write a brand kit from a brand brief. The kit is validated first: it may only override token sections " +
        "and tokens that exist, palette values must be hex, and the system identity may not be changed. A kit " +
        "with problems is not written.",
      inputSchema: {
        id: z.string().describe("Lowercase id, letters digits and dashes."),
        name: z.string().describe("The name people will read."),
        notes: z.string().optional().describe("What this kit is for."),
        palette: z.record(z.string(), z.string()).optional().describe("Token name to hex colour."),
        typography: z.record(z.string(), z.any()).optional().describe("Typography overrides, by token."),
        easing: z.record(z.string(), z.any()).optional(),
        duration: z.record(z.string(), z.any()).optional(),
        durationRanges: z.record(z.string(), z.any()).optional(),
        styleDurations: z.record(z.string(), z.any()).optional(),
        spring: z.record(z.string(), z.any()).optional(),
        stagger: z.record(z.string(), z.any()).optional(),
        motion: z.record(z.string(), z.any()).optional(),
      },
    },
    async (args) => {
      const base = tokens();
      const result = saveBrandKit(config.repoRoot, args, base);
      if (!result.saved) {
        return fail("The kit was not written because it has problems.", {
          problems: result.problems,
        });
      }
      return ok({
        saved: true,
        id: args.id,
        path: result.path,
        note: "The kit overrides the canonical tokens. Pass its id to the render tools to use it.",
      });
    },
  );

  server.registerTool(
    "queue_status",
    {
      title: "Render queue status",
      description:
        "What the render queue is doing: how many renders are running, how many are waiting, how many films " +
        "are on disk and how many of those are finished. A render that was interrupted is reported as failed, " +
        "so it can be asked for again.",
      inputSchema: {},
    },
    async () => {
      const interrupted = reconcileJobs(config.repoRoot);
      const state = queueState(config.repoRoot, {
        concurrency: Math.max(1, config.renderConcurrency),
        target: config.renderTarget,
        remoteUrl: config.renderRemoteUrl,
      });
      return ok({
        ...state,
        remoteConfigured: Boolean(config.renderRemoteUrl),
        remoteUrl: config.renderRemoteUrl ?? null,
        interrupted,
        note:
          "One render at a time by default: a render wants the whole machine. The same request renders once — " +
          "the key is a hash of the brief, the brand kit and the render options.",
      });
    },
  );

  server.registerTool(
    "list_house_templates",
    {
      title: "List the house scenes",
      description:
        "List the house library: the reusable scenes the studio renders from. Every one of them is a motion " +
        "block that passed the gate, filed under the shot roles it can serve, bound to a brand kit and " +
        "named down to its content variables. Pick a scene by what the shot has to do — an opening, a " +
        "number, a camera move, an end — rather than by searching for a prompt.",
      inputSchema: {
        role: z
          .string()
          .optional()
          .describe(
            "Only scenes that can serve this shot role: opening, typography, camera, data, effects, " +
              "interaction, ui-entrance, rhythm, transition, outro.",
          ),
        query: z.string().optional().describe("Search the scene names, ids and tags."),
        limit: z.number().int().positive().max(200).optional(),
      },
    },
    async ({ role, query, limit }) => {
      const library = loadHouseLibrary(config.repoRoot);
      const templates = listHouseTemplates(config.repoRoot, { role, query, limit });
      return ok({
        source: houseLibraryPath(config.repoRoot),
        total: library.counts.total,
        matched: templates.length,
        byRole: library.counts.byRole,
        problems: houseLibraryProblems(config.repoRoot),
        note:
          "Every scene here passed the gate. The motion already works: fill the content variables and it " +
          "renders.",
        templates: templates.map((template) => ({
          id: template.id,
          name: template.name,
          role: template.role,
          roles: template.roles,
          durationSeconds: template.durationSeconds,
          format: template.format,
          contentVariables: template.contentVariables,
          why: template.why,
        })),
      });
    },
  );

  server.registerTool(
    "get_house_template",
    {
      title: "Get one house scene",
      description:
        "Return one house scene in full: every variable it takes, what each one means, what it defaults to, " +
        "and the brief that produces it.",
      inputSchema: {
        id: z.string().describe("The scene id."),
      },
    },
    async ({ id }) => {
      const template = getHouseTemplate(config.repoRoot, id);
      if (!template) {
        return fail(`There is no house scene called "${id}".`, {
          hint: "Call list_house_templates to see what there is.",
        });
      }
      return ok({
        source: houseLibraryPath(config.repoRoot),
        template,
        problems: houseLibraryProblems(config.repoRoot),
      });
    },
  );

  server.registerTool(
    "plan_house_template",
    {
      title: "Plan a house scene from a brief",
      description:
        "Fill a house scene from a brief and return the scene's variables with their values, plus the tokens " +
        "and the kit it will render with. This is the fast path: the motion already works, so the brief only " +
        "has to say what the scene is about.",
      inputSchema: {
        id: z.string().describe("The scene id."),
        brief: z.string().describe("What the scene is about."),
        values: z.record(z.string(), z.any()).optional().describe("Explicit values by variable id. These always win."),
        headline: z.string().optional().describe("Override the headline."),
        brand_kit: BRAND_KIT_SCHEMA,
      },
    },
    async ({ id, brief, values, headline, brand_kit }) => {
      const resolvedKit = tokensFor(brand_kit);
      const planned = planHouseTemplate(config.repoRoot, id, {
        brief,
        tokens: resolvedKit.tokens,
        values,
        headline,
      });
      if (!planned.template || !planned.filled) {
        return fail(`There is no house scene called "${id}".`, { problems: planned.problems });
      }
      return ok({
        template: planned.template,
        filled: planned.filled,
        tokensSource: tokenSource(config.tokensPath),
        brandKit: resolvedKit.kit ? { id: resolvedKit.kit.id, name: resolvedKit.kit.name } : undefined,
        kitProblems: resolvedKit.problems,
        note:
          planned.template.source?.kind === "local"
            ? `The composition is in this repository at ${planned.template.source.path}. Copy it into a ` +
              "HyperFrames project, or point a host composition at it with data-composition-src. It " +
              "already passed the gate, so it renders as it is."
            : "Install the block with `npx hyperframes add <id>` and render it. The scene already " +
              "passed the gate, so it renders as it is.",
      });
    },
  );

  server.registerTool(
    "list_clips",
    {
      title: "List example clips",
      description:
        "List the rendered example clips in the Motion Master gallery, each with the exact prompt that produced it.",
      inputSchema: {
        id: z.string().optional().describe("Return only the clip with this id."),
        stack: z.string().optional().describe("Return only clips built with this stack."),
      },
    },
    async ({ id, stack }) => {
      const gallery = readGallery(config.clipsPath);
      const clips = gallery.clips.filter((clip) => {
        if (id && clip.id !== id) return false;
        if (stack && !clip.stack.toLowerCase().includes(stack.toLowerCase())) return false;
        return true;
      });
      return ok({
        available: gallery.available,
        source: gallery.source,
        note: gallery.note,
        count: clips.length,
        clips,
      });
    },
  );

  server.registerTool(
    "get_clip_prompt",
    {
      title: "Get the prompt behind a clip",
      description:
        "Return the exact prompt, stack and duration of one gallery clip, so it can be adapted into new work.",
      inputSchema: {
        id: z.string().describe("The clip id, for example \"launch-title\"."),
      },
    },
    async ({ id }) => {
      const gallery = readGallery(config.clipsPath);
      const clip = gallery.clips.find((entry) => entry.id === id);
      if (!clip) {
        return fail(`No clip with id "${id}" was found.`, {
          availableIds: gallery.clips.map((entry) => entry.id),
          source: gallery.source,
        });
      }
      return ok({
        id: clip.id,
        title: clip.title,
        prompt: clip.prompt,
        stack: clip.stack,
        duration: clip.duration,
        durationSeconds: clip.durationSeconds,
        src: clip.src,
        poster: clip.poster,
        alt: clip.alt,
        renderedWith: clip.renderedWith,
        bridgeDemo: clip.bridgeDemo,
        source: gallery.source,
      });
    },
  );

  server.registerTool(
    "list_shots",
    {
      title: "List motion shots",
      description:
        "List the shot cards: the authored vocabulary of shots, what each one is for, how long it runs " +
        "and how much energy it spends. Use this to choose the shape of a film before writing any code.",
      inputSchema: {
        role: z
          .enum(SHOT_ROLES as [ShotRole, ...ShotRole[]])
          .optional()
          .describe("Only shots in this role."),
        query: z.string().optional().describe("Match this against the shot's use-when line."),
        limit: z.number().optional().describe("How many to return (default 12)."),
      },
    },
    async ({ role, query, limit }) => {
      const shots = loadShots(config.skillsDir);
      if (shots.length === 0) {
        return fail(
          `No shot cards were found under ${config.skillsDir}. The shotcraft skill may be missing.`,
        );
      }
      const matched = query
        ? matchShots(shots, query, { limit: limit ?? 12 })
        : shots
            .filter((s) => !role || s.role === role)
            .slice(0, limit ?? 12);
      return ok({
        count: matched.length,
        total: shots.length,
        roles: SHOT_ROLES,
        source: {
          skill: "shotcraft",
          upstream: "github.com/Vincentwei1021/video-shotcraft",
          licence: "Apache-2.0",
          path: "plugins/motion-master/skills/shotcraft/references/shots",
        },
        note:
          "Read the card at the path given before writing the shot. The card is the technique, not a summary of it.",
        shots: matched.map((m) =>
          "shot" in m ? m.shot : m,
        ),
      });
    },
  );

  server.registerTool(
    "get_shot",
    {
      title: "Get one shot card",
      description:
        "Return one shot card in full: its one-line description, when to use it, its duration, its energy " +
        "and the path to the card itself.",
      inputSchema: {
        id: z.string().describe("The shot id, for example \"opening/brand-ink-open\"."),
      },
    },
    async ({ id }) => {
      const shots = loadShots(config.skillsDir);
      const found = getShot(shots, id);
      if (!found) {
        return fail(
          `No shot card with id "${id}". The ids are the role and the card name, for example "opening/brand-ink-open".`,
        );
      }
      return ok({
        shot: found,
        note: `Read ${found.path} for the technique, its parameters and its known traps.`,
      });
    },
  );

  server.registerTool(
    "plan_shots",
    {
      title: "Plan the shots of a film",
      description:
        "Build a shot plan from a brief: an opening, the shots the brief asks for, and an ending, each " +
        "one an existing authored card. Use this before composing anything, so the film has a shape " +
        "before it has code.",
      inputSchema: {
        brief: z.string().describe("What the film is about."),
        durationSeconds: z
          .number()
          .optional()
          .describe("How long the film should run. The plan is trimmed to fit."),
        maxShots: z.number().optional().describe("How many shots at most (default 6)."),
      },
    },
    async ({ brief, durationSeconds, maxShots }) => {
      if (!brief || !brief.trim()) return fail("A brief is required.");
      const shots = loadShots(config.skillsDir);
      if (shots.length === 0) {
        return fail(
          `No shot cards were found under ${config.skillsDir}. The shotcraft skill may be missing.`,
        );
      }
      const plan = planShots(shots, brief, { durationSeconds, maxShots });
      return ok({
        ...plan,
        note:
          "Every shot here is an authored card. Read the card before you write the shot — the card carries " +
          "the parameters and the traps its author already hit.",
      });
    },
  );

  server.registerTool(
    "list_motion_effects",
    {
      title: "List motion effects",
      description:
        "List the effects on the shelf: small reusable pieces of craft — wipes, dissolves, impacts, counters, " +
        "weather — each one a file of code with no dependencies.",
      inputSchema: {
        category: z.string().optional().describe("Only effects in this category, for example \"transitions\"."),
        query: z.string().optional().describe("Match this against the effect's tags and description."),
        limit: z.number().optional().describe("How many to return (default 12)."),
      },
    },
    async ({ category, query, limit }) => {
      const effects = loadEffects(config.skillsDir);
      if (effects.length === 0) {
        return fail(
          `No effects were found under ${config.skillsDir}. The pixelfx skill may be missing.`,
        );
      }
      const matched = query
        ? matchEffects(effects, query, { limit: limit ?? 12 })
        : effects
            .filter((e) => !category || e.category === category)
            .slice(0, limit ?? 12);
      return ok({
        count: matched.length,
        total: effects.length,
        categories: loadEffectCategories(config.skillsDir).map((c) => ({
          id: c.id,
          count: c.count,
          summary: c.summary,
        })),
        source: {
          skill: "pixelfx",
          upstream: "github.com/patch-gg/pixelfx",
          licence: "MIT",
          path: "plugins/motion-master/skills/pixelfx/src",
        },
        note:
          "An effect is code, not a description. Open its path and use it rather than drawing something like it.",
        effects: matched.map((m) => ("effect" in m ? m.effect : m)),
      });
    },
  );

  server.registerTool(
    "get_motion_effect",
    {
      title: "Get one effect",
      description:
        "Return one effect in full: what it does, how long it runs, its tags, and the path to its source.",
      inputSchema: {
        id: z.string().describe("The effect id, for example \"transitions/glitch-wipe\"."),
      },
    },
    async ({ id }) => {
      const effects = loadEffects(config.skillsDir);
      const found = getEffect(effects, id);
      if (!found) {
        return fail(`No effect with id "${id}". The ids are the category and the name.`);
      }
      return ok({
        effect: found,
        note: `Open ${found.path} — the effect is the code there, with its options and its palette.`,
      });
    },
  );

  server.registerTool(
    "plan_video",
    {
      title: "Plan a video",
      description:
        "Turn a brief into a storyboard: numbered beats with in/out times, per-beat easing roles and a stagger plan " +
        "that follows the Motion Master doctrine (entrance eases out, exit eases in, on-screen eases in-out, " +
        "total stagger under 500ms). Deterministic: the same brief always returns the same storyboard.",
      inputSchema: {
        brief: z
          .string()
          .min(1)
          .describe("The brief, e.g. \"15s launch film, name reveal, hold 2s, calm exit\"."),
        duration_seconds: z
          .number()
          .positive()
          .optional()
          .describe("Target length. Parsed from the brief when omitted."),
        style: z
          .enum(["premium", "calm", "energetic", "snappy"])
          .optional()
          .describe("Timing personality. Inferred from the brief when omitted."),
        fps: z.number().int().positive().optional().describe("Frames per second (default 30)."),
        width: z.number().int().positive().optional().describe("Frame width (default 1920)."),
        height: z.number().int().positive().optional().describe("Frame height (default 1080)."),
        element_count: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("How many elements the main group has (\"9 words\"). Parsed from the brief when omitted."),
        hold_seconds: z
          .number()
          .positive()
          .optional()
          .describe("Length of the readable hold. Parsed from the brief when omitted."),
      },
    },
    async (args) => {
      const storyboard = planVideo(args, tokens());
      return ok(storyboard);
    },
  );

  server.registerTool(
    "build_composition",
    {
      title: "Build a Remotion composition",
      description:
        "Emit a runnable Remotion composition (TSX) for a storyboard, using the Motion Master motion, palette and " +
        "type tokens and a real <Composition> registration.",
      inputSchema: {
        brief: z
          .string()
          .optional()
          .describe("A brief to plan and build from. Optional when a storyboard is supplied."),
        storyboard: STORYBOARD_SCHEMA
          .optional()
          .describe("A storyboard produced by plan_video. Takes priority over brief."),
        id: z.string().optional().describe("Composition id (default: derived from the template)."),
        filename: z.string().optional().describe("Target filename (default src/index.tsx)."),
        fps: z.number().int().positive().optional(),
        width: z.number().int().positive().optional(),
        height: z.number().int().positive().optional(),
        duration_seconds: z.number().positive().optional(),
        style: z.enum(["premium", "calm", "energetic", "snappy"]).optional(),
        brand_kit: BRAND_KIT_SCHEMA,
      },
    },
    async (args) => {
      if (!args.brief && !args.storyboard) {
        return fail("Give the tool either a brief or a storyboard to build from.");
      }
      const resolvedKit = tokensFor(args.brand_kit);

      let storyboard: Storyboard;
      if (args.storyboard) {
        try {
          storyboard = normalizeStoryboard(
            args.storyboard as unknown as Partial<Storyboard>,
          );
        } catch (error) {
          return fail(
            error instanceof Error ? error.message : String(error),
          );
        }
      } else {
        storyboard = planVideo(
          {
            brief: args.brief ?? "",
            durationSeconds: args.duration_seconds,
            style: args.style,
            fps: args.fps,
            width: args.width,
            height: args.height,
          },
          tokens(),
        );
      }

      const composition = buildComposition(storyboard, resolvedKit.tokens, {
        id: args.id,
        filename: args.filename,
      });

      return ok({
        ...composition,
        storyboard,
        tokensSource: tokenSource(config.tokensPath),
        kit: resolvedKit.kit ? { id: resolvedKit.kit.id, name: resolvedKit.kit.name } : undefined,
        kitProblems: resolvedKit.problems,
      });
    },
  );

  server.registerTool(
    "list_library_categories",
    {
      title: "List library categories",
      description:
        "List every category in the open-source motion library with its item count, so you can see what is " +
        "available before you pick. 9 upstream collections are normalised into one index: style recipes, " +
        "production prompts, technique notes and a security-graded skill directory. Filter by collection or kind.",
      inputSchema: {
        collection: z
          .string()
          .optional()
          .describe("Only categories in this collection (see list_library_collections)."),
        kind: z
          .enum(["all", "prompt", "style", "skill", "case"])
          .optional()
          .describe("Only categories that contain items of this kind."),
        min_count: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Hide categories with fewer than this many items (default 1)."),
      },
    },
    async ({ collection, kind, min_count }) => {
      const catalogue = loadCatalogue(config.libraryPath);
      const categories = listCategories(catalogue, {
        collection,
        kind,
        minCount: min_count,
      });
      return ok({
        source: config.libraryPath,
        collections: catalogue.collections.map((c) => ({
          id: c.id,
          title: c.title,
          count: c.count,
          license: c.license,
        })),
        counts: catalogue.counts,
        categoryCount: categories.length,
        categories,
        note:
          "Pick a category, then call browse_library with that category slug. " +
          "For a named look, filter kind=style — each style item carries a ready-to-paste recipe.",
      });
    },
  );

  server.registerTool(
    "list_library_collections",
    {
      title: "List library collections",
      description:
        "List the 9 upstream open-source collections in the library, with licence, item count and homepage. " +
        "Useful before shipping anything: four of them cannot go into a commercial product without a licence change.",
      inputSchema: {},
    },
    async () => {
      const catalogue = loadCatalogue(config.libraryPath);
      return ok({
        source: config.libraryPath,
        collections: catalogue.collections,
        licences: {
          shippable: catalogue.collections
            .filter((c) => /MIT|CC0|CC-BY-4\.0|Apache/i.test(c.license))
            .map((c) => c.id),
          restricted: catalogue.collections
            .filter((c) => !/MIT|CC0|CC-BY-4\.0|Apache/i.test(c.license))
            .map((c) => ({ id: c.id, licence: c.license })),
        },
      });
    },
  );

  server.registerTool(
    "browse_library",
    {
      title: "Browse the motion library",
      description:
        "Search and filter the open-source motion library. Combine a category with a query, a collection, a " +
        "kind or a tag. Every returned item carries its prompt, its author, its source link and its licence.",
      inputSchema: {
        category: z.string().optional().describe("A category slug from list_library_categories."),
        query: z.string().optional().describe("Free text. Matches title, summary, prompt and tags."),
        collection: z.string().optional().describe("Restrict to one upstream collection."),
        kind: z
          .enum(["all", "prompt", "style", "skill", "case"])
          .optional()
          .describe("Restrict to one kind of item."),
        tag: z.string().optional().describe("Restrict to one tag."),
        license: z.string().optional().describe("Restrict to items with exactly this licence string."),
        limit: z.number().int().positive().max(100).optional().describe("Items to return (default 20, max 100)."),
        offset: z.number().int().nonnegative().optional().describe("Skip this many items."),
      },
    },
    async (args) => {
      const catalogue = loadCatalogue(config.libraryPath);
      const result = browse(catalogue, args);
      return ok({
        source: config.libraryPath,
        ...result,
        items: result.items.map((i) => ({
          ...i,
          prompt: i.prompt ? i.prompt.slice(0, 1200) : "",
          promptTruncated: i.prompt.length > 1200,
        })),
        note:
          "Call get_library_item with an item id for the full prompt text.",
      });
    },
  );

  server.registerTool(
    "get_library_item",
    {
      title: "Get one library item",
      description:
        "Return one library item in full, including the complete prompt, the collection it came from, its " +
        "author, its original post link and its licence.",
      inputSchema: {
        id: z.string().describe("The item id, e.g. hiapi-styles:style-cinematic3d."),
      },
    },
    async ({ id }) => {
      const catalogue = loadCatalogue(config.libraryPath);
      const item = getItem(catalogue, id);
      if (!item) {
        return fail(`No library item with id "${id}".`, {
          hint: "Call browse_library or list_library_categories first.",
        });
      }
      return ok({ source: config.libraryPath, item });
    },
  );

  server.registerTool(
    "build_hyperframes_composition",
    {
      title: "Build a HyperFrames composition",
      description:
        "Turn a storyboard into a complete HyperFrames project — index.html with a seekable GSAP timeline, " +
        "the project manifest and a local copy of GSAP. HyperFrames is the Apache-2.0 HTML-to-video renderer: " +
        "the render is deterministic, the same composition produces the same frames every time, and nothing " +
        "is fetched from a CDN at render time. This is the generator Motion Master recommends over hand-rolled " +
        "canvas code, because it brings a lint and layout gate with it.",
      inputSchema: {
        storyboard: z
          .object({
            brief: z.string().optional(),
            template: z.string().optional(),
            style: z.string().optional(),
            fps: z.number().int().positive().optional(),
            width: z.number().int().positive().optional(),
            height: z.number().int().positive().optional(),
            duration: z
              .object({ seconds: z.number().optional(), frames: z.number().optional() })
              .optional(),
            doctrine: z.record(z.string(), z.any()).optional(),
            beats: z
              .array(
                z.object({
                  index: z.number().optional(),
                  key: z.string().optional(),
                  label: z.string().optional(),
                  role: z.string().optional(),
                  easingRole: z.string().optional(),
                  easing: z
                    .object({
                      name: z.string().optional(),
                      role: z.string().optional(),
                      cubicBezier: z.array(z.number()).optional(),
                    })
                    .optional(),
                  inSeconds: z.number().optional(),
                  outSeconds: z.number().optional(),
                  inFrame: z.number().optional(),
                  outFrame: z.number().optional(),
                  durationSeconds: z.number().optional(),
                  animationMs: z.number().optional(),
                  holdMs: z.number().optional(),
                  elements: z
                    .array(
                      z.object({
                        name: z.string(),
                        type: z.string(),
                        note: z.string().optional(),
                      }),
                    )
                    .optional(),
                  stagger: z
                    .object({
                      pattern: z.string().optional(),
                      elementCount: z.number().optional(),
                      intervalMs: z.number().optional(),
                      totalMs: z.number().optional(),
                      budgetMs: z.number().optional(),
                      withinBudget: z.boolean().optional(),
                      clamped: z.boolean().optional(),
                    })
                    .optional(),
                  transition: z.record(z.string(), z.any()).optional(),
                  notes: z.array(z.string()).optional(),
                }),
              )
              .describe("The beats to compose. Use plan_video to produce one."),
          })
          .describe("A storyboard. Get one from plan_video first."),
        project_name: z.string().optional().describe("Directory name for the project (default 'composition')."),
        brand_kit: BRAND_KIT_SCHEMA,
        include_gsap: z
          .boolean()
          .optional()
          .describe("Include the GSAP source so the project is self-contained (default true)."),
      },
    },
    async ({ storyboard, project_name, include_gsap, brand_kit }) => {
      let board: Storyboard;
      try {
        board = normalizeStoryboard(storyboard as Partial<Storyboard>);
      } catch (error) {
        return fail((error as Error).message, {
          hint: "Call plan_video first and pass the storyboard it returns.",
        });
      }
      const resolvedKit = tokensFor(brand_kit);
      const tokenFile = resolvedKit.tokens;
      let gsapSource = "";
      if (include_gsap !== false) {
        gsapSource = readGsap(config.repoRoot);
      }
      const result = buildHyperFramesProject(board, tokenFile as unknown as MotionTokens, {
        projectName: project_name ?? "composition",
        gsapSource,
      });
      return ok({
        generator: "hyperframes 0.8.186 (Apache-2.0)",
        kit: resolvedKit.kit ? { id: resolvedKit.kit.id, name: resolvedKit.kit.name } : undefined,
        kitProblems: resolvedKit.problems,
        storyboard: board,
        composition: result.composition,
        files: result.files.map((f) => ({
          path: f.path,
          bytes: Buffer.byteLength(f.contents),
          contents: f.contents.length > 20000 ? undefined : f.contents,
        })),
        commands: result.commands,
        notes: result.notes,
        install: "npx --yes hyperframes@0.8.186",
        nextSteps: [
          "Write the files to disk.",
          "npx hyperframes check <dir>  — lint, runtime validation and layout inspection as one gate.",
          "npx hyperframes render <dir> --output out.mp4 -f 30 -q delivery",
        ],
      });
    },
  );

  server.registerTool(
    "list_sfx_kinds",
    {
      title: "The sound vocabulary",
      description:
        "The kinds of sound the library holds — whoosh, hit, confirm, error, type, transition and the " +
        "rest — with what each one means and how many sounds are in it. This is the vocabulary the " +
        "site's buttons and the agent's search share, so a sound found by a person and a sound found " +
        "by an agent land in the same place.",
      inputSchema: {},
    },
    async () => {
      const catalogue = loadSfx(config.sfxPath);
      return ok({
        source: config.sfxPath,
        total: catalogue.counts.total,
        bySource: catalogue.counts.bySource,
        kinds: catalogue.kindVocabulary,
        note:
          "Each kind says what it means in words, so a sound can be asked for by what it is for " +
          "rather than by what it is called.",
      });
    },
  );

  server.registerTool(
    "browse_sfx",
    {
      title: "Browse the sound library",
      description:
        "Find sounds by kind, source, timbre, tag or length. Every sound carries its own licence, " +
        "its duration, its measured shape and a plain-language line saying what it sounds like and " +
        "when it belongs.",
      inputSchema: {
        kind: z.string().optional().describe("A kind from list_sfx_kinds, e.g. whoosh, hit, confirm."),
        source: z.enum(["earshot", "uisfx", "openverse"]).optional().describe("Where the sound came from."),
        timbre: z.string().optional().describe("The timbre family, e.g. minimal, mechanical, cinematic."),
        tag: z.string().optional().describe("A tag, e.g. transition, typing, success."),
        max_duration_ms: z.number().int().positive().optional().describe("Longest sound, in milliseconds."),
        min_duration_ms: z.number().int().positive().optional().describe("Shortest sound, in milliseconds."),
        limit: z.number().int().positive().max(100).optional().describe("How many to return (default 30)."),
        offset: z.number().int().nonnegative().optional().describe("Skip this many sounds."),
      },
    },
    async ({ kind, source, timbre, tag, max_duration_ms, min_duration_ms, limit, offset }) => {
      const catalogue = loadSfx(config.sfxPath);
      const result = browseSfx(catalogue, {
        kind,
        source,
        timbre,
        tag,
        maxDurationMs: max_duration_ms,
        minDurationMs: min_duration_ms,
        limit,
        offset,
      });
      return ok({
        source: config.sfxPath,
        total: result.total,
        returned: result.items.length,
        sounds: result.items.map((item) => ({
          id: item.id,
          kind: item.kind,
          source: item.source,
          timbre: item.timbre,
          title: item.title,
          description: item.description,
          use: item.use,
          durationMs: item.durationMs,
          attackMs: item.attackMs,
          centroidHz: item.centroidHz,
          licence: item.licence,
          author: item.author ?? item.creator,
          sourceUrl: item.sourceUrl,
          text: item.text,
        })),
      });
    },
  );

  server.registerTool(
    "search_sfx",
    {
      title: "Search the sound library in words",
      description:
        "Search by description rather than by name — \"a short bright pop for a button\", \"a deep hit " +
        "for the big reveal\", \"something reassuring and soft\". The search scores every sound against " +
        "the words over a plain-language line: what it is, when it belongs, how long it is and how it is " +
        "shaped. The words that join the sentence together are ignored, so the question can be asked the " +
        "way a person would ask it. The closest sounds come first, and each one says which of its words " +
        "matched.",
      inputSchema: {
        query: z.string().describe("What the sound should be like, in words."),
        limit: z.number().int().positive().max(50).optional().describe("How many to return (default 12)."),
      },
    },
    async ({ query, limit }) => {
      const catalogue = loadSfx(config.sfxPath);
      const result = browseSfx(catalogue, { query, limit: limit ?? 12 });
      return ok({
        query,
        total: result.total,
        sounds: result.items.map((item) => ({
          id: item.id,
          kind: item.kind,
          source: item.source,
          timbre: item.timbre,
          title: item.title,
          text: item.text,
          durationMs: item.durationMs,
          licence: item.licence,
          file: item.file,
          matched: result.scores?.[item.id]?.matched ?? [],
        })),
      });
    },
  );

  server.registerTool(
    "get_sfx",
    {
      title: "One sound, in full",
      description:
        "Everything about one sound: what it sounds like, when it belongs, its measured shape, its " +
        "licence, where it came from, and the file itself. For a sound that is code rather than a " +
        "recording, the recipe is included, so it can be re-rendered at another length or pitch.",
      inputSchema: {
        id: z.string().describe("The sound's id, e.g. earshot:whoosh_fast/crisp."),
      },
    },
    async ({ id }) => {
      const catalogue = loadSfx(config.sfxPath);
      const item = getSfx(catalogue, id);
      if (!item) {
        return fail(`No sound with the id "${id}".`, {
          hint: "Call list_sfx_kinds, or browse_sfx with a kind.",
        });
      }
      return ok({ ...item, filePath: sfxFile(config.repoRoot, item) });
    },
  );

  server.registerTool(
    "plan_sound",
    {
      title: "Plan the sound for a film",
      description:
        "Put sound under a storyboard. Each beat's role says what the picture is doing and therefore " +
        "what the ear should get: a setup leads in, a reveal lands just after the cut, a resolve " +
        "closes the phrase, an exit signs the film off. The result is a kit — a list of takes with " +
        "their times and levels — which render_film can then mix into the film.",
      inputSchema: {
        storyboard: z
          .object({
            brief: z.string().optional(),
            beats: z.array(
              z.object({
                index: z.number().optional(),
                label: z.string().optional(),
                role: z.string().optional(),
                inSeconds: z.number().optional(),
                outSeconds: z.number().optional(),
                durationSeconds: z.number().optional(),
              }),
            ),
          })
          .describe("The storyboard, as plan_video returns it."),
        limit: z.number().int().positive().max(12).optional().describe("How many takes (default 6)."),
      },
    },
    async ({ storyboard, limit }) => {
      const catalogue = loadSfx(config.sfxPath);
      const beats = (storyboard?.beats ?? []) as {
        index?: number;
        label?: string;
        role?: string;
        inSeconds?: number;
      }[];
      if (beats.length === 0) {
        return fail("The storyboard has no beats.", {
          hint: "Call plan_video first and pass the storyboard it returns.",
        });
      }
      const plan = planSound(catalogue, beats, { limit });
      return ok({
        source: config.sfxPath,
        beats: beats.length,
        takes: plan.takes,
        unplaced: plan.unplaced,
        note:
          "Each take says why it is there. Pass the takes to render_film as a kit to mix them in.",
      });
    },
  );

  server.registerTool(
    "list_motion_blocks",
    {
      title: "List HyperFrames motion blocks",
      description:
        "List the installable HyperFrames motion components — real, working motion blocks with tags, " +
        "dimensions and duration. This is the block catalogue you build films out of, not prompt text.",
      inputSchema: {
        tag: z.string().optional().describe("Filter by tag, e.g. transition, typography, kinetic-text."),
        type: z.enum(["block", "component"]).optional().describe("Filter by item type."),
        query: z.string().optional().describe("Free text search over name, title and description."),
        limit: z.number().int().positive().max(200).optional().describe("Items to return (default 40)."),
        offset: z.number().int().nonnegative().optional().describe("Skip this many items."),
      },
    },
    async ({ tag, type, query, limit, offset }) => {
      const file = loadBlocks(config.blocksPath);
      const q = query?.trim().toLowerCase();
      const filtered = file.blocks.filter((b) => {
        if (tag && !b.tags.includes(tag)) return false;
        if (type && b.type !== type) return false;
        if (q) {
          const hay = `${b.id} ${b.title} ${b.description} ${b.tags.join(" ")}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
      const lim = Math.min(limit ?? 40, 200);
      const off = offset ?? 0;
      return ok({
        source: config.blocksPath,
        generator: file.generated,
        upstream: file.source,
        total: filtered.length,
        libraryTotal: file.count,
        tags: file.tags.slice(0, 60),
        blocks: filtered.slice(off, off + lim).map((b) => ({
          id: b.id,
          type: b.type,
          title: b.title,
          description: b.description,
          tags: b.tags,
          author: b.author,
          dimensions: b.dimensions,
          duration: b.duration,
          variables: b.variables.map((v) => ({
            id: v.id,
            type: v.type,
            role: v.role,
            label: v.label,
            default: v.default,
          })),
          files: b.files.length,
        })),
        install: "npx hyperframes add <name>",
        note:
          "Each block is a working motion component with an editable variable schema. " +
          "Use fill_block to fill one from a brief, or compose_film to assemble a film from several.",
      });
    },
  );

    server.registerTool(
    "get_motion_block",
    {
      title: "Get one motion block in full",
      description:
        "The complete spec of a single HyperFrames motion block: every variable with its type, default " +
        "and role, every file the block is made of, its dimensions and duration. Use this before filling " +
        "a block, so the values you set are the ones the block actually reads.",
      inputSchema: {
        block: z.string().describe("The block id."),
        brief: z
          .string()
          .optional()
          .describe("If given, the block is also filled from this brief and the filled values are returned."),
        brand_kit: BRAND_KIT_SCHEMA,
      },
    },
    async ({ block, brief, brand_kit }) => {
      const file = loadBlocks(config.blocksPath);
      const found = file.blocks.find((b) => b.id === block);
      if (!found) {
        return fail(`No block with id "${block}".`, {
          hint: "Call list_motion_blocks to find one.",
        });
      }
      const payload: Record<string, unknown> = {
        source: config.blocksPath,
        generator: file.generated,
        block: {
          id: found.id,
          type: found.type,
          title: found.title,
          description: found.description,
          tags: found.tags,
          author: found.author,
          license: found.license,
          dimensions: found.dimensions,
          duration: found.duration,
          variables: found.variables.map((v) => ({
            id: v.id,
            type: v.type,
            role: v.role,
            label: v.label,
            description: v.description,
            default: v.default,
            min: v.min,
            max: v.max,
            options: v.options,
          })),
          files: found.files,
        },
      };
      if (brief) {
        const resolvedKit = tokensFor(brand_kit);
      const tokenFile = resolvedKit.tokens as unknown as TokenShape;
        payload.filled = fillBlock(found, {
          brief,
          tokens: tokenFile,
          values: {},
        });
      }
      return ok(payload);
    },
  );

  server.registerTool(
    "check_hyperframes",
    {
      title: "Run the HyperFrames gate",
      description:
        "Run the HyperFrames gate on a project directory. This is the check that catches what a render " +
        "cannot: a silent film, a frame stretched to nothing, text under the contrast floor, an element " +
        "with no id. It returns the findings with the file each one came from, so a failing block can be " +
        "named and dropped rather than guessed at. Run this before rendering.",
      inputSchema: {
        project: z
          .string()
          .describe("Path to the HyperFrames project directory, absolute or relative to the repository."),
        timeoutMs: z
          .number()
          .int()
          .positive()
          .max(600_000)
          .optional()
          .describe("How long the gate may run (default 180000)."),
      },
    },
    async ({ project, timeoutMs }) => {
      const dir = isAbsolute(project)
        ? project
        : join(config.repoRoot, project);
      if (!existsSync(dir)) {
        return fail(`No directory at "${project}".`, {
          hint: "Give the path to a HyperFrames project — the one build_hyperframes_composition writes.",
        });
      }
      const result = await gateProject(config.repoRoot, dir, timeoutMs ?? 180_000);
      return ok({
        project: dir,
        ok: result.ok,
        errors: result.errors,
        findings: result.findings,
        output: result.output,
        note: result.ok
          ? "The gate passed. This composition is safe to render."
          : "The gate failed. Every finding names the file it came from; fix it, or drop the block it came from.",
      });
    },
  );

server.registerTool(
    "fill_block",
    {
      title: "Fill a motion block from a brief",
      description:
        "Fill a HyperFrames motion block's variables from a brief. A block is a working motion component " +
        "with an editable schema — the headline strings, the image slots, the speed, the colour — so this " +
        "turns a sentence into a real composition that moves properly. Colour variables take the Motion " +
        "Master palette; a headline takes the subject of the brief; everything else keeps the block's own " +
        "default and says so.",
      inputSchema: {
        brief: z.string().describe("The brief to fill from."),
        block: z.string().optional().describe("The block id. Omit to let the matcher choose one."),
        tag: z.string().optional().describe("Prefer blocks with this tag."),
        values: z
          .record(z.string(), z.any())
          .optional()
          .describe("Explicit values by variable id. These always win."),
        headline: z.string().optional().describe("Override the headline."),
        brand_kit: BRAND_KIT_SCHEMA,
      },
    },
    async ({ brief, block, tag, values, headline, brand_kit }) => {
      const file = loadBlocks(config.blocksPath);
      const resolvedKit = tokensFor(brand_kit);
      const tokenFile = resolvedKit.tokens as unknown as TokenShape;

      let chosen: MotionBlock | undefined;
      let matched: { block: MotionBlock; score: number; matchedTags: string[] }[] = [];
      const known = loadVerdicts(config.repoRoot);
      if (block) {
        chosen = file.blocks.find((b) => b.id === block);
        if (!chosen) {
          return fail(`No block with id "${block}".`, {
            hint: "Call list_motion_blocks to find one.",
          });
        }
        /*
         * Asking for a block by name does not make it safe. The gate has
         * measured it and found it broken, so it is refused here too — with
         * the reason, so the caller can pick something else and know why.
         */
        const verdict = known[chosen.id];
        if (verdict && !verdict.ok) {
          return fail(`The gate rejected "${chosen.id}": ${verdict.reasons[0] ?? "it did not pass."}`, {
            hint: "Call list_motion_blocks for the blocks that passed.",
            block: chosen.id,
          });
        }
      } else {
        matched = matchBlocks(file, `${brief} ${tag ?? ""}`, {
          limit: 5,
          requireVariables: true,
          verdicts: known,
        });
        chosen = matched[0]?.block;
        if (!chosen) {
          return fail("No block matched that brief.", {
            hint: "Try a tag such as title-card, typography, reveal or transition.",
          });
        }
      }

      const filled = fillBlock(chosen, {
        brief,
        values: values as Record<string, unknown> | undefined,
        tokens: tokenFile,
        headline,
      });

      return ok({
        source: config.blocksPath,
        block: {
          id: chosen.id,
          title: chosen.title,
          tags: chosen.tags,
          author: chosen.author,
          dimensions: chosen.dimensions,
          duration: chosen.duration,
          license: chosen.license,
        },
        alternatives: matched
          .slice(1)
          .map((m) => ({ id: m.block.id, title: m.block.title, matchedTags: m.matchedTags })),
        filled: filled.variables,
        values: filled.values,
        unresolved: filled.unresolved,
        install: `npx hyperframes add ${chosen.id} --dir <project>`,
        nextSteps: [
          `npx hyperframes add ${chosen.id} --dir <project>`,
          "Render it with the values above, or let compose_film assemble the whole film.",
        ],
      });
    },
  );

  // ── board-sync: animate .m-root boards to a WAV with word timings ─────────
  server.registerTool(
    "board_sync_check",
    {
      title: "Check board-sync readiness",
      description:
        "Report whether this machine can run board-sync (Python environment, ffmpeg, a browser, packages, GSAP) " +
        "and where the input folders must live. Nothing is installed or started. Transcription is not exposed: " +
        "a words.tsv with word timings is required.",
      inputSchema: {},
    },
    async () => ok(checkReadiness(config)),
  );

  server.registerTool(
    "board_sync_start",
    {
      title: "Start a board-sync job",
      description:
        "Animate .m-root Design-Component boards to a final-cut WAV and its words.tsv, locally. `input` is one " +
        "folder name under the board-sync input root containing 02-cut (one .wav and one '... words.tsv'), " +
        "03-board-brief (script-marked.md, optional brief.md) and 04-boards (NN-Name.html). Reference boards " +
        "(seek()/.ebs) and boards without .m-root are rejected. Returns a job id; poll board_sync_status. " +
        "One job runs at a time. No cloud, no paid model.",
      inputSchema: {
        input: z.string().describe("Folder name under the input root, e.g. my-video."),
        only: z.string().optional().describe("Redo only these boards, e.g. 4,5."),
      },
    },
    async ({ input, only }) => {
      try {
        return ok(startBoardSyncJob(config, input, only));
      } catch (e) {
        if (e instanceof BoardSyncError) return fail(e.message);
        throw e;
      }
    },
  );

  server.registerTool(
    "board_sync_status",
    {
      title: "Board-sync job status",
      description:
        "Status of one board-sync job (running, ready, failed, cancelled), its log tail, and the artifacts it made. " +
        "Without an id, lists recent jobs. A job is only 'ready' when board-track.mp4 exists. Artifact download: " +
        "GET /api/v1/board-sync/jobs/{id}/artifacts/{name}. Names: " + BOARD_SYNC_ARTIFACTS.join(", ") + ".",
      inputSchema: { id: z.string().optional().describe("Job id (bs_...).") },
    },
    async ({ id }) => {
      try {
        if (!id) return ok({ jobs: listBoardSyncJobs(config) });
        const job = readBoardSyncJob(config, id);
        return job ? ok(job) : fail("Unknown job id.");
      } catch (e) {
        if (e instanceof BoardSyncError) return fail(e.message);
        throw e;
      }
    },
  );

  server.registerTool(
    "board_sync_cancel",
    {
      title: "Cancel a board-sync job",
      description: "Stop a running board-sync job, including its browser and ffmpeg children.",
      inputSchema: { id: z.string().describe("Job id (bs_...).") },
    },
    async ({ id }) => {
      try {
        cancelBoardSyncJob(config, id);
        return ok({ id, status: "cancelling" });
      } catch (e) {
        if (e instanceof BoardSyncError) return fail(e.message);
        throw e;
      }
    },
  );

  server.registerTool(
    "render_film",
    {
      title: "Build and render a film",
      description:
        "Build a real film from a brief and render it to an MP4 on this machine. The brief is turned " +
        "into a shot list of installed HyperFrames motion blocks, the blocks are mounted in one host " +
        "composition, the HyperFrames gate runs, and only then is the film encoded. The gate catches " +
        "what a render cannot — a silent film, a text below the contrast floor, a stretched frame — so a " +
        "rendered file here is a file that passed. Returns the film's paths and the URLs the console " +
        "plays and downloads it from.",
      inputSchema: {
        brief: z.string().describe("What the film is about, in one sentence."),
        shots: z.number().int().positive().max(6).optional().describe("How many shots (default 3)."),
        tags: z.array(z.string()).optional().describe("Require these tags, e.g. typography, transition."),
        title: z.string().optional().describe("The film's title. Defaults to a slug of the brief."),
        fps: z.number().int().positive().max(60).optional().describe("Frame rate (default 30)."),
        build_only: z
          .boolean()
          .optional()
          .describe("Build the project and run the gate, but do not render the MP4."),
        sound: z
          .boolean()
          .optional()
          .describe("Mix sound under the film (default true). False makes a silent film."),
        kit: z
          .array(
            z.object({
              id: z.string().describe("A sound id from browse_sfx or search_sfx."),
              at_seconds: z.number().min(0).optional().describe("When it lands, in seconds."),
              level: z.number().min(0).max(1).optional().describe("How loud, 0 to 1."),
              role: z.string().optional().describe("What it is doing there."),
            }),
          )
          .optional()
          .describe("The sound to mix in. Without it the kit is planned from the shot list."),
        wait: z
          .boolean()
          .optional()
          .describe("Wait for the render and return the finished file. For a terminal, not a chat."),
        brand_kit: BRAND_KIT_SCHEMA,
        target: z
          .enum(["local", "remote"])
          .optional()
          .describe(
            "Where the render runs: here, or on another Motion Master instance. Remote needs " +
              "MOTION_MASTER_RENDER_REMOTE_URL on the server.",
          ),
      },
    },
    async ({ brief, shots, tags, title, fps, build_only, wait, sound, kit: kitInput, brand_kit, target }) => {
      const file = loadBlocks(config.blocksPath);
      const resolvedKit = tokensFor(brand_kit);
      const tokenFile = resolvedKit.tokens as unknown as TokenShape;

      const known = loadVerdicts(config.repoRoot);
      const plan = planFilm(brief, {
        blocks: file,
        tokens: tokenFile,
        count: shots ?? 3,
        tags,
        verdicts: known,
        roles: loadBlockRoles(config.blockRolesPath),
        exclude: Object.entries(known)
          .filter(([, verdict]) => !verdict.ok)
          .map(([id]) => id),
      });

      if (plan.shots.length === 0) {
        return fail("No motion block matched that brief.", {
          hint: "Name a look instead: title card, kinetic type, transition, product demo, data, brand.",
        });
      }

      /* The job is keyed by a hash of the request. The same request lands in
         the same directory, so asking for the same film twice returns the
         film that already exists instead of rendering it again. */
      const requestKey = queueKey({
        brief,
        brandKit: brand_kit,
        title: title ?? plan.headline,
        tags,
        count: shots ?? 3,
        fps: fps ?? 30,
      });
      const id = queueDirectoryName(filmSlug(title ?? plan.headline), requestKey);
      const directory = join(filmsDir(config.repoRoot), id);

      const already = cachedFilm(config.repoRoot, id);
      if (already && !build_only) {
        return ok({
          id,
          title: title ?? plan.headline,
          brief,
          directory,
          status: "ready",
          cached: true,
          requestKey,
          video: { name: "film.mp4", bytes: already.bytes },
          note: "This exact request has already been rendered. The file is the one below.",
        });
      }

      let kit: KitTake[] = [];

      let built: { plan: FilmPlan; skipped: { id: string; reason: string }[] };
      try {
        built = buildFilmProject(config.repoRoot, directory, plan, tokenFile, kit);
      } catch (error) {
        return fail("The film project could not be built.", {
          detail: error instanceof Error ? error.message : String(error),
          hint: "The blocks are installed from the HyperFrames registry, which needs the network.",
        });
      }

      /*
       * The sound.
       *
       * A film with no sound is a film with something missing, so the kit is
       * planned from the shot list when the caller does not supply one: each
       * cut gets the sound its role calls for, timed against the cut and
       * levelled for its part in the film.
       */
      if (kitInput && kitInput.length > 0) {
        const catalogue = loadSfx(config.sfxPath);
        for (const take of kitInput) {
          const item = getSfx(catalogue, take.id);
          if (!item) continue;
          kit.push({
            id: item.id,
            atSeconds: take.at_seconds ?? 0,
            level: take.level ?? 0.4,
            file: item.file,
            durationMs: item.durationMs,
            title: item.title,
            role: take.role ?? "develop",
          });
        }
      } else if (sound !== false) {
        const catalogue = loadSfx(config.sfxPath);
        let cursor = 0;
        const beats = built.plan.shots.map((shot, index) => {
          const beat = {
            index,
            label: shot.title,
            role:
              index === 0
                ? "setup"
                : index === built.plan.shots.length - 1
                  ? "exit"
                  : "reveal",
            inSeconds: cursor,
          };
          cursor += shot.duration;
          return beat;
        });
        kit = planSound(catalogue, beats).takes.map((take) => ({
          id: take.id,
          atSeconds: take.atSeconds,
          level: take.level,
          file: take.file,
          durationMs: take.durationMs,
          title: take.title,
          role: take.role,
        }));
      }

      if (kit.length > 0) {
        copyKitFiles(config.repoRoot, directory, kit);
        writeHostComposition(built.plan, directory, tokenFile, kit);
      }

      if (built.plan.shots.length === 0) {
        return fail("None of the matched blocks could be mounted.", {
          skipped: built.skipped,
          hint: "Try a different brief, or ask for a look the registry has as a whole composition.",
        });
      }

      if (build_only) {
        return ok({
          id,
          title: title ?? plan.headline,
          brief,
          directory,
          brandKit: resolvedKit.kit ? { id: resolvedKit.kit.id, name: resolvedKit.kit.name } : undefined,
          kitProblems: resolvedKit.problems,
          headline: plan.headline,
          durationSeconds: built.plan.total,
          shotList: built.plan.shots.map((s) => ({
            id: s.id,
            title: s.title,
            duration: s.duration,
            unresolved: s.unresolved,
          })),
          skipped: built.skipped,
          note: "The project is on disk and the gate has not run yet.",
          nextSteps: ["Call render_film again without build_only to gate and render it."],
        });
      }

      /*
       * The render runs on its own. A render takes minutes and an MCP call
       * times out at a minute, so the tool answers at once and the console
       * polls for the file. Call it with wait=true to block for the file —
       * that is for a terminal, not for a chat.
       */
      const job: RenderJob = {
        id,
        status: "rendering",
        startedAt: new Date().toISOString(),
        shots: built.plan.shots.map((s) => ({
          id: s.id,
          title: s.title,
          duration: s.duration,
        })),
      };
      writeJob(config.repoRoot, job);

      const run = async (): Promise<void> => {
        let plan = built.plan;

        /* The remote target. The heavy work goes to another instance, which
           runs its own queue and its own gate. The file lands there. */
        const where = target ?? config.renderTarget;
        if (where === "remote") {
          const remoteUrl = config.renderRemoteUrl;
          if (!remoteUrl) {
            job.status = "failed";
            job.finishedAt = new Date().toISOString();
            job.error =
              "A remote render needs MOTION_MASTER_RENDER_REMOTE_URL set on the server. There is no remote instance configured.";
            writeJob(config.repoRoot, job);
            return;
          }
          const remote = await renderRemotely({
            remoteUrl,
            request: { brief, shots: shots ?? 3, tags, title: title ?? plan.headline, sound: sound !== false },
          });
          if (!remote.ok) {
            job.status = "failed";
            job.finishedAt = new Date().toISOString();
            job.error = remote.error;
            writeJob(config.repoRoot, job);
            return;
          }
          job.remote = {
            url: remoteUrl,
            id: remote.id,
            statusUrl: remote.statusUrl,
            videoUrl: remote.videoUrl,
          };
          job.status = "ready";
          job.finishedAt = new Date().toISOString();
          job.shots = plan.shots.map((s) => ({ id: s.id, title: s.title, duration: s.duration }));
          writeJob(config.repoRoot, job);
          writeFilmMeta(directory, {
            id,
            title: title ?? plan.headline,
            brief,
            createdAt: new Date().toISOString(),
            remote: job.remote,
          });
          return;
        }

        let result = await renderProject(config.repoRoot, directory, { fps: fps ?? 30 });
        const dropped: { id: string; reasons: string[] }[] = [];

        // Gate, render, and if the gate blames a block, drop that block and
        // try again. The registry has components that clip their own text or
        // put a label under the contrast floor. A block that fails is
        // recorded, so the next film does not pay to learn it again.
        for (let round = 0; round < 3 && !result.ok; round += 1) {
          const blamed = new Set<string>();
          const reasons = new Map<string, string[]>();
          for (const finding of result.gate?.findings ?? []) {
            if (!finding.sourceFile) continue;
            const shot = plan.shots.find((candidate) => candidate.src === finding.sourceFile);
            if (!shot || blamed.has(shot.id)) continue;
            blamed.add(shot.id);
            reasons.set(shot.id, [
              ...(reasons.get(shot.id) ?? []),
              `${finding.code}: ${finding.message}`,
            ]);
          }
          if (blamed.size === 0) break;

          // One block at a time. Dropping several at once can empty the film,
          // and then there is nothing left to check.
          const [worst] = [...blamed];
          const why = reasons.get(worst) ?? ["the gate rejected it"];
          dropped.push({ id: worst, reasons: why });
          recordVerdict(config.repoRoot, worst, false, why.length, why);

          plan = rebuildHost(directory, plan, tokenFile, [worst], kit);
          if (plan.shots.length === 0) break;
          result = await renderProject(config.repoRoot, directory, { fps: fps ?? 30 });
        }

        if (!result.ok) {
          job.status = "failed";
          job.finishedAt = new Date().toISOString();
          job.error =
            plan.shots.length === 0
              ? "Every shot in this film was rejected by the gate, so there was nothing left to render."
              : "The gate stopped the render, so no file was produced.";
          job.dropped = dropped;
          writeJob(config.repoRoot, job);
          return;
        }

        const seconds = result.video ? videoSeconds(result.video.path) : undefined;
        writeFilmMeta(directory, {
          id,
          title: title ?? plan.headline,
          brief,
          createdAt: new Date().toISOString(),
          seconds,
          gate: result.gate,
        });
        job.status = "ready";
        job.finishedAt = new Date().toISOString();
        job.seconds = seconds;
        job.shots = plan.shots.map((s) => ({ id: s.id, title: s.title, duration: s.duration }));
        job.dropped = dropped;
        writeJob(config.repoRoot, job);
      };

      /*
       * The queue.
       *
       * A render takes minutes and it wants the whole machine: a browser, a
       * Node render server and ffmpeg. Agents fire renders at once, so the
       * renders take a slot from the queue and wait their turn. One at a
       * time by default, because the default machine has two cores.
       */
      const limit = Math.max(1, config.renderConcurrency);
      const running = (async () => {
        await acquireSlot(limit);
        try {
          await run();
        } finally {
          releaseSlot();
        }
      })().catch((error: unknown) => {
        job.status = "failed";
        job.finishedAt = new Date().toISOString();
        job.error = error instanceof Error ? error.message : String(error);
        writeJob(config.repoRoot, job);
      });

      if (wait) {
        await running;
        const finished = readJob(config.repoRoot, id);
        return ok({
          id,
          title: title ?? plan.headline,
          brief,
          headline: plan.headline,
          directory,
          status: finished?.status ?? "failed",
          error: finished?.error,
          dropped: finished?.dropped,
          durationSeconds: finished?.seconds ?? built.plan.total,
          shotList: finished?.shots ?? [],
          kit: kit.map((take) => ({
            id: take.id,
            title: take.title,
            atSeconds: take.atSeconds,
            level: take.level,
            role: take.role,
          })),
          file: finished?.status === "ready" ? { name: "film.mp4", url: `/films/${id}/video` } : undefined,
          poster: finished?.status === "ready" ? { name: "poster.png", url: `/films/${id}/poster` } : undefined,
          contactSheet:
            finished?.status === "ready" ? { name: "contact-sheet.jpg", url: `/films/${id}/sheet` } : undefined,
        });
      }

      return ok({
        id,
        title: title ?? plan.headline,
        brief,
        headline: plan.headline,
        directory,
        brandKit: resolvedKit.kit ? { id: resolvedKit.kit.id, name: resolvedKit.kit.name } : undefined,
        kitProblems: resolvedKit.problems,
        status: "rendering",
        requestKey,
        target: target ?? config.renderTarget,
        queue: queueState(config.repoRoot, {
          concurrency: Math.max(1, config.renderConcurrency),
          target: config.renderTarget,
          remoteUrl: config.renderRemoteUrl,
        }),
        kit: kit.map((take) => ({
          id: take.id,
          title: take.title,
          atSeconds: take.atSeconds,
          level: take.level,
          role: take.role,
        })),
        durationSeconds: built.plan.total,
        shotList: built.plan.shots.map((s) => ({
          id: s.id,
          title: s.title,
          duration: s.duration,
          unresolved: s.unresolved,
        })),
        skipped: built.skipped,
        file: { name: "film.mp4", url: `/films/${id}/video` },
        poster: { name: "poster.png", url: `/films/${id}/poster` },
        contactSheet: { name: "contact-sheet.jpg", url: `/films/${id}/sheet` },
        note:
          "The render is running on this machine. It takes a minute or two. " +
          "Call film_status with this id, or let the console poll — the file appears at /films/" +
          id +
          "/video when it is ready.",
      });
    },
  );

  server.registerTool(
    "list_films",
    {
      title: "List the films made on this machine",
      description:
        "Every film that has been rendered here, with its length, when it was made, and the URL the " +
        "console plays it from.",
      inputSchema: {
        limit: z.number().int().positive().max(50).optional().describe("How many to return (default 20)."),
      },
    },
    async ({ limit }) => {
      const films = listFilms(config.repoRoot).map((film) => {
        const job = readJob(config.repoRoot, film.id);
        return {
          id: film.id,
          title: film.title,
          brief: film.brief,
          createdAt: film.createdAt,
          seconds: film.seconds,
          status: job?.status ?? (film.video ? "ready" : "unknown"),
          error: job?.error,
          videoUrl: film.video ? `/films/${film.id}/video` : undefined,
          posterUrl: film.poster ? `/films/${film.id}/poster` : undefined,
          sheetUrl: film.sheet ? `/films/${film.id}/sheet` : undefined,
        };
      });
      return ok({ count: films.length, films: films.slice(0, limit ?? 20) });
    },
  );

  server.registerTool(
    "film_status",
    {
      title: "Check on a rendered film",
      description:
        "Report where a film got to. The render runs on its own because it takes longer than a tool " +
        "call is allowed to wait. Ask again in a minute and the status moves from rendering to ready, " +
        "with the file's URL.",
      inputSchema: {
        id: z.string().describe("The film id returned by render_film."),
      },
    },
    async ({ id }) => {
      if (!/^[a-z0-9][a-z0-9-]*$/i.test(id)) {
        return fail("That is not a film id.");
      }
      const job = readJob(config.repoRoot, id);
      if (!job) {
        return fail(`No film with the id "${id}".`, {
          hint: "Call list_films to see what has been rendered.",
        });
      }
      return ok({
        id: job.id,
        status: job.status,
        startedAt: job.startedAt,
        finishedAt: job.finishedAt,
        seconds: job.seconds,
        error: job.error,
        dropped: job.dropped,
        shots: job.shots,
        file: job.status === "ready" ? { name: "film.mp4", url: `/films/${id}/video` } : undefined,
        poster: job.status === "ready" ? { name: "poster.png", url: `/films/${id}/poster` } : undefined,
        contactSheet:
          job.status === "ready" ? { name: "contact-sheet.jpg", url: `/films/${id}/sheet` } : undefined,
      });
    },
  );

  server.registerTool(
    "compose_film",
    {
      title: "Compose a film from motion blocks",
      description:
        "Pick the motion blocks whose tags fit a brief, fill each one from the brief, and return the shot " +
        "list with the variable values for every block. This is the assembly step: the blocks are real " +
        "working components, so the result is a film made of motion that already works, not a template.",
      inputSchema: {
        brief: z.string().describe("What the film is about."),
        count: z.number().int().positive().max(8).optional().describe("How many blocks (default 3)."),
        tags: z.array(z.string()).optional().describe("Require these tags."),
        values: z.record(z.string(), z.any()).optional().describe("Explicit values by variable id."),
        brand_kit: BRAND_KIT_SCHEMA,
      },
    },
    async ({ brief, count, tags, values, brand_kit }) => {
      const file = loadBlocks(config.blocksPath);
      const resolvedKit = tokensFor(brand_kit);
      const tokenFile = resolvedKit.tokens as unknown as TokenShape;
      const want = count ?? 3;

      const matched = matchBlocks(file, brief, {
        limit: want * 4,
        requireVariables: true,
      });
      if (matched.length === 0) {
        return fail("No block matched that brief.", {
          hint: "Try naming a look: title card, kinetic type, transition, product demo, data.",
        });
      }

      // One block per shot, and not two blocks that are the same idea.
      const chosen: MotionBlock[] = [];
      const usedTags = new Set<string>();
      for (const candidate of matched) {
        if (chosen.length >= want) break;
        const primary = candidate.block.tags[0] ?? candidate.block.id;
        if (usedTags.has(primary) && chosen.length > 0) continue;
        usedTags.add(primary);
        chosen.push(candidate.block);
      }

      const headline = headlineFrom(brief);
      const shots = chosen.map((block, index) => {
        const filled = fillBlock(block, {
          brief,
          values: values as Record<string, unknown> | undefined,
          tokens: tokenFile,
          headline,
        });
        return {
          index: index + 1,
          id: block.id,
          title: block.title,
          tags: block.tags,
          duration: block.duration,
          matchedTags: block.tags.filter((t) =>
            brief.toLowerCase().includes(t) || t.split("-").some((w) => brief.toLowerCase().includes(w)),
          ),
          values: filled.values,
          filled: filled.variables,
          unresolved: filled.unresolved,
          install: `npx hyperframes add ${block.id} --dir <project>`,
        };
      });

      const total = shots.reduce((sum, s) => sum + (s.duration ?? 5), 0);

      return ok({
        source: config.blocksPath,
        brief,
        headline,
        brandKit: resolvedKit.kit ? { id: resolvedKit.kit.id, name: resolvedKit.kit.name } : undefined,
        kitProblems: resolvedKit.problems,
        shotCount: shots.length,
        estimatedDurationSeconds: total,
        shots,
        note:
          "Each shot is a working HyperFrames block with its variables filled. " +
          "Install them with `npx hyperframes add <id>` and sequence them in one timeline.",
        nextSteps: shots.map((s) => s.install),
      });
    },
  );

  server.registerTool(
    "enhance_prompt",
    {
      title: "Enhance a weak motion prompt",
      description:
        "Strengthen a weak motion prompt into a complete brief. The enhancer is deterministic: it diagnoses " +
        "which parts of a motion brief are missing (format, duration, style, camera, timing, typography, " +
        "palette, audio, exclusions, production method), then rebuilds the prompt as a full brief using the " +
        "Motion Master motion tokens and a style recipe matched out of the library. It never invents facts " +
        "about your subject, and everything it assumes is reported back. Ask for this whenever a prompt " +
        "would otherwise return something generic.",
      inputSchema: {
        prompt: z.string().describe("The prompt to strengthen."),
        provider: z.enum(["motion-master", "hunyuan"]).optional().describe("Default is deterministic Motion Master; Hunyuan is optional and requires a licensed local worker."),
        duration_seconds: z.number().positive().optional().describe("Target duration in seconds (default 8)."),
        aspect: z.string().optional().describe("Aspect ratio (default 16:9)."),
        resolution: z.string().optional().describe("Pixel size (default 1920x1080)."),
        fps: z.number().int().positive().optional().describe("Frame rate (default 30)."),
        style: z.string().optional().describe("Force a named style instead of matching one."),
        style_collection: z.string().optional().describe("Draw the style recipe from this collection only."),
        extra_constraints: z
          .array(z.string())
          .optional()
          .describe("Extra constraint lines to append verbatim."),
        alternatives: z.number().int().positive().max(6).optional().describe("Alternative styles to offer."),
        brand_kit: BRAND_KIT_SCHEMA,
        plan_shots: z
          .boolean()
          .optional()
          .describe("Plan the shots from the shot cards first, and write that plan into the brief."),
        max_shots: z.number().int().positive().max(10).optional().describe("How many shots to plan (default 6)."),
      },
    },
    async (args) => {
      const catalogue = loadCatalogue(config.libraryPath);
      const resolvedKit = tokensFor(args.brand_kit);
      const tokenFile = resolvedKit.tokens as unknown as TokenShape;

      // A brief that already has a shape should not be given a second one.
      let shotPlan: ReturnType<typeof planShots>["shots"] | undefined;
      let shotSource: unknown;
      if (args.plan_shots) {
        const shots = loadShots(config.skillsDir);
        if (shots.length === 0) {
          return fail(
            `No shot cards were found under ${config.skillsDir}. The shotcraft skill may be missing.`,
          );
        }
        const plan = planShots(shots, args.prompt, {
          durationSeconds: args.duration_seconds,
          maxShots: args.max_shots,
        });
        shotPlan = plan.shots;
        shotSource = { plan: plan.shots, unresolved: plan.unresolved, source: plan.source };
      }

      const result = enhance(args.prompt, catalogue, tokenFile, {
        durationSeconds: args.duration_seconds,
        aspect: args.aspect,
        resolution: args.resolution,
        fps: args.fps,
        style: args.style,
        styleCollection: args.style_collection,
        extraConstraints: args.extra_constraints,
        alternatives: args.alternatives,
        shotPlan: shotPlan?.map((s) => ({
          id: s.id,
          role: s.role,
          summary: s.summary,
          duration: s.duration,
          durationSeconds: s.durationSeconds,
          energy: s.energy,
          reason: s.reason,
        })),
      });
      const suggestion = args.provider === "hunyuan"
        ? await requestHunyuanVisual(args.prompt)
        : null;
      return ok({
        source: config.libraryPath,
        tokens: config.tokensPath,
        kit: resolvedKit.kit ? { id: resolvedKit.kit.id, name: resolvedKit.kit.name } : undefined,
        kitProblems: resolvedKit.problems,
        ...(shotSource ? { shotPlan: shotSource } : {}),
        ...result,
        enhanced: suggestion?.visual
          ? result.enhanced + "\n\nOPTIONAL VISUAL DIRECTION (HUNYUAN — REVIEW BEFORE USE)\n" + suggestion.visual
          : result.enhanced,
        provider: suggestion?.visual ? "hunyuan + motion-master" : "motion-master",
        applied: false,
        ...(suggestion?.warning ? { warning: suggestion.warning } : {}),
      });
    },
  );

  server.registerTool(
    "mix_footage",
    {
      title: "Mix real footage with motion graphics",
      description:
        "Validate a Montage timeline (cuts + overlays) and hand it to the user's own Montage instance over its " +
        "public API: the timeline is written with PUT /api/v1/projects/{project_id}/timeline against the version " +
        "the instance reports, and the project is validated afterwards. Motion Master never renders footage " +
        "itself — Montage renders, on the user's own machine, and this tool never bills anything.",
      inputSchema: {
        timeline: z
          .object({
            cuts: z.array(z.any()).optional(),
            overlays: z.array(z.any()).optional(),
            scenes: z.array(z.any()).optional(),
          })
          .passthrough()
          .describe("A Montage timeline: cuts (video/image with in/out seconds) and overlays."),
        project_id: z
          .string()
          .optional()
          .describe("Target Montage project. Resolved from the instance when omitted."),
        dry_run: z
          .boolean()
          .optional()
          .describe("Validate only; never contact the Montage instance."),
        fps: z.number().int().positive().optional().describe("Canvas fps (default 30)."),
        width: z.number().int().positive().optional().describe("Canvas width (default 1920)."),
        height: z.number().int().positive().optional().describe("Canvas height (default 1080)."),
      },
    },
    async ({ timeline, project_id, dry_run, fps, width, height }) => {
      const validation = validateTimeline(timeline);
      if (!validation.valid) {
        return fail("The Montage timeline is not valid.", {
          issues: validation.issues,
          summary: validation.summary,
        });
      }

      const client = new MontageClient(config.montage.baseUrl, {
        token: config.montage.token,
        timeoutMs: config.montage.timeoutMs,
        tenant: config.montage.tenant,
      });

      if (dry_run) {
        return ok({
          delivered: false,
          reason: "dry_run was requested; the Montage instance was not contacted.",
          validation,
          timeline,
          nextSteps: [
            "Set MOTION_MASTER_MONTAGE_URL to the URL of the Montage instance you run.",
            "Call mix_footage again without dry_run.",
          ],
        });
      }

      if (!client.configured) {
        return ok({
          delivered: false,
          reason:
            "MOTION_MASTER_MONTAGE_URL is not set, so there is no Montage instance to hand the timeline to. " +
            "The timeline was validated but not sent.",
          validation,
          timeline,
          nextSteps: [
            "Start a Montage instance (the bridge task documents the setup).",
            "Set MOTION_MASTER_MONTAGE_URL, for example http://127.0.0.1:8000.",
            "Call mix_footage again.",
            "Writing the timeline into a project goes through Montage's studio timeline API — see the bridge README.",
          ],
        });
      }

      const health = await client.health();
      if (!health.ok) {
        return fail("The Montage instance did not answer /api/health.", {
          status: health.status,
          detail: health.error ?? health.body,
        });
      }

      const projects = await client.listProjects();
      const projectList = Array.isArray(projects.body)
        ? (projects.body as { id?: string; name?: string }[])
        : [];
      const projectId =
        project_id ?? (projectList.length > 0 ? (projectList[0].id ?? null) : null);

      if (!projectId) {
        return fail("No Montage project was found. Create one first, or pass project_id.", {
          status: projects.status,
          projects: projectList,
        });
      }

      // The write is optimistic: read the version the instance holds, then
      // replace the timeline against exactly that version.
      const current = await client.getTimeline(projectId);
      let expectedVersion = 0;
      if (current.ok && isTimelineDocument(current.body)) {
        expectedVersion = current.body.version;
      } else if (current.status !== 404 && current.status !== 0) {
        return fail("Montage did not return the project's timeline document.", {
          status: current.status,
          detail: current.error ?? current.body,
        });
      }

      const document: Record<string, unknown> = isTimelineDocument(timeline)
        ? { ...(timeline as unknown as Record<string, unknown>), version: expectedVersion }
        : (toMontageDocument(timeline, expectedVersion, {
            fps,
            width,
            height,
          }) as unknown as Record<string, unknown>);

      const replaced = await client.replaceTimeline(projectId, expectedVersion, document);
      if (!replaced.ok) {
        return fail("Montage refused the timeline replacement.", {
          status: replaced.status,
          expectedVersion,
          detail: replaced.error ?? replaced.body,
        });
      }

      const validationResult = await client.validateProject(projectId);

      return ok({
        delivered: true,
        reason:
          "The timeline was written to the Montage instance over its studio timeline API. " +
          "Montage renders the file; Motion Master does not render and does not run a hosted render service.",
        licence: licenceSentence(),
        montage: {
          baseUrl: config.montage.baseUrl,
          tenant: config.montage.tenant,
          health: health.body,
          projectId,
          expectedVersion,
          storedVersion:
            isTimelineDocument(replaced.body) ? replaced.body.version : expectedVersion + 1,
          response: replaced.body,
          validate: {
            status: validationResult.status,
            body: validationResult.body,
            error: validationResult.error ?? null,
          },
        },
        validation,
        timeline: document,
        nextSteps: [
          "Render the Montage composer composition: npx remotion render src/index.tsx Explainer out/video.mp4",
          "The Montage instance holds the timeline; the render happens on your own machine.",
        ],
      });
    },
  );

  /* ------------------------------------------------------------- the ads */

  server.registerTool(
    "list_meta_placements",
    {
      title: "List Meta's placements",
      description:
        "Meta's placements with the real numbers: the aspect ratio, the master size, the safe zone, the " +
        "aspect-ratio tolerance and the character limits on the primary text and the headline. Read this " +
        "before making an ad — the numbers come from Meta, they are not guessed, and they change. " +
        "The safe zone on a full-screen vertical placement covers roughly half the frame, and Facebook " +
        "Reels accepts zero per cent aspect-ratio tolerance.",
      inputSchema: {},
    },
    async () => {
      return ok({
        placements: PLACEMENTS.map((p) => ({
          id: p.id,
          name: p.name,
          aspect: p.aspect,
          master: { width: p.width, height: p.height },
          where: p.placements,
          aspectTolerance: `${p.aspectTolerance * 100}%`,
          safeZone: safeZoneFractions(p),
          safeArea: safeAreaOf(p),
          text: p.text,
          duration: p.duration,
          minWidth: p.minWidth,
          encoding: p.encoding,
          maxFileBytes: p.maxFileBytes,
          source: p.source,
          readOn: p.readOn,
          cropLoss: cropLoss(p),
        })),
        note:
          "The words live in the platform, not in the picture. The creative carries the brand; the primary " +
          "text and the headline are fields in the ad's JSON.",
        source: "Meta Ads Guide, read 2026-11-13",
      });
    },
  );

  server.registerTool(
    "check_ad_copy",
    {
      title: "Check an ad's copy",
      description:
        "Check a primary text and a headline against a placement's character limits. Both fields live in " +
        "the platform rather than in the creative, and both are bounded: a primary text of forty to a " +
        "hundred and fifty characters, a headline of twenty-seven on Feed or fifty-five on Reels. A copy " +
        "that is too short is as wrong as one that is too long.",
      inputSchema: {
        placement: z.string().describe("The placement id: feed-4x5, reels-9x16, square-1x1 or feed-16x9."),
        primaryText: z.string().default("").describe("The primary text, in the platform."),
        headline: z.string().default("").describe("The headline, in the platform."),
        description: z.string().default("").describe("The description field, if there is one."),
        label: z.string().default("").describe("The label field, if there is one."),
      },
    },
    async ({ placement: placementId, primaryText, headline, description, label }) => {
      const p = placement(placementId);
      if (!p) {
        return ok({
          ok: false,
          error: `There is no placement called "${placementId}".`,
          placements: PLACEMENTS.map((x) => x.id),
        });
      }
      const problems = checkCopy({ primaryText, headline, description, label }, p);
      return ok({
        ok: problems.length === 0,
        placement: { id: p.id, name: p.name, aspect: p.aspect, master: { width: p.width, height: p.height } },
        measured: {
          primaryText: { length: primaryText.length, min: p.text.primaryMin, max: p.text.primaryMax },
          headline: { length: headline.length, max: p.text.headlineMax },
        },
        problems,
        note: problems.length === 0 ? "The copy fits the placement." : "The copy does not fit the placement.",
      });
    },
  );

  server.registerTool(
    "plan_meta_ad",
    {
      title: "Plan a Meta ad",
      description:
        "Plan an ad for a placement: what the frame is, where the safe area is, where every piece of type " +
        "goes, what the copy says, and what the alternative would have cost. This is the plan, not the " +
        "build — it is the thing a person reads before the pixels exist.",
      inputSchema: {
        placement: z.string().describe("The placement id: feed-4x5, reels-9x16, square-1x1 or feed-16x9."),
        claim: z.string().describe("The claim, in the creator's words. One line, and true."),
        eyebrow: z.string().optional().describe("A short label above the claim. Optional, and short."),
        brand: z.string().describe("The brand mark shown on the frame."),
        primaryText: z.string().default("").describe("The primary text, in the platform."),
        headline: z.string().default("").describe("The headline, in the platform."),
        durationSeconds: z.number().int().positive().max(60).optional(),
      },
    },
    async ({ placement: placementId, claim, eyebrow, brand, primaryText, headline, durationSeconds }) => {
      const p = placement(placementId);
      if (!p) {
        return ok({ ok: false, error: `There is no placement called "${placementId}".`, placements: PLACEMENTS.map((x) => x.id) });
      }
      const safe = safeAreaOf(p);
      const loss = cropLoss(p);
      const problems = checkCopy({ primaryText, headline, description: "", label: "" }, p);
      return ok({
        ok: true,
        placement: {
          id: p.id,
          name: p.name,
          aspect: p.aspect,
          master: { width: p.width, height: p.height },
          where: p.placements,
        },
        frame: {
          safeArea: safe,
          safeZone: safeZoneFractions(p),
          typeFloorPx: Math.round(Math.min(p.width, p.height) * 0.026),
        },
        content: { claim, eyebrow: eyebrow ?? null, brand, primaryText, headline },
        durationSeconds: durationSeconds ?? 6,
        copyProblems: problems,
        theAlternative: {
          note: "What a sixteen-by-nine scene cropped to this placement would have kept.",
          cropLoss: loss,
        },
        nextSteps: [
          `build_meta_ad with the same placement and the same words`,
          "gate the composition with npx hyperframes check",
          "render with bash generator/render.sh <dir> <dir>/ad.mp4",
          `preflight_ad with the placement and the rendered file`,
        ],
      });
    },
  );

  server.registerTool(
    "build_meta_ad",
    {
      title: "Build a Meta ad",
      description:
        "Build the ad: a HyperFrames composition authored at the placement's own size, with the type stack " +
        "inside the safe area by construction, plus the ad's JSON holding the copy and the measurements. " +
        "This writes files; it does not render. The gate and the render are separate steps.",
      inputSchema: {
        placement: z.string().describe("The placement id: feed-4x5, reels-9x16, square-1x1 or feed-16x9."),
        claim: z.string().describe("The claim on the frame. One line, and true."),
        eyebrow: z.string().optional().describe("A short label above the claim."),
        brand: z.string().describe("The brand mark on the frame."),
        primaryText: z.string().default("").describe("The primary text, in the platform."),
        headline: z.string().default("").describe("The headline, in the platform."),
        accent: z.string().optional().describe("The accent, as a hex. One accent, never a surface."),
        out: z.string().optional().describe("Where to write the build. Defaults to studio/ads/build."),
        durationSeconds: z.number().int().positive().max(60).optional(),
      },
    },
    async ({ placement: placementId, claim, eyebrow, brand, primaryText, headline, accent, out, durationSeconds }) => {
      const p = placement(placementId);
      if (!p) {
        return ok({ ok: false, error: `There is no placement called "${placementId}".`, placements: PLACEMENTS.map((x) => x.id) });
      }
      const repoRoot = config.repoRoot;
      const outDir = out ?? join(repoRoot, "studio", "ads", "build");
      const args = [
        join(repoRoot, "scripts", "build-meta-ad.mjs"),
        "--placement", p.id,
        "--claim", claim,
        "--brand", brand,
        "--out", outDir,
        "--primary-text", primaryText,
        "--headline", headline,
        "--duration", String(durationSeconds ?? 6),
      ];
      if (eyebrow) args.push("--eyebrow", eyebrow);
      if (accent) args.push("--accent", accent);
      let stdout = "";
      let failed = false;
      try {
        stdout = execFileSync("node", args, { cwd: repoRoot, encoding: "utf8" });
      } catch (error) {
        failed = true;
        stdout = String((error as { stdout?: string; stderr?: string }).stdout ?? "") +
          String((error as { stderr?: string }).stderr ?? "");
      }
      const adJson = join(outDir, "ad.json");
      return ok({
        ok: !failed,
        placement: { id: p.id, name: p.name, aspect: p.aspect, master: { width: p.width, height: p.height } },
        outDir,
        adJson: existsSync(adJson) ? adJson : null,
        report: stdout.trim().split("\n").slice(-20).join("\n"),
        nextSteps: [
          `npx hyperframes check ${outDir}`,
          `bash generator/render.sh ${outDir} ${outDir}/ad.mp4`,
          `preflight_ad with the placement and the rendered file`,
        ],
      });
    },
  );

  server.registerTool(
    "preflight_ad",
    {
      title: "Preflight a rendered ad",
      description:
        "Measure a rendered file against its placement and report what Meta will crop or reject: the aspect " +
        "ratio and its tolerance, the minimum width, the duration, the encoding and the file size. Every " +
        "number is measured out of the file with ffprobe, not assumed.",
      inputSchema: {
        placement: z.string().describe("The placement id."),
        file: z.string().describe("The rendered file to check."),
      },
    },
    async ({ placement: placementId, file }) => {
      const p = placement(placementId);
      if (!p) {
        return ok({ ok: false, error: `There is no placement called "${placementId}".`, placements: PLACEMENTS.map((x) => x.id) });
      }
      const path = file.startsWith("/") ? file : join(config.repoRoot, file);
      if (!existsSync(path)) {
        return ok({ ok: false, error: `There is no file at ${file}.` });
      }
      const raw = execFileSync(
        "ffprobe",
        ["-v", "error", "-show_entries", "stream=codec_type,codec_name,width,height,r_frame_rate:format=duration,size", "-of", "json", path],
        { encoding: "utf8" },
      );
      const probed = JSON.parse(raw) as {
        streams?: { codec_type?: string; codec_name?: string; width?: number; height?: number; r_frame_rate?: string }[];
        format?: { duration?: string; size?: string };
      };
      const video = (probed.streams ?? []).find((s) => s.codec_type === "video");
      const audio = (probed.streams ?? []).find((s) => s.codec_type === "audio");
      if (!video) return ok({ ok: false, error: "That file has no video stream." });
      const [num, den] = String(video.r_frame_rate ?? "0/1").split("/").map(Number);
      const result = preflight(placementId as PlacementId, {
        file,
        width: video.width,
        height: video.height,
        durationSeconds: probed.format?.duration ? Number(probed.format.duration) : undefined,
        bytes: statSync(path).size,
        codec: video.codec_name,
        audioCodec: audio?.codec_name,
        fps: den ? num / den : undefined,
        hasAudio: Boolean(audio),
      });
      return ok(result);
    },
  );

  /* --------------------------------------------------------- the loop -- */

  server.registerTool(
    "run_supervisor",
    {
      title: "Run the studio loop",
      description:
        "Run the studio's loop: it takes the oldest queued job, checks it, repairs what the gate can " +
        "repair, renders it, and publishes it — or says clearly why it could not. A gate failure is a " +
        "finding, not a crash: the loop repairs it and re-gates, inside a budget of three rounds. When " +
        "the budget is spent the job fails with the findings that survived, and the loop does not spin. " +
        "One tick runs one job. Call it repeatedly to drain the queue.",
      inputSchema: {
        ticks: z.number().int().positive().max(50).optional().describe("How many jobs to attempt. One by default."),
        dryRun: z.boolean().optional().describe("Do everything except publish. For a rehearsal."),
        budget: z.number().int().positive().max(10).optional().describe("Gate rounds per job before it escalates."),
      },
    },
    async ({ ticks, dryRun, budget }) => {
      const supervisor = new Supervisor({
        repoRoot: config.repoRoot,
        budget: budget ?? 3,
        dryRun: dryRun ?? false,
      });
      const results = [];
      for (let i = 0; i < (ticks ?? 1); i += 1) {
        const result = await supervisor.tick();
        results.push({
          action: result.action,
          jobId: result.jobId,
          state: result.state,
          ok: result.outcome?.ok,
          error: result.outcome?.error,
          findings: result.outcome?.findings,
          artifact: result.outcome?.artifact,
          rounds: result.outcome?.rounds,
        });
        if (result.action === "idle") break;
      }
      return ok({
        ran: results.length,
        ledger: defaultLedgerPath(config.repoRoot),
        results,
        note:
          "A job that ends in `failed` carries the findings that survived the budget. A finding with no " +
          "repair rule needs a person — that is a decision, not a gap.",
      });
    },
  );

  server.registerTool(
    "supervisor_status",
    {
      title: "What the loop is doing",
      description:
        "The state of the queue: the jobs waiting, the job that was interrupted, and the last lines of " +
        "the ledger. The ledger is append-only and it is the studio's memory — without it there is no " +
        "answer to 'why did this fail'.",
      inputSchema: {
        limit: z.number().int().positive().max(200).optional(),
      },
    },
    async ({ limit }) => {
      const supervisor = new Supervisor({ repoRoot: config.repoRoot });
      const ledgerPath = defaultLedgerPath(config.repoRoot);
      const ledger = readLedger(ledgerPath);
      return ok({
        ledgerPath,
        totalEvents: ledger.length,
        events: ledger.slice(-(limit ?? 20)),
        byEvent: ledger.reduce<Record<string, number>>((counts, entry) => {
          counts[entry.event] = (counts[entry.event] ?? 0) + 1;
          return counts;
        }, {}),
        queued: supervisor.queuedJobs().map((job) => ({
          jobId: job.id,
          projectId: job.projectId,
          revision: job.revision,
          createdAt: job.createdAt,
        })),
        interrupted: supervisor.interruptedJobs().map((job) => ({
          jobId: job.id,
          projectId: job.projectId,
        })),
      });
    },
  );

  server.registerTool(
    "start_supervisor",
    {
      title: "Start the loop on a clock",
      description:
        "Start the supervisor as a long-running process that ticks on a clock until it is stopped. This " +
        "is the persistent mode: once it is running, work is picked up without anybody asking. It runs " +
        "one job per tick, oldest first.",
      inputSchema: {
        tickSeconds: z.number().int().positive().max(3600).optional().describe("Seconds between ticks. Thirty by default."),
        dryRun: z.boolean().optional().describe("Do everything except publish."),
      },
    },
    async ({ tickSeconds, dryRun }) => {
      await supervisorMain({
        repoRoot: config.repoRoot,
        tickMs: (tickSeconds ?? 30) * 1000,
        dryRun: dryRun ?? false,
      });
      return ok({ stopped: true });
    },
  );

  server.registerTool(
    "submit_brief",
    {
      title: "Put a brief in the inbox",
      description:
        "Put a brief in the studio's inbox. The loop takes it on its next tick: it plans the shots, " +
        "builds the composition, gates it, repairs what the gate can repair, renders it, and publishes " +
        "it — or says clearly why it could not. This is how work arrives without anybody waiting for it. " +
        "The brief is plain text that goes into the planner; it cannot carry a file path, a script or a " +
        "URL.",
      inputSchema: {
        title: z.string().describe("What the film is called."),
        brief: z.string().describe("The brief. What the film is for, and what it has to say."),
        name: z.string().optional().describe("The file name to use. Derived from the title if omitted."),
      },
    },
    async ({ title, brief, name }) => {
      const path = submitBrief(config.repoRoot, { title, brief }, name);
      return ok({
        path,
        inbox: inboxDir(config.repoRoot),
        note:
          "The brief is queued. Run the loop with run_supervisor to work it, or let the supervisor tick " +
          "on its own.",
      });
    },
  );

  server.registerTool(
    "loop_metrics",
    {
      title: "How the loop is doing",
      description:
        "The loop's counters, counted from the ledger: jobs by state, what the gate is failing on, what " +
        "the remediation table fixed, and the findings that survived the budget. Every number traces back " +
        "to a line in the ledger, so none of them can drift. Three consecutive failures with the same " +
        "finding is reported as `repeatedFailure` — that is a broken repair rule, not a bad brief.",
      inputSchema: {},
    },
    async () => ok(readMetrics(config.repoRoot)),
  );
}

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
import { buildHyperFramesProject, GSAP_FILE } from "./hyperframes-composer.js";

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
      },
    },
    async ({ group }) => {
      const all = tokens();
      const groups = group && group !== "all" ? [group] : Object.keys(all);
      const selected: Record<string, unknown> = {};
      for (const key of groups) {
        if (key in all) selected[key] = (all as Record<string, unknown>)[key];
      }
      return ok({
        source: tokenSource(config.tokensPath),
        canonicalPath: config.tokensPath,
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
      },
    },
    async (args) => {
      if (!args.brief && !args.storyboard) {
        return fail("Give the tool either a brief or a storyboard to build from.");
      }

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

      const composition = buildComposition(storyboard, tokens(), {
        id: args.id,
        filename: args.filename,
      });

      return ok({
        ...composition,
        storyboard,
        tokensSource: tokenSource(config.tokensPath),
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
            doctrine: z.record(z.any()).optional(),
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
                  transition: z.record(z.any()).optional(),
                  notes: z.array(z.string()).optional(),
                }),
              )
              .describe("The beats to compose. Use plan_video to produce one."),
          })
          .describe("A storyboard. Get one from plan_video first."),
        project_name: z.string().optional().describe("Directory name for the project (default 'composition')."),
        include_gsap: z
          .boolean()
          .optional()
          .describe("Include the GSAP source so the project is self-contained (default true)."),
      },
    },
    async ({ storyboard, project_name, include_gsap }) => {
      let board: Storyboard;
      try {
        board = normalizeStoryboard(storyboard as Partial<Storyboard>);
      } catch (error) {
        return fail((error as Error).message, {
          hint: "Call plan_video first and pass the storyboard it returns.",
        });
      }
      const tokenFile = tokens();
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
      const tagCounts = new Map<string, number>();
      for (const b of file.blocks) for (const t of b.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
      return ok({
        source: config.blocksPath,
        generator: file.generated,
        total: filtered.length,
        libraryTotal: file.count,
        tags: [...tagCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 60)
          .map(([slug, count]) => ({ slug, count })),
        blocks: filtered.slice(off, off + lim),
        install: "npx hyperframes add <name>",
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
      },
    },
    async (args) => {
      const catalogue = loadCatalogue(config.libraryPath);
      const tokenFile = tokens() as unknown as TokenShape;
      const result = enhance(args.prompt, catalogue, tokenFile, {
        durationSeconds: args.duration_seconds,
        aspect: args.aspect,
        resolution: args.resolution,
        fps: args.fps,
        style: args.style,
        styleCollection: args.style_collection,
        extraConstraints: args.extra_constraints,
        alternatives: args.alternatives,
      });
      return ok({
        source: config.libraryPath,
        tokens: config.tokensPath,
        ...result,
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
}

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
import { loadTokens, tokenSource } from "./tokens.js";
import { listSkills } from "./skills.js";
import { readGallery } from "./clips.js";
import { planVideo, type Storyboard } from "./planner.js";
import { buildComposition, normalizeStoryboard } from "./composer.js";
import { MontageClient, validateTimeline } from "./montage.js";

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
  .enum(["all", "motion-master", "motion-design", "gsap", "remotion"])
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
    "mix_footage",
    {
      title: "Mix real footage with motion graphics",
      description:
        "Validate a Montage timeline (cuts + overlays) and hand it to the user's own Montage instance over its " +
        "public HTTP API. Motion Master never renders footage itself — Montage renders.",
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
      },
    },
    async ({ timeline, project_id, dry_run }) => {
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
            "Writing the timeline into a project goes through Montage's timeline_replace MCP tool — see the bridge README.",
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

      const state = await client.projectState(projectId);
      return ok({
        delivered: false,
        reason:
          "The Montage instance is reachable and the timeline is valid. Applying the timeline is a write operation " +
          "that Montage exposes through its timeline_replace MCP tool, not through the public read-only HTTP API, " +
          "so the payload is returned for the bridge to submit.",
        montage: {
          baseUrl: config.montage.baseUrl,
          health: health.body,
          projectId,
          stateStatus: state.status,
          state: state.body,
        },
        validation,
        timeline,
        nextSteps: [
          "Use the bridge (bridge/README.md) — replaceTimeline(projectId, timeline) applies it via the timeline_replace MCP tool.",
          "Then render with: npx remotion render src/index.tsx Explainer out/video.mp4",
        ],
      });
    },
  );
}

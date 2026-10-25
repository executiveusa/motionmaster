/**
 * api.ts — the HTTP API.
 *
 * The MCP server is the agent surface; this is the same product over plain
 * HTTP, for anything that is not an MCP client: a script, a CI job, a web
 * app, another agent's tool belt.
 *
 * Every endpoint returns JSON. Every endpoint reads the same files the MCP
 * tools read, so the two can never disagree.
 *
 *   GET  /api/v1                     the index of everything below
 *   GET  /api/v1/openapi.json        the OpenAPI description of this API
 *   GET  /api/v1/skills              the motion skills in the pack
 *   GET  /api/v1/tokens              the motion tokens
 *   GET  /api/v1/clips               the gallery clips and their prompts
 *   GET  /api/v1/licence             the terms, as recorded
 *   GET  /api/v1/library/collections
 *   GET  /api/v1/library/categories
 *   GET  /api/v1/library/items       ?query=&collection=&category=&kind=&limit=&offset=
 *   GET  /api/v1/library/items/:id
 *   GET  /api/v1/blocks              ?tag=&query=&type=&limit=&offset=
 *   GET  /api/v1/blocks/:id
 *   POST /api/v1/blocks/fill         { brief, block?, values?, headline? }
 *   POST /api/v1/compositions/hyperframes  { storyboard }
 *   GET  /api/v1/sfx/kinds
 *   GET  /api/v1/sfx                 ?kind=&query=&source=&limit=&offset=
 *   GET  /api/v1/sfx/:id
 *   POST /api/v1/sound/plan          { brief, beats? }
 *   GET  /api/v1/films
 *   POST /api/v1/films               { brief, shots?, tags?, title?, sound? }
 *   GET  /api/v1/films/:id
 *
 * Authentication is optional. Set MOTION_MASTER_API_KEY and every /api/v1
 * route needs `Authorization: Bearer <key>`; leave it unset and the API is
 * open, which is the right thing for a server running on your own machine.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Config } from "./config.js";
import { listSkills } from "./skills.js";
import { loadTokens, tokenSource } from "./tokens.js";
import { readGallery } from "./clips.js";
import { LICENCE, licenceSentence } from "./licence.js";
import {
  browse,
  getItem,
  listCategories,
  loadBlocks,
  loadCatalogue,
} from "./library.js";
import { fillBlock, headlineFrom, matchBlocks, type MotionBlock } from "./blocks.js";
import { buildHyperFramesProject } from "./hyperframes-composer.js";
import { buildComposition, normalizeStoryboard } from "./composer.js";
import { browseSfx, getSfx, loadSfx, planSound, sfxKinds } from "./sfx.js";
import { loadVerdicts } from "./verdicts.js";
import {
  copyKitFiles,
  buildFilmProject,
  planFilm,
  writeHostComposition,
  type KitTake,
} from "./film.js";
import {
  filmSlug,
  filmsDir,
  listFilms,
  readJob,
  writeJob,
  type RenderJob,
} from "./render.js";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";

export const API_PREFIX = "/api/v1";

function writeJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    "access-control-allow-origin": "*",
  });
  res.end(payload);
}

function fail(res: ServerResponse, status: number, error: string, extra: Record<string, unknown> = {}): void {
  writeJson(res, status, { error, ...extra });
}

function num(value: string | null, fallback: number): number {
  const parsed = Number(value ?? "");
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Read a JSON request body, up to a sane size. */
async function readJson(req: IncomingMessage, limit = 4_000_000): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = chunk as Buffer;
    size += buf.length;
    if (size > limit) throw new Error("Request body too large.");
    chunks.push(buf);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

/**
 * Is this request allowed? An unset key means the API is open, which is the
 * right default for a server on somebody's own machine.
 */
export function authorised(req: IncomingMessage): boolean {
  const key = process.env.MOTION_MASTER_API_KEY?.trim();
  if (!key) return true;
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  return token.length > 0 && token === key;
}

/** The OpenAPI description, generated from the same tables the routes use. */
export function openApiDocument(config: Config): Record<string, unknown> {
  const json = (schema: unknown) => ({ "application/json": { schema } });
  const str = { type: "string" };
  const num = { type: "number" };
  const bool = { type: "boolean" };
  const obj = { type: "object" };
  const arr = (items: unknown) => ({ type: "array", items });

  return {
    openapi: "3.1.0",
    info: {
      title: "Motion Master API",
      version: "1.0.0",
      summary: "Motion design over HTTP: a library of prompts and motion blocks, sound, and a renderer.",
      description:
        "The same product the MCP server exposes, over plain HTTP. Every route reads the files in the " +
        "repository, so an API response and an MCP tool result can never disagree. " +
        licenceSentence(),
      license: { name: LICENCE.type },
    },
    servers: [{ url: `http://${config.host}:${config.port}${API_PREFIX}` }],
    security: process.env.MOTION_MASTER_API_KEY
      ? [{ bearerAuth: [] }]
      : [],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer" },
      },
      schemas: {
        Error: {
          type: "object",
          properties: { error: str },
          required: ["error"],
        },
      },
    },
    paths: {
      [`${API_PREFIX}/skills`]: {
        get: { summary: "The motion skills in the pack.", responses: { 200: { description: "ok", content: json(obj) } } },
      },
      [`${API_PREFIX}/tokens`]: {
        get: { summary: "The motion tokens.", responses: { 200: { description: "ok", content: json(obj) } } },
      },
      [`${API_PREFIX}/clips`]: {
        get: { summary: "The gallery clips and the exact prompt behind each.", responses: { 200: { description: "ok", content: json(obj) } } },
      },
      [`${API_PREFIX}/licence`]: {
        get: { summary: "The terms, as recorded.", responses: { 200: { description: "ok", content: json(obj) } } },
      },
      [`${API_PREFIX}/library/collections`]: {
        get: { summary: "The nine collections, with their licences.", responses: { 200: { description: "ok", content: json(arr(obj)) } } },
      },
      [`${API_PREFIX}/library/categories`]: {
        get: {
          summary: "Every category, with its count.",
          parameters: [{ name: "collection", in: "query", schema: str }],
          responses: { 200: { description: "ok", content: json(arr(obj)) } },
        },
      },
      [`${API_PREFIX}/library/items`]: {
        get: {
          summary: "Browse the library.",
          parameters: [
            { name: "query", in: "query", schema: str },
            { name: "collection", in: "query", schema: str },
            { name: "category", in: "query", schema: str },
            { name: "kind", in: "query", schema: str },
            { name: "limit", in: "query", schema: num },
            { name: "offset", in: "query", schema: num },
          ],
          responses: { 200: { description: "ok", content: json(obj) } },
        },
      },
      [`${API_PREFIX}/library/items/{id}`]: {
        get: {
          summary: "One library item, with its licence.",
          parameters: [{ name: "id", in: "path", required: true, schema: str }],
          responses: { 200: { description: "ok", content: json(obj) }, 404: { description: "not found", content: json(obj) } },
        },
      },
      [`${API_PREFIX}/blocks`]: {
        get: {
          summary: "The HyperFrames motion blocks.",
          parameters: [
            { name: "tag", in: "query", schema: str },
            { name: "query", in: "query", schema: str },
            { name: "type", in: "query", schema: str },
            { name: "limit", in: "query", schema: num },
            { name: "offset", in: "query", schema: num },
          ],
          responses: { 200: { description: "ok", content: json(obj) } },
        },
      },
      [`${API_PREFIX}/blocks/{id}`]: {
        get: {
          summary: "One motion block, in full: its variables, its files, its defaults.",
          parameters: [{ name: "id", in: "path", required: true, schema: str }],
          responses: { 200: { description: "ok", content: json(obj) }, 404: { description: "not found", content: json(obj) } },
        },
      },
      [`${API_PREFIX}/blocks/fill`]: {
        post: {
          summary: "Fill a motion block from a brief.",
          requestBody: {
            required: true,
            content: json({
              type: "object",
              properties: { brief: str, block: str, values: obj, headline: str },
              required: ["brief"],
            }),
          },
          responses: { 200: { description: "ok", content: json(obj) }, 400: { description: "no match", content: json(obj) } },
        },
      },
      [`${API_PREFIX}/compositions/hyperframes`]: {
        post: {
          summary: "Build a HyperFrames project from a storyboard.",
          requestBody: { required: true, content: json(obj) },
          responses: { 200: { description: "ok", content: json(obj) } },
        },
      },
      [`${API_PREFIX}/compositions/remotion`]: {
        post: {
          summary: "Build a Remotion composition from a storyboard.",
          requestBody: { required: true, content: json(obj) },
          responses: { 200: { description: "ok", content: json(obj) } },
        },
      },
      [`${API_PREFIX}/sfx/kinds`]: {
        get: { summary: "The sound vocabulary.", responses: { 200: { description: "ok", content: json(arr(obj)) } } },
      },
      [`${API_PREFIX}/sfx`]: {
        get: {
          summary: "Search the sound library.",
          parameters: [
            { name: "kind", in: "query", schema: str },
            { name: "query", in: "query", schema: str },
            { name: "source", in: "query", schema: str },
            { name: "limit", in: "query", schema: num },
            { name: "offset", in: "query", schema: num },
          ],
          responses: { 200: { description: "ok", content: json(obj) } },
        },
      },
      [`${API_PREFIX}/sfx/{id}`]: {
        get: {
          summary: "One sound, with its licence and its measured level.",
          parameters: [{ name: "id", in: "path", required: true, schema: str }],
          responses: { 200: { description: "ok", content: json(obj) }, 404: { description: "not found", content: json(obj) } },
        },
      },
      [`${API_PREFIX}/sound/plan`]: {
        post: {
          summary: "Plan the sound for a set of beats.",
          requestBody: { required: true, content: json(obj) },
          responses: { 200: { description: "ok", content: json(obj) } },
        },
      },
      [`${API_PREFIX}/films`]: {
        get: { summary: "The films rendered here.", responses: { 200: { description: "ok", content: json(arr(obj)) } } },
        post: {
          summary: "Plan, build and render a film from a brief.",
          requestBody: {
            required: true,
            content: json({ type: "object", properties: { brief: str, shots: num, tags: arr(str), title: str, sound: bool }, required: ["brief"] }),
          },
          responses: { 200: { description: "the job", content: json(obj) }, 400: { description: "no block matched", content: json(obj) } },
        },
      },
      [`${API_PREFIX}/films/{id}`]: {
        get: {
          summary: "One film, or the state of its render.",
          parameters: [{ name: "id", in: "path", required: true, schema: str }],
          responses: { 200: { description: "ok", content: json(obj) }, 404: { description: "not found", content: json(obj) } },
        },
      },
    },
  };
}

/**
 * Handle an API request. Returns true when the request was an API request and
 * has been answered.
 */
export async function handleApi(
  req: IncomingMessage,
  res: ServerResponse,
  path: string,
  config: Config,
): Promise<boolean> {
  if (!path.startsWith(API_PREFIX)) return false;

  const method = req.method ?? "GET";
  const query = new URL(req.url ?? "/", "http://localhost").searchParams;

  if (!authorised(req)) {
    fail(res, 401, "This API needs a bearer token.", {
      hint: "Set MOTION_MASTER_API_KEY on the server and send Authorization: Bearer <key>.",
    });
    return true;
  }

  const route = path.slice(API_PREFIX.length) || "/";

  // ── the index ─────────────────────────────────────────────────────────────
  if (route === "/" && method === "GET") {
    writeJson(res, 200, {
      name: "Motion Master API",
      version: "1.0.0",
      openapi: `${API_PREFIX}/openapi.json`,
      licence: licenceSentence(),
      endpoints: [
        "GET  /skills",
        "GET  /tokens",
        "GET  /clips",
        "GET  /licence",
        "GET  /library/collections",
        "GET  /library/categories",
        "GET  /library/items",
        "GET  /library/items/{id}",
        "GET  /blocks",
        "GET  /blocks/{id}",
        "POST /blocks/fill",
        "POST /compositions/hyperframes",
        "POST /compositions/remotion",
        "GET  /sfx/kinds",
        "GET  /sfx",
        "GET  /sfx/{id}",
        "POST /sound/plan",
        "GET  /films",
        "POST /films",
        "GET  /films/{id}",
      ],
      mcp: config.publicUrl,
    });
    return true;
  }

  if (route === "/openapi.json" && method === "GET") {
    writeJson(res, 200, openApiDocument(config));
    return true;
  }

  // ── the pack ──────────────────────────────────────────────────────────────
  if (route === "/skills" && method === "GET") {
    const skills = listSkills(config.skillsDir);
    writeJson(res, 200, { total: skills.length, skills });
    return true;
  }

  if (route === "/tokens" && method === "GET") {
    writeJson(res, 200, { source: tokenSource(config.tokensPath), tokens: loadTokens(config.tokensPath) });
    return true;
  }

  if (route === "/clips" && method === "GET") {
    writeJson(res, 200, readGallery(config.clipsPath));
    return true;
  }

  if (route === "/licence" && method === "GET") {
    writeJson(res, 200, LICENCE);
    return true;
  }

  // ── the library ───────────────────────────────────────────────────────────
  if (route === "/library/collections" && method === "GET") {
    const catalogue = loadCatalogue(config.libraryPath);
    writeJson(res, 200, catalogue.collections);
    return true;
  }

  if (route === "/library/categories" && method === "GET") {
    const catalogue = loadCatalogue(config.libraryPath);
    const collection = query.get("collection") ?? undefined;
    writeJson(res, 200, listCategories(catalogue, { collection }));
    return true;
  }

  if (route === "/library/items" && method === "GET") {
    const catalogue = loadCatalogue(config.libraryPath);
    const result = browse(catalogue, {
      query: query.get("query") ?? undefined,
      collection: query.get("collection") ?? undefined,
      category: query.get("category") ?? undefined,
      kind: (query.get("kind") as never) ?? undefined,
      tag: query.get("tag") ?? undefined,
      license: query.get("license") ?? undefined,
      limit: num(query.get("limit"), 20),
      offset: num(query.get("offset"), 0),
    });
    writeJson(res, 200, result);
    return true;
  }

  if (route.startsWith("/library/items/") && method === "GET") {
    const id = decodeURIComponent(route.slice("/library/items/".length));
    const catalogue = loadCatalogue(config.libraryPath);
    const item = getItem(catalogue, id);
    if (!item) {
      fail(res, 404, `No library item with id "${id}".`);
      return true;
    }
    writeJson(res, 200, item);
    return true;
  }

  // ── the motion blocks ─────────────────────────────────────────────────────
  if (route === "/blocks" && method === "GET") {
    const file = loadBlocks(config.blocksPath);
    const q = query.get("query")?.trim().toLowerCase();
    const tag = query.get("tag");
    const type = query.get("type");
    const filtered = file.blocks.filter((b) => {
      if (tag && !b.tags.includes(tag)) return false;
      if (type && b.type !== type) return false;
      if (q) {
        const hay = `${b.id} ${b.title} ${b.description} ${b.tags.join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const limit = Math.min(num(query.get("limit"), 40), 200);
    const offset = Math.max(num(query.get("offset"), 0), 0);
    writeJson(res, 200, {
      source: config.blocksPath,
      generator: file.generated,
      upstream: file.source,
      total: filtered.length,
      libraryTotal: file.count,
      tags: file.tags,
      blocks: filtered.slice(offset, offset + limit),
    });
    return true;
  }

  if (route.startsWith("/blocks/") && method === "GET" && !route.includes("/fill")) {
    const id = decodeURIComponent(route.slice("/blocks/".length));
    const file = loadBlocks(config.blocksPath);
    const found = file.blocks.find((b) => b.id === id);
    if (!found) {
      fail(res, 404, `No motion block with id "${id}".`);
      return true;
    }
    writeJson(res, 200, found);
    return true;
  }

  if (route === "/blocks/fill" && method === "POST") {
    const body = (await readJson(req)) as {
      brief?: string;
      block?: string;
      values?: Record<string, unknown>;
      headline?: string;
    };
    if (!body?.brief) {
      fail(res, 400, "A brief is required.");
      return true;
    }
    const file = loadBlocks(config.blocksPath);
    const tokenFile = loadTokens(config.tokensPath) as never;

    let chosen: MotionBlock | undefined;
    let matched: { block: MotionBlock; score: number }[] = [];
    if (body.block) {
      chosen = file.blocks.find((b) => b.id === body.block);
      if (!chosen) {
        fail(res, 404, `No motion block with id "${body.block}".`);
        return true;
      }
    } else {
      matched = matchBlocks(file, body.brief, { limit: 5, requireVariables: true });
      if (matched.length === 0) {
        fail(res, 400, "No motion block matched that brief.", {
          hint: "Name a look: title card, kinetic type, transition, product demo, data.",
        });
        return true;
      }
      chosen = matched[0].block;
    }

    const filled = fillBlock(chosen, {
      brief: body.brief,
      values: body.values,
      tokens: tokenFile,
      headline: body.headline ?? headlineFrom(body.brief),
    });
    writeJson(res, 200, {
      block: { id: chosen.id, title: chosen.title, tags: chosen.tags, duration: chosen.duration },
      matched: matched.map((m) => ({ id: m.block.id, title: m.block.title, score: m.score })),
      ...filled,
    });
    return true;
  }

  // ── the generators ────────────────────────────────────────────────────────
  if (route === "/compositions/hyperframes" && method === "POST") {
    const body = (await readJson(req)) as { storyboard?: unknown };
    const storyboard = normalizeStoryboard((body?.storyboard ?? body ?? {}) as never);
    const tokenFile = loadTokens(config.tokensPath) as never;
    const result = buildHyperFramesProject(storyboard as never, tokenFile as never, {});
    writeJson(res, 200, result);
    return true;
  }

  if (route === "/compositions/remotion" && method === "POST") {
    const body = (await readJson(req)) as { storyboard?: unknown };
    const storyboard = normalizeStoryboard((body?.storyboard ?? body ?? {}) as never);
    const tokenFile = loadTokens(config.tokensPath) as never;
    const result = buildComposition(storyboard as never, tokenFile as never);
    writeJson(res, 200, result);
    return true;
  }

  // ── the sound ─────────────────────────────────────────────────────────────
  if (route === "/sfx/kinds" && method === "GET") {
    const catalogue = loadSfx(config.sfxPath);
    writeJson(res, 200, sfxKinds(catalogue));
    return true;
  }

  if (route === "/sfx" && method === "GET") {
    const catalogue = loadSfx(config.sfxPath);
    const result = browseSfx(catalogue, {
      kind: query.get("kind") ?? undefined,
      source: query.get("source") ?? undefined,
      query: query.get("query") ?? undefined,
      limit: num(query.get("limit"), 20),
      offset: num(query.get("offset"), 0),
    });
    writeJson(res, 200, { total: result.total, items: result.items, scores: result.scores });
    return true;
  }

  if (route.startsWith("/sfx/") && method === "GET") {
    const id = decodeURIComponent(route.slice("/sfx/".length));
    const catalogue = loadSfx(config.sfxPath);
    const item = getSfx(catalogue, id);
    if (!item) {
      fail(res, 404, `No sound with id "${id}".`);
      return true;
    }
    writeJson(res, 200, item);
    return true;
  }

  if (route === "/sound/plan" && method === "POST") {
    const body = (await readJson(req)) as {
      beats?: { index?: number; label?: string; role?: string; inSeconds?: number }[];
    };
    const catalogue = loadSfx(config.sfxPath);
    const beats = (body?.beats ?? []).map((b, index) => ({
      index: b.index ?? index,
      label: b.label ?? `Beat ${index + 1}`,
      role: (b.role ?? "reveal") as never,
      inSeconds: b.inSeconds ?? index,
    }));
    const kit = planSound(catalogue, beats as never);
    writeJson(res, 200, { beats, takes: kit.takes });
    return true;
  }

  // ── the films ─────────────────────────────────────────────────────────────
  if (route === "/films" && method === "GET") {
    writeJson(res, 200, listFilms(config.repoRoot));
    return true;
  }

  if (route === "/films" && method === "POST") {
    const body = (await readJson(req)) as {
      brief?: string;
      shots?: number;
      tags?: string[];
      title?: string;
      sound?: boolean;
    };
    if (!body?.brief) {
      fail(res, 400, "A brief is required.");
      return true;
    }
    const file = loadBlocks(config.blocksPath);
    const tokenFile = loadTokens(config.tokensPath) as never;
    const known = loadVerdicts(config.repoRoot);
    const plan = planFilm(body.brief, {
      blocks: file,
      tokens: tokenFile,
      count: body.shots ?? 3,
      tags: body.tags,
      exclude: Object.entries(known)
        .filter(([, verdict]) => !verdict.ok)
        .map(([id]) => id),
    });
    if (plan.shots.length === 0) {
      fail(res, 400, "No motion block matched that brief.", {
        hint: "Name a look instead: title card, kinetic type, transition, product demo, data, brand.",
      });
      return true;
    }

    const id = filmSlug(body.title ?? plan.headline);
    const directory = join(filmsDir(config.repoRoot), id);

    let kit: KitTake[] = [];
    let built: { plan: typeof plan; skipped: { id: string; reason: string }[] };
    try {
      built = buildFilmProject(config.repoRoot, directory, plan, tokenFile, kit);
    } catch (error) {
      fail(res, 500, "The film project could not be built.", {
        detail: error instanceof Error ? error.message : String(error),
        hint: "The blocks are installed from the HyperFrames registry, which needs the network.",
      });
      return true;
    }

    if (body.sound !== false) {
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
      kit = planSound(catalogue, beats as never).takes.map((take) => ({
        id: take.id,
        atSeconds: take.atSeconds,
        level: take.level,
        file: take.file,
        durationMs: take.durationMs,
        title: take.title,
        role: take.role,
      }));
      if (kit.length > 0) {
        copyKitFiles(config.repoRoot, directory, kit);
        writeHostComposition(built.plan, directory, tokenFile, kit);
      }
    }

    const job: RenderJob = {
      id,
      status: "rendering",
      startedAt: new Date().toISOString(),
      shots: built.plan.shots.map((s) => ({ id: s.id, title: s.title, duration: s.duration })),
    };
    writeJob(config.repoRoot, job);

    // The render runs in the background: it takes minutes, and the caller's
    // request should not hang on it.
    void (async () => {
      try {
        const { renderProject } = await import("./render.js");
        const result = await renderProject(config.repoRoot, directory, {});
        job.status = result.ok ? "ready" : "failed";
        job.error = result.ok ? undefined : result.log.slice(-2000);
        job.finishedAt = new Date().toISOString();
        job.seconds = result.video ? undefined : undefined;
      } catch (error) {
        job.status = "failed";
        job.error = error instanceof Error ? error.message : String(error);
      }
      writeJob(config.repoRoot, job);
    })();

    writeJson(res, 202, {
      job,
      statusUrl: `${API_PREFIX}/films/${id}`,
      videoUrl: `/films/${id}/video`,
      posterUrl: `/films/${id}/poster`,
      note: "The render runs in the background. Poll the status URL, or use the MCP tool film_status.",
    });
    return true;
  }

  if (route.startsWith("/films/") && method === "GET") {
    const id = decodeURIComponent(route.slice("/films/".length));
    const job = readJob(config.repoRoot, id);
    const directory = join(filmsDir(config.repoRoot), id);
    if (!job && !existsSync(directory)) {
      fail(res, 404, `No film with id "${id}".`);
      return true;
    }
    writeJson(res, 200, {
      job: job ?? null,
      id,
      statusUrl: `${API_PREFIX}/films/${id}`,
      videoUrl: `/films/${id}/video`,
      posterUrl: `/films/${id}/poster`,
      sheetUrl: `/films/${id}/sheet`,
    });
    return true;
  }

  fail(res, 404, `No API route for ${method} ${path}.`, {
    index: `${API_PREFIX}`,
    openapi: `${API_PREFIX}/openapi.json`,
  });
  return true;
}

/** Write a small file the API can serve. Used by the tests and the films. */
export function writeApiNote(repoRoot: string, name: string, body: string): string {
  const dir = join(repoRoot, "workspace");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, name);
  writeFileSync(path, body, "utf8");
  return path;
}

/** Read a file the API wrote. */
export function readApiNote(path: string): string {
  return readFileSync(path, "utf8");
}

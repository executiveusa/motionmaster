/**
 * Motion Master MCP server.
 *
 * Serves the Motion Master tools over the Streamable HTTP transport
 * (the transport the official @modelcontextprotocol/sdk provides for remote
 * servers). The endpoint is /mcp; /health returns a small status document.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { createReadStream, existsSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { loadConfig, type Config } from "./config.js";
import { registerTools } from "./tools.js";
import { listSkills } from "./skills.js";
import { readGallery } from "./clips.js";
import { loadTokens, tokenSource } from "./tokens.js";
import { LICENCE } from "./licence.js";
import { handleChat, type ChatRequestBody } from "./chat.js";
import { listFiles, storeFile, workspaceDir } from "./files.js";
import { filmsDir, listFilms, readJob } from "./render.js";
import { authorised, handleApi } from "./api.js";

const SERVER_NAME = "motion-master";
const SERVER_VERSION = "1.0.0";

const TOOL_NAMES = [
  "list_skills",
  "get_motion_tokens",
  "list_clips",
  "get_clip_prompt",
  "plan_video",
  "build_composition",
  "build_hyperframes_composition",
  "mix_footage",
  "list_library_collections",
  "list_library_categories",
  "browse_library",
  "get_library_item",
  "list_motion_blocks",
  "fill_block",
  "compose_film",
  "render_film",
  "film_status",
  "list_films",
  "list_sfx_kinds",
  "browse_sfx",
  "search_sfx",
  "get_sfx",
  "plan_sound",
  "enhance_prompt",
] as const;

export function createMcpServer(config: Config): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      instructions:
        "Motion Master — motion design skills, a deterministic storyboard planner, and an " +
        "open-source prompt library of nearly 4,000 items across 756 categories. " +
        "Motion Master is not on sale; it is the founder's own agent, used in-house. " +
        "This server never renders anything — it hands you the plan and the command. " +
        "Start with skills/motion-master/SKILL.md: it routes to the specialised skills, " +
        "states the motion doctrine and the anti-slop rules. " +
        "plan_video turns a brief into a timed storyboard; build_composition turns that " +
        "storyboard into runnable Remotion TSX; build_hyperframes_composition turns it into " +
        "a runnable HyperFrames HTML project; enhance_prompt turns a weak brief into a " +
        "complete one; browse_library and list_motion_blocks are the prompt and block " +
        "libraries; mix_footage hands a Montage timeline to the user's own Montage instance.",
    },
  );
  registerTools(server, config);
  return server;
}

/** Read a JSON request body, with a size cap. */
function readBody(req: IncomingMessage, limitBytes = 1_000_000): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(new Error("The request body is too large."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
    req.on("error", reject);
  });
}

/**
 * Uploads are binary. Do not pass them through the JSON chat-body decoder:
 * MP4s and multipart bodies are not JSON, and that silently broke intake.
 */
function readBinaryBody(req: IncomingMessage, limitBytes: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(new Error("Upload exceeds the request limit."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

/** Guess a content type from a filename. */
function guessType(name: string): string {
  const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
  const types: Record<string, string> = {
    ".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm",
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml",
    ".mp3": "audio/mpeg", ".wav": "audio/wav", ".m4a": "audio/mp4",
    ".json": "application/json", ".txt": "text/plain", ".md": "text/markdown",
    ".srt": "text/plain", ".vtt": "text/vtt", ".woff2": "font/woff2",
    ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8", ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".ttf": "font/ttf", ".otf": "font/otf",
  };
  return types[ext] ?? "application/octet-stream";
}

/**
 * Opt-in local combined mode: the Vite build and the agent are served from
 * the same loopback origin. This is a DEVELOPMENT/PRIVATE test surface.
 * Do not bind to the public Internet: the private file/job routes still need
 * an authorization boundary before a hosted deployment.
 */
function tryServeLocalSite(
  req: IncomingMessage,
  res: ServerResponse,
  config: Config,
  pathname: string,
): boolean {
  if (process.env.MOTION_MASTER_SERVE_SITE !== "1") return false;
  if (req.method !== "GET" && req.method !== "HEAD") return false;
  if (!["127.0.0.1", "::1", "localhost"].includes(config.host)) {
    writeJson(res, 403, { error: "Combined site mode is loopback-only until private API auth is complete." });
    return true;
  }
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    writeJson(res, 400, { error: "Malformed asset path." });
    return true;
  }
  if (decoded.includes("\\") || decoded.includes("\0") || decoded.split("/").includes("..")) {
    writeJson(res, 403, { error: "Asset path rejected." });
    return true;
  }
  const base = resolve(config.repoRoot, "site", "dist");
  const candidate = resolve(base, "." + (decoded === "/" ? "/index.html" : decoded));
  if (!candidate.startsWith(base + sep) || !existsSync(candidate)) return false;
  let target: string;
  try {
    target = realpathSync(candidate);
    if (!target.startsWith(realpathSync(base) + sep) || !statSync(target).isFile()) return false;
  } catch {
    return false;
  }
  const bytes = statSync(target).size;
  const headers: Record<string, string | number> = {
    "content-type": guessType(target),
    "accept-ranges": "bytes",
    "cache-control": "no-store",
  };
  // Range responses are needed to seek and play MP4s without reading the entire film.
  const range = req.headers.range?.trim().match(/^bytes=([0-9]+)-([0-9]*)$/i);
  if (req.headers.range && !range) {
    res.writeHead(416, { "content-range": `bytes */${bytes}` });
    res.end();
    return true;
  }
  const start = range ? Number(range[1]) : 0;
  const end = range && range[2] ? Number(range[2]) : bytes - 1;
  if (start >= bytes || end < start || end >= bytes) {
    res.writeHead(416, { "content-range": `bytes */${bytes}` });
    res.end();
    return true;
  }
  headers["content-length"] = end - start + 1;
  if (range) headers["content-range"] = `bytes ${start}-${end}/${bytes}`;
  res.writeHead(range ? 206 : 200, headers);
  if (req.method === "HEAD") { res.end(); return true; }
  createReadStream(target, { start, end }).pipe(res);
  return true;
}

/**
 * Read one file out of a multipart body. The file part is the one with a
 * filename; the other parts are form fields and are ignored.
 */
function parseMultipart(
  body: Buffer,
  boundary: string,
): { filename: string; contentType: string; data: Buffer } | null {
  const marker = Buffer.from(`--${boundary}`);
  let index = body.indexOf(marker);
  while (index !== -1) {
    const start = index + marker.length;
    if (body.slice(start, start + 2).toString() === "--") return null;
    const headerEnd = body.indexOf("\r\n\r\n", start);
    if (headerEnd === -1) return null;
    const headers = body.slice(start, headerEnd).toString("utf8");
    const next = body.indexOf(marker, headerEnd);
    if (next === -1) return null;
    const data = body.slice(headerEnd + 4, next - 2);
    const filename = (headers.match(/filename="([^"]*)"/) || [])[1];
    if (filename) {
      const contentType = (headers.match(/Content-Type:\s*([^\r\n]+)/i) || [])[1] ?? "";
      return { filename, contentType: contentType.trim(), data };
    }
    index = next;
  }
  return null;
}

function writeJson(res: ServerResponse, status: number, payload: unknown): void {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(body),
  });
  res.end(body);
}

function statusDocument(config: Config): Record<string, unknown> {
  const skills = listSkills(config.skillsDir);
  const gallery = readGallery(config.clipsPath);
  return {
    name: SERVER_NAME,
    version: SERVER_VERSION,
    status: "ok",
    mcpEndpoint: config.publicUrl,
    tools: [...TOOL_NAMES],
    skills: {
      count: skills.length,
      directory: config.skillsDir,
      router: "skills/motion-master/SKILL.md",
    },
    clips: {
      available: gallery.available,
      source: gallery.source,
      count: gallery.clips.length,
    },
    tokens: {
      source: tokenSource(config.tokensPath),
      canonicalPath: config.tokensPath,
    },
    montage: {
      configured: config.montage.baseUrl.length > 0,
      baseUrl: config.montage.baseUrl.length > 0 ? config.montage.baseUrl : null,
      tenant: config.montage.tenant,
      tokenConfigured: Boolean(config.montage.token),
    },
    licence: LICENCE,
    domain: {
      recordedIn: config.brandPath,
      tld: null,
      url: null,
      note: "The TLD has not been chosen. No URL is published by this server.",
    },
    rendering: LICENCE.rendering,
  };
}

/**
 * Cross-origin headers.
 *
 * The console is a static site and the server runs on the founder's machine,
 * so the browser sees two origins. The server binds to 127.0.0.1 by default,
 * which keeps it on the local machine; the allowlist is here so it can be
 * narrowed to the exact site that talks to it.
 */
function isLoopbackHost(host: string): boolean {
  return host === "127.0.0.1" || host === "::1" || host === "localhost";
}

/**
 * Browser access to private local files and tools is opt-in. Without an
 * allowlist, an arbitrary website must not be able to drive the local agent.
 * The local combined site is the only implicit browser origin.
 */
function privateOriginAllowed(req: IncomingMessage): boolean {
  const origin = req.headers.origin;
  if (!origin) return true; // Non-browser clients still require the bearer key.
  const allowed = (process.env.MOTION_MASTER_ALLOWED_ORIGINS ?? "")
    .split(",").map((item) => item.trim()).filter(Boolean);
  if (allowed.includes(origin)) return true;
  const host = req.headers.host ?? "";
  const name = host.startsWith("[") ? host.slice(1, host.indexOf("]")) : host.split(":")[0];
  return isLoopbackHost(name) && origin === `http://${host}`;
}

function corsOrigin(config: Config, requestOrigin: string | undefined): string {
  const allowed = (process.env.MOTION_MASTER_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  if (allowed.length === 0) return "*";
  if (requestOrigin && allowed.includes(requestOrigin)) return requestOrigin;
  return allowed[0];
}

/** The request handler.
 *
 * It is a plain function so a host can mount the same routes on its own
 * server — a plugin host, a test, or a reverse proxy in front of it.
 */
export function createHttpHandler(config: Config) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    const origin = corsOrigin(config, req.headers.origin);
    res.setHeader("access-control-allow-origin", origin);
    res.setHeader("vary", "origin");
    /*
     * Private Network Access.
     *
     * The page is served over HTTPS and the agent runs on this machine, so
     * the browser is asking a public page to reach a private address. It
     * will not, unless the server says so — and it asks first, with a
     * preflight. Without these two headers the console cannot reach the
     * agent from a deployed page at all, and the failure looks like "no
     * agent here" rather than like a policy.
     */
    res.setHeader("access-control-allow-private-network", "true");
    const privateRoute = url.pathname.startsWith("/api/") ||
      url.pathname === "/files" || url.pathname.startsWith("/files/") ||
      url.pathname === "/films" || url.pathname.startsWith("/films/") ||
      url.pathname === "/chat" || url.pathname === "/mcp";
    if (privateRoute && !privateOriginAllowed(req)) {
      writeJson(res, 403, { error: "Browser origin is not approved for private tools." });
      return;
    }
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "access-control-allow-methods": "GET, POST, OPTIONS",
        "access-control-allow-headers":
          "content-type, authorization, x-file-name, x-motion-master, access-control-request-private-network",
        "access-control-max-age": "600",
      });
      res.end();
      return;
    }

    // Never expose private projects, uploads, rendered films, chat or MCP
    // tools on a network interface without a configured server-side key.
    // A loopback-only instance remains convenient for local development.
    if (privateRoute) {
      if (!isLoopbackHost(config.host) && !process.env.MOTION_MASTER_API_KEY?.trim()) {
        writeJson(res, 403, { error: "Private endpoints require MOTION_MASTER_API_KEY on a network listener." });
        return;
      }
      if (!authorised(req)) {
        writeJson(res, 401, { error: "Private endpoint requires a bearer token." });
        return;
      }
    }

    // The HTTP API. It answers before the MCP route, so /api/v1 is the
    // product over plain HTTP and /mcp is the same product to an agent.
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url.pathname, config);
      return;
    }

    // Prefer the built frontend on / only when private combined mode is on.
    if (url.pathname === "/" && tryServeLocalSite(req, res, config, url.pathname)) return;

    if (url.pathname === "/health" || url.pathname === "/") {
      if (req.method !== "GET") {
        writeJson(res, 405, { error: "Method not allowed" });
        return;
      }
      writeJson(res, 200, statusDocument(config));
      return;
    }

    if (url.pathname === "/files") {
      if (req.method === "GET") {
        writeJson(res, 200, { files: listFiles(config) });
        return;
      }
      if (req.method !== "POST") {
        writeJson(res, 405, { error: "Method not allowed" });
        return;
      }
      // A multipart upload, or a raw body with the name in a header.
      const contentType = req.headers["content-type"] ?? "";
      if (contentType.includes("multipart/form-data")) {
        const boundary = contentType.split("boundary=")[1];
        if (!boundary) {
          writeJson(res, 400, { error: "The upload had no boundary." });
          return;
        }
        const raw = await readBinaryBody(req, 600 * 1024 * 1024);
        const parsed = parseMultipart(raw as Buffer, boundary);
        if (!parsed) {
          writeJson(res, 400, { error: "The upload could not be read." });
          return;
        }
        const stored = storeFile(config, parsed.filename, parsed.data, parsed.contentType);
        if (!stored.ok) {
          writeJson(res, stored.status, { error: stored.error });
          return;
        }
        writeJson(res, 201, { file: stored.file });
        return;
      }
      const name = String(req.headers["x-file-name"] ?? "upload.bin");
      const bytes = await readBinaryBody(req, 600 * 1024 * 1024);
      const stored = storeFile(config, name, bytes, contentType || "application/octet-stream");
      if (!stored.ok) {
        writeJson(res, stored.status, { error: stored.error });
        return;
      }
      writeJson(res, 201, { file: stored.file });
      return;
    }

    if (url.pathname.startsWith("/files/")) {
      if (req.method !== "GET" && req.method !== "HEAD") {
        writeJson(res, 405, { error: "Method not allowed." });
        return;
      }
      let name: string;
      try {
        name = decodeURIComponent(url.pathname.slice("/files/".length));
      } catch {
        writeJson(res, 400, { error: "Invalid file name." });
        return;
      }
      // Flat hash-named uploads only. Reject encoded slashes, dot segments,
      // backslashes, and symlink targets outside the private workspace.
      if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,255}$/.test(name) || name === "." || name === "..") {
        writeJson(res, 400, { error: "Invalid file name." });
        return;
      }
      const root = workspaceDir(config);
      const path = join(root, name);
      if (!existsSync(path)) {
        writeJson(res, 404, { error: "No such file." });
        return;
      }
      try {
        const realRoot = realpathSync(root);
        const realFile = realpathSync(path);
        if (!realFile.startsWith(realRoot + sep) || !statSync(realFile).isFile()) {
          writeJson(res, 403, { error: "File access denied." });
          return;
        }
      } catch {
        writeJson(res, 404, { error: "No such file." });
        return;
      }
      const body = req.method === "HEAD" ? Buffer.alloc(0) : readFileSync(path);
      res.writeHead(200, {
        "content-type": guessType(name),
        "content-length": statSync(path).size,
        "cache-control": "no-store",
      });
      res.end(body);
      return;
    }

    if (url.pathname === "/films" && req.method === "GET") {
      // The films on this machine. Each one names the URL the console plays.
      const films = listFilms(config.repoRoot).map((film) => {
        const job = readJob(config.repoRoot, film.id);
        return {
          id: film.id,
          title: film.title,
          brief: film.brief,
          createdAt: film.createdAt,
          seconds: film.seconds,
          bytes: film.video?.bytes,
          status: job?.status ?? (film.video ? "ready" : "unknown"),
          error: job?.error,
          videoUrl: film.video ? `/films/${film.id}/video` : undefined,
          posterUrl: film.poster ? `/films/${film.id}/poster` : undefined,
          sheetUrl: film.sheet ? `/films/${film.id}/sheet` : undefined,
        };
      });
      writeJson(res, 200, { films });
      return;
    }

    if (url.pathname.startsWith("/films/")) {
      if (req.method !== "GET" && req.method !== "HEAD") {
        writeJson(res, 405, { error: "Method not allowed." });
        return;
      }
      const rest = url.pathname.slice("/films/".length);
      const slash = rest.indexOf("/");
      const id = decodeURIComponent(slash === -1 ? rest : rest.slice(0, slash));
      const what = slash === -1 ? "record" : rest.slice(slash + 1);

      // The id is a folder name, never a path. Anything that tries to walk
      // out of the films directory is refused.
      if (!/^[a-z0-9][a-z0-9-]*$/i.test(id)) {
        writeJson(res, 400, { error: "That is not a film id." });
        return;
      }
      const directory = join(filmsDir(config.repoRoot), id);
      if (!existsSync(directory)) {
        writeJson(res, 404, { error: "No such film." });
        return;
      }

      if (what === "record") {
        const film = listFilms(config.repoRoot).find((f) => f.id === id);
        const job = readJob(config.repoRoot, id);
        writeJson(res, 200, {
          film,
          job,
          status: job?.status ?? (film?.video ? "ready" : "unknown"),
          videoUrl: film?.video ? `/films/${id}/video` : undefined,
          posterUrl: film?.poster ? `/films/${id}/poster` : undefined,
          sheetUrl: film?.sheet ? `/films/${id}/sheet` : undefined,
        });
        return;
      }

      const targets: Record<string, string[]> = {
        video: ["film.mp4"],
        poster: ["stills"],
        sheet: ["stills"],
      };
      const allowed = targets[what];
      if (!allowed) {
        writeJson(res, 404, { error: "Not found", endpoints: ["/films", "/films/:id/video"] });
        return;
      }

      let file: string | undefined;
      if (what === "video") {
        const candidate = join(directory, "film.mp4");
        if (existsSync(candidate)) file = candidate;
      } else {
        const stills = join(directory, "stills");
        if (existsSync(stills)) {
          const names = readdirSync(stills);
          const wanted =
            what === "sheet"
              ? names.find((n) => /sheet|contact/i.test(n))
              : names.find((n) => /^frame-.*\.(png|jpe?g)$/i.test(n));
          if (wanted) file = join(stills, wanted);
        }
      }
      if (!file) {
        writeJson(res, 404, { error: "That file has not been made." });
        return;
      }

      const body = readFileSync(file);
      res.writeHead(200, {
        "content-type": guessType(file),
        "content-length": body.length,
        "cache-control": "no-store",
      });
      res.end(body);
      return;
    }

    if (url.pathname === "/chat") {
      if (req.method !== "POST") {
        writeJson(res, 405, { error: "Method not allowed" });
        return;
      }
      let body: ChatRequestBody;
      try {
        body = (await readBody(req)) as ChatRequestBody;
      } catch (error) {
        writeJson(res, 400, {
          error: "The request body could not be read.",
          detail: error instanceof Error ? error.message : String(error),
        });
        return;
      }
      const controller = new AbortController();
      res.on("close", () => controller.abort());
      const result = await handleChat(body, config, controller.signal);
      res.statusCode = result.status;
      for (const [key, value] of result.response.headers) {
        if (key === "content-type") continue;
        res.setHeader(key, value);
      }
      if (!result.response.body) {
        res.end();
        return;
      }
      const reader = result.response.body.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!res.write(value)) {
            await new Promise<void>((resolve) => res.once("drain", resolve));
          }
        }
      } catch (error) {
        if (!res.headersSent) {
          writeJson(res, 500, {
            error: "The stream failed.",
            detail: error instanceof Error ? error.message : String(error),
          });
        }
      }
      res.end();
      return;
    }

    if (url.pathname === "/mcp") {
      // Stateless: a fresh server + transport per request keeps the endpoint
      // usable from hosts that do not keep a session.
      const server = createMcpServer(config);
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      res.on("close", () => {
        void transport.close();
        void server.close();
      });
      try {
        await server.connect(transport);
        await transport.handleRequest(req, res);
      } catch (error) {
        if (!res.headersSent) {
          writeJson(res, 500, {
            error: error instanceof Error ? error.message : String(error),
          });
        } else {
          res.end();
        }
      }
      return;
    }

    if (tryServeLocalSite(req, res, config, url.pathname)) return;
    writeJson(res, 404, { error: "Not found", endpoints: ["/mcp", "/health"] });
  };
}

/**
 * Start the server on its configured host and port.
 *
 * Returns the running server so a caller — the CLI, a test, another host — can
 * mount it, probe it, and shut it down again. This is the same server the
 * console talks to; there is no second implementation.
 */
export async function startChatServer(config: Config): Promise<{
  server: Server;
  url: string;
  close: () => Promise<void>;
}> {
  const httpServer = createServer(createHttpHandler(config));
  await new Promise<void>((resolve) => {
    httpServer.listen(config.port, config.host, () => resolve());
  });
  return {
    server: httpServer,
    url: `http://${config.host}:${config.port}`,
    close: () =>
      new Promise<void>((resolve) => {
        httpServer.close(() => resolve());
      }),
  };
}

export async function main(): Promise<void> {
  const config = loadConfig();
  const { server: httpServer } = await startChatServer(config);

  const skills = listSkills(config.skillsDir);
  process.stdout.write(
    [
      `Motion Master MCP ${SERVER_VERSION} listening on http://${config.host}:${config.port}`,
      `  MCP endpoint : ${config.publicUrl}`,
      `  health       : http://${config.host}:${config.port}/health`,
      `  tools        : ${TOOL_NAMES.join(", ")}`,
      `  skills       : ${skills.length} bundled in ${config.skillsDir}`,
      `  tokens       : ${tokenSource(config.tokensPath)}`,
      `  montage      : ${
        config.montage.baseUrl.length > 0 ? config.montage.baseUrl : "not configured"
      }`,
      `  licence      : ${LICENCE.summary}`,
      `  rendering    : local (Remotion) on your own machine; Studio can also render on ours — never billed automatically`,
      "",
    ].join("\n"),
  );

  const shutdown = (): void => {
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 2000).unref();
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

/**
 * Is this module the one the process was started with?
 *
 * The real path is used on both sides. Without it, a server started through a
 * symlink — "/workspace/..." pointing at the real mount — silently exits
 * instead of listening, because the two paths never match.
 */
function isEntrypoint(): boolean {
  const invoked = process.argv[1];
  if (!invoked) return false;
  try {
    const resolved = realpathSync(invoked);
    return import.meta.url === new URL(`file://${resolved}`).href;
  } catch {
    return import.meta.url === new URL(`file://${invoked}`).href;
  }
}

if (isEntrypoint()) {
  main().catch((error) => {
    process.stderr.write(
      `Failed to start the Motion Master MCP server: ${
        error instanceof Error ? error.stack ?? error.message : String(error)
      }\n`,
    );
    process.exit(1);
  });
}

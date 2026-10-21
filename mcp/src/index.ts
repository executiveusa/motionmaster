/**
 * Motion Master MCP server.
 *
 * Serves the Motion Master tools over the Streamable HTTP transport
 * (the transport the official @modelcontextprotocol/sdk provides for remote
 * servers). The endpoint is /mcp; /health returns a small status document.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { loadConfig, type Config } from "./config.js";
import { registerTools } from "./tools.js";
import { listSkills } from "./skills.js";
import { readGallery } from "./clips.js";
import { loadTokens, tokenSource } from "./tokens.js";

const SERVER_NAME = "motion-master";
const SERVER_VERSION = "1.0.0";

const TOOL_NAMES = [
  "list_skills",
  "get_motion_tokens",
  "list_clips",
  "get_clip_prompt",
  "plan_video",
  "build_composition",
  "mix_footage",
] as const;

export function createMcpServer(config: Config): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      instructions:
        "Motion Master — motion design skills and a deterministic storyboard planner. " +
        "Start with skills/motion-master/SKILL.md: it routes to the specialised skills, " +
        "states the motion doctrine and the anti-slop rules. " +
        "plan_video turns a brief into a timed storyboard; build_composition turns that " +
        "storyboard into runnable Remotion TSX; mix_footage hands a Montage timeline to the " +
        "user's own Montage instance.",
    },
  );
  registerTools(server, config);
  return server;
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
      tokenConfigured: Boolean(config.montage.token),
    },
  };
}

export async function main(): Promise<void> {
  const config = loadConfig();
  const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    if (url.pathname === "/health" || url.pathname === "/") {
      if (req.method !== "GET") {
        writeJson(res, 405, { error: "Method not allowed" });
        return;
      }
      writeJson(res, 200, statusDocument(config));
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

    writeJson(res, 404, { error: "Not found", endpoints: ["/mcp", "/health"] });
  });

  await new Promise<void>((resolve) => {
    httpServer.listen(config.port, config.host, () => resolve());
  });

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

const isEntrypoint =
  process.argv[1] !== undefined &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (isEntrypoint) {
  main().catch((error) => {
    process.stderr.write(
      `Failed to start the Motion Master MCP server: ${
        error instanceof Error ? error.stack ?? error.message : String(error)
      }\n`,
    );
    process.exit(1);
  });
}

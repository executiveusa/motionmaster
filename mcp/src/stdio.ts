/**
 * The same server, over stdio.
 *
 * The HTTP transport is right for the web console and for a remote host that
 * can reach a URL. It is wrong for a host that launches a server as a child
 * process and speaks to it over its pipes — Claude Code, Codex and Hermes
 * all do that, and all of them call it stdio.
 *
 * This is the same tool surface, built by the same factory. Nothing is
 * registered twice and nothing drifts: if a tool is on the HTTP server it is
 * on this one, because both call createMcpServer().
 *
 *   node mcp/dist/stdio.js
 *
 * Nothing may be written to stdout. The protocol owns that stream. The
 * banner therefore goes to stderr, which is where a host looks for a log.
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { createMcpServer, TOOL_NAMES } from "./index.js";
import { listSkills } from "./skills.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const server = createMcpServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);

  const skills = listSkills(config.skillsDir);
  process.stderr.write(
    [
      `Motion Master MCP over stdio`,
      `  tools        : ${TOOL_NAMES.length}`,
      `  skills       : ${skills.length} bundled`,
      `  repo         : ${config.repoRoot}`,
      "",
    ].join("\n"),
  );
}

main().catch((error: unknown) => {
  process.stderr.write(
    `Failed to start the Motion Master MCP server over stdio: ${
      error instanceof Error ? (error.stack ?? error.message) : String(error)
    }\n`,
  );
  process.exit(1);
});

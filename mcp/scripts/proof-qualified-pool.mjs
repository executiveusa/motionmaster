#!/usr/bin/env node
/**
 * The qualified pool, end to end.
 *
 * Starts the REAL MCP server and checks that the blocks it hands back are the
 * ones the gate passed. A block the gate rejected must not be offered, not
 * matched, and not returned when it is asked for by name.
 *
 *   cd mcp && node scripts/proof-qualified-pool.mjs
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const here = dirname(fileURLToPath(import.meta.url));
const mcpDir = resolve(here, "..");
const repoRoot = resolve(here, "..", "..");
/*
 * A fresh port every run. A server left over from an earlier run would be
 * answering with code from before the last build, and the proof would be
 * measuring the wrong thing without knowing it.
 */
const port = Number(process.env.MOTION_MASTER_VERIFY_PORT ?? 8800 + Math.floor(Math.random() * 400));
const baseUrl = `http://127.0.0.1:${port}`;

const verdicts = JSON.parse(readFileSync(resolve(repoRoot, "library", "block-verdicts.json"), "utf8")).verdicts ?? {};
const passing = new Set(Object.entries(verdicts).filter(([, v]) => v.ok).map(([id]) => id));
const failing = Object.entries(verdicts).filter(([, v]) => !v.ok).map(([id]) => id);

let failures = 0;
function check(name, condition, detail = "") {
  const ok = Boolean(condition);
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  return ok;
}

const child = spawn(process.execPath, ["dist/index.js"], {
  cwd: mcpDir,
  env: { ...process.env, MOTION_MASTER_MCP_HOST: "127.0.0.1", MOTION_MASTER_MCP_PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"],
});
child.stdout.setEncoding("utf8");
child.stderr.setEncoding("utf8");
let ready = false;
child.stdout.on("data", (chunk) => { if (/listening|MCP/i.test(chunk)) ready = true; });
for (let i = 0; i < 80 && !ready; i += 1) await new Promise((r) => setTimeout(r, 250));

const client = new Client({ name: "qualified-pool-proof", version: "1.0.0" });
let connected = false;
try {
  await client.connect(new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`)));
  connected = true;
} catch (error) {
  child.kill("SIGTERM");
  console.error(`could not reach the server on ${baseUrl}: ${error.message}`);
  process.exit(1);
}

try {
  check("the pool was measured", Object.keys(verdicts).length > 0, `${Object.keys(verdicts).length} blocks`);
  check("some blocks pass and some do not", passing.size > 0 && failing.length > 0,
    `${passing.size} pass, ${failing.length} do not`);

  /* 1 — a brief is answered, and what it is answered with has passed. */
  const briefs = [
    "a calm title card for ACME coffee",
    "kinetic type, one line of words arriving on its own beat",
    "a lower third with a name and a role",
    "a data chart that draws itself",
    "a product turning on a light ground",
  ];
  const chosen = new Set();
  for (const brief of briefs) {
    const filled = await client.callTool({ name: "fill_block", arguments: { brief } });
    if (filled.isError) {
      check(`a brief is answered: "${brief.slice(0, 34)}"`, false, String(filled.content?.[0]?.text ?? "").slice(0, 90));
      continue;
    }
    const id = filled.structuredContent?.block?.id ?? filled.structuredContent?.id;
    chosen.add(id);
    check(`a brief is answered: "${brief.slice(0, 34)}"`, Boolean(id), String(id));
  }

  const rejected = [...chosen].filter((id) => !passing.has(id));
  check("every block it offered has passed the gate", rejected.length === 0,
    rejected.length ? `not passed: ${rejected.join(", ")}` : `${chosen.size} distinct blocks`);

  /* 2 — a block the gate rejected is refused even when it is named. */
  const named = failing.find((id) => !id.includes("-") && !id.startsWith("caption-")) ?? failing[0];
  const refused = await client.callTool({ name: "fill_block", arguments: { brief: "anything", block: named } });
  check("a rejected block is refused when it is named", Boolean(refused.isError),
    refused.isError ? String(refused.content?.[0]?.text ?? "").slice(0, 90) : `it filled ${named}`);

  /* 3 — and the reason is the gate's own. */
  const reason = String(refused.content?.[0]?.text ?? "");
  check("the refusal carries the gate's reason", reason.includes("gate"), reason.slice(0, 90));

  /* 4 — the tool list still matches the banner. */
  const listed = await client.listTools();
  const names = listed.tools.map((t) => t.name);
  check("the server exposes every tool", names.length === 35, `${names.length} tools`);
} finally {
  if (connected) await client.close().catch(() => {});
  child.kill("SIGTERM");
}

console.log(failures ? `\nFAILED ${failures}` : "\nALL PASS");
process.exit(failures ? 1 : 0);

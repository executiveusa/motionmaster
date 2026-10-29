/**
 * End-to-end tests for the Motion Master MCP server.
 *
 * The suite starts the real server on a free port, connects a real MCP client
 * over the Streamable HTTP transport and calls every tool. Nothing here is
 * mocked: the tools run against the plugin package and the site clip manifest
 * on disk.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import ts from "typescript";

const here = dirname(fileURLToPath(import.meta.url));
const mcpDir = resolve(here, "..");
const port = 8791;
const baseUrl = `http://127.0.0.1:${port}`;

async function startServer() {
  const child = spawn(process.execPath, ["dist/index.js"], {
    cwd: mcpDir,
    env: {
      ...process.env,
      MOTION_MASTER_MCP_HOST: "127.0.0.1",
      MOTION_MASTER_MCP_PORT: String(port),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk;
  });
  child.stderr.on("data", (chunk) => {
    output += chunk;
  });

  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return { child, output: () => output };
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`The server did not start. Output:\n${output}`);
}

let server;
let client;

test.before(async () => {
  server = await startServer();
  client = new Client({ name: "motion-master-test", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`));
  await client.connect(transport);
});

test.after(async () => {
  if (client) await client.close();
  if (server) {
    server.child.kill("SIGTERM");
    await once(server.child, "exit");
  }
});

test("the server advertises every tool", async () => {
  const { tools } = await client.listTools();
  const names = tools.map((tool) => tool.name).sort();
  assert.deepEqual(names, [
    "board_sync_cancel",
    "board_sync_check",
    "board_sync_start",
    "board_sync_status",
    "browse_library",
    "browse_sfx",
    "build_composition",
    "build_hyperframes_composition",
    "check_hyperframes",
    "compose_film",
    "enhance_prompt",
    "fill_block",
    "film_status",
    "get_clip_prompt",
    "get_library_item",
    "get_motion_block",
    "get_motion_tokens",
    "get_sfx",
    "list_clips",
    "list_films",
    "list_library_categories",
    "list_library_collections",
    "list_motion_blocks",
    "list_sfx_kinds",
    "list_skills",
    "mix_footage",
    "plan_sound",
    "plan_video",
    "render_film",
    "search_sfx",
  ]);
  for (const tool of tools) {
    assert.ok(tool.description && tool.description.length > 20, `${tool.name} needs a description`);
  }
});

test("list_skills returns the bundled skills", async () => {
  const result = await client.callTool({ name: "list_skills", arguments: {} });
  const payload = result.structuredContent;
  assert.ok(payload.count >= 21, "expected 20 upstream skills plus the router");
  const names = payload.skills.map((skill) => skill.name);
  assert.ok(names.includes("motion-master"), "the router skill is missing");
  assert.ok(names.includes("gsap-timeline"));
  assert.ok(names.includes("remotion-markup"));
  for (const skill of payload.skills) {
    assert.ok(skill.description.length > 0, `${skill.name} has no description`);
  }
});

test("get_motion_tokens returns the doctrine", async () => {
  const result = await client.callTool({ name: "get_motion_tokens", arguments: {} });
  const payload = result.structuredContent;
  assert.equal(payload.doctrine.entrance, "ease-out");
  assert.equal(payload.doctrine.exit, "ease-in");
  assert.equal(payload.doctrine.onScreen, "ease-in-out");
  assert.equal(payload.doctrine.staggerBudgetMs, 500);
  assert.equal(payload.tokens.palette.accent, "#FF4A1C");
});

test("list_clips reads the site clip manifest", async () => {
  const result = await client.callTool({ name: "list_clips", arguments: {} });
  const payload = result.structuredContent;
  assert.equal(payload.available, true);
  assert.ok(payload.count >= 4);
  assert.ok(payload.clips.some((clip) => clip.id === "launch-title"));
});

test("get_clip_prompt returns the real prompt", async () => {
  const result = await client.callTool({
    name: "get_clip_prompt",
    arguments: { id: "launch-title" },
  });
  const payload = result.structuredContent;
  assert.equal(payload.id, "launch-title");
  assert.match(payload.prompt, /14s launch title/i);
  assert.equal(payload.durationSeconds, 14);
  assert.ok(payload.stack.length > 0);
});

test("get_clip_prompt fails honestly for an unknown id", async () => {
  const result = await client.callTool({
    name: "get_clip_prompt",
    arguments: { id: "does-not-exist" },
  });
  assert.equal(result.isError, true);
  assert.match(result.structuredContent.error, /does-not-exist/);
});

test("plan_video produces a doctrine-compliant, deterministic storyboard", async () => {
  const brief = "15s launch film, name reveal, hold 2s, calm exit";
  const first = await client.callTool({ name: "plan_video", arguments: { brief } });
  const second = await client.callTool({ name: "plan_video", arguments: { brief } });
  assert.deepEqual(first.structuredContent, second.structuredContent, "the planner must be deterministic");

  const plan = first.structuredContent;
  assert.equal(plan.duration.seconds, 15);
  assert.ok(plan.beats.length >= 3);
  assert.equal(plan.beats[0].index, 1);

  // entrance eases out, exit eases in, on-screen eases in-out
  const entrance = plan.beats.find((beat) => beat.easingRole === "entrance");
  const exit = plan.beats.find((beat) => beat.easingRole === "exit");
  const onScreen = plan.beats.find((beat) => beat.easingRole === "onScreen");
  assert.equal(entrance.easing.role, "ease-out");
  assert.equal(exit.easing.role, "ease-in");
  assert.equal(onScreen.easing.role, "ease-in-out");

  // in/out times and frames are consistent and ordered
  for (let i = 0; i < plan.beats.length; i += 1) {
    const beat = plan.beats[i];
    assert.ok(beat.outSeconds > beat.inSeconds, `beat ${beat.index} has no duration`);
    assert.equal(beat.inFrame, Math.round(beat.inSeconds * plan.fps));
    if (i > 0) {
      assert.equal(beat.inSeconds, plan.beats[i - 1].outSeconds, "beats must be contiguous");
    }
  }
  assert.equal(plan.duration.frames, plan.beats[plan.beats.length - 1].outFrame);

  // the stagger plan stays inside the budget
  assert.equal(plan.staggerPlan.allWithinBudget, true);
  assert.ok(plan.staggerPlan.maxTotalMs < 500);
  for (const group of plan.staggerPlan.groups) {
    assert.ok(group.totalMs < 500, `stagger group ${group.beat} exceeds the budget`);
  }
});

test("plan_video keeps a big stagger group under the budget", async () => {
  const result = await client.callTool({
    name: "plan_video",
    arguments: { brief: "20s kinetic type, 12 words, one line each" },
  });
  const plan = result.structuredContent;
  assert.ok(plan.staggerPlan.maxTotalMs < 500, "the stagger budget was blown");
  assert.equal(plan.staggerPlan.allWithinBudget, true);
});

test("build_composition emits runnable TSX with a Composition registration", async () => {
  const result = await client.callTool({
    name: "build_composition",
    arguments: { brief: "15s launch film, name reveal, hold 2s, calm exit" },
  });
  const payload = result.structuredContent;
  assert.ok(payload.tsx.includes("<Composition"));
  assert.ok(payload.tsx.includes("registerRoot"));
  assert.ok(payload.tsx.includes('id="launch-title"'));
  assert.ok(payload.tsx.includes("#FF4A1C"), "the palette tokens must be in the file");
  assert.ok(payload.tsx.includes("Easing.bezier"), "the doctrine curves must be in the file");
  assert.ok(payload.composition.durationInFrames > 0);
  assert.ok(payload.commands.some((command) => command.includes("remotion render")));
});

test("mix_footage validates a Montage timeline and reports honestly", async () => {
  const result = await client.callTool({
    name: "mix_footage",
    arguments: {
      dry_run: true,
      timeline: {
        cuts: [
          {
            type: "none",
            source: "footage/source.mp4",
            source_in_seconds: 0,
            in_seconds: 0,
            out_seconds: 3,
            animation: "ken-burns",
          },
        ],
        overlays: [
          { type: "hero_title", text: "Motion Master", position: "center" },
          { type: "section_title", text: "Chapter one", subtitle: "00:03" },
        ],
      },
    },
  });
  const payload = result.structuredContent;
  assert.equal(payload.delivered, false);
  assert.equal(payload.validation.valid, true);
  assert.equal(payload.validation.summary.cuts, 1);
  assert.equal(payload.validation.summary.overlays, 2);
});

test("mix_footage rejects an invalid Montage timeline", async () => {
  const result = await client.callTool({
    name: "mix_footage",
    arguments: {
      dry_run: true,
      timeline: {
        cuts: [{ type: "none", source: "a.mp4", in_seconds: 5, out_seconds: 2 }],
        overlays: [{ type: "not_a_real_overlay", text: "x" }],
      },
    },
  });
  assert.equal(result.isError, true);
  const issues = result.structuredContent.issues;
  assert.ok(issues.some((issue) => issue.message.includes("out_seconds")));
  assert.ok(issues.some((issue) => issue.message.includes("Unknown overlay type")));
});

test("the generated TSX parses as a TSX module", async () => {
  const result = await client.callTool({
    name: "build_composition",
    arguments: { brief: "15s launch film, name reveal, hold 2s, calm exit" },
  });
  const tsx = result.structuredContent.tsx;
  assert.ok(tsx.length > 2000, "the composition looks truncated");

  const source = ts.createSourceFile(
    "src/index.tsx",
    tsx,
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.TSX,
  );
  const parseErrors = source.parseDiagnostics ?? [];
  assert.deepEqual(
    parseErrors.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")),
    [],
    "the generated TSX does not parse",
  );
});

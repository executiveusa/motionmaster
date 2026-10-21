#!/usr/bin/env node
/**
 * Proof harness for the Motion Master MCP server.
 *
 * It starts the REAL server (node dist/index.js), connects a REAL MCP client
 * over the Streamable HTTP transport and calls every tool. Nothing is mocked
 * except the Montage instance, which is a local test double for the routes
 * documented in docs/05-MONTAGE-INTEGRATION.md.
 *
 *   node scripts/verify-tools.mjs            # human-readable transcript
 *   node scripts/verify-tools.mjs --json     # machine-readable summary
 *
 * The exit code is 0 only when every check passed.
 */
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import ts from "typescript";
import { startFakeMontage } from "../test/fixtures/fake-montage-server.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const mcpDir = resolve(here, "..");
const port = Number(process.env.MOTION_MASTER_VERIFY_PORT ?? 8799);
const baseUrl = `http://127.0.0.1:${port}`;

const BRIEF = "15s launch film, name reveal, hold 2s, calm exit";

const results = [];
let failures = 0;

function check(name, condition, detail = "") {
  const ok = Boolean(condition);
  if (!ok) failures += 1;
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  return ok;
}

function section(title) {
  console.log(`\n=== ${title} ===`);
}

async function startServer(env = {}) {
  const child = spawn(process.execPath, ["dist/index.js"], {
    cwd: mcpDir,
    env: {
      ...process.env,
      MOTION_MASTER_MCP_HOST: "127.0.0.1",
      MOTION_MASTER_MCP_PORT: String(port),
      ...env,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    output += chunk;
  });
  child.stderr.on("data", (chunk) => {
    output += chunk;
  });
  for (let attempt = 0; attempt < 80; attempt += 1) {
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

const main = async () => {
  section("server start-up");
  const montage = await startFakeMontage({ version: 3 });
  const server = await startServer({
    MOTION_MASTER_MONTAGE_URL: montage.url,
    MOTION_MASTER_MONTAGE_TENANT: "tenant_owner",
  });
  console.log(server.output().trimEnd());

  const client = new Client({ name: "motion-master-verify", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`));
  await client.connect(transport);

  try {
    section("tools/list");
    const { tools } = await client.listTools();
    for (const tool of tools) {
      console.log(`- ${tool.name}: ${tool.description.slice(0, 90)}…`);
    }
    check(
      "all seven tools are advertised",
      tools.length === 7 &&
        ["list_skills", "get_motion_tokens", "list_clips", "get_clip_prompt", "plan_video", "build_composition", "mix_footage"].every(
          (name) => tools.some((tool) => tool.name === name),
        ),
      `${tools.length} tools`,
    );

    section("list_skills");
    const skills = await client.callTool({ name: "list_skills", arguments: {} });
    const skillPayload = skills.structuredContent;
    console.log(
      `count=${skillPayload.count} total=${skillPayload.total} source=${skillPayload.source}`,
    );
    console.log(
      skillPayload.skills
        .map((skill) => `  ${skill.name} [${skill.group}] ${skill.license ?? "—"}`)
        .join("\n"),
    );
    check("list_skills returns the bundled skills", skillPayload.count >= 21, `${skillPayload.count} skills`);
    check(
      "the router is listed",
      skillPayload.skills.some((skill) => skill.name === "motion-master"),
    );
    check(
      "the upstream skills keep their MIT licence",
      skillPayload.skills
        .filter((skill) => skill.group === "gsap" || skill.group === "motion-design")
        .every((skill) => skill.license === "MIT"),
    );

    section("get_motion_tokens");
    const tokens = await client.callTool({ name: "get_motion_tokens", arguments: {} });
    const tokenPayload = tokens.structuredContent;
    console.log(
      `entrance=${tokenPayload.doctrine.entrance} exit=${tokenPayload.doctrine.exit} onScreen=${tokenPayload.doctrine.onScreen} budget=${tokenPayload.doctrine.staggerBudgetMs}ms`,
    );
    console.log(
      `easing.entrance=${JSON.stringify(tokenPayload.tokens.easing.entrance.cubicBezier)} accent=${tokenPayload.tokens.palette.accent}`,
    );
    check("the doctrine comes back", tokenPayload.doctrine.entrance === "ease-out" && tokenPayload.doctrine.exit === "ease-in");
    check("the stagger budget is 500ms", tokenPayload.doctrine.staggerBudgetMs === 500);
    check("the palette is inlined", tokenPayload.tokens.palette.accent === "#FF4A1C");

    section("list_clips");
    const clips = await client.callTool({ name: "list_clips", arguments: {} });
    const galleryPayload = clips.structuredContent;
    for (const clip of galleryPayload.clips) {
      console.log(`- ${clip.id} · ${clip.title} · ${clip.stack} · ${clip.duration}`);
    }
    check("the four gallery clips come back", galleryPayload.count === 4, `${galleryPayload.count} clips`);

    section("get_clip_prompt");
    const clipResult = await client.callTool({
      name: "get_clip_prompt",
      arguments: { id: "launch-title" },
    });
    const clipPayload = clipResult.structuredContent;
    console.log(`id=${clipPayload.id}`);
    console.log(`stack=${clipPayload.stack} duration=${clipPayload.duration} (${clipPayload.durationSeconds}s)`);
    console.log(`prompt=${clipPayload.prompt}`);
    check("the prompt is the real one", /14s launch title/i.test(clipPayload.prompt));
    check("the stack is present", clipPayload.stack.length > 0);
    check("the duration is present", clipPayload.durationSeconds === 14);

    section("plan_video (called twice with the same brief)");
    const first = await client.callTool({ name: "plan_video", arguments: { brief: BRIEF } });
    const second = await client.callTool({ name: "plan_video", arguments: { brief: BRIEF } });
    const firstBytes = Buffer.from(first.content[0].text, "utf8");
    const secondBytes = Buffer.from(second.content[0].text, "utf8");
    const identical = firstBytes.equals(secondBytes);
    console.log(`brief="${BRIEF}"`);
    console.log(`first  response: ${firstBytes.length} bytes`);
    console.log(`second response: ${secondBytes.length} bytes`);
    console.log(`byte-identical: ${identical}`);
    console.log(`sha256(first)  = ${(await import("node:crypto")).createHash("sha256").update(firstBytes).digest("hex")}`);
    console.log(`sha256(second) = ${(await import("node:crypto")).createHash("sha256").update(secondBytes).digest("hex")}`);
    check("plan_video is byte-identical across two calls", identical);

    const plan = first.structuredContent;
    console.log(
      `template=${plan.template} style=${plan.style} fps=${plan.fps} duration=${plan.duration.seconds}s (${plan.duration.frames} frames)`,
    );
    for (const beat of plan.beats) {
      console.log(
        `  ${beat.index}. ${beat.label} — ${beat.role} — ${beat.easingRole} (${beat.easing.name}) ${beat.inSeconds}s→${beat.outSeconds}s f${beat.inFrame}→f${beat.outFrame} stagger ${beat.stagger.intervalMs}ms × ${beat.stagger.elementCount} = ${beat.stagger.totalMs}ms`,
      );
    }
    console.log(
      `stagger plan: budget=${plan.staggerPlan.budgetMs}ms max=${plan.staggerPlan.maxTotalMs}ms allWithinBudget=${plan.staggerPlan.allWithinBudget}`,
    );
    check("the beats are numbered and contiguous", plan.beats.every((beat, i) => beat.index === i + 1));
    check("the in/out times are ordered", plan.beats.every((beat) => beat.outSeconds > beat.inSeconds));
    check(
      "the easing roles follow the doctrine",
      plan.beats.every((beat) =>
        beat.easingRole === "entrance"
          ? beat.easing.role === "ease-out"
          : beat.easingRole === "exit"
            ? beat.easing.role === "ease-in"
            : beat.easing.role === "ease-in-out",
      ),
    );
    check("the total stagger stays under 500ms", plan.staggerPlan.maxTotalMs < 500, `${plan.staggerPlan.maxTotalMs}ms`);

    section("build_composition");
    const composition = await client.callTool({
      name: "build_composition",
      arguments: { brief: BRIEF },
    });
    const compositionPayload = composition.structuredContent;
    const tsx = compositionPayload.tsx;
    console.log(`file=${compositionPayload.filename} id=${compositionPayload.composition.id}`);
    console.log(
      `composition=${compositionPayload.composition.width}x${compositionPayload.composition.height} @${compositionPayload.composition.fps}fps, ${compositionPayload.composition.durationInFrames} frames`,
    );
    console.log(`tsx=${tsx.length} bytes`);
    const source = ts.createSourceFile(
      "src/index.tsx",
      tsx,
      ts.ScriptTarget.ES2022,
      true,
      ts.ScriptKind.TSX,
    );
    const parseErrors = (source.parseDiagnostics ?? []).map((diagnostic) =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, " "),
    );
    console.log(`parse errors: ${parseErrors.length === 0 ? "none" : parseErrors.join("; ")}`);
    check("the TSX contains a Composition registration", tsx.includes("<Composition"));
    check("the TSX calls registerRoot", tsx.includes("registerRoot"));
    check("the TSX carries the motion tokens", tsx.includes("#FF4A1C") && tsx.includes("Easing.bezier"));
    check("the TSX parses", parseErrors.length === 0, parseErrors.join("; "));
    const outFile = resolve(mcpDir, "verification", "src", "index.tsx");
    await mkdir(dirname(outFile), { recursive: true });
    await writeFile(outFile, tsx, "utf8");
    console.log(`written: ${outFile}`);

    section("mix_footage (against a local Montage test double)");
    const mix = await client.callTool({
      name: "mix_footage",
      arguments: {
        timeline: {
          cuts: [
            { type: "none", source: "footage/source.mp4", source_in_seconds: 0, in_seconds: 0, out_seconds: 3 },
            { type: "none", source: "footage/source.mp4", source_in_seconds: 3, in_seconds: 3, out_seconds: 14 },
          ],
          overlays: [
            { type: "hero_title", text: "Motion Master", in_seconds: 3, out_seconds: 9, position: "center" },
          ],
        },
      },
    });
    const mixPayload = mix.structuredContent;
    console.log(`delivered=${mixPayload.delivered}`);
    console.log(
      `montage=${JSON.stringify({
        projectId: mixPayload.montage?.projectId,
        expectedVersion: mixPayload.montage?.expectedVersion,
        storedVersion: mixPayload.montage?.storedVersion,
        health: mixPayload.montage?.health,
      })}`,
    );
    console.log("requests the Montage instance actually received:");
    for (const request of montage.requests) {
      console.log(`  ${request.method} ${request.path}`);
    }
    check("the timeline was delivered", mixPayload.delivered === true);
    check(
      "the instance received the documented routes",
      montage.requests.some((r) => r.method === "PUT" && r.path === "/api/v1/projects/demo-project/timeline"),
    );

    section("health document");
    const health = await (await fetch(`${baseUrl}/health`)).json();
    console.log(JSON.stringify(health, null, 2));
    check("the licence is a paid one-time licence", health.licence.type === "paid-one-time");
    check("Solo is $99", health.licence.tiers[0].price === 99);
    check("Studio is $399", health.licence.tiers[1].price === 399);
    check("local rendering is available", health.rendering.local.available === true);
    check("hosted rendering is a studio feature", health.rendering.hosted.tier === "studio");
    check("no hosted render allowance number is published", health.rendering.hosted.allowance === null);
    check("nothing is billed automatically", /nothing is ever charged automatically|never .*automatic|no automatic/i.test(health.rendering.hosted.billingNote));
    check("no URL is published", health.domain.url === null);
  } finally {
    await client.close();
    server.child.kill("SIGTERM");
    await once(server.child, "exit");
    await montage.close();
  }

  section("summary");
  console.log(`${results.filter((r) => r.ok).length}/${results.length} checks passed`);
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify({ results, failures }, null, 2));
  }
  process.exit(failures === 0 ? 0 : 1);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

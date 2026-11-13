#!/usr/bin/env node
/**
 * Proof harness for the in-house studio surfaces.
 *
 * It starts the REAL server, connects a REAL MCP client over the Streamable
 * HTTP transport and calls the studio tools: the brand kits, the house
 * library and the render queue. Nothing is mocked.
 *
 *   node scripts/proof-studio.mjs
 *
 * The exit code is 0 only when every check passed.
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");
const port = Number(process.env.MOTION_MASTER_STUDIO_PORT ?? 8801);
const baseUrl = `http://127.0.0.1:${port}`;

let failures = 0;
function check(name, ok, detail = "") {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

const child = spawn(process.execPath, ["dist/index.js"], {
  cwd: join(repoRoot, "mcp"),
  env: { ...process.env, MOTION_MASTER_MCP_HOST: "127.0.0.1", MOTION_MASTER_MCP_PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"],
});
let serverOut = "";
child.stdout.setEncoding("utf8");
child.stderr.setEncoding("utf8");
child.stdout.on("data", (chunk) => {
  serverOut += chunk;
});
child.stderr.on("data", (chunk) => {
  serverOut += chunk;
});

/* Wait for the server to say it is listening. */
let ready = false;
for (let i = 0; i < 80 && !ready; i += 1) {
  if (/listening/i.test(serverOut)) ready = true;
  else await new Promise((r) => setTimeout(r, 250));
}
if (!ready) {
  console.error(`the server never came up:\n${serverOut.slice(-2000)}`);
  child.kill("SIGTERM");
  process.exit(1);
}

let client;
try {
  client = new Client({ name: "studio-proof", version: "1.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`)));

  const call = async (name, args = {}) => {
    const result = await client.callTool({ name, arguments: args });
    const text = String(result.content?.[0]?.text ?? "");
    let data = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
    return { result, data, text };
  };

  /* ---- 1 — the brand kits ---- */
  const kits = await call("list_brand_kits");
  check("the brand kits are listed", kits.data.count >= 1, `${kits.data.count} kits`);
  check(
    "the house kit is among them",
    (kits.data.kits ?? []).some((kit) => kit.id === "house"),
  );

  const house = await call("get_brand_kit", { id: "house" });
  check("the house kit reads back", house.data.id === "house");
  check("the house kit has no problems", (house.data.problems ?? []).length === 0);
  check(
    "the house kit keeps the house accent",
    house.data.resolved?.palette?.accent === "#FF4A1C",
    house.data.resolved?.palette?.accent,
  );

  const missing = await call("get_brand_kit", { id: "no-such-kit" });
  check("a kit that does not exist says so", missing.result.isError === true);

  const broken = await call("save_brand_kit", {
    id: "broken-kit",
    name: "Broken",
    palette: { accent: "not-a-colour" },
  });
  check("a kit with a bad colour is refused", broken.result.isError === true);
  check(
    "the refusal says which value is wrong",
    JSON.stringify(broken.data.problems ?? []).includes("palette.accent"),
  );

  const good = await call("save_brand_kit", {
    id: "proof-kit",
    name: "Proof kit",
    notes: "Written by the proof harness.",
    palette: { accent: "#3D7BFF" },
  });
  check("a good kit is written", good.data.saved === true, JSON.stringify(good.data.problems ?? []));

  const after = await call("get_brand_kit", { id: "proof-kit" });
  check("the written kit reads back", after.data.id === "proof-kit");
  check(
    "the written kit overrides only its own value",
    after.data.resolved?.palette?.accent === "#3D7BFF" &&
      after.data.resolved?.palette?.canvas === "#F4F4F2",
    after.data.resolved?.palette?.accent,
  );

  /* ---- 2 — the house library ---- */
  const scenes = await call("list_house_templates");
  check("the house library is listed", scenes.data.total >= 1, `${scenes.data.total} scenes`);
  check("all ten shot roles are covered", Object.keys(scenes.data.byRole ?? {}).length === 10);
  check("the house library has no problems", (scenes.data.problems ?? []).length === 0);

  const byRole = await call("list_house_templates", { role: "opening" });
  check(
    "a role filter returns only that role",
    (byRole.data.templates ?? []).length > 0 &&
      byRole.data.templates.every((template) => template.roles.includes("opening")),
    `${byRole.data.templates?.length} openings`,
  );

  const sceneId = (scenes.data.templates ?? [])[0]?.id;
  const scene = await call("get_house_template", { id: sceneId });
  check("a house scene reads back in full", scene.data.template?.id === sceneId);
  check("a house scene names its variables", Array.isArray(scene.data.template?.variables));

  const planned = await call("plan_house_template", {
    id: sceneId,
    brief: "A launch film for a coffee subscription called Slow mornings",
  });
  check("a house scene can be planned from a brief", planned.data.filled !== undefined);
  check(
    "the planned scene carries the house kit",
    planned.data.brandKit === undefined || planned.data.brandKit.id !== undefined,
  );

  const withKit = await call("plan_house_template", {
    id: sceneId,
    brief: "A launch film for a coffee subscription called Slow mornings",
    brand_kit: "proof-kit",
  });
  check("a house scene can be planned with a brand kit", withKit.data.brandKit?.id === "proof-kit");

  /* A scene that came from one of the vendored repos has to plan too. */
  const localScene = (scenes.data.templates ?? []).find((t) => t.id === "big-number-card");
  if (localScene) {
    const localPlanned = await call("plan_house_template", {
      id: "big-number-card",
      brief: "A launch film for a coffee subscription called Slow mornings",
    });
    check("a scene from the vendored repos can be planned", localPlanned.data.filled !== undefined);
    check(
      "the plan says where the composition lives",
      String(localPlanned.data.note ?? "").includes("composition"),
      localPlanned.data.template?.source?.path,
    );
  }

  const missingScene = await call("get_house_template", { id: "no-such-scene" });
  check("a scene that does not exist says so", missingScene.result.isError === true);

  /* ---- 3 — the queue ---- */
  const queue = await call("queue_status");
  check("the queue reports its state", queue.data.concurrency >= 1, `${queue.data.concurrency} at a time`);
  check("the queue says where renders run", typeof queue.data.target === "string", queue.data.target);

  /* ---- 4 — the token surface honours a kit ---- */
  const tokens = await call("get_motion_tokens", { group: "palette", brand_kit: "proof-kit" });
  check(
    "the tokens honour the brand kit",
    tokens.data.tokens?.palette?.accent === "#3D7BFF",
    tokens.data.tokens?.palette?.accent,
  );
  const plain = await call("get_motion_tokens", { group: "palette" });
  check(
    "the tokens without a kit are the canonical ones",
    plain.data.tokens?.palette?.accent === "#FF4A1C",
    plain.data.tokens?.palette?.accent,
  );

  /* ---- 5 — the HTTP API ---- */
  const apiKits = await (await fetch(`${baseUrl}/api/v1/kits`)).json();
  check("the API lists the kits", apiKits.total >= 1);
  const apiScene = await (await fetch(`${baseUrl}/api/v1/scenes?role=opening`)).json();
  check("the API filters the scenes by role", apiScene.matched >= 1);
  const apiQueue = await (await fetch(`${baseUrl}/api/v1/queue`)).json();
  check("the API reports the queue", apiQueue.concurrency >= 1);
  const apiPlan = await (
    await fetch(`${baseUrl}/api/v1/scenes/plan`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: sceneId, brief: "A film about coffee" }),
    })
  ).json();
  check("the API plans a scene from a brief", apiPlan.filled !== undefined);

  /* ---- 6 — clean up after ourselves ---- */
  const { rmSync } = await import("node:fs");
  rmSync(join(repoRoot, "studio", "kits", "proof-kit.json"), { force: true });
} catch (error) {
  console.error(`FAIL  the proof crashed: ${error instanceof Error ? error.stack : String(error)}`);
  failures += 1;
} finally {
  if (client) await client.close().catch(() => {});
  child.kill("SIGTERM");
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);

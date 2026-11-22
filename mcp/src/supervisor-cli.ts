/**
 * The worker, as its own process.
 *
 * The same code as the API's supervisor, run on a clock and nothing else.
 * It exists so the container can run the loop without the API, and so the
 * loop can be restarted without touching the API.
 *
 *   node mcp/dist/supervisor-cli.js
 */

import { loadConfig } from "./config.js";
import { supervisorMain } from "./supervisor.js";

const config = loadConfig();

await supervisorMain({
  repoRoot: config.repoRoot,
  tickMs: Number(process.env.MOTION_MASTER_SUPERVISOR_TICK_MS ?? 30_000),
  dryRun: process.env.MOTION_MASTER_SUPERVISOR_DRY_RUN === "1",
});

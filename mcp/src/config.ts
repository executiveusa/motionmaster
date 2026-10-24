/**
 * Motion Master MCP server — runtime configuration.
 *
 * Every value is read from the environment. No secret is ever bundled with the
 * server: `MOTION_MASTER_MONTAGE_TOKEN` is read from the environment of the
 * process that starts the server and is never written to disk.
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/** mcp/ -> repo root (mcp/src -> mcp -> <repo>) */
function defaultRepoRoot(): string {
  return resolve(here, "..", "..");
}

/**
 * Walk up from `start` looking for a directory that contains the markers of
 * the Motion Master repository. Falls back to the package layout guess.
 */
export function findRepoRoot(start: string): string {
  let current = resolve(start);
  for (let i = 0; i < 8; i += 1) {
    const hasPlugins = existsSync(join(current, "plugins", "motion-master"));
    const hasSite = existsSync(join(current, "site", "src"));
    if (hasPlugins || hasSite) return current;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return defaultRepoRoot();
}

function env(name: string): string | undefined {
  const value = process.env[name];
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function intEnv(name: string, fallback: number): number {
  const raw = env(name);
  if (raw === undefined) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export interface MontageConfig {
  /** Base URL of a user-run Montage instance. Empty when not configured. */
  baseUrl: string;
  /** Optional bearer token for the Montage instance (never persisted). */
  token?: string;
  /** Tenant that owns the projects (local auth mode). */
  tenant: string;
  /** Request timeout in milliseconds. */
  timeoutMs: number;
}

export interface Config {
  host: string;
  port: number;
  /** Public URL the server advertises for MCP clients. */
  publicUrl: string;
  repoRoot: string;
  tokensPath: string;
  clipsPath: string;
  skillsDir: string;
  /** The single file that records the product domain. */
  brandPath: string;
  /** The normalised open-source motion library. */
  libraryPath: string;
  /** The HyperFrames block library. */
  blocksPath: string;
  /** The sound library: one index of every sound in the house. */
  sfxPath: string;
  montage: MontageConfig;
}

export function loadConfig(): Config {
  const repoRoot = env("MOTION_MASTER_REPO_ROOT") ?? findRepoRoot(here);
  const host = env("MOTION_MASTER_MCP_HOST") ?? "127.0.0.1";
  const port = intEnv("MOTION_MASTER_MCP_PORT", 8787);
  const publicUrl =
    env("MOTION_MASTER_MCP_URL_PUBLIC") ?? `http://${host}:${port}/mcp`;

  const montageBase = (env("MOTION_MASTER_MONTAGE_URL") ?? "").replace(/\/+$/, "");

  return {
    host,
    port,
    publicUrl,
    repoRoot,
    tokensPath:
      env("MOTION_MASTER_TOKENS_PATH") ??
      join(repoRoot, "plugins", "motion-master", "assets", "motion-tokens.json"),
    clipsPath:
      env("MOTION_MASTER_CLIPS_PATH") ??
      join(repoRoot, "site", "src", "clips.json"),
    skillsDir:
      env("MOTION_MASTER_SKILLS_DIR") ??
      join(repoRoot, "plugins", "motion-master", "skills"),
    brandPath:
      env("MOTION_MASTER_BRAND_PATH") ??
      join(repoRoot, "plugins", "motion-master", "assets", "brand.json"),
    libraryPath:
      env("MOTION_MASTER_LIBRARY_PATH") ?? join(repoRoot, "library", "catalogue.json"),
    blocksPath:
      env("MOTION_MASTER_BLOCKS_PATH") ?? join(repoRoot, "library", "blocks.json"),
    sfxPath:
      env("MOTION_MASTER_SFX_PATH") ?? join(repoRoot, "library", "sfx.json"),
    montage: {
      baseUrl: montageBase,
      token: env("MOTION_MASTER_MONTAGE_TOKEN"),
      tenant:
        env("MOTION_MASTER_MONTAGE_TENANT") ??
        env("MONTAGE_TENANT_ID") ??
        "tenant_owner",
      timeoutMs: intEnv("MOTION_MASTER_MONTAGE_TIMEOUT_MS", 8000),
    },
  };
}

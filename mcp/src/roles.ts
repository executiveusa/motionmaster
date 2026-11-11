/**
 * Which shot roles each block can serve.
 *
 * The shot vocabulary has ten roles — an opening, some typography, a camera
 * move, a number, an end — and the block pool has 448 entries. Until now the
 * two systems never met: the matcher scored blocks against the wording of the
 * brief, so a brief that asked for a camera move could be answered with a
 * chart.
 *
 * This file holds the bridge. It is generated from the real registry tags by
 * `scripts/map-block-roles.mjs`, and only blocks that passed the gate are in
 * it: a block that clips its own text cannot serve any role well.
 */
import { existsSync, readFileSync } from "node:fs";

export type BlockRoles = Record<string, string[]>;

export function loadBlockRoles(path: string): BlockRoles {
  if (!existsSync(path)) return {};
  try {
    const file = JSON.parse(readFileSync(path, "utf8")) as { roles?: BlockRoles };
    return file.roles ?? {};
  } catch {
    return {};
  }
}

/** The roles one block can serve. */
export function rolesFor(roles: BlockRoles, blockId: string): string[] {
  return roles[blockId] ?? [];
}

/** The blocks that can serve one role, best first. */
export function blocksForRole(roles: BlockRoles, role: string): string[] {
  return Object.entries(roles)
    .filter(([, served]) => served.includes(role))
    .map(([id]) => id);
}

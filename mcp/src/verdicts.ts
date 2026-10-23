/**
 * Which blocks pass the gate.
 *
 * The HyperFrames registry has hundreds of components and they are not all
 * equal. Some clip their own text; some put a label under the contrast
 * floor; some leave the first frame empty. The gate finds all of that, and
 * this file remembers what it found.
 *
 * A block that fails is not used again. The verdict is cached, so the second
 * film does not pay to learn the same lesson twice.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

export interface BlockVerdict {
  /** True when the block passed the gate on its own. */
  ok: boolean;
  /** How many errors the gate found. */
  errors: number;
  /** The reasons, in the gate's own words. */
  reasons: string[];
  /** When this was checked. */
  checkedAt: string;
}

export type VerdictMap = Record<string, BlockVerdict>;

/** Where the verdicts live. */
export function verdictPath(repoRoot: string): string {
  return resolve(repoRoot, "library", "block-verdicts.json");
}

export function loadVerdicts(repoRoot: string): VerdictMap {
  const path = verdictPath(repoRoot);
  if (!existsSync(path)) return {};
  try {
    const file = JSON.parse(readFileSync(path, "utf8")) as { verdicts?: VerdictMap };
    return file.verdicts ?? {};
  } catch {
    return {};
  }
}

export function saveVerdicts(repoRoot: string, verdicts: VerdictMap): void {
  const path = verdictPath(repoRoot);
  const sorted: VerdictMap = {};
  for (const key of Object.keys(verdicts).sort()) sorted[key] = verdicts[key];
  writeFileSync(
    path,
    `${JSON.stringify(
      {
        generated: "mcp/src/verdicts.ts",
        note:
          "Blocks the HyperFrames gate rejected on this machine, and why. A block in this list is " +
          "not used to build a film. Delete the file to try them again.",
        verdicts: sorted,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

/** Record one block's verdict. */
export function recordVerdict(
  repoRoot: string,
  blockId: string,
  ok: boolean,
  errors: number,
  reasons: string[],
): void {
  const verdicts = loadVerdicts(repoRoot);
  verdicts[blockId] = { ok, errors, reasons, checkedAt: new Date().toISOString() };
  saveVerdicts(repoRoot, verdicts);
}

/** The blocks that failed. */
export function rejectedBlocks(verdicts: VerdictMap): string[] {
  return Object.entries(verdicts)
    .filter(([, verdict]) => !verdict.ok)
    .map(([id]) => id);
}

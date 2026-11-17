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

/**
 * The codes the house will not publish, whatever the gate called them.
 *
 * The gate rates a finding "error" or "warning". The house has its own
 * taste, written down in docs/11 and docs/29, and it is stricter on the
 * things it cares about:
 *
 *   - reading type clears 2.6% of the short side — the floor is in
 *     remediations.ts as TYPE_FLOOR;
 *   - contrast clears WCAG AA;
 *   - a line a reader cannot read, or text under an opaque element, is not
 *     a line a reader can read;
 *   - media without an id renders a silent file.
 *
 * The gate calls these warnings. A warning that says the text is 14 px on a
 * phone is not a warning, it is a film nobody can read — so the house
 * decides for itself.
 */
export const HOUSE_DISQUALIFYING = new Set([
  "text_below_floor",
  "contrast_aa_failure",
  "text_occluded",
  "line_unread",
  "content_overlap",
  "media_missing_id",
]);

/**
 * The empty first frame, which is not the same rule for a block and a film.
 *
 * A finished film must carry its claim on frame zero, because frame zero is
 * the thumbnail on a social player. A block is a reusable composition that
 * gets mounted: the mount is what puts the claim on screen, so a block that
 * enters from nothing is not a broken block. Ten of the twelve blocks that
 * can carry editable text were being thrown away for this one reason, and
 * the matcher was left answering every brief with the same block.
 *
 * So the rule stays where it belongs — on the artifact — and not on the
 * pool. The render gate enforces it; see mcp/src/render.ts.
 */
export const FRAME_ZERO = "first_frame_empty";

/**
 * One finding as the gate wrote it.
 *
 * Only the fields the house needs to make a decision.
 */
export interface RawGateFinding {
  code?: string;
  severity?: string;
  message?: string;
  selector?: string;
  sourceFile?: string;
  time?: number;
}

/**
 * The house's severity for one finding.
 *
 * The gate has a severity column, and the house has its own opinion about
 * the findings it cares about. A gate warning that says the text is 14 px
 * on a phone is a failure here, not a note.
 *
 * The frame-zero rule is the one that differs between a block and an
 * artifact, so it is handled separately: a finished film must carry its
 * claim on frame zero, because frame zero is the thumbnail on a social
 * player, and the gate measures exactly that — the frame 0 of the file it
 * is checking.
 */
export function houseSeverity(finding: RawGateFinding): "error" | "warning" | "info" {
  if (finding.severity === "error") return "error";
  const code = (finding.code ?? "").trim();
  if (HOUSE_DISQUALIFYING.has(code)) return "error";
  if (code === FRAME_ZERO) return "error";
  if (finding.severity === "info") return "info";
  return "warning";
}

/**
 * Whether a verdict means the block may be used.
 *
 * A block qualifies when the gate found nothing at all — no errors, and no
 * finding the house refuses to publish. A verdict that could not be
 * measured at all (the browser died) is not a qualification either.
 */
export function isQualified(verdict: BlockVerdict | undefined): boolean {
  if (!verdict) return false;
  if (!verdict.ok) return false;
  return !verdict.reasons.some((reason) =>
    HOUSE_DISQUALIFYING.has(reason.split(":")[0].trim()),
  );
}

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
    .filter(([, verdict]) => !isQualified(verdict))
    .map(([id]) => id);
}

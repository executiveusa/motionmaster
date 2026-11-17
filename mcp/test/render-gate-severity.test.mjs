/**
 * The render gate reads the house's severity, not the gate's.
 *
 * The gate has a severity column. The house has rules of its own, and it is
 * stricter than the gate on the things it cares about — the type floor, the
 * contrast, the claim on frame zero. These tests build a gate report the way
 * the gate writes one and read it back the way the render gate reads it.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const { readGateFindings } = await import("../dist/render.js");
const { houseSeverity } = await import("../dist/verdicts.js");

/** Write a gate report the way the gate writes one, and read it back. */
function reportWith(findings) {
  const dir = mkdtempSync(join(tmpdir(), "mm-gate-report-"));
  const checks = join(dir, ".hyperframes", "artifacts", "checks");
  mkdirSync(checks, { recursive: true });
  writeFileSync(join(checks, "report.json"), JSON.stringify({
    ok: true,
    lint: { findings: [] },
    runtime: { findings: [] },
    layout: { findings: [] },
    motion: { findings: [] },
    contrast: { findings: [] },
    craft: { findings: findings.map((f) => ({ severity: "warning", ...f })) },
  }));
  const found = readGateFindings(dir);
  rmSync(dir, { recursive: true, force: true });
  return found;
}

test("the gate's own errors are errors", () => {
  assert.equal(houseSeverity({ code: "anything", severity: "error" }), "error");
});

test("a warning the house does not care about stays a warning", () => {
  assert.equal(houseSeverity({ code: "console_warning", severity: "warning" }), "warning");
});

test("text under the type floor is an error, whatever the gate called it", () => {
  assert.equal(houseSeverity({ code: "text_below_floor", severity: "warning" }), "error");
});

test("a contrast failure is an error, whatever the gate called it", () => {
  assert.equal(houseSeverity({ code: "contrast_aa_failure", severity: "warning" }), "error");
});

test("an empty first frame is an error: frame zero is the thumbnail", () => {
  assert.equal(houseSeverity({ code: "first_frame_empty", severity: "warning" }), "error");
});

test("the render gate reports a warning the house refuses as a failure", () => {
  const found = reportWith([{
    code: "text_below_floor",
    severity: "warning",
    message: 'the smallest "Net growth" at 26 px',
  }]);
  assert.equal(found.length, 1);
  assert.equal(found[0].code, "text_below_floor");
  assert.equal(found[0].severity, "error");
});

test("the render gate still leaves the gate's warnings alone", () => {
  const found = reportWith([{ code: "sweep_static", severity: "warning", message: "nothing moved" }]);
  assert.equal(found.length, 0);
});

test("the render gate keeps the raw finding, so a repair can use it", () => {
  const found = reportWith([{
    code: "contrast_aa_failure",
    severity: "warning",
    message: "Contrast is 2.79:1",
    fg: "#ffffff",
    bg: "#8c8c90",
    ratio: 2.79,
    requiredRatio: 3,
  }]);
  assert.equal(found.length, 1);
  assert.equal(found[0].raw?.ratio, 2.79);
  assert.equal(found[0].raw?.requiredRatio, 3);
});

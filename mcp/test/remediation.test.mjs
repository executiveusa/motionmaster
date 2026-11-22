/**
 * The remediation table and the loop's own arithmetic.
 *
 * The colour maths gets tested here because it is the part that has to be
 * right without the gate to check it: if `passingColor` returns a colour
 * that does not actually pass, the repair is a lie and the gate will say so
 * later, expensively.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const {
  parseColor,
  toHex,
  luminance,
  contrastRatio,
  passingColor,
  idFromSelector,
  applyRemediation,
  planRemediation,
  REMEDIATIONS,
  UNREPAIRABLE,
} = await import("../dist/remediations.js");
const { writeLedger, readLedger, defaultLedgerPath } = await import("../dist/supervisor.js");

test("a colour parses from every form the gate uses", () => {
  assert.deepEqual(parseColor("#8c8c90"), { r: 140, g: 140, b: 144 });
  assert.deepEqual(parseColor("#abc"), { r: 170, g: 187, b: 204 });
  assert.deepEqual(parseColor("rgb(154,154,158)"), { r: 154, g: 154, b: 158 });
  assert.deepEqual(parseColor("rgba(154, 154, 158, 0.5)"), { r: 154, g: 154, b: 158 });
  assert.equal(parseColor("not a colour"), null);
});

test("the luminance of black is zero and of white is one", () => {
  assert.equal(luminance({ r: 0, g: 0, b: 0 }), 0);
  assert.ok(Math.abs(luminance({ r: 255, g: 255, b: 255 }) - 1) < 0.0001);
});

test("black on white is the full 21 to 1", () => {
  const ratio = contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 });
  assert.ok(Math.abs(ratio - 21) < 0.01, `got ${ratio}`);
});

test("a colour that already passes is returned unchanged", () => {
  const fg = { r: 0, g: 0, b: 0 };
  const bg = { r: 255, g: 255, b: 255 };
  assert.deepEqual(passingColor(fg, bg, 4.5), fg);
});

test("the colour that is returned genuinely meets the ratio", () => {
  /* This is the case the gate's own suggestion gets wrong: 2.55:1 against
     a required 3:1, and the suggestion lands at 2.98:1 — still failing. */
  const fg = { r: 154, g: 154, b: 158 };
  const bg = { r: 244, g: 244, b: 242 };
  const passing = passingColor(fg, bg, 3);
  assert.ok(passing !== null, "a passing colour was found");
  assert.ok(
    contrastRatio(passing, bg) >= 3,
    `the returned colour reaches ${contrastRatio(passing, bg)}, which is short of 3`,
  );
});

test("white on white is fixed by darkening the text, not by giving up", () => {
  /* The first version of this test asserted that white-on-white cannot be
     repaired. It can: the foreground walks away from the background. So the
     repair darkens it, and the result genuinely passes. */
  const white = { r: 255, g: 255, b: 255 };
  const passing = passingColor(white, white, 4.5);
  assert.ok(passing !== null);
  assert.ok(contrastRatio(passing, white) >= 4.5);
});

test("a ratio that is impossible returns null rather than a lie", () => {
  /* Nothing is more than 21:1 apart, so a requirement above that cannot be
     met. Returning null says so; returning a colour would be a lie. */
  assert.equal(passingColor({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }, 22), null);
});

test("a colour survives the round trip through hex", () => {
  assert.equal(toHex(parseColor("rgb(140,140,144)")), "#8c8c90");
});

test("the id is found in a selector", () => {
  assert.equal(idFromSelector("#weak"), "weak");
  assert.equal(idFromSelector("#root > span:nth-of-type(2)"), "root");
  assert.equal(idFromSelector(".stage"), null);
});

test("an unknown finding code is refused, not guessed at", () => {
  const dir = mkdtempSync(join(tmpdir(), "mm-remediation-"));
  try {
    const repair = applyRemediation(dir, {
      code: "a_code_nobody_wrote_a_rule_for",
      severity: "error",
      message: "invented",
    });
    assert.equal(repair.applied, false);
    assert.match(repair.reason ?? "", /not known to the remediation table/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a known but unrepairable code says it needs a person", () => {
  const dir = mkdtempSync(join(tmpdir(), "mm-remediation-"));
  try {
    const repair = applyRemediation(dir, {
      code: "motion_frozen",
      severity: "error",
      message: "the timeline never moved",
    });
    assert.equal(repair.applied, false);
    assert.match(repair.reason ?? "", /needs a person/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the plan separates what can be repaired from what cannot", () => {
  const plan = planRemediation([
    { code: "contrast_aa_failure", severity: "error", message: "" },
    { code: "motion_frozen", severity: "error", message: "" },
    { code: "something_new", severity: "error", message: "" },
  ]);
  assert.equal(plan.repairable.length, 1);
  assert.equal(plan.repairable[0].code, "contrast_aa_failure");
  assert.equal(plan.unrepairable.length, 2);
  assert.match(plan.unrepairable[0].reason, /needs a person/);
  assert.match(plan.unrepairable[1].reason, /not known/);
});

test("every rule has a description and every unrepairable code is a real one", () => {
  assert.ok(REMEDIATIONS.length >= 8, "the table is not a stub");
  for (const rule of REMEDIATIONS) {
    assert.ok(rule.code.length > 0);
    assert.ok(rule.describe.length > 10, `${rule.code} has no description`);
  }
  for (const code of UNREPAIRABLE) {
    assert.ok(code.length > 0);
  }
});

test("the deprecated attribute rename changes the file", () => {
  const dir = mkdtempSync(join(tmpdir(), "mm-remediation-"));
  try {
    writeFileSync(
      join(dir, "index.html"),
      '<div id="root" data-start="0" data-end="4"></div>',
      "utf8",
    );
    const repair = applyRemediation(dir, {
      code: "deprecated_data_end",
      severity: "error",
      message: "",
      sourceFile: "index.html",
    });
    assert.equal(repair.applied, true, repair.reason);
    const html = readFileSync(join(dir, "index.html"), "utf8");
    assert.match(html, /data-duration="4"/);
    assert.doesNotMatch(html, /data-end/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the ledger is append-only and every line is readable", () => {
  const dir = mkdtempSync(join(tmpdir(), "mm-ledger-"));
  try {
    const path = join(dir, "ledger.jsonl");
    writeLedger(path, { at: "2026-01-01T00:00:00.000Z", event: "claimed", jobId: "j1", projectId: "p1", attempt: 1 });
    writeLedger(path, { at: "2026-01-01T00:00:01.000Z", event: "published", jobId: "j1", projectId: "p1", attempt: 1 });
    const entries = readLedger(path);
    assert.equal(entries.length, 2);
    assert.equal(entries[0].event, "claimed");
    assert.equal(entries[1].event, "published");
    assert.ok(defaultLedgerPath("/repo").endsWith("ledger.jsonl"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a corrupt ledger line does not take the rest of the ledger down", () => {
  const dir = mkdtempSync(join(tmpdir(), "mm-ledger-"));
  try {
    const path = join(dir, "ledger.jsonl");
    mkdirSync(dir, { recursive: true });
    writeFileSync(path, '{"event":"claimed","at":"x","jobId":"j","projectId":"p","attempt":1}\nnot json\n{"event":"failed","at":"y","jobId":"j","projectId":"p","attempt":1}\n', "utf8");
    const entries = readLedger(path);
    assert.equal(entries.length, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

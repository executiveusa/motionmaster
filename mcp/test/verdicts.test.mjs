/**
 * The house's own policy about what may be published.
 *
 * The gate rates a finding "error" or "warning". The house has rules of its
 * own — the type floor, the claim on frame zero, contrast — and it is
 * stricter than the gate on those. These tests pin that down, because a
 * policy nobody tests is a policy that quietly stops being true.
 */
import test from "node:test";
import assert from "node:assert/strict";

const { isQualified, HOUSE_DISQUALIFYING, rejectedBlocks } = await import("../dist/verdicts.js");

test("a block the gate passed on every count is qualified", () => {
  assert.equal(
    isQualified({ ok: true, errors: 0, reasons: [], checkedAt: "2026-01-01T00:00:00.000Z" }),
    true,
  );
});

test("a block the gate rejected is not qualified", () => {
  assert.equal(
    isQualified({
      ok: false,
      errors: 1,
      reasons: ["contrast_aa_failure: Contrast is 1.31:1"],
      checkedAt: "2026-01-01T00:00:00.000Z",
    }),
    false,
  );
});

test("a block with no verdict at all is not qualified", () => {
  assert.equal(isQualified(undefined), false);
});

test("the house refuses a warning the gate would have let through", () => {
  // 14 px text on a phone is not a warning. The gate calls it one.
  assert.equal(
    isQualified({
      ok: true,
      errors: 0,
      reasons: ["text_below_floor: the smallest \"LIVE\" at 14 px"],
      checkedAt: "2026-01-01T00:00:00.000Z",
    }),
    false,
  );
});

/*
 * An empty first frame is a rule about a film, not about a block.
 *
 * A block is mounted into a composition, and the mount is what puts the
 * claim on screen. Refusing every block that enters from nothing took away
 * ten of the twelve blocks that could carry editable text, and the matcher
 * was left answering every brief with the same block. The rule stays on the
 * artifact, where the house wrote it.
 */
test("an empty first frame does not disqualify a block that will be mounted", () => {
  assert.equal(
    isQualified({
      ok: true,
      errors: 0,
      reasons: ["first_frame_empty: Frame 0 shows only the background"],
      checkedAt: "2026-01-01T00:00:00.000Z",
    }),
    true,
  );
});

test("the house still refuses text under an opaque element", () => {
  assert.equal(
    isQualified({
      ok: true,
      errors: 0,
      reasons: ["text_occluded: Text is hidden beneath an opaque element."],
      checkedAt: "2026-01-01T00:00:00.000Z",
    }),
    false,
  );
});

test("a warning the house does not refuse still qualifies", () => {
  assert.equal(
    isQualified({
      ok: true,
      errors: 0,
      reasons: ["console_warning: something in the console"],
      checkedAt: "2026-01-01T00:00:00.000Z",
    }),
    true,
  );
});

test("the refusal list holds only codes the house has a reason about", () => {
  assert.ok(HOUSE_DISQUALIFYING.has("text_below_floor"));
  assert.ok(HOUSE_DISQUALIFYING.has("contrast_aa_failure"));
  assert.ok(HOUSE_DISQUALIFYING.has("text_occluded"));
  assert.equal(HOUSE_DISQUALIFYING.has("first_frame_empty"), false,
    "the frame-zero rule belongs on the artifact, not on a mountable block");
});

test("the rejected list is every block the house will not publish", () => {
  const verdicts = {
    good: { ok: true, errors: 0, reasons: [], checkedAt: "2026-01-01T00:00:00.000Z" },
    warned: {
      ok: true,
      errors: 0,
      reasons: ["text_below_floor: the smallest text is 14 px"],
      checkedAt: "2026-01-01T00:00:00.000Z",
    },
    failed: {
      ok: false,
      errors: 1,
      reasons: ["runtime: it broke"],
      checkedAt: "2026-01-01T00:00:00.000Z",
    },
  };
  const rejected = rejectedBlocks(verdicts);
  assert.deepEqual(rejected.sort(), ["failed", "warned"]);
});

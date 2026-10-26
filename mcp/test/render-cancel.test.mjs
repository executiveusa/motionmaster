import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gateProject } from "../dist/render.js";

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "mm-hf-abort-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, "generator"));
  const project = join(root, "composition");
  mkdirSync(project);
  return { root, project };
}

test("MM-05: abort stops the real HyperFrames shell subprocess before timeout", async (t) => {
  const { root, project } = fixture(t);
  // This intentionally spawns a long-running descendant. Killing only bash
  // would leave sleep alive; the renderer must terminate the process group.
  writeFileSync(join(root, "generator", "hf.sh"), "#!/usr/bin/env bash\nsleep 30\n");
  const controller = new AbortController();
  const start = Date.now();
  const timer = setTimeout(() => controller.abort(), 250);
  try {
    const result = await gateProject(root, project, 10_000, controller.signal);
    assert.equal(result.ok, false);
    assert.match(result.output, /cancelled/i);
    assert.ok(Date.now() - start < 6_000, "abort should not wait for the 30-second child");
  } finally {
    clearTimeout(timer);
  }
});

test("MM-05: an already aborted signal refuses to spawn HyperFrames", async (t) => {
  const { root, project } = fixture(t);
  const controller = new AbortController();
  controller.abort();
  const result = await gateProject(root, project, 10_000, controller.signal);
  assert.equal(result.ok, false);
  assert.match(result.output, /cancelled before start/i);
});

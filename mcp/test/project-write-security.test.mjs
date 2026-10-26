import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeProject } from "../dist/render.js";

test("project writer accepts nested files without escaping its root", (t) => {
  const tmp = mkdtempSync(join(tmpdir(), "mm-writer-"));
  t.after(() => rmSync(tmp, { recursive: true, force: true }));
  const root = join(tmp, "film");
  const files = writeProject(root, [
    { path: "index.html", contents: "<h1>ACME</h1>" },
    { path: "assets/title.txt", contents: "ACME" },
  ]);
  assert.equal(files.length, 2);
  assert.equal(readFileSync(join(root, "assets/title.txt"), "utf8"), "ACME");
});

test("project writer rejects sibling-prefix traversal and absolute paths", (t) => {
  const tmp = mkdtempSync(join(tmpdir(), "mm-traversal-"));
  t.after(() => rmSync(tmp, { recursive: true, force: true }));
  const root = join(tmp, "film");
  assert.throws(() => writeProject(root, [{ path: "../film-evil/escape.txt", contents: "BAD" }]), /escapes root/);
  assert.equal(existsSync(join(tmp, "film-evil", "escape.txt")), false);
  assert.throws(() => writeProject(root, [{ path: join(tmp, "outside.txt"), contents: "BAD" }]), /Invalid project file path/);
  assert.equal(existsSync(join(tmp, "outside.txt")), false);
});

test("project writer rejects symlinked parent and final target", (t) => {
  const tmp = mkdtempSync(join(tmpdir(), "mm-symlink-"));
  t.after(() => rmSync(tmp, { recursive: true, force: true }));
  const root = join(tmp, "film");
  const outside = join(tmp, "outside");
  mkdirSync(root);
  mkdirSync(outside);
  symlinkSync(outside, join(root, "linked"));
  assert.throws(() => writeProject(root, [{ path: "linked/escape.txt", contents: "BAD" }]), /parent escapes root/);
  assert.equal(existsSync(join(outside, "escape.txt")), false);
  const victim = join(outside, "victim.txt");
  writeFileSync(victim, "SAFE");
  symlinkSync(victim, join(root, "victim.txt"));
  assert.throws(() => writeProject(root, [{ path: "victim.txt", contents: "BAD" }]));
  assert.equal(readFileSync(victim, "utf8"), "SAFE");
});

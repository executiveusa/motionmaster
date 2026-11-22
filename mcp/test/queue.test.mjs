/**
 * Tests for the render queue.
 *
 * The queue has three jobs and each of them is a promise to the agents that
 * use it: the same request renders once, renders do not pile up on the
 * machine, and a render that was interrupted is reported as failed instead of
 * looking busy forever.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";

import {
  acquireSlot,
  queueActive,
  queueDirectoryName,
  queueKey,
  queueState,
  queueWaiting,
  reconcileJobs,
  releaseSlot,
  renderRemotely,
} from "../dist/queue.js";
import { writeJob, readJob, filmsDir } from "../dist/render.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");

test("the same request has the same key", () => {
  const request = {
    brief: "A launch film for a coffee subscription",
    brandKit: "house",
    title: "Slow mornings",
    tags: ["calm"],
    count: 3,
    fps: 30,
  };
  assert.equal(queueKey(request), queueKey({ ...request }));
});

test("a different request has a different key", () => {
  const base = { brief: "A launch film", title: "One", fps: 30 };
  const keys = new Set([
    queueKey(base),
    queueKey({ ...base, brief: "A different film" }),
    queueKey({ ...base, brandKit: "house" }),
    queueKey({ ...base, fps: 60 }),
    queueKey({ ...base, title: "Two" }),
  ]);
  assert.equal(keys.size, 5, "each difference makes its own key");
});

test("the key does not depend on the order of the tags", () => {
  const a = queueKey({ brief: "x", tags: ["one", "two"], fps: 30 });
  const b = queueKey({ brief: "x", tags: ["two", "one"], fps: 30 });
  assert.equal(a, b);
});

test("the directory name carries the key, so the same film lands in one place", () => {
  const key = queueKey({ brief: "x", fps: 30 });
  const name = queueDirectoryName("slow-mornings", key);
  assert.ok(name.startsWith("slow-mornings-"));
  assert.ok(name.endsWith(key.slice(0, 8)));
  assert.equal(name, queueDirectoryName("slow-mornings", key));
});

test("the queue lets one render at a time by default", async () => {
  const before = queueActive();
  await acquireSlot(1);
  assert.equal(queueActive(), before + 1);

  let secondRan = false;
  const second = acquireSlot(1).then(() => {
    secondRan = true;
  });

  /* The second caller must still be waiting. */
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(secondRan, false, "the second render waits");
  assert.ok(queueWaiting() >= 1);

  releaseSlot();
  await second;
  assert.equal(secondRan, true, "the second render runs once the slot is free");
  releaseSlot();
  assert.equal(queueActive(), before, "the queue is back to where it was");
});

test("the queue runs in parallel when it is allowed to", async () => {
  const before = queueActive();
  await acquireSlot(2);
  await acquireSlot(2);
  assert.equal(queueActive(), before + 2);
  releaseSlot();
  releaseSlot();
  assert.equal(queueActive(), before);
});

test("a film that was interrupted is reported as failed, not as busy", () => {
  const dir = mkdtempSync(join(tmpdir(), "mm-queue-"));
  try {
    const id = "some-film";
    mkdirSync(join(filmsDir(dir), id), { recursive: true });
    writeJob(dir, {
      id,
      status: "rendering",
      startedAt: new Date().toISOString(),
    });
    const interrupted = reconcileJobs(dir);
    assert.equal(interrupted.length, 1);
    assert.equal(interrupted[0].id, id);
    const job = readJob(dir, id);
    assert.equal(job.status, "failed");
    assert.match(job.error ?? "", /interrupted/i);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the queue state counts the films and the cached ones", () => {
  const dir = mkdtempSync(join(tmpdir(), "mm-queue-"));
  try {
    const id = "a-film";
    mkdirSync(join(filmsDir(dir), id), { recursive: true });
    writeJob(dir, { id, status: "ready", startedAt: new Date().toISOString() });
    const state = queueState(dir, { concurrency: 1, target: "local" });
    assert.equal(state.films, 1);
    assert.equal(state.cached, 1);
    assert.equal(state.concurrency, 1);
    assert.equal(state.target, "local");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a remote render that cannot be reached fails with the reason", async () => {
  const result = await renderRemotely({
    /* Port 1 is not listening; the connection is refused immediately. */
    remoteUrl: "http://127.0.0.1:1",
    request: { brief: "x" },
    timeoutMs: 3000,
    pollMs: 100,
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /could not be reached|refused/i);
});

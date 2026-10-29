import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, symlinkSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "../dist/config.js";
import {
  checkReadiness, resolveInputs, startBoardSyncJob, readBoardSyncJob, cancelBoardSyncJob, boardSyncArtifactPath,
} from "../dist/board-sync.js";

const BOARD = '<html><body><div class="m-root" style="width:1920px;height:1080px"><p>Hi</p></div></body></html>';

function env(t, fakeBody) {
  const root = mkdtempSync(join(tmpdir(), "mm-bs-"));
  const prev = { ...process.env };
  t.after(() => { process.env = prev; rmSync(root, { recursive: true, force: true }); });
  const skills = join(root, "skills");
  mkdirSync(join(skills, "board-sync", "assets"), { recursive: true });
  writeFileSync(join(skills, "board-sync", "assets", "gsap.min.js"), "//gsap");
  const py = join(root, "fakepy.sh");
  writeFileSync(py, fakeBody, { mode: 0o755 });
  const inputs = join(root, "inputs");
  mkdirSync(inputs);
  process.env.MOTION_MASTER_BOARD_SYNC_PYTHON = py;
  process.env.MOTION_MASTER_BOARD_SYNC_ROOT = inputs;
  const config = { ...loadConfig(), repoRoot: join(root, "repo"), skillsDir: skills };
  mkdirSync(config.repoRoot, { recursive: true });
  return { root, inputs, config };
}

function video(inputs, name = "demo", board = BOARD) {
  const d = join(inputs, name);
  mkdirSync(join(d, "02-cut"), { recursive: true });
  mkdirSync(join(d, "03-board-brief"));
  mkdirSync(join(d, "04-boards"));
  writeFileSync(join(d, "02-cut", "demo.wav"), "RIFF");
  writeFileSync(join(d, "02-cut", "demo words.tsv"), "0\t0.5\thello\n");
  writeFileSync(join(d, "03-board-brief", "script-marked.md"), "[SLIDE 1]\nhello\n");
  writeFileSync(join(d, "04-boards", "01-Line.html"), board);
  return d;
}

// Fake board_sync.py: --check passes; a run writes artifacts into --out.
const FAKE_OK = `#!/usr/bin/env bash
for a in "$@"; do [ "$a" = "--check" ] && { printf "python 3\nffmpeg /x\nplaywright ok\nbrowser /b\nstage render   ready\n"; exit 1; }; done
out=""; while [ $# -gt 0 ]; do [ "$1" = "--out" ] && out="$2"; shift; done
mkdir -p "$out"; echo mp4 > "$out/board-track.mp4"; echo x > "$out/timeline.fcpxml"; echo '#qa' > "$out/qa-report.md"; echo "done"
`;
const FAKE_SLEEP = `#!/usr/bin/env bash
for a in "$@"; do [ "$a" = "--check" ] && { printf "python 3\\nplaywright ok\\nbrowser /b\\nstage render   ready\\n"; exit 1; }; done
sleep 30
`;
const FAKE_FAIL = `#!/usr/bin/env bash
for a in "$@"; do [ "$a" = "--check" ] && { printf "python 3\\nplaywright ok\\nbrowser /b\\nstage render   ready\\n"; exit 1; }; done
echo "boom" >&2; exit 3
`;
const FAKE_NOTREADY = `#!/usr/bin/env bash
echo "ffmpeg missing"; exit 1
`;

async function settle(config, id, ms = 8000) {
  const end = Date.now() + ms;
  for (;;) {
    const j = readBoardSyncJob(config, id);
    if (j && j.status !== "running") return j;
    if (Date.now() > end) throw new Error("job did not settle");
    await new Promise((r) => setTimeout(r, 50));
  }
}

test("readiness: reports not ready, with setup, when the check fails", (t) => {
  const { config, inputs } = env(t, FAKE_NOTREADY);
  const r = checkReadiness(config);
  assert.equal(r.ready, false);
  assert.match(r.details, /ffmpeg missing/);
  assert.ok(r.setup);
  assert.throws(() => startBoardSyncJob(config, "demo"), /not ready|Missing|Dependencies/);
});

test("readiness: ready when check passes; transcription is not offered", (t) => {
  const { config } = env(t, FAKE_OK);
  const r = checkReadiness(config);
  assert.equal(r.ready, true);
  assert.match(r.transcription, /words\.tsv required/);
});

test("input validation: traversal, absolute, missing, link, no words.tsv", (t) => {
  const { config, inputs, root } = env(t, FAKE_OK);
  for (const bad of ["../x", "/etc", "a/b", "..", ".hidden", ""]) {
    assert.throws(() => resolveInputs(config, bad), /input must|Missing/, bad);
  }
  assert.throws(() => resolveInputs(config, "nope"), /Missing folder/);
  const d = video(inputs);
  assert.equal(resolveInputs(config, "demo").boardCount, 1);
  rmSync(join(d, "02-cut", "demo words.tsv"));
  assert.throws(() => resolveInputs(config, "demo"), /words\.tsv/);
  // a symlinked input folder must be refused
  mkdirSync(join(root, "outside", "02-cut"), { recursive: true });
  symlinkSync(join(root, "outside"), join(inputs, "linked"));
  assert.throws(() => resolveInputs(config, "linked"), /real folder/);
});

test("input validation: reference boards and boards without .m-root are rejected", (t) => {
  const { config, inputs } = env(t, FAKE_OK);
  video(inputs, "ref", '<div class="m-root ebs"><script>seek(0)</script></div>');
  assert.throws(() => resolveInputs(config, "ref"), /reference board/);
  video(inputs, "plain", "<div>no root</div>");
  assert.throws(() => resolveInputs(config, "plain"), /no \.m-root/);
});

test("job: runs, becomes ready only with board-track.mp4, serves allow-listed artifacts only", async (t) => {
  const { config, inputs } = env(t, FAKE_OK);
  video(inputs);
  const started = startBoardSyncJob(config, "demo");
  assert.equal(started.status, "running");
  const done = await settle(config, started.id);
  assert.equal(done.status, "ready");
  assert.ok(done.artifacts.includes("board-track.mp4"));
  assert.ok(existsSync(boardSyncArtifactPath(config, started.id, "board-track.mp4")));
  assert.throws(() => boardSyncArtifactPath(config, started.id, "../job.json"), /Unknown artifact/);
  assert.throws(() => boardSyncArtifactPath(config, started.id, "preview.mp4"), /not available/);
});

test("job: nonzero exit is failed with the log, never ready", async (t) => {
  const { config, inputs } = env(t, FAKE_FAIL);
  video(inputs);
  const j = await settle(config, startBoardSyncJob(config, "demo").id);
  assert.equal(j.status, "failed");
  assert.match(j.log, /boom/);
  assert.equal(j.artifacts.length, 0);
});

test("job: one at a time, cancel kills the process group", async (t) => {
  const { config, inputs } = env(t, FAKE_SLEEP);
  video(inputs);
  const a = startBoardSyncJob(config, "demo");
  assert.throws(() => startBoardSyncJob(config, "demo"), /already running/);
  const t0 = Date.now();
  cancelBoardSyncJob(config, a.id);
  const j = await settle(config, a.id);
  assert.equal(j.status, "cancelled");
  assert.ok(Date.now() - t0 < 6000);
  assert.throws(() => cancelBoardSyncJob(config, a.id), /nothing to cancel/);
});

test("job: bad ids and bad 'only' are rejected", (t) => {
  const { config, inputs } = env(t, FAKE_OK);
  video(inputs);
  assert.throws(() => readBoardSyncJob(config, "../../etc"), /Unknown job id/);
  assert.throws(() => startBoardSyncJob(config, "demo", "1;rm -rf /"), /only must/);
});

test("job: a running job with no live process after restart reads as failed", (t) => {
  const { config } = env(t, FAKE_OK);
  const id = "bs_0123456789abcdef";
  mkdirSync(join(config.repoRoot, ".board-sync", "jobs", id), { recursive: true });
  writeFileSync(join(config.repoRoot, ".board-sync", "jobs", id, "job.json"),
    JSON.stringify({ id, input: "demo", status: "running", startedAt: new Date().toISOString() }));
  const j = readBoardSyncJob(config, id);
  assert.equal(j.status, "failed");
  assert.match(j.error, /Interrupted/);
});

test("child environment does not inherit API keys", async (t) => {
  const fake = `#!/usr/bin/env bash
for a in "$@"; do [ "$a" = "--check" ] && { printf "python 3\\nplaywright ok\\nbrowser /b\\nstage render   ready\\n"; exit 1; }; done
out=""; while [ $# -gt 0 ]; do [ "$1" = "--out" ] && out="$2"; shift; done
mkdir -p "$out"; echo mp4 > "$out/board-track.mp4"; echo "KEY=[\${MOTION_MASTER_API_KEY:-}][\${OPENROUTER_API_KEY:-}] ROOTS=\${BOARD_SYNC_FILE_ROOTS:-}"
`;
  const { config, inputs } = env(t, fake);
  process.env.MOTION_MASTER_API_KEY = "secret-a";
  process.env.OPENROUTER_API_KEY = "secret-b";
  video(inputs);
  const j = await settle(config, startBoardSyncJob(config, "demo").id);
  assert.match(j.log, /KEY=\[\]\[\]/);
  assert.doesNotMatch(j.log, /secret/);
  // render confinement: the child is told to allow files only under input, job and skill folders
  const roots = /ROOTS=(.*)/.exec(j.log)[1].split(":");
  assert.equal(roots.length, 3);
  assert.ok(roots[0].endsWith("/inputs/demo") && roots[1].endsWith(`/${j.id}`) && roots[2].endsWith("/board-sync"), roots.join(" | "));
});

import http from "node:http";
import { handleApi } from "../dist/api.js";

async function withServer(config, fn) {
  const srv = http.createServer(async (req, res) => {
    const handled = await handleApi(req, res, new URL(req.url, "http://x").pathname, config);
    if (!handled) { res.writeHead(404); res.end(); }
  });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${srv.address().port}/api/v1/board-sync`;
  try { await fn(base); } finally { srv.close(); }
}

test("HTTP: readiness, start, status, artifact download, cancel, errors", async (t) => {
  const { config, inputs } = env(t, FAKE_OK);
  config.host = "127.0.0.1";
  delete process.env.MOTION_MASTER_API_KEY;
  video(inputs);
  await withServer(config, async (base) => {
    assert.equal((await (await fetch(`${base}/readiness`)).json()).ready, true);
    const bad = await fetch(`${base}/jobs`, { method: "POST", body: JSON.stringify({ input: "../etc" }) });
    assert.equal(bad.status, 400);
    const none = await fetch(`${base}/jobs`, { method: "POST", body: "{}" });
    assert.equal(none.status, 400);
    const start = await fetch(`${base}/jobs`, { method: "POST", body: JSON.stringify({ input: "demo" }) });
    assert.equal(start.status, 202);
    const { id } = await start.json();
    await settle(config, id);
    assert.equal((await (await fetch(`${base}/jobs/${id}`)).json()).status, "ready");
    const art = await fetch(`${base}/jobs/${id}/artifacts/board-track.mp4`);
    assert.equal(art.status, 200);
    assert.equal(art.headers.get("content-type"), "video/mp4");
    assert.equal((await fetch(`${base}/jobs/${id}/artifacts/job.json`)).status, 404);
    assert.equal((await fetch(`${base}/jobs/bs_ffffffffffffffff`)).status, 404);
    assert.equal((await fetch(`${base}/jobs/${id}/cancel`, { method: "POST" })).status, 409);
  });
});

test("HTTP: non-loopback host without an API key is refused", async (t) => {
  const { config } = env(t, FAKE_OK);
  config.host = "0.0.0.0";
  delete process.env.MOTION_MASTER_API_KEY;
  await withServer(config, async (base) => {
    assert.equal((await fetch(`${base}/readiness`)).status, 403);
  });
});

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
test("render confinement and browser detection probes (real chromium; skipped when the skill venv is absent)", (t) => {
  const py = process.env.BOARD_SYNC_TEST_PYTHON;
  if (!py || !existsSync(py)) return t.skip("set BOARD_SYNC_TEST_PYTHON to the board-sync venv python to run the real-browser probes");
  const script = fileURLToPath(new URL("../../plugins/motion-master/skills/board-sync/selftest/test_confine.py", import.meta.url));
  const r = spawnSync(py, [script], { encoding: "utf8", timeout: 90_000 });
  assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
  assert.match(r.stdout, /F3 ok: network hits 0/);
});

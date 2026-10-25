import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../dist/config.js';
import { createHttpHandler } from '../dist/index.js';

async function fixture(t, host = '127.0.0.1') {
  const root = mkdtempSync(join(tmpdir(), 'mm-project-api-'));
  const config = { ...loadConfig(), repoRoot: root, host };
  const handler = createHttpHandler(config);
  const server = createServer((req, res) => { void handler(req, res); });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    rmSync(root, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${server.address().port}/api/v1`;
  const request = async (path, method = 'GET', data) => {
    const res = await fetch(base + path, {
      method,
      ...(data ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) } : {}),
    });
    return { status: res.status, body: await res.json() };
  };
  return { request, root };
}

test('MM-03 HTTP: create, reopen, edit and read old revision; reject stale writes', async (t) => {
  const { request } = await fixture(t);
  const created = await request('/projects', 'POST', { title: 'First', brief: 'A launch video' });
  assert.equal(created.status, 201);
  const id = created.body.project.id;
  assert.match(id, /^p_/);
  const reopened = await request('/projects/' + id);
  assert.equal(reopened.status, 200);
  assert.equal(reopened.body.revision.brief, 'A launch video');
  const edited = await request('/projects/' + id + '/revisions', 'POST', {
    expectedRevision: 1, title: 'Second', brief: 'An edited video',
    shots: [{ id: 'shot1', title: 'Reveal', duration: 5 }],
  });
  assert.equal(edited.status, 201);
  assert.equal(edited.body.project.currentRevision, 2);
  const stale = await request('/projects/' + id + '/revisions', 'POST', {
    expectedRevision: 1, title: 'Stale', brief: 'Stale', shots: [],
  });
  assert.equal(stale.status, 409);
  const old = await request('/projects/' + id + '/revisions/1');
  assert.equal(old.status, 200);
  assert.equal(old.body.brief, 'A launch video');
  const list = await request('/projects');
  assert.equal(list.status, 200);
  assert.equal(list.body.length, 1);
  assert.equal(list.body[0].title, 'Second');
});

test('MM-03 HTTP: invalid IDs and missing revisions fail closed', async (t) => {
  const { request } = await fixture(t);
  assert.equal((await request('/projects/%2e%2e')).status, 400);
  assert.equal((await request('/projects/unknown')).status, 404);
  assert.equal((await request('/projects/unknown/revisions/99')).status, 404);
  assert.equal((await request('/projects', 'POST', { title: '', brief: 'x' })).status, 400);
});

test('MM-03 HTTP: refuse unauthenticated project storage on non-loopback host', async (t) => {
  const previous = process.env.MOTION_MASTER_API_KEY;
  delete process.env.MOTION_MASTER_API_KEY;
  t.after(() => {
    if (previous === undefined) delete process.env.MOTION_MASTER_API_KEY;
    else process.env.MOTION_MASTER_API_KEY = previous;
  });
  const { request } = await fixture(t, '0.0.0.0');
  const result = await request('/projects', 'POST', { title: 'Private', brief: 'Do not expose' });
  assert.equal(result.status, 403);
});

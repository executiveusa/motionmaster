import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createProject, createProjectJob, listProjectJobs, readProjectJob,
  recoverInterruptedProjectJobs, transitionProjectJob,
} from '../dist/projects.js';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'mm-jobs-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const { project } = createProject(root, { title: 'Film', brief: 'A launch film' });
  return { root, projectId: project.id };
}

test('MM-05 job lifecycle is persisted and idempotent; retries increment attempts only when started', (t) => {
  const { root, projectId } = fixture(t);
  const job = createProjectJob(root, projectId, 1);
  assert.equal(job.status, 'queued');
  const running = transitionProjectJob(root, projectId, job.id, 'start');
  assert.equal(running.attempts, 1);
  assert.deepEqual(transitionProjectJob(root, projectId, job.id, 'start'), running);
  const failed = transitionProjectJob(root, projectId, job.id, 'fail', { error: 'renderer unavailable' });
  assert.equal(failed.status, 'failed');
  assert.equal(readProjectJob(root, projectId, job.id)?.error, 'renderer unavailable');
  const queued = transitionProjectJob(root, projectId, job.id, 'retry');
  assert.equal(queued.status, 'queued');
  assert.equal(queued.error, undefined);
  assert.equal(queued.attempts, 1);
  assert.deepEqual(transitionProjectJob(root, projectId, job.id, 'retry'), queued);
  const second = transitionProjectJob(root, projectId, job.id, 'start');
  assert.equal(second.attempts, 2);
  assert.equal(listProjectJobs(root, projectId).length, 1);
  assert.throws(() => transitionProjectJob(root, projectId, job.id, 'retry'), /Invalid job transition/);
});

test('MM-05 completed jobs require a real project-local MP4 and cannot be cancelled', (t) => {
  const { root, projectId } = fixture(t);
  const job = createProjectJob(root, projectId, 1);
  transitionProjectJob(root, projectId, job.id, 'start');
  assert.throws(() => transitionProjectJob(root, projectId, job.id, 'complete'), /MP4 artifact/);
  assert.throws(() => transitionProjectJob(root, projectId, job.id, 'complete', { artifact: '../secret.mp4' }), /MP4 artifact/);
  assert.throws(() => transitionProjectJob(root, projectId, job.id, 'complete', { artifact: 'artifacts/movie.mp4' }), /missing or invalid/);
  const artifacts = join(root, 'workspace', 'projects', projectId, 'artifacts');
  mkdirSync(artifacts);
  writeFileSync(join(artifacts, 'movie.mp4'), Buffer.from([0, 0, 0, 1]));
  const ready = transitionProjectJob(root, projectId, job.id, 'complete', { artifact: 'artifacts/movie.mp4' });
  assert.equal(ready.status, 'ready');
  assert.equal(ready.artifact, 'artifacts/movie.mp4');
  assert.deepEqual(transitionProjectJob(root, projectId, job.id, 'complete'), ready);
  assert.throws(() => transitionProjectJob(root, projectId, job.id, 'cancel'), /Invalid job transition/);
});

test('MM-05 restart recovery marks only in-flight jobs failed, without auto-running work', (t) => {
  const { root, projectId } = fixture(t);
  const rendering = createProjectJob(root, projectId, 1);
  const queued = createProjectJob(root, projectId, 1);
  transitionProjectJob(root, projectId, rendering.id, 'start');
  assert.equal(recoverInterruptedProjectJobs(root), 1);
  assert.equal(recoverInterruptedProjectJobs(root), 0);
  assert.match(readProjectJob(root, projectId, rendering.id)?.error ?? '', /interrupted/);
  assert.equal(readProjectJob(root, projectId, queued.id)?.status, 'queued');
  assert.equal(transitionProjectJob(root, projectId, rendering.id, 'retry').status, 'queued');
  assert.equal(transitionProjectJob(root, projectId, queued.id, 'cancel').status, 'cancelled');
  assert.throws(() => transitionProjectJob(root, projectId, queued.id, 'start'), /Invalid job transition/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createProject, createProjectJob, listProjects, migrateLegacyFilms,
  readProject, readProjectJob, readRevision, saveRevision,
} from '../dist/projects.js';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'mm-projects-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

test('MM-03: project and immutable revisions reopen after a fresh read', (t) => {
  const root = fixture(t);
  const created = createProject(root, { title: 'Launch', brief: 'Launch film' });
  assert.equal(created.project.schemaVersion, 1);
  assert.equal(readProject(root, created.project.id)?.revision.brief, 'Launch film');
  const edited = saveRevision(root, created.project.id, 1, {
    title: 'Launch v2', brief: 'New brief', shots: [{ id: 'a', title: 'Open', duration: 3 }],
  });
  assert.equal(edited.project.currentRevision, 2);
  assert.equal(readProject(root, created.project.id)?.revision.shots[0].duration, 3);
  assert.equal(readRevision(root, created.project.id, 1)?.brief, 'Launch film');
  assert.equal(listProjects(root).length, 1);
  assert.throws(() => saveRevision(root, created.project.id, 1, { title: 'stale', brief: 'stale', shots: [] }), /conflict/);
});

test('MM-03: durable job references a real project revision', (t) => {
  const root = fixture(t);
  const { project } = createProject(root, { title: 'Test', brief: 'Test film' });
  const job = createProjectJob(root, project.id, 1);
  assert.equal(readProjectJob(root, project.id, job.id)?.status, 'queued');
  assert.throws(() => createProjectJob(root, project.id, 2), /not found/);
  assert.equal(readProjectJob(root, project.id, 'j_missing'), undefined);
});

test('MM-03: reject traversal and duplicate ids, do not silently repair corrupt records', (t) => {
  const root = fixture(t);
  assert.throws(() => createProject(root, { id: '../escape', title: 'Bad', brief: 'Bad' }), /Invalid/);
  createProject(root, { id: 'safe', title: 'Good', brief: 'Good' });
  assert.throws(() => createProject(root, { id: 'safe', title: 'Overwrite', brief: 'Overwrite' }), /EEXIST/);
  assert.throws(() => readProject(root, '../escape'), /Invalid/);
  const path = join(root, 'workspace', 'projects', 'safe', 'project.json');
  writeFileSync(path, '{ broken');
  assert.throws(() => readProject(root, 'safe'), /JSON/);
});

test('MM-03: legacy migration is idempotent, non-destructive and skips malformed films', (t) => {
  const root = fixture(t);
  const dir = join(root, 'workspace', 'films', 'old-film');
  mkdirSync(dir, { recursive: true });
  const original = '{"title":"Old film","brief":"Old launch"}\n';
  writeFileSync(join(dir, 'film.json'), original);
  writeFileSync(join(dir, 'job.json'), JSON.stringify({ status: 'ready', shots: [{ id: 'one', title: 'Shot', duration: 4 }] }));
  const broken = join(root, 'workspace', 'films', 'broken');
  mkdirSync(broken);
  writeFileSync(join(broken, 'film.json'), '{bad');
  assert.deepEqual(migrateLegacyFilms(root), { imported: 1, skipped: 1 });
  assert.deepEqual(migrateLegacyFilms(root), { imported: 0, skipped: 2 });
  assert.equal(readProject(root, 'legacy_old-film')?.revision.shots[0].duration, 4);
  assert.equal(readFileSync(join(dir, 'film.json'), 'utf8'), original);
  assert.equal(existsSync(join(dir, 'job.json')), true);
});

test('MM-08: text and color overrides survive immutable revisions and reject unsafe payloads', (t) => {
  const root = fixture(t);
  const first = createProject(root, {
    title: 'Editable title', brief: 'A title card',
    shots: [{ id: 'lt-neon-border', title: 'Intro', duration: 3.5, values: { name: 'Maya Chen', accent: '#1A2B3C' } }],
  });
  assert.deepEqual(readProject(root, first.project.id)?.revision.shots[0].values,
    { name: 'Maya Chen', accent: '#1A2B3C' });
  const updated = saveRevision(root, first.project.id, 1, {
    title: 'Edited title', brief: 'A title card',
    shots: [{ id: 'lt-neon-border', title: 'Intro', duration: 3.5, values: { name: 'Ana Ruiz', accent: '#1A2B3C' } }],
  });
  assert.equal(updated.revision.number, 2);
  assert.equal(readRevision(root, first.project.id, 1)?.shots[0].values.name, 'Maya Chen');
  assert.equal(readProject(root, first.project.id)?.revision.shots[0].values.name, 'Ana Ruiz');
  for (const values of [
    { name: '<script>alert(1)</script>' },
    { name: '' },
    { name: 'x'.repeat(121) },
    { name: 3 },
    { __proto__: null, bad: null },
    Object.fromEntries(Array.from({ length: 13 }, (_, i) => ['field' + i, 'x'])),
  ]) {
    assert.throws(() => saveRevision(root, first.project.id, 2, {
      title: 'Unsafe', brief: 'Unsafe', shots: [{ id: 'lt-neon-border', title: 'Intro', duration: 3, values }],
    }), /Invalid revision content/);
  }
  assert.equal(readProject(root, first.project.id)?.project.currentRevision, 2);
});

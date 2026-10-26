#!/usr/bin/env node
/** Offline staging backup/verify/restore regressions; disposable fixtures only. */
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { backup, verify, restore } from './staging-workspace.mjs';

const temp = mkdtempSync(join(tmpdir(), 'mm-staging-backup-test-'));
const source = join(temp, 'source');
const target = join(temp, 'target');
const archive = join(temp, 'backup');
const offline = '--confirm-stopped';
try {
  mkdirSync(join(source, 'workspace', 'projects', 'p_fixture', 'revisions'), { recursive: true });
  mkdirSync(target);
  const revision = JSON.stringify({ schemaVersion: 1, projectId: 'p_fixture', number: 1, shots: [{ id: 'lt-neon-border', values: { name: 'Ana Ruiz' } }] });
  writeFileSync(join(source, 'workspace', 'projects', 'p_fixture', 'revisions', '1.json'), revision);
  await assert.rejects(backup(source, archive), /confirm-stopped/);
  const created = await backup(source, archive, offline);
  assert.equal(created.status, 'verified');
  assert.equal(created.files, 1);
  assert.equal((await verify(archive)).manifestSha256, created.manifestSha256);
  assert.equal(statSync(join(archive, 'workspace', 'projects', 'p_fixture', 'revisions', '1.json')).mode & 0o777, 0o600);
  await assert.rejects(backup(source, archive, offline), /already exists/);
  await assert.rejects(restore(archive, target), /confirm-stopped/);
  assert.equal((await restore(archive, target, offline)).status, 'restored');
  assert.equal(readFileSync(join(target, 'workspace', 'projects', 'p_fixture', 'revisions', '1.json'), 'utf8'), revision);
  await assert.rejects(restore(archive, target, offline), /refuses to overwrite/);
  writeFileSync(join(archive, 'workspace', 'projects', 'p_fixture', 'revisions', '1.json'), 'tampered');
  await assert.rejects(verify(archive), /mismatch/);
  const unsafe = join(temp, 'unsafe');
  mkdirSync(join(unsafe, 'workspace'), { recursive: true });
  symlinkSync(join(source, 'workspace'), join(unsafe, 'workspace', 'linked'));
  await assert.rejects(backup(unsafe, join(temp, 'unsafe-backup'), offline), /symlinks are forbidden/);
  console.log('PASS: offline backup, checksum/tamper detection, private file modes, no-overwrite restore, symlink rejection');
} finally { rmSync(temp, { recursive: true, force: true }); }

#!/usr/bin/env node
/**
 * Offline, owner-controlled snapshot/verify/restore for the single-writer
 * Motion Master workspace. No service management, cloud upload or encryption.
 * Stop API + render worker and quiesce writers BEFORE backup or restore.
 */
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, copyFileSync, chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, resolve, sep } from 'node:path';

const SCHEMA = 1;
const manifestName = 'manifest.json';
const isWithin = (parent, child) => child === parent || child.startsWith(parent + sep);
function requireDirectory(path) {
  if (!existsSync(path) || !lstatSync(path).isDirectory() || lstatSync(path).isSymbolicLink()) {
    throw new Error('Expected a real directory: ' + path);
  }
}
function assertOffline(flag) {
  if (flag !== '--confirm-stopped') throw new Error('Stop the API and worker first; pass --confirm-stopped to acknowledge.');
}
function safePath(path) {
  return typeof path === 'string' && path.length > 0 && !isAbsolute(path) &&
    !path.includes('\\') && !path.includes('\0') &&
    path.split('/').every((segment) => segment !== '' && segment !== '.' && segment !== '..');
}
async function digest(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}
function walk(root) {
  const files = [];
  const directories = [];
  function visit(dir, prefix) {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const rel = prefix ? prefix + '/' + entry.name : entry.name;
      if (!safePath(rel)) throw new Error('Unsafe workspace path: ' + rel);
      const full = join(dir, entry.name);
      const stat = lstatSync(full);
      if (stat.isSymbolicLink()) throw new Error('Workspace symlinks are forbidden: ' + rel);
      if (stat.isDirectory()) { directories.push(rel); visit(full, rel); }
      else if (stat.isFile()) files.push({ path: rel, bytes: stat.size });
      else throw new Error('Unsupported workspace entry: ' + rel);
    }
  }
  visit(root, '');
  return { files, directories };
}
function copySnapshot(source, target, tree) {
  mkdirSync(target, { mode: 0o700 });
  for (const dir of tree.directories) mkdirSync(join(target, dir), { mode: 0o700 });
  for (const file of tree.files) {
    const from = join(source, file.path);
    if (!lstatSync(from).isFile()) throw new Error('Source changed during backup: ' + file.path);
    copyFileSync(from, join(target, file.path));
    chmodSync(join(target, file.path), 0o600);
  }
}
async function verify(backup) {
  requireDirectory(backup);
  const root = join(backup, 'workspace');
  requireDirectory(root);
  const manifestPath = join(backup, manifestName);
  if (!existsSync(manifestPath) || !lstatSync(manifestPath).isFile()) throw new Error('Missing backup manifest.');
  if (lstatSync(manifestPath).size > 10_000_000) throw new Error('Manifest too large.');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (manifest.schema !== SCHEMA || manifest.source !== 'workspace' ||
      !Array.isArray(manifest.files) || !Array.isArray(manifest.directories)) throw new Error('Invalid backup manifest.');
  const actual = walk(root);
  const filePaths = manifest.files.map((f) => f.path);
  const dirs = manifest.directories;
  if (![...filePaths, ...dirs].every(safePath) || new Set(filePaths).size !== filePaths.length ||
      new Set(dirs).size !== dirs.length) throw new Error('Unsafe or duplicate manifest paths.');
  if (JSON.stringify([...filePaths].sort()) !== JSON.stringify(actual.files.map((f) => f.path).sort()) ||
      JSON.stringify([...dirs].sort()) !== JSON.stringify(actual.directories.sort())) {
    throw new Error('Backup contents do not match manifest.');
  }
  let bytes = 0;
  for (const file of manifest.files) {
    const full = join(root, file.path);
    const size = lstatSync(full).size;
    if (!Number.isSafeInteger(file.bytes) || size !== file.bytes ||
        !/^[0-9a-f]{64}$/.test(file.sha256) || await digest(full) !== file.sha256) {
      throw new Error('Backup checksum or size mismatch: ' + file.path);
    }
    bytes += size;
  }
  return { status: 'verified', files: filePaths.length, bytes, manifestSha256: await digest(manifestPath) };
}
async function backup(repoRoot, backupDir, flag) {
  assertOffline(flag);
  requireDirectory(repoRoot);
  const source = join(repoRoot, 'workspace');
  requireDirectory(source);
  if (isWithin(source, backupDir) || isWithin(backupDir, source)) throw new Error('Backup must be outside workspace.');
  if (existsSync(backupDir)) throw new Error('Backup destination already exists.');
  const tree = walk(source);
  mkdirSync(backupDir, { mode: 0o700 });
  try {
    copySnapshot(source, join(backupDir, 'workspace'), tree);
    const files = [];
    for (const file of tree.files) {
      const original = join(source, file.path);
      const copied = join(backupDir, 'workspace', file.path);
      const sha256 = await digest(copied);
      if (await digest(original) !== sha256 || lstatSync(original).size !== file.bytes) {
        throw new Error('Workspace changed during backup: ' + file.path);
      }
      files.push({ ...file, sha256 });
    }
    writeFileSync(join(backupDir, manifestName), JSON.stringify({
      schema: SCHEMA, source: 'workspace', createdAt: new Date().toISOString(),
      directories: tree.directories, files,
    }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    return await verify(backupDir);
  } catch (error) { rmSync(backupDir, { recursive: true, force: true }); throw error; }
}
async function restore(backupDir, repoRoot, flag) {
  assertOffline(flag);
  requireDirectory(repoRoot);
  const destination = join(repoRoot, 'workspace');
  if (existsSync(destination)) throw new Error('Restore refuses to overwrite an existing workspace.');
  const verified = await verify(backupDir);
  const source = join(backupDir, 'workspace');
  if (isWithin(source, destination) || isWithin(destination, source)) throw new Error('Restore destination overlaps backup.');
  const temp = join(repoRoot, '.workspace-restore-' + randomUUID());
  try {
    const tree = walk(source);
    copySnapshot(source, temp, tree);
    const manifest = JSON.parse(readFileSync(join(backupDir, manifestName), 'utf8'));
    for (const file of manifest.files) {
      if (await digest(join(temp, file.path)) !== file.sha256) {
        throw new Error('Restore copy failed integrity check: ' + file.path);
      }
    }
    // The API/worker must remain stopped until this atomic rename completes.
    renameSync(temp, destination);
    return { ...verified, status: 'restored' };
  } finally { rmSync(temp, { recursive: true, force: true }); }
}

export { backup, verify, restore };
if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  const [command, first, second, flag] = process.argv.slice(2);
  try {
    if (!first) throw new Error('Usage: backup <repo> <new-backup-dir> --confirm-stopped | verify <backup-dir> | restore <backup-dir> <empty-repo> --confirm-stopped');
    const result = command === 'backup' ? await backup(resolve(first), resolve(second), flag) :
      command === 'verify' ? await verify(resolve(first)) :
      command === 'restore' ? await restore(resolve(first), resolve(second), flag) : null;
    if (!result) throw new Error('Unknown command.');
    console.log(JSON.stringify(result));
  } catch (error) { console.error('Staging workspace: ' + error.message); process.exitCode = 1; }
}

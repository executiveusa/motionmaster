/**
 * File intake.
 *
 * The user brings their own material: a logo, a product shot, a clip of
 * footage. The agent needs it on disk, at a path it can hand to a renderer.
 *
 * Files are written under the repository's `workspace/` directory, named by a
 * content hash so two uploads of the same file do not collide and a file is
 * never overwritten. Nothing is executed and nothing is interpreted: this
 * endpoint stores bytes and tells the truth about them.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import type { Config } from './config.js';

export const MAX_UPLOAD_BYTES = 512 * 1024 * 1024;

/** Extensions we will store. Anything else is refused with the reason. */
const ALLOWED = new Set([
  '.mp4', '.mov', '.webm', '.mkv', '.m4v',
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.svg',
  '.mp3', '.wav', '.m4a', '.aac', '.ogg',
  '.json', '.txt', '.md', '.srt', '.vtt',
  '.ttf', '.otf', '.woff', '.woff2',
]);

export interface StoredFile {
  id: string;
  name: string;
  path: string;
  relativePath: string;
  bytes: number;
  contentType: string;
  url: string;
  storedAt: string;
}

export function workspaceDir(config: Config): string {
  return resolve(config.repoRoot, 'workspace', 'files');
}

/**
 * Store an upload. The name is sanitised, the extension is checked, and the
 * bytes are hashed so the same file is stored once.
 */
export function storeFile(
  config: Config,
  originalName: string,
  bytes: Buffer,
  contentType = 'application/octet-stream',
): { ok: true; file: StoredFile } | { ok: false; error: string; status: number } {
  if (bytes.length === 0) {
    return { ok: false, error: 'The file was empty.', status: 400 };
  }
  if (bytes.length > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      error: `The file is ${(bytes.length / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`,
      status: 413,
    };
  }

  const safeName = originalName.replace(/[^\w.\-]+/g, '_').replace(/^_+|_+$/g, '') || 'file';
  const dot = safeName.lastIndexOf('.');
  const extension = dot > 0 ? safeName.slice(dot).toLowerCase() : '';
  if (!ALLOWED.has(extension)) {
    return {
      ok: false,
      error: `".${extension.replace('.', '') || 'no extension'}" is not an accepted file type.`,
      status: 415,
    };
  }

  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 16);
  const stem = dot > 0 ? safeName.slice(0, dot) : safeName;
  const storedName = `${stem}-${hash}${extension}`;

  const dir = workspaceDir(config);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, storedName);
  writeFileSync(path, bytes);

  return {
    ok: true,
    file: {
      id: hash,
      name: safeName,
      path,
      relativePath: relative(config.repoRoot, path),
      bytes: bytes.length,
      contentType,
      url: `/files/${storedName}`,
      storedAt: new Date().toISOString(),
    },
  };
}

/** The files already in the workspace. */
export function listFiles(config: Config): StoredFile[] {
  const dir = workspaceDir(config);
  if (!existsSync(dir)) return [];
  const out: StoredFile[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    let size = 0;
    try {
      size = statSync(path).size;
    } catch {
      continue;
    }
    out.push({
      id: name,
      name,
      path,
      relativePath: relative(config.repoRoot, path),
      bytes: size,
      contentType: 'application/octet-stream',
      url: `/files/${name}`,
      storedAt: '',
    });
  }
  return out;
}

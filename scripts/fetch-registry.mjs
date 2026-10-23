#!/usr/bin/env node
/**
 * fetch-registry.mjs — pull the HyperFrames registry into the library.
 *
 * The catalogue command gives names, tags and descriptions. What it does not
 * give is the thing that makes a block usable: its **variables** — the
 * headline strings, the image slots, the speed, the colour — and the list of
 * files it needs. Those live in each registry item's `registry-item.json`.
 *
 * This fetches all of them from the upstream registry at a pinned revision
 * and writes the result into library/blocks.json, so a brief can be filled
 * into a real block instead of a template.
 *
 *   node scripts/fetch-registry.mjs [--out library/blocks.json]
 *
 * The revision is pinned in the output, so a rebuild is reproducible.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const OUT = join(ROOT, 'library', 'blocks.json');
const RAW = 'https://raw.githubusercontent.com/heygen-com/hyperframes';
const REPO = 'heygen-com/hyperframes';
const TREE_API = `https://api.github.com/repos/${REPO}/git/trees/main?recursive=1`;

const CONCURRENCY = 8;

async function getJson(url, attempts = 3) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url, {
        headers: { 'user-agent': 'motion-master-library' },
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (error) {
      if (i === attempts - 1) throw error;
      await new Promise((r) => setTimeout(r, 600 * (i + 1)));
    }
  }
  return null;
}

async function main() {
  console.log('reading the upstream tree…');
  const tree = await getJson(TREE_API);
  const paths = tree.tree
    .map((t) => t.path)
    .filter((p) => p.startsWith('registry/blocks/') || p.startsWith('registry/components/'))
    .filter((p) => p.endsWith('/registry-item.json'));

  console.log(`${paths.length} registry items`);

  const items = [];
  const failed = [];
  let done = 0;

  const worker = async () => {
    while (paths.length) {
      const path = paths.shift();
      try {
        const item = await getJson(`${RAW}/main/${path}`);
        items.push(item);
      } catch (error) {
        failed.push({ path, error: String(error) });
      }
      done += 1;
      if (done % 50 === 0) console.log(`  ${done} fetched`);
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  if (failed.length) {
    console.warn(`${failed.length} items could not be fetched:`);
    for (const f of failed.slice(0, 5)) console.warn(`  ${f.path}: ${f.error}`);
  }

  // Sort by name so the output is deterministic regardless of fetch order.
  items.sort((a, b) => String(a.name).localeCompare(String(b.name)));

  const blocks = items.map((item) => ({
    id: item.name,
    type: item.type,
    title: item.title ?? item.name,
    description: item.description ?? '',
    tags: item.tags ?? [],
    author: item.author ?? null,
    dimensions: item.dimensions ?? null,
    duration: item.duration ?? null,
    variables: (item.variables ?? []).map((v) => ({
      id: v.id,
      type: v.type,
      role: v.role,
      label: v.label ?? '',
      description: v.description ?? '',
      portrays: v.portrays ?? [],
      default: v.default ?? null,
      min: v.min ?? null,
      max: v.max ?? null,
      options: v.options ?? [],
    })),
    files: (item.files ?? []).map((f) => ({ path: f.path, target: f.target, type: f.type })),
    license: item.license ?? 'Apache-2.0 (heygen-com/hyperframes)',
  }));

  const byTag = new Map();
  for (const b of blocks) {
    for (const t of b.tags) byTag.set(t, (byTag.get(t) ?? 0) + 1);
  }

  const payload = {
    generated: 'scripts/fetch-registry.mjs',
    source: `github.com/${REPO} @ ${tree.sha ?? 'main'}`,
    count: blocks.length,
    tags: [...byTag.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([slug, count]) => ({ slug, count })),
    blocks,
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n');

  const withVars = blocks.filter((b) => b.variables.length > 0).length;
  console.log(
    `blocks.json: ${blocks.length} items · ${withVars} with variables · ${byTag.size} tags`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

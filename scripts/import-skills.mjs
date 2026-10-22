#!/usr/bin/env node
/**
 * Import the top motion skills into the Motion Master plugin package.
 *
 * We take the SKILL knowledge — SKILL.md, its references, and small assets —
 * not the upstream repositories' sample libraries, render output and tooling.
 * A skill is a document an agent reads; a 186 MB style gallery is not.
 *
 * Every imported skill keeps its upstream licence and attribution. The plugin
 * is a commercial product; the upstream work stays under its own terms.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';

const SRC = '/workspace/.research/skills';
const DST = '/workspace/motion-master/plugins/motion-master/skills';

const MAX_TEXT = 300 * 1024; // 300 KB
const MAX_ASSET = 300 * 1024; // 300 KB

const IMPORTS = [
  { repo: 'motionmaxxing', name: 'motionmaxxing', licence: 'Apache-2.0', author: 'motionmaxxing' },
  { repo: 'lemo-opuscar', name: 'lemo-opuscar', licence: 'MIT AND CC-BY-4.0', author: 'LemoLab', skill: 'plugin/skills/lemo-opuscar' },
  { repo: 'awesome-ai-motion', name: 'awesome-ai-motion', licence: 'MIT', author: 'awesome-ai-motion' },
  { repo: 'product-launch-motion', name: 'product-launch-motion', licence: 'MIT', author: 'AbubakrChan' },
  { repo: 'oil-motion', name: 'oil-motion', licence: 'MIT', author: 'oil-oil' },
  { repo: 'huashu-art-motion', name: 'huashu-art-motion', licence: 'MIT', author: 'alchaincyf' },
  { repo: 'animate', name: 'animate', licence: 'MIT', author: 'cth9191' },
  { repo: 'claude-motion', name: 'claude-motion', licence: 'MIT', author: 'whaleyxbt', skill: '.claude/skills' },
  { repo: 'guizang-product-video-skill', name: 'guizang-product-video', licence: 'MIT', author: 'op7418' },
  { repo: 'Jacky-motion', name: 'jacky-motion', licence: 'MIT', author: 'Jackywxsz' },
];

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function dirSize(files) {
  return files.reduce((n, f) => n + statSync(f).size, 0);
}

function copyFiltered(from, to, isAsset) {
  const cap = isAsset ? MAX_ASSET : MAX_TEXT;
  const files = walk(from);
  let bytes = 0;
  let kept = 0;
  for (const file of files) {
    const size = statSync(file).size;
    if (size > cap) continue;
    const rel = file.slice(from.length).replace(/^\/+/, '');
    const target = join(to, rel);
    mkdirSync(join(target, '..'), { recursive: true });
    cpSync(file, target);
    bytes += size;
    kept++;
  }
  return { bytes, kept, total: files.length };
}

/** Add name/description/license frontmatter if the upstream file lacks it. */
function normaliseFrontmatter(text, meta) {
  if (text.startsWith('---')) {
    const end = text.indexOf('\n---', 3);
    if (end !== -1) {
      let fm = text.slice(3, end);
      const body = text.slice(end + 4);
      if (!/^license:/m.test(fm)) fm += `\nlicense: ${meta.licence}`;
      if (!/^metadata:/m.test(fm)) {
        fm += `\nmetadata:\n  author: ${meta.author}\n  upstream: ${meta.upstream}\n  imported: "2026-10-22"`;
      }
      return `---\n${fm}\n---${body}`;
    }
  }
  const desc = meta.description ?? '';
  return `---\nname: ${meta.name}\ndescription: ${desc}\nlicense: ${meta.licence}\nmetadata:\n  author: ${meta.author}\n  upstream: ${meta.upstream}\n  imported: "2026-10-22"\n---\n\n${text}`;
}

const report = [];
for (const item of IMPORTS) {
  const repoRoot = join(SRC, item.repo);
  if (!existsSync(repoRoot)) {
    report.push({ name: item.name, status: 'MISSING REPO' });
    continue;
  }
  // The skill root is the directory holding SKILL.md, or the repo root.
  const skillFiles = walk(repoRoot).filter((f) => basename(f) === 'SKILL.md');
  let skillRoot = repoRoot;
  let skillFile = join(repoRoot, 'SKILL.md');
  if (item.skill) {
    // An explicit root: the directory that holds the skill(s).
    const base = join(repoRoot, item.skill);
    const candidates = walk(base).filter((f) => basename(f) === 'SKILL.md');
    if (candidates.length) {
      skillFile = candidates[0];
      skillRoot = skillFile.slice(0, skillFile.length - '/SKILL.md'.length);
    }
  } else if (!existsSync(skillFile) && skillFiles.length) {
    skillFile = skillFiles[0];
    skillRoot = skillFile.slice(0, skillFile.length - '/SKILL.md'.length);
  }
  if (!existsSync(skillFile)) {
    report.push({ name: item.name, status: 'NO SKILL.md' });
    continue;
  }

  const dest = join(DST, item.name);
  mkdirSync(dest, { recursive: true });

  const head = readFileSync(skillFile, 'utf8').slice(0, 1200);
  const descMatch = head.match(/description:\s*(.+)/);
  const description = (descMatch ? descMatch[1] : '').replace(/^['"]|['"]$/g, '').trim();

  // SKILL.md
  const normalised = normaliseFrontmatter(readFileSync(skillFile, 'utf8'), {
    name: item.name,
    licence: item.licence,
    author: item.author,
    upstream: `github.com/${item.repo}`,
    description,
  });
  writeFileSync(join(dest, 'SKILL.md'), normalised);

  // references / assets / docs / styleboard, filtered by size
  let bytes = 0;
  let kept = 0;
  for (const sub of ['references', 'assets', 'docs', 'library', 'styles', 'styleboard', 'agents', 'core', 'defaults', 'templates']) {
    const from = join(skillRoot, sub);
    if (!existsSync(from)) continue;
    const isAsset = sub === 'assets' || sub === 'core';
    const r = copyFiltered(from, join(dest, sub), isAsset);
    bytes += r.bytes;
    kept += r.kept;
  }

  // licence + attribution, always
  for (const lic of ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'NOTICE', 'ATTRIBUTIONS.md', 'ATTRIBUTION.md']) {
    const from = join(repoRoot, lic);
    if (existsSync(from)) {
      cpSync(from, join(dest, lic));
      bytes += statSync(from).size;
      kept++;
    }
  }

  // upstream provenance note
  writeFileSync(
    join(dest, 'UPSTREAM.md'),
    `# Upstream\n\n${item.name} is imported from **github.com/${item.repo}**.\n\n` +
      `- Licence: ${item.licence}\n- Author: ${item.author}\n- Imported: 2026-10-22\n\n` +
      `The upstream licence file is included in this directory and applies to every file\n` +
      `imported from it. Attribution is kept intact.\n`,
  );

  report.push({ name: item.name, status: 'OK', files: kept, kb: Math.round(bytes / 1024) });
}

console.log('imported into ' + DST);
for (const r of report) {
  console.log(
    `  ${r.status === 'OK' ? 'OK  ' : 'MISS'} ${r.name.padEnd(26)} ${r.status === 'OK' ? `${r.files} files, ${r.kb} KB` : r.status}`,
  );
}

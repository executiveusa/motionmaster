#!/usr/bin/env node
/**
 * build-library.mjs — vendor the open-source motion libraries into this repo and
 * normalise every prompt, style, technique and skill into one catalogue.
 *
 *   node scripts/build-library.mjs [--src <dir>] [--hf-catalog <file>]
 *
 *   --src          where the cloned upstream repos live
 *                  (default: ../.research/libs)
 *   --hf-catalog   cached `hyperframes catalog --json` output
 *                  (default: library/raw/hyperframes-catalog.json)
 *
 * Outputs
 *   library/collections/<id>/...   vendored source data (no media)
 *   library/catalogue.json         the normalised index
 *   library/blocks.json            the HyperFrames block library
 *
 * Deterministic: run it twice, the bytes are the same.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync, statSync, copyFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};
const SRC = resolve(ROOT, arg('src', '../.research/libs'));
const HF_CATALOG = resolve(ROOT, arg('hf-catalog', 'library/raw/hyperframes-catalog.json'));
const OUT = join(ROOT, 'library');

/* ------------------------------------------------------------------ helpers */

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const readText = (p) => readFileSync(p, 'utf8');

function writeJson(rel, value) {
  const p = join(OUT, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(value, null, 2) + '\n');
  return p;
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    if (e === '.git') continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/** Copy a file if it exists; return true when copied. */
function vendor(from, to) {
  if (!existsSync(from)) return false;
  const p = join(OUT, to);
  mkdirSync(dirname(p), { recursive: true });
  copyFileSync(from, p);
  return true;
}

/**
 * Pull the prompt text out of a markdown file.
 * Prefers the first fenced block under a heading that mentions "prompt";
 * falls back to the longest fenced block in the file.
 */
function extractPrompt(md) {
  const fences = [...md.matchAll(/```(\w*)\n([\s\S]*?)```/g)].map((m) => ({
    lang: (m[1] || '').toLowerCase(),
    text: m[2].trim(),
    at: m.index,
  }));
  if (!fences.length) return { prompt: '', partial: false };

  const promptHeading = /#{1,4}[^\n]*prompt/i;
  const headings = [...md.matchAll(/^#{1,4} .*$/gm)];
  const heading = headings.find((h) => promptHeading.test(h[0]));
  let chosen = null;
  if (heading) {
    const after = md.slice(heading.index);
    const f = fences.find((x) => x.at > heading.index - 1);
    if (f) chosen = f;
  }
  if (!chosen) {
    chosen = fences.filter((f) => f.lang === 'text' || f.lang === '').sort((a, b) => b.text.length - a.text.length)[0];
  }
  if (!chosen) return { prompt: '', partial: false };

  const text = chosen.text;
  // A prompt that is obviously cut short, or that the source flags as a fragment.
  const partial = /fragment|may need additional|Prompt fragment|截断|节选/i.test(md) || text.length < 220;
  return { prompt: text, partial };
}

/** Slug that is stable across runs and readable. */
const slug = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'untitled';

const clean = (s, max = 400) => {
  if (!s) return '';
  const t = String(s).replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
};

/* --------------------------------------------------------- the collections */
/*
 * Every collection gets the same normalised item shape, so the catalogue can be
 * filtered by category regardless of which upstream project it came from.
 *
 *   id          stable, prefixed by collection
 *   collection  collection id
 *   kind        prompt | style | technique | skill | case
 *   title       display title
 *   prompt      the usable text (may be empty for a skill index entry)
 *   partial     true when the source says the prompt is truncated
 *   categories  normalised category slugs
 *   tags        free-form tags
 */

const items = [];
const collections = [];

function add(collection, item) {
  items.push({
    id: `${collection.id}:${item.id}`,
    collection: collection.id,
    kind: item.kind,
    title: clean(item.title || '', 140),
    titleZh: clean(item.titleZh || '', 140),
    summary: clean(item.summary || '', 320),
    prompt: item.prompt || '',
    partial: !!item.partial,
    categories: [...new Set((item.categories || []).filter(Boolean).map(slug))],
    tags: [...new Set((item.tags || []).filter(Boolean).map(slug))],
    author: clean(item.author || '', 80),
    source: item.source || '',
    tools: item.tools || [],
    metrics: item.metrics || {},
    license: collection.license,
  });
}

/* 1 — HiAPIAI: 12 styles, 425 prompts, CC-BY-4.0 ----------------------------- */
{
  const id = 'hiapi-styles';
  const src = join(SRC, 'awesome-opus-5-5-video-styles');
  const data = existsSync(join(src, 'data/cases.json')) ? readJson(join(src, 'data/cases.json')) : null;
  const c = { id, title: 'Awesome Opus 5.5 Video Styles', repo: 'HiAPIAI/awesome-opus-5-5-video-styles', license: 'CC-BY-4.0', homepage: 'https://github.com/HiAPIAI/awesome-opus-5-5-video-styles', kind: 'style-library' };

  if (data) {
    // The style recipes are the most valuable part: a named look, ready to paste.
    for (const s of data.styles || []) {
      vendor(join(src, 'styles', `${s.id}.md`), `collections/${id}/styles/${s.id}.md`);
      add(c, {
        id: `style-${s.id}`,
        kind: 'style',
        title: s.en || s.id,
        titleZh: s.zh || '',
        summary: s.en || '',
        prompt: s.recipe || '',
        categories: ['style-recipe', s.id],
        tags: [s.id, 'style'],
      });
    }
    for (const cs of data.cases || []) {
      add(c, {
        id: `case-${cs.id}`,
        kind: 'prompt',
        title: cs.title_en || cs.title_zh || cs.id,
        titleZh: cs.title_zh || '',
        prompt: cs.prompt || '',
        partial: !!cs.prompt_partial,
        categories: ['prompt', cs.style].filter(Boolean),
        tags: [cs.style, 'prompt'],
        author: cs.author || '',
        source: cs.post_url || '',
        metrics: { likes: cs.likes_2026_09_29 ?? null },
      });
    }
    vendor(join(src, 'data/cases.json'), `collections/${id}/cases.json`);
    vendor(join(src, 'LICENSE'), `collections/${id}/LICENSE`);
    c.count = (data.cases || []).length + (data.styles || []).length;
    c.categories = (data.styles || []).map((s) => ({ slug: s.id, title: s.en || s.id }));
  }
  collections.push(c);
}

/* 2 — LeaddeOpenLab: 398 prompts with provenance, no explicit licence ------- */
{
  const id = 'leadde-prompts';
  const src = join(SRC, 'awesome-opus-5-5-video-prompts');
  const c = { id, title: 'Awesome Opus 5.5 Video Prompts', repo: 'LeaddeOpenLab/awesome-opus-5-5-video-prompts', license: 'all rights reserved (no licence file)', homepage: 'https://github.com/LeaddeOpenLab/awesome-opus-5-5-video-prompts', kind: 'prompt-library' };

  const posts = existsSync(join(src, 'data/source-posts.json')) ? readJson(join(src, 'data/source-posts.json')) : [];
  const byUrl = new Map(posts.map((p) => [p.url, p]));

  // The per-category markdown files are the index: each links a post id and
  // carries a short "Use:" label. Build id -> {categories, use} from them.
  const idCat = new Map();
  const catDir = join(src, 'data/categories');
  if (existsSync(catDir)) {
    for (const f of readdirSync(catDir).filter((e) => e.endsWith('.md'))) {
      const cat = f.replace(/\.md$/, '');
      const md = readText(join(catDir, f));
      for (const m of md.matchAll(/prompts\/(\d{19})\.md[\s\S]{0,900}?Use:\s*([^<\n]+)/g)) {
        const rec = idCat.get(m[1]) || { categories: [], use: '' };
        rec.categories.push(cat);
        if (!rec.use) rec.use = m[2].trim();
        idCat.set(m[1], rec);
      }
      vendor(join(catDir, f), `collections/${id}/categories/${f}`);
    }
  }

  for (const f of walk(join(src, 'prompts')).filter((p) => p.endsWith('.md'))) {
    const md = readText(f);
    const base = f.split('/').pop().replace(/\.md$/, '');
    const { prompt, partial } = extractPrompt(md);
    const h1 = (md.match(/^# (.+)$/m) || [])[1] || base;
    const author = (md.match(/By \[@?([^\]]+)\]/) || [])[1] || '';
    const postUrl = (md.match(/\((https:\/\/x\.com\/[^)]+)\)/) || [])[1] || '';
    const meta = byUrl.get(postUrl) || {};
    const cat = idCat.get(base) || { categories: [], use: '' };
    add(c, {
      id: `post-${base}`,
      kind: 'prompt',
      title: h1,
      summary: cat.use || '',
      prompt,
      partial,
      categories: ['prompt', ...cat.categories, meta.category].filter(Boolean),
      tags: [...cat.categories, meta.category].filter(Boolean),
      author,
      source: postUrl,
    });
  }
  vendor(join(src, 'data/source-posts.json'), `collections/${id}/source-posts.json`);
  c.count = items.filter((i) => i.collection === id).length;
  c.categories = [...new Set([...idCat.values()].flatMap((r) => r.categories))].map((s) => ({ slug: slug(s), title: s }));
  collections.push(c);
}

/* 3 — Li-Evan: 334 verified entries with tools, inputs and cost notes ------- */
{
  const id = 'lian-verified';
  const src = join(SRC, 'awesome-opus-5.5-video-prompts');
  const c = { id, title: 'Awesome Opus 5.5 Video Prompts (verified)', repo: 'Li-Evan/awesome-opus-5.5-video-prompts', license: 'CC-BY-4.0', homepage: 'https://github.com/Li-Evan/awesome-opus-5.5-video-prompts', kind: 'prompt-library' };

  const data = existsSync(join(src, 'site/data.json')) ? readJson(join(src, 'site/data.json')) : null;
  if (data) {
    for (const e of data.entries || []) {
      add(c, {
        id: `entry-${e.id}`,
        kind: 'prompt',
        title: e.title,
        titleZh: e.title_zh || '',
        summary: e.description || '',
        prompt: e.prompt || '',
        partial: !e.prompt || e.prompt.length < 120,
        categories: ['prompt', e.category, e.kind].filter(Boolean),
        tags: [e.category, e.kind, e.platform].filter(Boolean),
        author: e.author_name || e.author || '',
        source: e.url || '',
        tools: e.tools || [],
        metrics: e.metrics || {},
      });
    }
    vendor(join(src, 'site/data.json'), `collections/${id}/data.json`);
    vendor(join(src, 'LICENSE'), `collections/${id}/LICENSE`);
    for (const y of ['launch', 'story', 'showreel']) {
      vendor(join(src, 'data', `${y}.yaml`), `collections/${id}/${y}.yaml`);
      vendor(join(src, 'prompts', `${y}.md`), `collections/${id}/${y}.md`);
    }
    c.count = (data.entries || []).length;
    c.categories = (data.categories || []).map((x) => ({ slug: x.slug, title: x.title, description: x.description }));
  }
  collections.push(c);
}

/* 4 — maning636: 379 GSAP prompts, custom licence forbidding repackaging ---- */
{
  const id = 'maning-prompts';
  const src = join(SRC, 'motion-prompts');
  const c = { id, title: 'Motion Prompts', repo: 'maning636/motion-prompts', license: 'custom (not OSI) — forbids repackaging or re-uploading', homepage: 'https://github.com/maning636/motion-prompts', kind: 'prompt-library' };

  for (const f of walk(join(src, 'prompts')).filter((p) => p.endsWith('.md'))) {
    const md = readText(f);
    const base = f.split('/').pop().replace(/\.md$/, '');
    const { prompt, partial } = extractPrompt(md);
    const h1 = (md.match(/^# (.+)$/m) || [])[1] || base;
    const cat = (md.match(/分类[：:]\s*([^\s｜|]+)/) || [])[1] || '';
    const dur = (md.match(/时长[：:]\s*([^\s｜|]+)/) || [])[1] || '';
    const tagLine = (md.match(/【标签】([^\n]+)/) || [])[1] || '';
    add(c, {
      id: `prompt-${base}`,
      kind: 'prompt',
      title: h1,
      prompt,
      partial,
      categories: ['prompt', cat].filter(Boolean),
      tags: [...tagLine.split(/[\/、,，]/).map((t) => t.trim())].filter(Boolean),
      metrics: dur ? { duration: dur } : {},
    });
  }
  vendor(join(src, 'SAMPLES.md'), `collections/${id}/SAMPLES.md`);
  c.count = items.filter((i) => i.collection === id).length;
  c.categories = [...new Set(items.filter((i) => i.collection === id).flatMap((i) => i.categories))].map((s) => ({ slug: s, title: s }));
  collections.push(c);
}

/* 5 — cindyxu1030: 57 HyperFrames prompts with GIFs, CC BY-NC-SA 4.0 --------- */
{
  const id = 'cindy-prompt-bank';
  const src = join(SRC, 'motion-graphics-prompt-bank');
  const c = { id, title: 'Motion Graphics Prompt Bank', repo: 'cindyxu1030/motion-graphics-prompt-bank', license: 'CC BY-NC-SA 4.0 (non-commercial)', homepage: 'https://github.com/cindyxu1030/motion-graphics-prompt-bank', kind: 'prompt-library' };

  for (const f of walk(src).filter((p) => p.endsWith('.md') && !p.includes('/.git/'))) {
    const rel = f.slice(src.length + 1);
    if (/README|CONTRIBUTING/i.test(rel)) continue;
    const md = readText(f);
    const { prompt, partial } = extractPrompt(md);
    if (!prompt) continue;
    const h1 = (md.match(/^# (.+)$/m) || [])[1] || rel.replace(/\.md$/, '');
    const en = (md.match(/What it delivers:\s*([^\n*]+)/) || [])[1] || '';
    const group = rel.split('/')[0];
    add(c, {
      id: `bank-${rel.replace(/[/.]/g, '-')}`,
      kind: 'prompt',
      title: h1,
      summary: en,
      prompt,
      partial,
      categories: ['prompt', group].filter(Boolean),
      tags: [group],
      tools: /hyperframes/i.test(prompt) ? ['hyperframes'] : [],
    });
    vendor(f, `collections/${id}/${rel}`);
  }
  vendor(join(src, 'LICENSE'), `collections/${id}/LICENSE`);
  c.count = items.filter((i) => i.collection === id).length;
  c.categories = [...new Set(items.filter((i) => i.collection === id).flatMap((i) => i.categories))].map((s) => ({ slug: s, title: s }));
  collections.push(c);
}

/* 6 — zhuyansen: 333 security-graded skills, CC0 ----------------------------- */
{
  const id = 'zhuyansen-skills';
  const src = join(SRC, 'awesome-claude-video-skills');
  const c = { id, title: 'Awesome Claude Video Skills', repo: 'zhuyansen/awesome-claude-video-skills', license: 'CC0-1.0 (the list itself)', homepage: 'https://github.com/zhuyansen/awesome-claude-video-skills', kind: 'skill-index' };

  const data = existsSync(join(src, 'data/skills.json')) ? readJson(join(src, 'data/skills.json')) : null;
  if (data) {
    for (const s of data.skills || []) {
      add(c, {
        id: `skill-${slug(s.repo_full_name)}`,
        kind: 'skill',
        title: s.repo_full_name,
        summary: s.description || '',
        prompt: '',
        categories: ['skill', s.kind].filter(Boolean),
        tags: [s.kind, s.security_grade, s.language].filter(Boolean),
        source: `https://github.com/${s.repo_full_name}`,
        metrics: { stars: s.stars, license: s.license, security: s.security_grade },
      });
    }
    vendor(join(src, 'data/skills.json'), `collections/${id}/skills.json`);
    c.count = (data.skills || []).length;
    c.categories = (data.kinds || []).map((k) => ({ slug: k.id, title: k.en }));
  }
  collections.push(c);
}

/* 7 — PHY041: 233 catalogued works, 137 techniques, prompt patterns --------- */
{
  const id = 'phy-playbook';
  const src = join(SRC, 'claude-motion-playbook');
  const c = { id, title: 'Claude Motion Playbook', repo: 'PHY041/claude-motion-playbook', license: 'CC-BY-4.0', homepage: 'https://github.com/PHY041/claude-motion-playbook', kind: 'analysis' };

  const cat = existsSync(join(src, 'catalog/catalog.json')) ? readJson(join(src, 'catalog/catalog.json')) : [];
  for (const e of cat) {
    add(c, {
      id: `work-${e.id}`,
      kind: 'case',
      title: e.title,
      summary: e.summary_zh || '',
      prompt: '',
      categories: ['analysis', e.category].filter(Boolean),
      tags: [...(e.tags || []), e.kind].filter(Boolean),
      author: e.creator || '',
      source: e.post_url || e.entry_url || '',
      tools: e.stack_inferred ? [e.stack_inferred] : [],
      metrics: { duration: e.duration_s, aspect: e.aspect, promptType: e.prompt_type, promptChars: e.prompt_chars },
    });
  }
  vendor(join(src, 'catalog/catalog.json'), `collections/${id}/catalog.json`);
  vendor(join(src, 'LICENSE'), `collections/${id}/LICENSE`);
  for (const d of ['techniques', 'prompt-patterns', 'skills', 'ecosystem', 'top-picks']) {
    vendor(join(src, `docs/${d}.md`), `collections/${id}/${d}.md`);
  }
  c.count = cat.length;
  c.categories = [...new Set(cat.map((e) => e.category))].filter(Boolean).map((s) => ({ slug: slug(s), title: s }));
  collections.push(c);
}

/* 8 — guanmo-ai: 637 techniques, 1417 cases, MIT ---------------------------- */
{
  const id = 'guanmo-ai-motion';
  const src = join(SRC, 'awesome-ai-motion');
  const c = { id, title: 'Awesome AI Motion', repo: 'guanmo-ai/awesome-ai-motion', license: 'MIT', homepage: 'https://github.com/guanmo-ai/awesome-ai-motion', kind: 'technique-library' };

  const data = existsSync(join(src, 'data/cases.json')) ? readJson(join(src, 'data/cases.json')) : null;
  if (data) {
    for (const cs of data.cases || []) {
      const p = cs.prompt || {};
      add(c, {
        id: `case-${cs.id}`,
        kind: 'case',
        title: cs.titleEn || cs.title || cs.id,
        titleZh: cs.title || '',
        summary: cs.summaryEn || cs.summary || '',
        prompt: p.text || '',
        partial: p.status === 'brief' || !p.text,
        categories: ['case', cs.category].filter(Boolean),
        tags: [cs.stage, p.status, cs.model && cs.model.name].filter(Boolean),
        author: cs.author && (cs.author.name || cs.author.handle),
        source: cs.source && cs.source.url,
        metrics: cs.metrics ? { likes: cs.metrics.likes, views: cs.metrics.views } : {},
      });
    }
    vendor(join(src, 'data/cases.json'), `collections/${id}/cases.json`);
    vendor(join(src, 'index.json'), `collections/${id}/index.json`);
    vendor(join(src, 'LICENSE'), `collections/${id}/LICENSE`);
    c.count = (data.cases || []).length;
    c.categories = [...new Set(data.cases.map((x) => x.category))].filter(Boolean).map((s) => ({ slug: slug(s), title: s }));
  }
  collections.push(c);
}

/* 9 — lemo-opuscar: 60 film styles, already vendored in the plugin ---------- */
{
  const id = 'lemo-opuscar';
  const src = join(ROOT, 'plugins/motion-master/skills/lemo-opuscar');
  const c = { id, title: 'Lemo Opuscar — film styles made in code', repo: 'lemomo-ai/lemo-opuscar', license: 'MIT + CC BY 4.0', homepage: 'https://github.com/lemomo-ai/lemo-opuscar', kind: 'style-library' };

  const stylesDir = join(src, 'styles');
  if (existsSync(stylesDir)) {
    for (const e of readdirSync(stylesDir)) {
      const dir = join(stylesDir, e);
      if (!statSync(dir).isDirectory()) continue;
      const styleMd = join(dir, 'STYLE.md');
      if (!existsSync(styleMd)) continue;
      const name = e === '_template' ? 'template' : e;
      if (name === 'template') continue;
      const md = readText(styleMd);
      const title = (md.match(/^#\s+(.+)$/m) || [])[1] || name;
      // The style prompt is the block quote under the heading, or a fenced block.
      const prompt =
        (md.match(/```(?:text|markdown)?\n([\s\S]*?)```/) || [])[1] ||
        (md.match(/^>\s*(.+?)$/m) || [])[1] ||
        '';
      add(c, {
        id: `style-${slug(name)}`,
        kind: 'style',
        title,
        summary: clean(md.replace(/^#.*$/m, '').replace(/```[\s\S]*?```/g, ''), 280),
        prompt,
        categories: ['style-recipe', name].filter(Boolean),
        tags: [name, 'style'],
      });
      vendor(styleMd, `collections/${id}/styles/${name}.md`);
    }
    c.count = items.filter((i) => i.collection === id).length;
    c.categories = readdirSync(stylesDir)
      .filter((e) => e !== '_template' && statSync(join(stylesDir, e)).isDirectory())
      .map((e) => ({ slug: e, title: e }));
  }
  collections.push(c);
}

/* -------------------------------------------------------- HyperFrames blocks */
let blocks = [];
if (existsSync(HF_CATALOG)) {
  const raw = readJson(HF_CATALOG);
  const list = Array.isArray(raw) ? raw : raw.items || raw.results || [];
  blocks = list.map((b) => ({
    id: b.name,
    type: b.type,
    title: b.title || b.name,
    description: clean(b.description || '', 400),
    tags: (b.tags || []).map(slug),
    dimensions: b.dimensions || null,
    duration: b.duration || null,
    source: 'hyperframes catalog',
  }));
  writeJson('blocks.json', { generated: 'hyperframes catalog --json', version: '0.8.186', count: blocks.length, blocks });
}

/* ------------------------------------------------------------------ output */

const byKind = {};
for (const i of items) byKind[i.kind] = (byKind[i.kind] || 0) + 1;

const catCounts = new Map();
for (const i of items) for (const c2 of i.categories) catCounts.set(c2, (catCounts.get(c2) || 0) + 1);
for (const b of blocks) for (const t of b.tags) catCounts.set(t, (catCounts.get(t) || 0) + 1);

const catalogue = {
  generated: 'scripts/build-library.mjs',
  generator: 'hyperframes-catalog' in blocks ? 'hyperframes 0.8.186' : 'bundled',
  counts: {
    items: items.length,
    byKind,
    blocks: blocks.length,
    collections: collections.length,
    categories: catCounts.size,
  },
  collections: collections.map((c) => ({
    id: c.id,
    title: c.title,
    repo: c.repo,
    license: c.license,
    homepage: c.homepage,
    kind: c.kind,
    count: c.count ?? items.filter((i) => i.collection === c.id).length,
    categories: c.categories || [],
  })),
  categories: [...catCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([slug, count]) => ({ slug, count })),
  items,
};

writeJson('catalogue.json', catalogue);

console.log(
  `catalogue: ${items.length} items · ${collections.length} collections · ${catCounts.size} categories · ${blocks.length} blocks`
);
for (const c of collections) {
  console.log(`  ${c.id.padEnd(22)} ${String(c.count ?? 0).padStart(5)}  ${c.license}`);
}

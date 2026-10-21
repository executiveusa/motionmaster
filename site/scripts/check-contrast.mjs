/**
 * WCAG contrast check for the Motion Master page.
 *
 * Part 1 — every colour pair the design system actually uses, with the
 * threshold that applies to it.
 * Part 2 — every `color:` declaration found in the stylesheets, resolved
 * against the surface it sits on, so a colour can never drift into a
 * failing pair by accident.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteDir = dirname(dirname(fileURLToPath(import.meta.url)));
const stylesDir = join(siteDir, 'src', 'styles');

const hex = (value) => {
  const v = value.trim().replace('#', '');
  const full = v.length === 3 ? v.split('').map((c) => c + c).join('') : v;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
};

const luminance = (value) => {
  const [r, g, b] = hex(value).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const ratio = (a, b) => {
  const la = luminance(a);
  const lb = luminance(b);
  const light = Math.max(la, lb);
  const dark = Math.min(la, lb);
  return (light + 0.05) / (dark + 0.05);
};

const CANVAS = '#f4f4f2';
const SURFACE = '#ffffff';
const PLAYER = '#0e0e10';

const PAIRS = [
  { fg: '#111113', bg: CANVAS, min: 4.5, use: 'body text on the canvas' },
  { fg: '#111113', bg: SURFACE, min: 4.5, use: 'body text on a surface panel' },
  { fg: '#6b6b70', bg: CANVAS, min: 4.5, use: 'muted text on the canvas' },
  { fg: '#6b6b70', bg: SURFACE, min: 4.5, use: 'muted text on a surface panel' },
  { fg: '#c03412', bg: CANVAS, min: 4.5, use: 'darkened accent, small text on the canvas' },
  { fg: '#c03412', bg: SURFACE, min: 4.5, use: 'darkened accent, small text on a surface' },
  { fg: '#111113', bg: '#ff4a1c', min: 4.5, use: 'primary CTA label on the accent fill' },
  { fg: '#ffffff', bg: PLAYER, min: 4.5, use: 'player zone text' },
  { fg: '#9a9aa0', bg: PLAYER, min: 4.5, use: 'muted text in the player zone' },
  { fg: '#ff4a1c', bg: PLAYER, min: 4.5, use: 'accent text in the player zone' },
  { fg: '#e8e8ea', bg: PLAYER, min: 4.5, use: 'code text' },
  { fg: '#c8c8cc', bg: PLAYER, min: 4.5, use: 'code string' },
  { fg: '#ff8a5c', bg: PLAYER, min: 4.5, use: 'code keyword' },
  { fg: '#ff4a1c', bg: CANVAS, min: 3, use: 'accent as a non-text mark (8px square, progress line)' },
  { fg: '#ff4a1c', bg: SURFACE, min: 3, use: 'accent as a non-text mark on a surface' },
  { fg: '#8a8a8e', bg: CANVAS, min: 3, use: 'border of an interactive control' },
  { fg: '#8a8a8e', bg: SURFACE, min: 3, use: 'border of an interactive control on a surface' },
];

const DECORATIVE = [
  { fg: '#dddeda', bg: CANVAS, use: 'hairline rules and dividers (decorative, not a control boundary)' },
  { fg: '#2a2a2e', bg: PLAYER, use: 'hairline inside the player zone (decorative)' },
  { fg: '#55555c', bg: PLAYER, use: 'separator dot in the player caption (decorative)' },
  { fg: '#3a3a40', bg: PLAYER, use: 'inactive bar in the hero composition (decorative)' },
];

console.log('MOTION MASTER — WCAG contrast report\n');
console.log('text and non-text pairs');
console.log('-'.repeat(92));

let failures = 0;
for (const pair of PAIRS) {
  const value = ratio(pair.fg, pair.bg);
  const ok = value >= pair.min;
  if (!ok) failures += 1;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${value.toFixed(2).padStart(5)}:1  (min ${pair.min})  ${pair.fg} on ${pair.bg}  — ${pair.use}`,
  );
}

console.log('\ndecorative rules (exempt: they are not the only way to identify a control)');
console.log('-'.repeat(92));
for (const pair of DECORATIVE) {
  console.log(
    `note  ${ratio(pair.fg, pair.bg).toFixed(2).padStart(5)}:1         ${pair.fg} on ${pair.bg}  — ${pair.use}`,
  );
}

/* ---- resolve the stylesheets -------------------------------------------- */

const files = readdirSync(stylesDir).filter((f) => f.endsWith('.css'));
const css = files.map((f) => readFileSync(join(stylesDir, f), 'utf8')).join('\n');

const vars = {};
const rootBlock = css.match(/:root\s*{([\s\S]*?)}/);
if (rootBlock) {
  for (const match of rootBlock[1].matchAll(/--([\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})/g)) {
    vars[match[1]] = match[2].toLowerCase();
  }
}

const resolve = (value) => {
  const trimmed = value.trim();
  if (trimmed.startsWith('#')) return trimmed.toLowerCase();
  const varMatch = trimmed.match(/^var\(--([\w-]+)\)$/);
  if (varMatch) return vars[varMatch[1]] ?? null;
  return null;
};

const DARK_CONTEXT = /(player|stage__|\.code|clip__state|clip__toggle|clip__video|install__command)/;

const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
  selector: m[1].trim().split('\n').pop().trim(),
  body: m[2],
}));

console.log('\nresolved `color:` declarations in the stylesheets');
console.log('-'.repeat(92));

for (const rule of rules) {
  if (rule.selector.startsWith(':root') || rule.selector.startsWith('@')) continue;
  const colorMatch = rule.body.match(/(?:^|;)\s*color\s*:\s*([^;]+);/);
  if (!colorMatch) continue;
  const fg = resolve(colorMatch[1]);
  if (!fg) continue;
  const sizeMatch = rule.body.match(/font-size\s*:\s*([^;]+);/);
  const size = sizeMatch ? parseFloat(sizeMatch[1]) : 17;
  const weightMatch = rule.body.match(/font-weight\s*:\s*(\d+)/);
  const weight = weightMatch ? Number(weightMatch[1]) : 400;
  const isLarge = size >= 24 || (size >= 18.66 && weight >= 700);
  const ownBackground =
    rule.body.match(/background(?:-color)?\s*:\s*([^;]+);/) ??
    rule.body.match(/background\s*:\s*([^;]+);/);
  const own = ownBackground ? resolve(ownBackground[1].split(' ')[0]) : null;
  const dark = DARK_CONTEXT.test(rule.selector);
  const bg = own ?? (dark ? PLAYER : CANVAS);
  const min = isLarge ? 3 : 4.5;
  const value = ratio(fg, bg);
  const ok = value >= min;
  if (!ok) failures += 1;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${value.toFixed(2).padStart(5)}:1  (min ${min})  ${fg} on ${bg}  ${rule.selector} { color: ${colorMatch[1].trim()} }`,
  );
}

console.log('');
if (failures) {
  console.error(`FAILED: ${failures} pair(s) below the WCAG AA threshold`);
  process.exit(1);
}
console.log('OK — every text pair clears WCAG AA (4.5:1) and every non-text pair clears 3:1');

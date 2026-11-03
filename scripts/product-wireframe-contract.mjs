#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const html = readFileSync(resolve(import.meta.dirname, '..', 'site', 'dist', 'index.html'), 'utf8');
const failures = [];
const requireText = (value, label) => { if (!html.includes(value)) failures.push(label); };

const ids = ['top','proof','console','library','agents','docs'];
for (const id of ids) requireText(`id="${id}"`, `missing #${id}`);

const nav = [
  ['#proof','Examples'],
  ['#console','Create'],
  ['#library','Library'],
  ['#agents','MCP / Plugins'],
  ['#docs','Docs'],
];
for (const [href,label] of nav) {
  requireText(`href="${href}"`, `navigation has no ${label} target`);
}
for (const control of [
  'data-example-search',
  'data-example-filter="all"',
  'data-start-prompt',
  'data-console-signin',
  'data-console-send',
  'data-project-editor',
  'data-copy-agent',
]) requireText(control, `missing wired control ${control}`);

requireText('Create Motion', 'approved hero headline missing');
requireText('Videos For Your', 'approved hero headline line 2 missing');
requireText('Brand Today', 'approved hero headline line 3 missing');
requireText('Private preview · Not on sale.', 'private sale disclosure missing');

if (/href="#pricing"|id="pricing"/.test(html)) failures.push('pricing surface returned while onSale=false');
if (/feTurbulence|feDisplacementMap|id="wobble"/.test(html)) failures.push('wavy hero filter returned');
if (/data-buy\s*=/.test(html)) failures.push('purchase affordance present');

if (failures.length) {
  console.error('PRODUCT WIREFRAME CONTRACT FAIL');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}
console.log('PASS product wireframe contract: discover → create → edit → export → agents, no pricing/wavy-line regression');

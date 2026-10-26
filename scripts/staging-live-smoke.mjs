#!/usr/bin/env node
/**
 * Read-only probe for an ALREADY deployed owner-controlled staging origin.
 * Never follows redirects or prints bearer tokens, responses or project data.
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function validateStagingOrigin(value, { allowLoopbackFixture = false } = {}) {
  if (typeof value !== 'string' || !value || value !== value.trim() || value.includes('*')) {
    throw new Error('An exact private staging origin is required.');
  }
  let url;
  try { url = new URL(value); } catch { throw new Error('Invalid staging origin.'); }
  const loopback = ['127.0.0.1', '[::1]', 'localhost'].includes(url.hostname);
  if (url.origin !== value || url.username || url.password || url.search || url.hash ||
      (url.protocol !== 'https:' && !(allowLoopbackFixture && loopback && url.protocol === 'http:')) ||
      (!allowLoopbackFixture && loopback) ||
      url.hostname === 'motionmaster-private-preview.vercel.app') {
    throw new Error('Staging requires an exact private HTTPS origin, not a public preview or URL path.');
  }
  return url.origin;
}

export async function probeStaging({ origin, key, fetchImpl = fetch, allowLoopbackFixture = false }) {
  const checks = [];
  const check = (name, pass) => checks.push({ name, pass: Boolean(pass) });
  let base = '';
  try { base = validateStagingOrigin(origin, { allowLoopbackFixture }); }
  catch { check('exact-private-https-origin', false); }
  if (base) check('exact-private-https-origin', true);
  const validKey = typeof key === 'string' && key.trim().length >= 32 && key === key.trim();
  check('owner-bearer-present', validKey);
  const unverified = [
    'Owner-approved host and access-layer ownership',
    'Persistent encrypted storage and off-host backups',
    'Hosted restart, restore and rollback',
    'Ten consecutive browser-to-worker renders',
    'Actual Codex and Claude MCP host invocation',
    'Independent design, accessibility, security, asset rights and human approval',
  ];
  if (!base || !validKey) return { status: 'blocked', checks, unverified };

  // GET only. Redirects are never followed, so the bearer cannot be forwarded.
  async function get(path, headers = {}) {
    try {
      const response = await fetchImpl(base + path, {
        method: 'GET', redirect: 'manual', cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
        headers: { accept: 'application/json', ...headers },
      });
      const isJson = (response.headers.get('content-type') ?? '').includes('application/json');
      let data = null;
      if (isJson && response.ok) {
        try { data = await response.json(); } catch { /* invalid response */ }
      }
      return { status: response.status, isJson, data, headers: response.headers, redirected: response.redirected };
    } catch { return { status: 0, isJson: false, data: null, headers: new Headers(), redirected: false }; }
  }
  const bearer = { authorization: 'Bearer ' + key };
  const wrongKey = key === 'MM-NEGATIVE-PROBE-NOT-A-SECRET' ? key + '-wrong' : 'MM-NEGATIVE-PROBE-NOT-A-SECRET';
  const health = await get('/health');
  check('minimal-public-health', health.status === 200 && health.isJson && !health.redirected &&
    health.data?.name === 'motion-master' && health.data?.status === 'ok' &&
    typeof health.data?.version === 'string' &&
    JSON.stringify(Object.keys(health.data).sort()) === JSON.stringify(['name', 'status', 'version']));
  const anonymous = await get('/api/v1/projects');
  check('anonymous-project-list-denied', anonymous.status === 401 && !anonymous.redirected);
  const invalid = await get('/api/v1/projects', { authorization: 'Bearer ' + wrongKey });
  check('incorrect-bearer-denied', invalid.status === 401 && !invalid.redirected);
  const projects = await get('/api/v1/projects', bearer);
  check('authenticated-project-list', projects.status === 200 && projects.isJson &&
    Array.isArray(projects.data) && !projects.redirected);
  const licence = await get('/api/v1/licence', bearer);
  check('sale-disabled-on-host', licence.status === 200 && licence.isJson &&
    licence.data?.status?.onSale === false && !licence.redirected);
  const approved = await get('/api/v1/projects', { ...bearer, origin: base });
  check('exact-approved-browser-origin', approved.status === 200 &&
    approved.headers.get('access-control-allow-origin') === base &&
    /(?:^|,\s*)origin(?:,|$)/i.test(approved.headers.get('vary') ?? '') && !approved.redirected);
  const foreignOrigin = 'https://unapproved-motion-master.invalid';
  const foreign = await get('/api/v1/projects', { ...bearer, origin: foreignOrigin });
  check('unapproved-browser-origin-denied', foreign.status === 403 &&
    foreign.headers.get('access-control-allow-origin') !== foreignOrigin && !foreign.redirected);
  return { status: checks.every((item) => item.pass) ? 'read-only-http-smoke-passed-not-released' : 'blocked',
    checks, unverified };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await probeStaging({ origin: process.env.MOTION_MASTER_STAGING_ORIGIN,
    key: process.env.MOTION_MASTER_API_KEY });
  console.log(JSON.stringify(result, null, 2));
  if (result.status === 'blocked') process.exitCode = 1;
}

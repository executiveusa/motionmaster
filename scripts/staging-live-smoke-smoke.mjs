#!/usr/bin/env node
/** Disposable real-HTTP tests; never touches staging or real credentials. */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { probeStaging, validateStagingOrigin } from './staging-live-smoke.mjs';

const secret = 'TEST-ONLY-NEVER-A-REAL-SECRET-0123456789';
const config = { noAuth: false, saleOn: false, wildcardCors: false, healthLeak: false, redirect: false };
const seen = [];
const server = createServer((req, res) => {
  seen.push(req.method);
  if (config.redirect) { res.writeHead(302, { location: 'https://unapproved-motion-master.invalid/' }); res.end(); return; }
  const origin = req.headers.origin;
  const approved = !origin || origin === 'http://127.0.0.1:' + server.address().port;
  const headers = { 'content-type': 'application/json', vary: 'Origin',
    'access-control-allow-origin': config.wildcardCors ? '*' : 'http://127.0.0.1:' + server.address().port };
  const json = (status, data) => { res.writeHead(status, headers); res.end(JSON.stringify(data)); };
  if (req.url === '/health') {
    json(200, { name: 'motion-master', version: '1.0.0', status: 'ok',
      ...(config.healthLeak ? { repoRoot: '/sensitive/path' } : {}) });
  } else if (!approved) json(403, { error: 'origin denied' });
  else if (!config.noAuth && req.headers.authorization !== 'Bearer ' + secret) json(401, { error: 'auth required' });
  else if (req.url === '/api/v1/projects') json(200, [{ id: 'fixture-private-project' }]);
  else if (req.url === '/api/v1/licence') json(200, { status: { onSale: config.saleOn } });
  else json(404, { error: 'not found' });
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
try {
  const origin = 'http://127.0.0.1:' + server.address().port;
  const run = () => probeStaging({ origin, key: secret, allowLoopbackFixture: true });
  const good = await run();
  assert.equal(good.status, 'read-only-http-smoke-passed-not-released', JSON.stringify(good.checks));
  assert.ok(good.checks.every((item) => item.pass));
  assert.ok(seen.every((method) => method === 'GET'), 'probe must be read-only');
  assert.ok(!JSON.stringify(good).includes(secret), 'never print secrets');
  assert.ok(!JSON.stringify(good).includes('fixture-private-project'), 'never print project records');
  for (const [flag, failingCheck] of [
    ['noAuth', 'anonymous-project-list-denied'],
    ['saleOn', 'sale-disabled-on-host'],
    ['wildcardCors', 'exact-approved-browser-origin'],
    ['healthLeak', 'minimal-public-health'],
    ['redirect', 'minimal-public-health'],
  ]) {
    config[flag] = true;
    const bad = await run();
    assert.equal(bad.status, 'blocked', flag);
    assert.equal(bad.checks.find((item) => item.name === failingCheck)?.pass, false, flag);
    config[flag] = false;
  }
  assert.equal((await probeStaging({ origin, key: 'short', allowLoopbackFixture: true })).status, 'blocked');
  for (const bad of ['http://staging.example.test', 'https://staging.example.test/path',
    'https://user:pass@staging.example.test', 'https://motionmaster-private-preview.vercel.app',
    'http://127.0.0.1:8787']) {
    assert.throws(() => validateStagingOrigin(bad), /origin|Staging/i, bad);
  }
  console.log('PASS: read-only real-HTTP staging probe, bearer isolation, strict origin, sale-off, no redirect, no sensitive output');
} finally { await new Promise((done) => server.close(done)); }

#!/usr/bin/env node
/** Isolated negative/positive tests. No real host, credentials or deployment. */
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { auditStaging } from './staging-preflight.mjs';

const root = mkdtempSync(join(tmpdir(), 'mm-preflight-'));
const key = 'TEST-ONLY-NEVER-A-REAL-SECRET-0123456789';
const env = {
  MOTION_MASTER_REPO_ROOT: root,
  MOTION_MASTER_MCP_HOST: '127.0.0.1',
  MOTION_MASTER_MCP_PORT: '8787',
  MOTION_MASTER_RENDER_WORKER: '1',
  MOTION_MASTER_API_KEY: key,
  MOTION_MASTER_ALLOWED_ORIGINS: 'https://staging.example.test',
  MOTION_MASTER_MCP_URL_PUBLIC: 'https://staging.example.test/mcp',
};
const expectFailure = (change, name) => {
  const result = auditStaging({ ...env, ...change }, root);
  assert.equal(result.status, 'blocked', name);
  assert.equal(result.checks.find((c) => c.name === name)?.pass, false, name);
  assert.ok(!JSON.stringify(result).includes(key), 'secret must never appear in report');
};
try {
  mkdirSync(join(root, 'site', 'dist'), { recursive: true });
  mkdirSync(join(root, 'mcp', 'dist'), { recursive: true });
  mkdirSync(join(root, 'workspace'), { mode: 0o700 });
  writeFileSync(join(root, 'site', 'dist', 'index.html'), '<html></html>');
  writeFileSync(join(root, 'mcp', 'dist', 'index.js'), '');
  writeFileSync(join(root, 'licence.json'), JSON.stringify({ status: { onSale: false } }));
  const good = auditStaging(env, root);
  assert.equal(good.status, 'preflight-passed-not-deployed', JSON.stringify(good.checks));
  assert.ok(good.unverified.length >= 5);
  assert.ok(!JSON.stringify(good).includes(key));
  expectFailure({ MOTION_MASTER_API_KEY: '' }, 'server-bearer-configured');
  expectFailure({ MOTION_MASTER_API_KEY: 'short' }, 'server-bearer-configured');
  expectFailure({ MOTION_MASTER_MCP_HOST: '0.0.0.0' }, 'loopback-only-api-listener');
  expectFailure({ MOTION_MASTER_RENDER_WORKER: '0' }, 'worker-explicitly-enabled');
  expectFailure({ MOTION_MASTER_ALLOWED_ORIGINS: '*' }, 'exact-private-https-origin-allowlist');
  expectFailure({ MOTION_MASTER_ALLOWED_ORIGINS: 'http://staging.example.test' }, 'exact-private-https-origin-allowlist');
  expectFailure({ MOTION_MASTER_ALLOWED_ORIGINS: 'https://staging.example.test/path' }, 'exact-private-https-origin-allowlist');
  expectFailure({ MOTION_MASTER_ALLOWED_ORIGINS: 'https://staging.example.test,https://staging.example.test' }, 'exact-private-https-origin-allowlist');
  expectFailure({ MOTION_MASTER_MCP_URL_PUBLIC: 'http://staging.example.test/mcp' }, 'private-https-mcp-endpoint');
  expectFailure({ MOTION_MASTER_MCP_URL_PUBLIC: 'https://motionmaster-private-preview.vercel.app/mcp' }, 'private-https-mcp-endpoint');
  expectFailure({ MOTION_MASTER_MCP_PORT: '0' }, 'valid-explicit-port');
  expectFailure({ MOTION_MASTER_REPO_ROOT: '/tmp/wrong-release' }, 'absolute-pinned-release-root');
  chmodSync(join(root, 'workspace'), 0o755);
  expectFailure({}, 'workspace-real-private-owned-directory');
  chmodSync(join(root, 'workspace'), 0o700);
  writeFileSync(join(root, 'licence.json'), JSON.stringify({ status: { onSale: true } }));
  expectFailure({}, 'sale-disabled');
  console.log('PASS: staging preflight blocks unsafe listener, missing auth, bad origins, public endpoint, wrong root, permissions and sale activation');
} finally { rmSync(root, { recursive: true, force: true }); }

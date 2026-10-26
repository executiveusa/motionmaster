#!/usr/bin/env node
/**
 * Fail-closed, read-only preflight for an owner-controlled PRIVATE staging host.
 * This does not deploy, inspect encryption, establish network privacy or
 * prove a backup. It intentionally never prints secrets or user data.
 */
import { existsSync, lstatSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const isWithin = (parent, child) => child === parent || child.startsWith(parent + sep);
const realDirectory = (path) => existsSync(path) && !lstatSync(path).isSymbolicLink() && lstatSync(path).isDirectory();
const realFile = (path) => existsSync(path) && !lstatSync(path).isSymbolicLink() && lstatSync(path).isFile();

function exactHttpsOrigin(value) {
  if (!value || value.includes('*')) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.origin === value &&
      url.username === '' && url.password === '' &&
      !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  } catch { return false; }
}

export function auditStaging(env = process.env, root = env.MOTION_MASTER_REPO_ROOT) {
  const checks = [];
  const check = (name, ok) => checks.push({ name, pass: Boolean(ok) });
  const declared = typeof root === 'string' && isAbsolute(root) ? resolve(root) : '';
  const configured = typeof env.MOTION_MASTER_REPO_ROOT === 'string' && isAbsolute(env.MOTION_MASTER_REPO_ROOT)
    ? resolve(env.MOTION_MASTER_REPO_ROOT) : '';
  check('absolute-pinned-release-root', Boolean(declared && configured && declared === configured && realDirectory(declared)));

  const site = declared ? join(declared, 'site', 'dist') : '';
  const workspace = declared ? join(declared, 'workspace') : '';
  check('built-site-and-mcp-present', Boolean(declared &&
    realFile(join(declared, 'site', 'dist', 'index.html')) &&
    realFile(join(declared, 'mcp', 'dist', 'index.js'))));
  check('workspace-real-private-owned-directory', Boolean(workspace && realDirectory(workspace) &&
    (statSync(workspace).mode & 0o077) === 0 &&
    (typeof process.getuid !== 'function' || statSync(workspace).uid === process.getuid())));
  let distinct = false;
  if (workspace && site && realDirectory(workspace) && realDirectory(site)) {
    const actualWorkspace = realpathSync(workspace);
    const actualSite = realpathSync(site);
    distinct = !isWithin(actualSite, actualWorkspace) && !isWithin(actualWorkspace, actualSite);
  }
  check('workspace-outside-served-site', distinct);

  let saleOff = false;
  if (declared && realFile(join(declared, 'licence.json'))) {
    try { saleOff = JSON.parse(readFileSync(join(declared, 'licence.json'), 'utf8')).status?.onSale === false; }
    catch { saleOff = false; }
  }
  check('sale-disabled', saleOff);
  check('loopback-only-api-listener', ['127.0.0.1', '::1'].includes(env.MOTION_MASTER_MCP_HOST));
  check('worker-explicitly-enabled', env.MOTION_MASTER_RENDER_WORKER === '1');
  check('server-bearer-configured', typeof env.MOTION_MASTER_API_KEY === 'string' &&
    env.MOTION_MASTER_API_KEY.trim().length >= 32);
  check('valid-explicit-port', /^(?:[1-9]\d{0,4})$/.test(env.MOTION_MASTER_MCP_PORT ?? '') &&
    Number(env.MOTION_MASTER_MCP_PORT) <= 65535);

  const origins = (env.MOTION_MASTER_ALLOWED_ORIGINS ?? '').split(',').map((v) => v.trim());
  check('exact-private-https-origin-allowlist', origins.length > 0 && origins.length <= 3 &&
    new Set(origins).size === origins.length && origins.every(exactHttpsOrigin));
  let publicMcp = false;
  try {
    const value = env.MOTION_MASTER_MCP_URL_PUBLIC ?? '';
    const url = new URL(value);
    publicMcp = exactHttpsOrigin(url.origin) && url.pathname === '/mcp' &&
      !url.search && !url.hash && !url.username && !url.password &&
      !value.includes('motionmaster-private-preview.vercel.app');
  } catch { /* missing or invalid URL */ }
  check('private-https-mcp-endpoint', publicMcp);

  return {
    status: checks.every((c) => c.pass) ? 'preflight-passed-not-deployed' : 'blocked',
    checks,
    // These are intentionally never represented as automated passes.
    unverified: [
      'Owner approval of host, domain and staging deployment',
      'Private HTTPS proxy and external network access controls',
      'Durable encrypted workspace mount and encrypted off-host backup',
      'Restore and rollback on the actual host',
      'Ten hosted browser-to-renderer journeys and live Codex/Claude MCP calls',
      'Independent design, accessibility, security, licence and user review',
    ],
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = auditStaging();
  console.log(JSON.stringify(result, null, 2));
  if (result.status === 'blocked') process.exitCode = 1;
}

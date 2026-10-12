#!/usr/bin/env node
'use strict';

/**
 * Cloudflare Tunnel bootstrap for djjessejay.ch origin protection.
 *
 * Implements the contract in ORIGIN-PROTECTION-DEPLOYMENT.md:
 *   - plan-only by default; Cloudflare is mutated only with --apply
 *   - existing DNS records are never overwritten
 *   - an existing tunnel with the configured name is reused; duplicates are refused
 *   - ingress always ends with a catch-all http_status:404 rule
 *   - the hostname is a proxied CNAME to <tunnel-id>.cfargotunnel.com
 *   - the tunnel hostname is restricted to the Worker by a service-token-only Access app
 *   - human Access (--access) is only attached to a dedicated hostname, never to the public site
 *   - a failed apply rolls back DNS records and a tunnel created by this run
 *   - the tunnel token is never requested or printed
 *
 * Environment:
 *   CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_ZONE_ID   (required)
 *   CF_PUBLIC_HOSTNAME   hostname routed through the tunnel, e.g. origin.djjessejay.ch (required)
 *   CF_ORIGIN_SERVICE    default http://127.0.0.1:3000
 *   CF_TUNNEL_NAME       default djjessejay-origin
 *   CF_ORIGIN_ACCESS_SERVICE_TOKEN_ID  ID of the Access service token the wdjjj Worker uses;
 *                        the tunnel hostname gets an Access app that admits only this token
 *                        (required unless --allow-public-origin)
 *   CF_ACCESS_HOSTNAME   dedicated Access hostname (required with --access)
 *   CF_ACCESS_EMAILS     comma-separated allow-list (required with --access)
 *
 * Usage:
 *   node scripts/cloudflare-tunnel-setup.js            # plan only
 *   node scripts/cloudflare-tunnel-setup.js --apply    # create / reconcile
 *   node scripts/cloudflare-tunnel-setup.js --apply --access
 */

const API_BASE = 'https://api.cloudflare.com/client/v4';
const PUBLIC_SITE_HOSTS = ['djjessejay.ch', 'www.djjessejay.ch'];

function parseArgs(argv) {
  const known = new Set(['--apply', '--access', '--allow-public-origin']);
  const unknown = argv.filter((a) => !known.has(a));
  if (unknown.length) throw new Error(`Unknown argument(s): ${unknown.join(' ')}`);
  return { apply: argv.includes('--apply'), access: argv.includes('--access'), allowPublicOrigin: argv.includes('--allow-public-origin') };
}

const HOSTNAME_RE = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

/** Accepts only scheme://host[:port], so no credentials or paths can reach logs or the tunnel config. */
function parseOriginService(raw, errors) {
  const value = String(raw).trim();
  let u;
  try { u = new URL(value); } catch { errors.push('CF_ORIGIN_SERVICE is not a valid URL'); return ''; }
  if (!['http:', 'https:'].includes(u.protocol)) errors.push('CF_ORIGIN_SERVICE must use http or https');
  if (u.username || u.password) errors.push('CF_ORIGIN_SERVICE must not contain credentials');
  if ((u.pathname && u.pathname !== '/') || u.search || u.hash) errors.push('CF_ORIGIN_SERVICE must not contain a path, query or fragment');
  return `${u.protocol}//${u.host}`;
}

function readConfig(env, flags) {
  const errors = [];
  for (const key of ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_ZONE_ID', 'CF_PUBLIC_HOSTNAME']) {
    if (!env[key]) errors.push(`Missing ${key}`);
  }
  const publicHostname = (env.CF_PUBLIC_HOSTNAME || '').trim().toLowerCase();
  if (publicHostname && !HOSTNAME_RE.test(publicHostname)) errors.push(`CF_PUBLIC_HOSTNAME is not a valid hostname: ${publicHostname}`);
  else if (PUBLIC_SITE_HOSTS.includes(publicHostname)) {
    errors.push(`Refusing ${publicHostname} as tunnel hostname: the public site must stay behind the wdjjj Worker`);
  }

  const originService = parseOriginService(env.CF_ORIGIN_SERVICE || 'http://127.0.0.1:3000', errors);

  const cfg = {
    token: env.CLOUDFLARE_API_TOKEN,
    accountId: env.CLOUDFLARE_ACCOUNT_ID,
    zoneId: env.CLOUDFLARE_ZONE_ID,
    publicHostname,
    originService,
    tunnelName: (env.CF_TUNNEL_NAME || 'djjessejay-origin').trim(),
    access: null,
    originTokenId: null,
  };

  // The tunnel hostname must only be reachable by the wdjjj Worker. Access with a
  // service-token-only policy enforces that at the Cloudflare edge.
  const tokenId = (env.CF_ORIGIN_ACCESS_SERVICE_TOKEN_ID || '').trim();
  if (tokenId) {
    if (!/^[0-9a-f-]{32,36}$/i.test(tokenId)) errors.push('CF_ORIGIN_ACCESS_SERVICE_TOKEN_ID must be the service token ID (UUID), not the client secret');
    cfg.originTokenId = tokenId;
  } else if (!flags.allowPublicOrigin) {
    errors.push('Missing CF_ORIGIN_ACCESS_SERVICE_TOKEN_ID: the tunnel hostname must be restricted to the Worker (or pass --allow-public-origin explicitly)');
  }

  if (flags.access) {
    const host = (env.CF_ACCESS_HOSTNAME || '').trim().toLowerCase();
    const emails = (env.CF_ACCESS_EMAILS || '').split(',').map((e) => e.trim()).filter(Boolean);
    if (!host) errors.push('--access requires CF_ACCESS_HOSTNAME');
    else if (!HOSTNAME_RE.test(host)) errors.push(`CF_ACCESS_HOSTNAME is not a valid hostname: ${host}`);
    else if (host === publicHostname || PUBLIC_SITE_HOSTS.includes(host)) {
      errors.push(`Refusing to attach Access to ${host}: Access needs a dedicated hostname, not the public site or the tunnel hostname`);
    }
    if (!emails.length) errors.push('--access requires CF_ACCESS_EMAILS');
    const bad = emails.filter((e) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
    if (bad.length) errors.push(`Invalid e-mail(s) in CF_ACCESS_EMAILS: ${bad.join(', ')}`);
    cfg.access = { hostname: host, emails };
  }

  if (errors.length) {
    const err = new Error(errors.join('\n'));
    err.configErrors = errors;
    throw err;
  }
  return cfg;
}

function makeApi(token, fetchImpl = globalThis.fetch) {
  return async function api(method, path, body) {
    const res = await fetchImpl(`${API_BASE}${path}`, {
      method,
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let json;
    try { json = await res.json(); } catch { throw new Error(`${method} ${path}: HTTP ${res.status}, response is not JSON`); }
    if (!json.success) {
      const msg = (json.errors || []).map((e) => `${e.code}: ${e.message}`).join('; ') || `HTTP ${res.status}`;
      throw new Error(`${method} ${path}: ${msg}`);
    }
    return json.result;
  };
}

/** Ingress rules: one per hostname, then the mandatory catch-all. */
function buildIngress(hostnames, service) {
  return [...hostnames.map((hostname) => ({ hostname, service })), { service: 'http_status:404' }];
}

/**
 * Merges our hostnames into an existing remote tunnel config. Keeps every other key
 * (originRequest, warp-routing, ...) and every rule that is not ours, including
 * path-only rules. Our host-only rule is replaced in place so it keeps its precedence;
 * missing ones are added before the single http_status:404 catch-all at the end.
 */
function mergeTunnelConfig(existing, hostnames, service) {
  const base = existing && typeof existing === 'object' ? JSON.parse(JSON.stringify(existing)) : {};
  const rules = Array.isArray(base.ingress) ? base.ingress : [];
  const isCatchAll = (r) => r && !r.hostname && !r.path;
  const isOurs = (r) => r && hostnames.includes(r.hostname) && !r.path;
  const placed = new Set();
  const out = [];
  for (const r of rules) {
    if (isCatchAll(r)) continue;
    if (isOurs(r)) {
      if (placed.has(r.hostname)) continue; // drop duplicates of our rule
      placed.add(r.hostname);
      out.push({ ...r, service });
      continue;
    }
    out.push(r);
  }
  // A missing exact rule goes in front of the first host-only rule that would otherwise
  // match it (e.g. *.djjessejay.ch), so cloudflared's first-match evaluation picks ours.
  for (const h of hostnames) {
    if (placed.has(h)) continue;
    const shadow = out.findIndex((r) => r.hostname && !r.path && hostMatches(r.hostname, h));
    const rule = { hostname: h, service };
    if (shadow === -1) out.push(rule); else out.splice(shadow, 0, rule);
  }
  out.push({ service: 'http_status:404' });
  base.ingress = out;
  return base;
}

/** cloudflared hostname matching: exact, or a leading "*." wildcard for subdomains. */
function hostMatches(pattern, host) {
  if (pattern === host) return true;
  return pattern.startsWith('*.') && host.endsWith(pattern.slice(1));
}

/** True when the policies are exactly one non_identity policy for exactly this service token. */
function serviceTokenPolicyMatches(policies, tokenId) {
  if (!Array.isArray(policies) || policies.length !== 1) return false;
  const p = policies[0];
  if (p.decision !== 'non_identity' || (p.exclude && p.exclude.length) || (p.require && p.require.length)) return false;
  const inc = Array.isArray(p.include) ? p.include : [];
  return inc.length === 1 && Boolean(inc[0] && inc[0].service_token) && inc[0].service_token.token_id === tokenId;
}

/** An existing Access app may only be reused if it protects exactly this hostname, without overrides. */
function accessAppIsStrict(app, hostname) {
  if (!app || app.type !== 'self_hosted') return false;
  if (app.domain !== hostname) return false;
  const doms = Array.isArray(app.self_hosted_domains) ? app.self_hosted_domains : [];
  if (doms.some((d) => d !== hostname)) return false;
  const dests = Array.isArray(app.destinations) ? app.destinations : [];
  if (dests.some((d) => d.type !== 'public' || d.uri !== hostname)) return false;
  return true;
}

/** Reads every page of a paginated list endpoint (path must already contain a query string). */
async function listAll(api, path, perPage = 50) {
  const all = [];
  for (let page = 1; page <= 100; page++) {
    const items = await api('GET', `${path}&per_page=${perPage}&page=${page}`);
    all.push(...items);
    if (items.length < perPage) return all;
  }
  throw new Error(`${path}: more than 100 pages, refusing to continue`);
}

/** True when an Access app's policies are exactly one allow policy for exactly these e-mails. */
function accessPolicyMatches(policies, emails) {
  if (!Array.isArray(policies) || policies.length !== 1) return false;
  const p = policies[0];
  if (p.decision !== 'allow' || (p.exclude && p.exclude.length) || (p.require && p.require.length)) return false;
  const inc = Array.isArray(p.include) ? p.include : [];
  if (!inc.every((i) => i && i.email && typeof i.email.email === 'string')) return false;
  const got = [...new Set(inc.map((i) => i.email.email.toLowerCase()))].sort();
  const want = [...new Set(emails.map((e) => e.toLowerCase()))].sort();
  return got.length === want.length && got.every((e, i) => e === want[i]);
}

/** Classifies an existing DNS state for a hostname against the expected tunnel CNAME. */
function classifyDns(records, target) {
  if (!records.length) return { state: 'missing' };
  const ok = records.length === 1 && records[0].type === 'CNAME' && records[0].content === target && records[0].proxied === true;
  return ok ? { state: 'ok', id: records[0].id } : { state: 'conflict', records };
}

async function run(cfg, flags, api, log = console.log) {
  const mode = flags.apply ? 'APPLY' : 'PLAN';
  log(`Cloudflare Tunnel setup (${mode})`);
  const hostnames = [cfg.publicHostname, ...(cfg.access ? [cfg.access.hostname] : [])];

  // Phase 1: read and validate everything. No mutation happens before this phase passes.
  const zone = await api('GET', `/zones/${cfg.zoneId}`);
  if (zone.status !== 'active') throw new Error(`Zone ${zone.name} is not active (status: ${zone.status})`);
  if (!zone.account || zone.account.id !== cfg.accountId) {
    throw new Error(`Zone ${zone.name} does not belong to CLOUDFLARE_ACCOUNT_ID; a tunnel CNAME only works within the same account`);
  }
  for (const h of hostnames) {
    if (h !== zone.name && !h.endsWith(`.${zone.name}`)) throw new Error(`${h} is not inside zone ${zone.name}`);
  }
  log(`  zone ${zone.name}: active`);

  const tunnels = await api('GET', `/accounts/${cfg.accountId}/cfd_tunnel?name=${encodeURIComponent(cfg.tunnelName)}&is_deleted=false`);
  if (tunnels.length > 1) throw new Error(`Found ${tunnels.length} active tunnels named ${cfg.tunnelName}; resolve the duplicates first`);
  const reused = tunnels[0] || null;
  if (reused && reused.remote_config === false) throw new Error(`Tunnel ${cfg.tunnelName} is locally managed; expected config_src=cloudflare`);
  let snapshot = null;
  if (reused) {
    const conf = await api('GET', `/accounts/${cfg.accountId}/cfd_tunnel/${reused.id}/configurations`);
    snapshot = (conf && conf.config) || {};
    log(`  tunnel ${cfg.tunnelName}: reuse ${reused.id}`);
  } else {
    log(`  tunnel ${cfg.tunnelName}: ${flags.apply ? 'will create' : 'would create'}`);
  }

  const target = reused ? `${reused.id}.cfargotunnel.com` : null;
  const dnsToCreate = [];
  for (const name of hostnames) {
    const records = await api('GET', `/zones/${cfg.zoneId}/dns_records?name=${encodeURIComponent(name)}`);
    const s = target ? classifyDns(records, target) : (records.length ? { state: 'conflict', records } : { state: 'missing' });
    if (s.state === 'conflict') {
      const desc = s.records.map((r) => `${r.type} ${r.proxied ? 'proxied' : 'dns-only'}`).join(', ');
      throw new Error(`DNS ${name} already exists (${desc}); refusing to overwrite. Remove or change it explicitly first.`);
    }
    if (s.state === 'missing') dnsToCreate.push(name);
    log(`  dns ${name}: ${s.state === 'ok' ? 'ok' : (flags.apply ? 'will create proxied CNAME' : 'would create proxied CNAME')}`);
  }

  const accessSpecs = [];
  if (cfg.originTokenId) {
    accessSpecs.push({
      hostname: cfg.publicHostname, appName: `${cfg.tunnelName}-worker-only`, what: 'service token (Worker only)',
      matches: (pol) => serviceTokenPolicyMatches(pol, cfg.originTokenId),
      policy: { name: 'wdjjj worker only', decision: 'non_identity', precedence: 1, include: [{ service_token: { token_id: cfg.originTokenId } }] },
    });
  } else {
    log(`  access ${cfg.publicHostname}: NONE (--allow-public-origin): the origin is reachable without the Worker`);
  }
  if (cfg.access) {
    accessSpecs.push({
      hostname: cfg.access.hostname, appName: `${cfg.tunnelName}-access`, what: `${cfg.access.emails.length} e-mail(s)`,
      matches: (pol) => accessPolicyMatches(pol, cfg.access.emails),
      policy: { name: 'allow-listed e-mails', decision: 'allow', precedence: 1, include: cfg.access.emails.map((email) => ({ email: { email } })) },
    });
  }
  const accessToCreate = [];
  for (const spec of accessSpecs) {
    const apps = await listAll(api, `/accounts/${cfg.accountId}/access/apps?domain=${encodeURIComponent(spec.hostname)}&exact=true`);
    const matching = apps.filter((a) => a.domain === spec.hostname);
    if (matching.length > 1) throw new Error(`Found ${matching.length} Access apps for ${spec.hostname}; resolve the duplicates first`);
    const app = matching[0];
    if (app && !accessAppIsStrict(app, spec.hostname)) {
      throw new Error(`Access app for ${spec.hostname} has another type, extra domains or destination overrides; fix it in the dashboard first`);
    }
    if (app) {
      const policies = await api('GET', `/accounts/${cfg.accountId}/access/apps/${app.id}/policies`);
      if (!spec.matches(policies)) {
        throw new Error(`Access app for ${spec.hostname} exists but its policies do not match the expected ${spec.what} exactly; fix it in the dashboard first`);
      }
      log(`  access ${spec.hostname}: app and policy match`);
    } else {
      accessToCreate.push(spec);
      log(`  access ${spec.hostname}: ${flags.apply ? 'will create' : 'would create'} app for ${spec.what}`);
    }
  }
  log(`  ingress: ${hostnames.join(', ')} -> ${cfg.originService}, catch-all http_status:404`);

  if (!flags.apply) {
    log('Plan only. Re-run with --apply to make these changes.');
    return { created: { dns: [], tunnelId: null, accessAppIds: [] } };
  }

  // Phase 2: mutate, with rollback of everything this run changed.
  const created = { dns: [], tunnelId: null, accessAppIds: [], configChanged: false };
  let tunnelId = reused && reused.id;
  try {
    if (!tunnelId) {
      const t = await api('POST', `/accounts/${cfg.accountId}/cfd_tunnel`, { name: cfg.tunnelName, config_src: 'cloudflare' });
      tunnelId = t.id;
      created.tunnelId = t.id;
      log(`  tunnel ${cfg.tunnelName}: created ${tunnelId}`);
    }
    for (const spec of accessToCreate) {
      const newApp = await api('POST', `/accounts/${cfg.accountId}/access/apps`, {
        name: spec.appName, domain: spec.hostname, type: 'self_hosted', session_duration: '24h', app_launcher_visible: false,
      });
      created.accessAppIds.push(newApp.id);
      await api('POST', `/accounts/${cfg.accountId}/access/apps/${newApp.id}/policies`, spec.policy);
      log(`  access ${spec.hostname}: app ${newApp.id} created`);
    }
    created.configChanged = true; // set first: a lost response must still trigger the restore
    await api('PUT', `/accounts/${cfg.accountId}/cfd_tunnel/${tunnelId}/configurations`, { config: mergeTunnelConfig(snapshot, hostnames, cfg.originService) });
    log('  ingress: updated');
    const cname = `${tunnelId}.cfargotunnel.com`;
    for (const name of dnsToCreate) {
      const rec = await api('POST', `/zones/${cfg.zoneId}/dns_records`, { type: 'CNAME', name, content: cname, proxied: true, comment: `tunnel ${cfg.tunnelName}` });
      created.dns.push(rec.id);
      log(`  dns ${name}: created proxied CNAME`);
    }
  } catch (err) {
    log('  rolling back changes made by this run');
    const step = async (label, fn) => { try { await fn(); log(`    ${label}: done`); } catch (e) { log(`    ${label}: FAILED (${e.message})`); } };
    for (const id of created.dns) await step(`delete dns record ${id}`, () => api('DELETE', `/zones/${cfg.zoneId}/dns_records/${id}`));
    if (created.configChanged && snapshot) await step('restore previous tunnel configuration', () => api('PUT', `/accounts/${cfg.accountId}/cfd_tunnel/${tunnelId}/configurations`, { config: snapshot }));
    for (const id of created.accessAppIds) await step(`delete access app ${id}`, () => api('DELETE', `/accounts/${cfg.accountId}/access/apps/${id}`));
    if (created.tunnelId) await step(`delete tunnel ${created.tunnelId}`, () => api('DELETE', `/accounts/${cfg.accountId}/cfd_tunnel/${created.tunnelId}`));
    throw err;
  }

  log('Done. Install cloudflared on the origin with the tunnel token from the Cloudflare dashboard');
  log('(Zero Trust -> Networks -> Tunnels). This script does not print the token.');
  return { created };
}

async function main() {
  let flags, cfg;
  try {
    flags = parseArgs(process.argv.slice(2));
    cfg = readConfig(process.env, flags);
  } catch (err) {
    console.error(`Configuration error:\n  ${err.message.split('\n').join('\n  ')}`);
    process.exit(2);
  }
  try {
    await run(cfg, flags, makeApi(cfg.token));
  } catch (err) {
    console.error(`FAILED: ${err.message}`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { parseArgs, readConfig, parseOriginService, buildIngress, mergeTunnelConfig, hostMatches, accessPolicyMatches, serviceTokenPolicyMatches, accessAppIsStrict, listAll, classifyDns, run, makeApi };

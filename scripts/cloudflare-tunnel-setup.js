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
 *   - Access (--access) is only attached to a dedicated hostname, never to the public site
 *   - a failed apply rolls back DNS records and a tunnel created by this run
 *   - the tunnel token is never requested or printed
 *
 * Environment:
 *   CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_ZONE_ID   (required)
 *   CF_PUBLIC_HOSTNAME   hostname routed through the tunnel, e.g. origin.djjessejay.ch (required)
 *   CF_ORIGIN_SERVICE    default http://127.0.0.1:3000
 *   CF_TUNNEL_NAME       default djjessejay-origin
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
  const known = new Set(['--apply', '--access']);
  const unknown = argv.filter((a) => !known.has(a));
  if (unknown.length) throw new Error(`Unknown argument(s): ${unknown.join(' ')}`);
  return { apply: argv.includes('--apply'), access: argv.includes('--access') };
}

const HOSTNAME_RE = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

function readConfig(env, flags) {
  const errors = [];
  for (const key of ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_ZONE_ID', 'CF_PUBLIC_HOSTNAME']) {
    if (!env[key]) errors.push(`Missing ${key}`);
  }
  const publicHostname = (env.CF_PUBLIC_HOSTNAME || '').trim().toLowerCase();
  if (publicHostname && !HOSTNAME_RE.test(publicHostname)) errors.push(`CF_PUBLIC_HOSTNAME is not a valid hostname: ${publicHostname}`);

  const originService = (env.CF_ORIGIN_SERVICE || 'http://127.0.0.1:3000').trim();
  if (!/^https?:\/\/[^\s/]+(:\d+)?\/?$/.test(originService)) errors.push(`CF_ORIGIN_SERVICE must look like http://host:port, got: ${originService}`);

  const cfg = {
    token: env.CLOUDFLARE_API_TOKEN,
    accountId: env.CLOUDFLARE_ACCOUNT_ID,
    zoneId: env.CLOUDFLARE_ZONE_ID,
    publicHostname,
    originService,
    tunnelName: (env.CF_TUNNEL_NAME || 'djjessejay-origin').trim(),
    access: null,
  };

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

/** Classifies an existing DNS state for a hostname against the expected tunnel CNAME. */
function classifyDns(records, target) {
  if (!records.length) return { state: 'missing' };
  const ok = records.length === 1 && records[0].type === 'CNAME' && records[0].content === target && records[0].proxied === true;
  return ok ? { state: 'ok', id: records[0].id } : { state: 'conflict', records };
}

async function run(cfg, flags, api, log = console.log) {
  const created = { dns: [], tunnelId: null };
  const mode = flags.apply ? 'APPLY' : 'PLAN';
  log(`Cloudflare Tunnel setup (${mode})`);

  const zone = await api('GET', `/zones/${cfg.zoneId}`);
  if (zone.status !== 'active') throw new Error(`Zone ${zone.name} is not active (status: ${zone.status})`);
  const inZone = (h) => h === zone.name || h.endsWith(`.${zone.name}`);
  for (const h of [cfg.publicHostname, cfg.access && cfg.access.hostname].filter(Boolean)) {
    if (!inZone(h)) throw new Error(`${h} is not inside zone ${zone.name}`);
  }
  log(`  zone ${zone.name}: active`);

  try {
    // Tunnel: reuse by name, refuse duplicates, create only with --apply.
    const existing = await api('GET', `/accounts/${cfg.accountId}/cfd_tunnel?name=${encodeURIComponent(cfg.tunnelName)}&is_deleted=false`);
    if (existing.length > 1) throw new Error(`Found ${existing.length} active tunnels named ${cfg.tunnelName}; resolve the duplicates first`);
    let tunnelId;
    if (existing.length === 1) {
      tunnelId = existing[0].id;
      if (existing[0].remote_config === false) throw new Error(`Tunnel ${cfg.tunnelName} is locally managed; expected config_src=cloudflare`);
      log(`  tunnel ${cfg.tunnelName}: reuse ${tunnelId}`);
    } else if (flags.apply) {
      const t = await api('POST', `/accounts/${cfg.accountId}/cfd_tunnel`, { name: cfg.tunnelName, config_src: 'cloudflare' });
      tunnelId = t.id;
      created.tunnelId = t.id;
      log(`  tunnel ${cfg.tunnelName}: created ${tunnelId}`);
    } else {
      log(`  tunnel ${cfg.tunnelName}: would create`);
    }

    // Ingress.
    const hostnames = [cfg.publicHostname, ...(cfg.access ? [cfg.access.hostname] : [])];
    const ingress = buildIngress(hostnames, cfg.originService);
    if (flags.apply) {
      await api('PUT', `/accounts/${cfg.accountId}/cfd_tunnel/${tunnelId}/configurations`, { config: { ingress } });
      log(`  ingress: ${hostnames.join(', ')} -> ${cfg.originService}, catch-all http_status:404`);
    } else {
      log(`  ingress: would set ${hostnames.join(', ')} -> ${cfg.originService}, catch-all http_status:404`);
    }

    // DNS: proxied CNAME per hostname, never overwrite.
    const target = tunnelId ? `${tunnelId}.cfargotunnel.com` : '<new-tunnel-id>.cfargotunnel.com';
    for (const name of hostnames) {
      const records = await api('GET', `/zones/${cfg.zoneId}/dns_records?name=${encodeURIComponent(name)}`);
      const s = classifyDns(records, target);
      if (s.state === 'ok') { log(`  dns ${name}: ok`); continue; }
      if (s.state === 'conflict') {
        const desc = s.records.map((r) => `${r.type} ${r.content}${r.proxied ? ' (proxied)' : ''}`).join(', ');
        throw new Error(`DNS ${name} already exists (${desc}); refusing to overwrite. Remove or change it explicitly first.`);
      }
      if (flags.apply) {
        const rec = await api('POST', `/zones/${cfg.zoneId}/dns_records`, { type: 'CNAME', name, content: target, proxied: true, comment: `tunnel ${cfg.tunnelName}` });
        created.dns.push(rec.id);
        log(`  dns ${name}: created proxied CNAME -> ${target}`);
      } else {
        log(`  dns ${name}: would create proxied CNAME -> ${target}`);
      }
    }

    // Access on the dedicated hostname only.
    if (cfg.access) {
      const apps = await api('GET', `/accounts/${cfg.accountId}/access/apps`);
      const app = apps.find((a) => a.domain === cfg.access.hostname);
      if (app) {
        log(`  access ${cfg.access.hostname}: app exists (${app.id}), policies left unchanged`);
      } else if (flags.apply) {
        const newApp = await api('POST', `/accounts/${cfg.accountId}/access/apps`, {
          name: `${cfg.tunnelName}-access`, domain: cfg.access.hostname, type: 'self_hosted', session_duration: '24h', app_launcher_visible: false,
        });
        await api('POST', `/accounts/${cfg.accountId}/access/apps/${newApp.id}/policies`, {
          name: 'allow-listed e-mails', decision: 'allow', precedence: 1,
          include: cfg.access.emails.map((email) => ({ email: { email } })),
        });
        log(`  access ${cfg.access.hostname}: app ${newApp.id} with ${cfg.access.emails.length} allowed e-mail(s)`);
      } else {
        log(`  access ${cfg.access.hostname}: would create app for ${cfg.access.emails.length} e-mail(s)`);
      }
    }
  } catch (err) {
    if (flags.apply && (created.dns.length || created.tunnelId)) {
      log('  rolling back changes made by this run');
      for (const id of created.dns) {
        try { await api('DELETE', `/zones/${cfg.zoneId}/dns_records/${id}`); log(`    dns record ${id} deleted`); }
        catch (e) { log(`    dns record ${id} NOT deleted: ${e.message}`); }
      }
      if (created.tunnelId) {
        try { await api('DELETE', `/accounts/${cfg.accountId}/cfd_tunnel/${created.tunnelId}`); log(`    tunnel ${created.tunnelId} deleted`); }
        catch (e) { log(`    tunnel ${created.tunnelId} NOT deleted: ${e.message}`); }
      }
    }
    throw err;
  }

  if (flags.apply) {
    log('Done. Install cloudflared on the origin with the tunnel token from the Cloudflare dashboard');
    log('(Zero Trust -> Networks -> Tunnels). This script does not print the token.');
  } else {
    log('Plan only. Re-run with --apply to make these changes.');
  }
  return created;
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

module.exports = { parseArgs, readConfig, buildIngress, classifyDns, run, makeApi };

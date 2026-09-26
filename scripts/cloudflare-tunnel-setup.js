#!/usr/bin/env node
/**
 * Cloudflare Tunnel + optional Access bootstrap.
 *
 * Safety model:
 *   - dry-run is the default
 *   - --apply is mandatory for mutations
 *   - credentials are read only from environment variables
 *   - existing DNS records are never overwritten implicitly
 *   - existing named tunnels are reused; duplicate tunnels are refused
 *   - newly created state is rolled back on a failed apply
 *   - Access is only created for CF_ACCESS_HOSTNAME, never the public site hostname
 *
 * Requires Node.js >= 22 and no npm dependencies.
 */

'use strict';

const CF_API = 'https://api.cloudflare.com/client/v4';
const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const access = args.has('--access');

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function env(name, fallback) {
  return process.env[name] || fallback;
}

function assertHostname(value, name) {
  if (!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(value)) {
    throw new Error(`${name} is not a valid DNS hostname`);
  }
}

async function cf(path, options = {}) {
  const token = required('CLOUDFLARE_API_TOKEN');
  const response = await fetch(`${CF_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success === false) {
    const detail = JSON.stringify(body.errors || body, null, 2);
    throw new Error(`Cloudflare API ${response.status}: ${detail}`);
  }
  return body.result;
}

async function findTunnels(accountId, name) {
  const result = await cf(`/accounts/${accountId}/cfd_tunnel?name=${encodeURIComponent(name)}&is_deleted=false`);
  return Array.isArray(result) ? result : [];
}

async function ensureTunnelCname(zoneId, hostname, tunnelId) {
  const records = await cf(`/zones/${zoneId}/dns_records?name=${encodeURIComponent(hostname)}`);
  const expected = `${tunnelId}.cfargotunnel.com`;
  if (Array.isArray(records) && records.length > 0) {
    if (records.length === 1 && records[0].type === 'CNAME' && records[0].proxied === true && records[0].content === expected) {
      return { created: false, id: records[0].id };
    }
    throw new Error(`DNS record already exists for ${hostname}; refusing to overwrite it automatically`);
  }

  const created = await cf(`/zones/${zoneId}/dns_records`, {
    method: 'POST',
    body: JSON.stringify({
      type: 'CNAME',
      name: hostname,
      content: expected,
      proxied: true,
      ttl: 1,
    }),
  });
  return { created: true, id: created.id };
}

async function deleteDnsRecord(zoneId, recordId) {
  if (!recordId) return;
  try {
    await cf(`/zones/${zoneId}/dns_records/${recordId}`, { method: 'DELETE' });
  } catch (error) {
    console.error(`ROLLBACK WARNING: could not delete DNS record ${recordId}: ${error.message}`);
  }
}

async function deleteTunnel(accountId, tunnelId) {
  if (!tunnelId) return;
  try {
    await cf(`/accounts/${accountId}/cfd_tunnel/${tunnelId}`, { method: 'DELETE' });
  } catch (error) {
    console.error(`ROLLBACK WARNING: could not delete tunnel ${tunnelId}: ${error.message}`);
  }
}

async function main() {
  const accountId = required('CLOUDFLARE_ACCOUNT_ID');
  const zoneId = required('CLOUDFLARE_ZONE_ID');
  const publicHostname = required('CF_PUBLIC_HOSTNAME');
  const originService = env('CF_ORIGIN_SERVICE', 'http://127.0.0.1:3000');
  const tunnelName = env('CF_TUNNEL_NAME', 'djjessejay-origin');
  const accessHostname = process.env.CF_ACCESS_HOSTNAME;
  const accessEmails = (process.env.CF_ACCESS_EMAILS || '').split(',').map(s => s.trim()).filter(Boolean);

  assertHostname(publicHostname, 'CF_PUBLIC_HOSTNAME');
  if (access) {
    if (!accessHostname) throw new Error('CF_ACCESS_HOSTNAME is required with --access');
    assertHostname(accessHostname, 'CF_ACCESS_HOSTNAME');
    if (accessHostname === publicHostname) {
      throw new Error('CF_ACCESS_HOSTNAME must be distinct from CF_PUBLIC_HOSTNAME; do not put Access in front of the public site accidentally');
    }
    if (accessEmails.length === 0) throw new Error('CF_ACCESS_EMAILS must contain at least one email with --access');
  }

  const config = {
    tunnelName,
    publicHostname,
    originService,
    accessHostname: accessHostname || null,
    accessEmails,
  };

  console.log(JSON.stringify({ mode: apply ? 'APPLY' : 'PLAN', config }, null, 2));

  if (!apply) {
    console.log('DRY-RUN: no Cloudflare mutation performed. Re-run with --apply to execute.');
    return;
  }

  let tunnelId;
  let createdTunnel = false;
  const createdDnsRecords = [];

  try {
    const existingTunnels = await findTunnels(accountId, tunnelName);
    if (existingTunnels.length > 1) {
      throw new Error(`Multiple active tunnels already use name ${tunnelName}; refusing to guess`);
    }

    if (existingTunnels.length === 1) {
      tunnelId = existingTunnels[0].id;
    } else {
      const tunnel = await cf(`/accounts/${accountId}/cfd_tunnel`, {
        method: 'POST',
        body: JSON.stringify({ name: tunnelName, config_src: 'cloudflare' }),
      });
      tunnelId = tunnel.id;
      createdTunnel = true;
    }

    if (!tunnelId) throw new Error('Cloudflare did not return a tunnel id');

    await cf(`/accounts/${accountId}/cfd_tunnel/${tunnelId}/configurations`, {
      method: 'PUT',
      body: JSON.stringify({
        config: {
          ingress: [
            { hostname: publicHostname, service: originService, originRequest: {} },
            ...(accessHostname ? [{ hostname: accessHostname, service: originService, originRequest: {} }] : []),
            { service: 'http_status:404' },
          ],
        },
      }),
    });

    const publicDns = await ensureTunnelCname(zoneId, publicHostname, tunnelId);
    if (publicDns.created) createdDnsRecords.push(publicDns.id);

    let accessApp = null;
    if (accessHostname) {
      const accessDns = await ensureTunnelCname(zoneId, accessHostname, tunnelId);
      if (accessDns.created) createdDnsRecords.push(accessDns.id);

      const existingApps = await cf(`/accounts/${accountId}/access/apps?domain=${encodeURIComponent(accessHostname)}`);
      if (Array.isArray(existingApps) && existingApps.length > 0) {
        throw new Error(`An Access application already exists for ${accessHostname}; refusing to overwrite it automatically`);
      }

      accessApp = await cf(`/accounts/${accountId}/access/apps`, {
        method: 'POST',
        body: JSON.stringify({
          name: `${tunnelName} Access`,
          domain: accessHostname,
          type: 'self_hosted',
          session_duration: '24h',
          policies: [
            {
              name: `${tunnelName} allow-list`,
              decision: 'allow',
              include: accessEmails.map(email => ({ email: { email } })),
            },
          ],
        }),
      });
    }

    // Never print tunnel credentials/token. Retrieve them from Cloudflare.
    console.log(JSON.stringify({
      success: true,
      tunnelId,
      dnsTarget: `${tunnelId}.cfargotunnel.com`,
      accessApplicationId: accessApp?.id || null,
      reusedExistingTunnel: !createdTunnel,
      next: 'Run cloudflared with the tunnel token from Cloudflare; verify with scripts/verify-origin-protection.js',
    }, null, 2));
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    for (const recordId of createdDnsRecords.reverse()) await deleteDnsRecord(zoneId, recordId);
    if (createdTunnel) await deleteTunnel(accountId, tunnelId);
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(`FATAL: ${error.message}`);
  process.exitCode = 1;
});

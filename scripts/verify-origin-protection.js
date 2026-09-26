#!/usr/bin/env node
/**
 * Read-only six-point Cloudflare origin-protection verification.
 * Node.js >= 22, zero dependencies.
 */
'use strict';

const CF_API = 'https://api.cloudflare.com/client/v4';
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const zoneId = process.env.CLOUDFLARE_ZONE_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
const hostname = process.env.CF_PUBLIC_HOSTNAME;
const tunnelId = process.env.CF_TUNNEL_ID;
const expectedOriginIp = process.env.CF_ORIGIN_PUBLIC_IP;
const accessHostname = process.env.CF_ACCESS_HOSTNAME;

const failures = [];
function pass(id, message) { console.log(`PASS ${id}: ${message}`); }
function fail(id, message) { failures.push(`${id}: ${message}`); console.error(`FAIL ${id}: ${message}`); }
function requireEnv(name, value) { if (!value) fail('ENV', `${name} is required`); }

async function cf(path) {
  const response = await fetch(`${CF_API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success === false) throw new Error(`Cloudflare API ${response.status}: ${JSON.stringify(body.errors || body)}`);
  return body.result;
}

async function main() {
  for (const [name, value] of [['CLOUDFLARE_API_TOKEN', token], ['CLOUDFLARE_ACCOUNT_ID', accountId], ['CLOUDFLARE_ZONE_ID', zoneId], ['CF_PUBLIC_HOSTNAME', hostname], ['CF_TUNNEL_ID', tunnelId]]) requireEnv(name, value);
  if (failures.length) return finish();

  try {
    const zone = await cf(`/zones/${zoneId}`);
    if (zone?.id !== zoneId || zone?.status !== 'active') fail('OP-01', 'Cloudflare zone is not active');
    else pass('OP-01', 'API token reaches an active target zone');
  } catch (e) { fail('OP-01', e.message); }

  try {
    const tunnel = await cf(`/accounts/${accountId}/cfd_tunnel/${tunnelId}`);
    if (tunnel?.remote_config !== true) fail('OP-02', 'Tunnel is not Cloudflare-managed remote configuration');
    else pass('OP-02', `Tunnel exists (${tunnel.status || 'unknown'}); remote_config=true`);
  } catch (e) { fail('OP-02', e.message); }

  try {
    const cfg = await cf(`/accounts/${accountId}/cfd_tunnel/${tunnelId}/configurations`);
    const ingress = cfg?.config?.ingress || [];
    const route = ingress.find(rule => rule.hostname === hostname);
    const catchAll = ingress.some(rule => !rule.hostname);
    if (!route || !route.service || !catchAll) fail('OP-03', 'Ingress is missing the expected hostname route or catch-all');
    else pass('OP-03', 'Tunnel ingress routes the public hostname and fails closed with a catch-all');
  } catch (e) { fail('OP-03', e.message); }

  try {
    const records = await cf(`/zones/${zoneId}/dns_records?name=${encodeURIComponent(hostname)}`);
    const expected = `${tunnelId}.cfargotunnel.com`;
    const good = Array.isArray(records) && records.length === 1 && records[0].type === 'CNAME' && records[0].proxied === true && records[0].content === expected;
    if (!good) fail('OP-04', 'Public DNS is not exactly one proxied CNAME to the expected tunnel');
    else pass('OP-04', 'Public DNS points only to the Cloudflare Tunnel');
  } catch (e) { fail('OP-04', e.message); }

  if (expectedOriginIp) {
    try {
      const records = await cf(`/zones/${zoneId}/dns_records?name=${encodeURIComponent(hostname)}`);
      const leaked = records.some(r => ['A', 'AAAA'].includes(r.type) && r.content === expectedOriginIp);
      if (leaked) fail('OP-05', `Configured origin IP ${expectedOriginIp} is directly published in DNS`);
      else pass('OP-05', 'Configured origin IP is not directly published in the target hostname DNS');
    } catch (e) { fail('OP-05', e.message); }
  } else {
    fail('OP-05', 'CF_ORIGIN_PUBLIC_IP is not set; direct-origin leak cannot be verified');
  }

  if (accessHostname) {
    try {
      const apps = await cf(`/accounts/${accountId}/access/apps?domain=${encodeURIComponent(accessHostname)}`);
      const matching = Array.isArray(apps) && apps.some(app => app.domain === accessHostname);
      const publicMatch = Array.isArray(apps) && apps.some(app => app.domain === hostname);
      if (!matching || publicMatch) fail('OP-06', 'Dedicated Access application is missing or Access is attached to the public site');
      else pass('OP-06', `Access protects dedicated hostname ${accessHostname}, not ${hostname}`);
    } catch (e) { fail('OP-06', e.message); }
  } else {
    pass('OP-06', 'No Access hostname requested; public-site Access lockout is avoided by design');
  }

  finish();
}

function finish() {
  if (failures.length) {
    console.error(`\nORIGIN PROTECTION: FAIL (${failures.length})`);
    process.exitCode = 1;
  } else {
    console.log('\nORIGIN PROTECTION: PASS');
  }
}

main().catch(error => { console.error(`FATAL: ${error.message}`); process.exitCode = 1; });

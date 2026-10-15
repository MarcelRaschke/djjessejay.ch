'use strict';

/**
 * Client identity for rate limiting behind the Cloudflare Tunnel.
 *
 * Request path: client → Cloudflare edge → wdjjj Worker → Access → tunnel →
 * cloudflared → Express. By the time a request reaches Express its socket
 * address is the loopback address of cloudflared, so req.ip is the same value
 * for every visitor and an express-rate-limit bucket keyed on it degrades into
 * one global counter.
 *
 * The usable identity is the LEFTMOST entry of x-forwarded-for. The wdjjj
 * Worker builds the origin request headers from an allow-list that does not
 * contain x-forwarded-for, drops whatever the client sent, and then sets the
 * header to exactly one value: cf-connecting-ip. Later hops only append to the
 * right. The leftmost entry is therefore written by the Worker, not by the
 * client.
 *
 * This holds only as long as the origin is unreachable except through the
 * Worker — the Access service-token policy from ORIGIN-PROTECTION-DEPLOYMENT.md.
 * If that policy is ever removed, this header becomes client-controlled again
 * and so does the rate-limit key.
 */

const IPV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/;

/** Strips brackets and a trailing port, and rejects anything that is not an address. */
function normalizeAddress(value) {
  if (typeof value !== 'string') return '';
  let address = value.trim();
  if (address === '') return '';

  // [2001:db8::1]:443 → 2001:db8::1
  const bracketed = address.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (bracketed) address = bracketed[1];

  // 198.51.100.7:443 → 198.51.100.7. A bare IPv6 address keeps its colons.
  if (address.includes(':') && !address.includes('::') && address.split(':').length === 2) {
    address = address.split(':')[0];
  }

  if (IPV4.test(address)) {
    return address.split('.').every((octet) => Number(octet) <= 255) ? address : '';
  }
  // Loose IPv6 check: hex groups and colons only, at least one colon.
  if (/^[0-9a-f:]+$/i.test(address) && address.includes(':')) return address.toLowerCase();
  return '';
}

/** Returns the Worker-written client address, or '' when there is none to trust. */
function clientAddressFromHeaders(headers) {
  if (!headers) return '';
  const forwarded = headers['x-forwarded-for'] ?? headers['X-Forwarded-For'];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (typeof value !== 'string') return '';
  return normalizeAddress(value.split(',')[0]);
}

/**
 * Builds an express-rate-limit keyGenerator.
 *
 * @param {(ip: string) => string} normalizeIp express-rate-limit's ipKeyGenerator,
 *   which collapses an IPv6 address onto its /64 subnet so a single client cannot
 *   walk through its own prefix. Falls back to identity when unavailable.
 */
function createClientKeyGenerator(normalizeIp) {
  const normalize = typeof normalizeIp === 'function' ? normalizeIp : (ip) => ip;
  return (req) => {
    const address = clientAddressFromHeaders(req && req.headers) || normalizeAddress(req && req.ip);
    // No usable address: one shared bucket is the safe direction, not an open door.
    return address ? normalize(address) : 'unknown';
  };
}

module.exports = { clientAddressFromHeaders, createClientKeyGenerator, normalizeAddress };

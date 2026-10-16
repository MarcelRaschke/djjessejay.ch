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
 * The usable identity is the LEFTMOST entry of x-forwarded-for, but only under
 * a Worker that rewrites the header. Cloudflare APPENDS the connecting address
 * to an x-forwarded-for the caller already sent, so under a Worker that passes
 * client headers through, the leftmost entry is the caller's own value and
 * reading it would let one client rotate spoofed addresses through fresh
 * buckets — strictly worse than the single bucket it replaces.
 *
 * Two conditions must both hold before the header may be read:
 *
 * 1. The deployed wdjjj Worker builds the origin request headers from an
 *    allow-list that excludes x-forwarded-for, discarding the caller's value,
 *    and sets the header to exactly one address from cf-connecting-ip. Later
 *    hops only append to the right.
 * 2. The origin is unreachable except through that Worker, which is what the
 *    Access service-token policy in ORIGIN-PROTECTION-DEPLOYMENT.md enforces.
 *
 * Neither is visible from inside this process, so the operator asserts them
 * with TRUST_FORWARDED_FOR=1 once both are live. Until then the key falls back
 * to the socket address: one shared bucket, which throttles too broadly but
 * cannot be escaped. If the Access policy is ever removed, unset the variable
 * in the same change.
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

  // ::ffff:198.51.100.7 — how a dual-stack listener reports an IPv4 peer, which
  // is what req.ip looks like on the direct-origin fallback path. Reduced to the
  // IPv4 form so the same client keys the same bucket either way.
  const mapped = address.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  if (mapped) address = mapped[1];

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
 * @param {{trustForwardedFor?: boolean}} [options] trustForwardedFor must be true
 *   before x-forwarded-for is read at all; see the conditions at the top of this
 *   file. Default false, which keys on the socket address.
 */
function createClientKeyGenerator(normalizeIp, options = {}) {
  const normalize = typeof normalizeIp === 'function' ? normalizeIp : (ip) => ip;
  const trustForwardedFor = options.trustForwardedFor === true;
  return (req) => {
    const forwarded = trustForwardedFor ? clientAddressFromHeaders(req && req.headers) : '';
    const address = forwarded || normalizeAddress(req && req.ip);
    // No usable address: one shared bucket is the safe direction, not an open door.
    return address ? normalize(address) : 'unknown';
  };
}

module.exports = { clientAddressFromHeaders, createClientKeyGenerator, normalizeAddress };

'use strict';

/**
 * Cloudflare Turnstile server-side verification.
 *
 * Replaces Google reCAPTCHA v3: no Google cookies, no score threshold,
 * runs on the same edge provider as the Worker.
 *
 * Fail closed: anything other than an explicit success with the expected
 * hostname and action is a rejection.
 *
 * Docs: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const MAX_TOKEN_LENGTH = 2048;
const DEFAULT_TIMEOUT_MS = 5000;

/**
 * @param {object} opts
 * @param {string} opts.secret            TURNSTILE_SECRET_KEY
 * @param {string} opts.token             value of `cf-turnstile-response`
 * @param {string[]} [opts.hostnames]     accepted hostnames, empty = no check
 * @param {string} [opts.action]          expected widget action, empty = no check
 * @param {Function} [opts.fetchImpl]     injectable fetch for tests
 * @param {number} [opts.timeoutMs]
 * @returns {Promise<{ok: true} | {ok: false, status: number, reason: string}>}
 */
async function verifyTurnstile({ secret, token, hostnames = [], action = '', fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  if (!secret) return { ok: false, status: 500, reason: 'secret-missing' };
  if (typeof token !== 'string' || token.length === 0) return { ok: false, status: 400, reason: 'token-missing' };
  if (token.length > MAX_TOKEN_LENGTH) return { ok: false, status: 400, reason: 'token-too-long' };

  let data;
  try {
    const res = await fetchImpl(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return { ok: false, status: 502, reason: `siteverify-http-${res.status}` };
    data = await res.json();
  } catch (err) {
    return { ok: false, status: 502, reason: `siteverify-unreachable:${err.name || 'Error'}` };
  }

  if (!data || data.success !== true) {
    const codes = Array.isArray(data && data['error-codes']) ? data['error-codes'].join(',') : 'unknown';
    return { ok: false, status: 403, reason: `rejected:${codes}` };
  }
  if (hostnames.length && !hostnames.includes(data.hostname)) {
    return { ok: false, status: 403, reason: `hostname-mismatch:${data.hostname}` };
  }
  if (action && data.action !== action) {
    return { ok: false, status: 403, reason: `action-mismatch:${data.action}` };
  }
  return { ok: true };
}

function parseHostnames(value) {
  return String(value || '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

module.exports = { verifyTurnstile, parseHostnames, SITEVERIFY_URL, MAX_TOKEN_LENGTH };

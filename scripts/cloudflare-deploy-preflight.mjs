import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const API = 'https://api.cloudflare.com/client/v4';
const TOKEN_KINDS = new Set(['auto', 'user', 'account']);

// Only fixed Cloudflare endpoints receive the credential. Never follow a
// redirect or echo an API body/error message, which may contain sensitive data.
async function checkApi(path, token, fetchImpl) {
  try {
    const response = await fetchImpl(API + path, {
      method: 'GET',
      headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
      redirect: 'manual',
      signal: AbortSignal.timeout(15000),
    });
    if (response.status >= 300 && response.status < 400) {
      return { http: response.status, ok: false, reason: 'redirect_refused' };
    }
    let body;
    try { body = await response.json(); } catch {
      return { http: response.status, ok: false, reason: 'non_json_response' };
    }
    const errorCodes = Array.isArray(body?.errors)
      ? body.errors.filter(e => Number.isSafeInteger(e?.code)).map(e => e.code)
      : [];
    const result = {
      http: response.status,
      ok: response.ok && body?.success === true,
      errorCodes,
    };
    if (['active', 'disabled', 'expired'].includes(body?.result?.status)) {
      result.tokenStatus = body.result.status;
    }
    return result;
  } catch {
    return { http: null, ok: false, reason: 'request_failed_or_timed_out' };
  }
}

export async function runPreflight(config, fetchImpl = globalThis.fetch) {
  const { token, accountId, tokenKind = 'auto', workerName = 'wdjjj' } = config;
  const invalid = [];
  if (typeof token !== 'string' || !token || token.trim() !== token || /[\r\n]/.test(token)) invalid.push('CLOUDFLARE_API_TOKEN');
  if (!/^[a-f0-9]{32}$/i.test(accountId || '')) invalid.push('CLOUDFLARE_ACCOUNT_ID');
  if (!TOKEN_KINDS.has(tokenKind)) invalid.push('CLOUDFLARE_TOKEN_KIND');
  if (!/^[a-z0-9_-]{1,63}$/i.test(workerName)) invalid.push('CF_WORKER_NAME');
  const report = { ok: false, classification: 'configuration_error', checks: [], writePermissionVerified: false };
  if (invalid.length) return { ...report, invalid };

  let activeKind;
  for (const kind of tokenKind === 'auto' ? ['user', 'account'] : [tokenKind]) {
    const path = kind === 'user' ? '/user/tokens/verify' : `/accounts/${accountId}/tokens/verify`;
    const result = await checkApi(path, token, fetchImpl);
    report.checks.push({ check: 'token_verify', kind, ...result });
    if (result.ok && result.tokenStatus === 'active') { activeKind = kind; break; }
  }
  if (!activeKind) {
    return { ...report, classification: 'token_not_verified', nextAction: 'Check token type, validity, member permissions, IP conditions and secret value.' };
  }
  const service = await checkApi(`/accounts/${accountId}/workers/services/${workerName}`, token, fetchImpl);
  report.checks.push({ check: 'worker_service_read', ...service });
  if (!service.ok) {
    return { ...report, classification: 'worker_access_not_verified', nextAction: 'Token is active; check target account, existing Worker and resource permissions. A 403/404 does not identify the cause by itself.' };
  }
  return { ...report, ok: true, classification: 'token_and_worker_read_verified', tokenKind: activeKind,
    nextAction: 'Read access confirmed. Deploy still requires Worker edit and the appropriate zone route permissions.' };
}

export function renderSummary(report) {
  const rows = report.checks.map(check => `| ${check.check}${check.kind ? ` (${check.kind})` : ''} | ${check.http ?? 'no response'} | ${check.tokenStatus || (check.ok ? 'accepted' : 'not verified')} | ${(check.errorCodes || []).join(', ') || '—'} |`);
  return [
    '## Cloudflare deployment preflight', '',
    `Result: **${report.classification}**`, '',
    '| Read-only check | HTTP | State | API error codes |',
    '|---|---|---|---|', ...rows, '',
    report.nextAction || `Check configuration: ${(report.invalid || []).join(', ')}`, '',
    'No token values or API response bodies were logged. Read access does not prove deploy/write permission.', '',
  ].join('\n');
}

export async function main(env = process.env, fetchImpl = globalThis.fetch) {
  const report = await runPreflight({ token: env.CLOUDFLARE_API_TOKEN, accountId: env.CLOUDFLARE_ACCOUNT_ID,
    tokenKind: env.CLOUDFLARE_TOKEN_KIND || 'auto', workerName: env.CF_WORKER_NAME || 'wdjjj' }, fetchImpl);
  console.log(JSON.stringify(report, null, 2));
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, renderSummary(report));
  return report.ok ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main();
}

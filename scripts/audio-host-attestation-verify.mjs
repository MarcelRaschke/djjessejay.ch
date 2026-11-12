import { createPublicKey, verify as verifySig } from 'node:crypto';
import { readFileSync } from 'node:fs';

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
export { canonical };

const isHex = x => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x);
export function verifyHostAttestation(document, pem, headSha, now = new Date()) {
  function deny(reason) { throw new Error(`DENY:${reason}`); }
  if (!document || typeof document !== 'object' || Array.isArray(document)) deny('document');
  if (Object.keys(document).sort().join(',') !== 'key_id,payload,signature') deny('envelope');
  if (document.key_id !== 'audio-host-release-root') deny('key_id');
  const p = document.payload;
  if (!p || p.kind !== 'audio_host_release_attestation' || p.schema !== 1) deny('schema');
  if (!/^[a-f0-9]{40}$/.test(headSha || '') || p.head_sha !== headSha) deny('commit_binding');
  const issued = Date.parse(p.issued_at);
  const expires = Date.parse(p.expires);
  const time = now.getTime();
  if (!Number.isFinite(issued) || !Number.isFinite(expires) || issued > time + 30_000 ||
      expires <= time || expires - issued > 900_000 || time - issued > 900_000) deny('freshness');
  if (!p.evidence || typeof p.evidence !== 'object') deny('evidence');
  for (const gate of ['operator', 'worm', 'sandbox']) {
    const item = p.evidence[gate];
    if (!item || item.status !== 'PASS' || !isHex(item.sha256) ||
        typeof item.verifier !== 'string' || item.verifier.length < 8) deny(`${gate}_evidence`);
  }
  if (!p.evidence.worm.bucket || !p.evidence.worm.version_id || !p.evidence.worm.key ||
      p.evidence.worm.mode !== 'COMPLIANCE' || Date.parse(p.evidence.worm.retention_until) <= time) deny('worm_version');
  if (p.evidence.sandbox.no_network !== true || p.evidence.sandbox.read_only_inputs !== true ||
      p.evidence.sandbox.mcp_stdio_verified !== true) deny('sandbox_controls');
  if (!p.evidence.operator.key_policy_signature_verified || !p.evidence.operator.replay_persistent) deny('operator_controls');
  const signature = Buffer.from(String(document.signature || ''), 'base64');
  if (signature.length !== 64) deny('signature_format');
  try {
    const pub = createPublicKey(pem);
    if (pub.asymmetricKeyType !== 'ed25519' || !verifySig(null, Buffer.from(canonical(p)), pub, signature)) deny('signature');
  } catch (e) { deny('signature'); }
  return { status: 'PASS', head_sha: headSha, expires: p.expires };
}

if (process.argv[1]?.endsWith('audio-host-attestation-verify.mjs')) {
  try {
    const b64 = process.env.AUDIO_HOST_ATTESTATION_B64 || '';
    const rootB64 = process.env.AUDIO_HOST_ROOT_PUB_B64: || '';
    if (!b64 || !rootB64) throw new Error('DENY:missing_external_attestation_or_root');
    const doc = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    const pem = Buffer.from(rootB64, 'base64').toString('utf8');
    console.log(JSON.stringify(verifyHostAttestation(doc, pem, process.env.AUDIO_EXPECTED_SHA)));
  } catch (e) { console.error(String(e.message)); process.exitCode = 1; }
}

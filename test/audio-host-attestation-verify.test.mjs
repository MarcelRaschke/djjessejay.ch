import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { canonical, verifyHostAttestation } from '../scripts/audio-host-attestation-verify.mjs';

const sha = 'a'.repeat(40);
const hash = 'f'.repeat(64);
const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const pem = publicKey.export({ type: 'spki', format: 'pem' });
function example() {
  const now = Date.now();
  const payload = {schema:1,kind:'audio_host_release_attestation', head_sha:sha,
    issued_at:new Date(now-1000).toISOString(),expires:new Date(now+60000).toISOString(),
    evidence:{operator:{status:'PASS',sha256:hash,verifier:'independent-operator',key_policy_signature_verified:true,replay_persistent:true},
      worm:{status:'PASS',sha256:hash,verifier:'external-worm-verifier',bucket:'canary-bucket',key:'audit/1.json',version_id:'v1',mode:'COMPLIANCE',retention_until:new Date(now+86400000).toISOString()},
      sandbox:{status:'PASS',sha256:hash,verifier:'isolated-host-runner',no_network:true,read_only_inputs:true,mcp_stdio_verified:true}}};
  return {key_id:'audio-host-release-root',payload,
    signature:sign(null,Buffer.from(canonical(payload)),privateKey).toString('base64')};
}
test('valid signed artifact accepted',()=>assert.equal(verifyHostAttestation(example(),pem,sha).status,'PASS'));
test('cannot change evidence',()=>{const x=example();x.payload.evidence.sandbox.no_network=false;assert.throws(()=>verifyHostAttestation(x,pem,sha),/DENY/);});
test('cannot substitute commit',()=>assert.throws(()=>verifyHostAttestation(example(),pem,'b'.repeat(40)),/commit_binding/));
test('cannot use stale evidence',()=>{const x=example();x.payload.expires='2020-01-01T00:00:00Z';assert.throws(()=>verifyHostAttestation(x,pem,sha),/freshness/);});
test('cannot omit WORM version',()=>{const x=example();delete x.payload.evidence.worm.version_id;assert.throws(()=>verifyHostAttestation(x,pem,sha),/worm_version/);});
test('wrong root rejected',()=>{const p=generateKeyPairSync('ed25519').publicKey.export({type:'spki',format:'pem'});assert.throws(()=>verifyHostAttestation(example(),p,sha),/signature/);});

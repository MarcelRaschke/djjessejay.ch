import type { AccessRequest } from "../../contracts/access-request";
import type { VerifiedIdentity } from "../../contracts/identity";

export interface SignatureVerifier {
  verify(request: AccessRequest): Promise<boolean>;
}

export async function verifyIdentity(
  request: AccessRequest,
  verifier: SignatureVerifier,
  expectedDomain: string,
  now=Date.now()
):Promise<VerifiedIdentity>{
  if(request.protocol!=="DJJJ-ACCESS/v1"||request.domain!==expectedDomain) throw new Error("invalid context");
  const issued=Date.parse(request.issued_at), expiration=Date.parse(request.expiration);
  if(!Number.isFinite(issued)||!Number.isFinite(expiration)||issued>now||now>=expiration) throw new Error("invalid challenge");
  if(!(await verifier.verify(request))) throw new Error("invalid signature");
  return {valid:true,subject:request.wallet,domain:request.domain,chain_id:request.chain_id,nonce:request.nonce};
}
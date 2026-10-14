import type { Authorization } from "../../contracts/authorization";
import type { VerifiedIdentity } from "../../contracts/identity";
import type { ResourceDescriptor } from "../../contracts/resource";
import type { PolicyDecision } from "../../contracts/policy";
export function createAuthorization(identity:VerifiedIdentity,resource:ResourceDescriptor,decision:Extract<PolicyDecision,{effect:"ALLOW"}>,now:number,ttlMs=300000):Authorization{
  return{subject:identity.subject,resource:resource.id,scope:resource.scope,policy:decision.policyId,issued_at:new Date(now).toISOString(),expiration:new Date(now+ttlMs).toISOString()};
}
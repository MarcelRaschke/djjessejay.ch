import type {AccessRequest} from "../../contracts/access-request";
import type {AccessResult,DenyReason} from "../../contracts/access-result";
import type {VerifiedIdentity} from "../../contracts/identity";
import type {Eligibility} from "../../contracts/eligibility";
import type {ResourceDescriptor} from "../../contracts/resource";
import type {PolicyDecisionPoint} from "../../contracts/policy";
import type {AccessSession} from "../../contracts/session";
import type {Authorization} from "../../contracts/authorization";
import {sessionMatchesAuthorization} from "../../contracts/session";
export interface IdentityVerifier{verify(r:AccessRequest):Promise<VerifiedIdentity>;}
export interface EligibilityResolver{resolve(subject:string,chainId:number):Promise<Eligibility>;}
export interface ResourceRegistry{resolve(resource:string,scope:string):Promise<ResourceDescriptor>;}
export interface SessionIssuer{issue(a:Authorization):AccessSession;}
export interface AccessDependencies{identity:IdentityVerifier;eligibility:EligibilityResolver;resources:ResourceRegistry;pdp:PolicyDecisionPoint;sessions:SessionIssuer;now?:()=>number;}
const deny=(reason:DenyReason):AccessResult=>({decision:"DENY",reason});
export async function access(request:AccessRequest,deps:AccessDependencies):Promise<AccessResult>{
 try{
  const identity=await deps.identity.verify(request); if(!identity.valid)return deny("AUTHENTICATION_FAILED");
  const eligibility=await deps.eligibility.resolve(identity.subject,request.chain_id); if(!eligibility.valid)return deny("ELIGIBILITY_FAILED");
  const resource=await deps.resources.resolve(request.resource,request.scope);
  const decision=await deps.pdp.evaluate({identity,eligibility,resource}); if(decision.effect!=="ALLOW")return deny("POLICY_DENIED");
  const now=deps.now?.()??Date.now();
  const a:Authorization={subject:identity.subject,resource:resource.id,scope:resource.scope,policy:decision.policyId,issued_at:new Date(now).toISOString(),expiration:new Date(now+300000).toISOString()};
  const issued=Date.parse(a.issued_at),expiration=Date.parse(a.expiration);
  if(a.subject!==identity.subject||!Number.isFinite(issued)||!Number.isFinite(expiration)||now<issued||now>=expiration)return deny("AUTHORIZATION_INVALID");
  const session=deps.sessions.issue(a);
  if(!sessionMatchesAuthorization(session,a,now))return deny("SESSION_INVALID");
  return{decision:"ALLOW",session};
 }catch{return deny("INTERNAL_VERIFICATION_FAILURE");}
}
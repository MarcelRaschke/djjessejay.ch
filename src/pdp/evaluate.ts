import type { PolicyInput, PolicyDecision } from "../../contracts/policy";
export interface PolicyRequirement { asset:string; type:string; minimum_balance:string; }
export interface Policy { policy_id:string; requirements:readonly PolicyRequirement[]; effect:"ALLOW"; }
export function evaluatePolicy(input:PolicyInput,policy:Policy):PolicyDecision{
  if(!input.identity.valid||!input.eligibility.valid)return{effect:"DENY",policyId:policy.policy_id,reason:"INVALID_FACTS"};
  for(const req of policy.requirements){
    const a=input.eligibility.assets[req.asset];
    if(!a) return{effect:"DENY",policyId:policy.policy_id,reason:"INSUFFICIENT_ELIGIBILITY"};
    try{if(BigInt(a.balance)<BigInt(req.minimum_balance))return{effect:"DENY",policyId:policy.policy_id,reason:"INSUFFICIENT_ELIGIBILITY"};}
    catch{return{effect:"DENY",policyId:policy.policy_id,reason:"INVALID_ELIGIBILITY"};}
  }
  return{effect:"ALLOW",policyId:policy.policy_id};
}
import type { Eligibility } from "./eligibility";
import type { ResourceRequest } from "./resource";
import type { VerifiedIdentity } from "./identity";
export interface PolicyInput {
  identity:VerifiedIdentity; eligibility:Eligibility; resource:ResourceRequest;
}
export type PolicyDecision =
  | {effect:"ALLOW";policyId:string}
  | {effect:"DENY";policyId?:string;reason:string};
export interface PolicyDecisionPoint {
  evaluate(input:PolicyInput):Promise<PolicyDecision>;
}
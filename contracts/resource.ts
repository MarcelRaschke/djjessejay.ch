export interface ResourceRequest { id:string; scope:string; }
export interface ResourceDescriptor extends ResourceRequest {
  policy_id:string; r2_key:string;
}
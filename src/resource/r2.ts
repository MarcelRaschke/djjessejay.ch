import type {AccessSession} from "../../contracts/session";
import type {Authorization} from "../../contracts/authorization";
import type {ResourceDescriptor} from "../../contracts/resource";
import {sessionMatchesAuthorization} from "../../contracts/session";
export interface PrivateR2Adapter{issueBoundedAccess(key:string,expiresAt:string):Promise<string>;}
export async function enforcePrivateR2(session:AccessSession,authorization:Authorization,resource:ResourceDescriptor,r2:PrivateR2Adapter,now=Date.now()):Promise<string>{
  if(!sessionMatchesAuthorization(session,authorization,now))throw new Error("invalid session");
  if(session.resource!==resource.id||session.scope!==resource.scope)throw new Error("resource binding mismatch");
  return r2.issueBoundedAccess(resource.r2_key,session.expires_at);
}
import {randomUUID} from "node:crypto";
import type {Authorization} from "../../contracts/authorization";
import type {AccessSession} from "../../contracts/session";
export function createSession(a:Authorization):AccessSession{
  return{session_id:randomUUID(),subject:a.subject,resource:a.resource,scope:a.scope,policy_id:a.policy,issued_at:a.issued_at,expires_at:a.expiration};
}
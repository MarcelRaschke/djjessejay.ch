import type { Authorization } from "./authorization";
export interface AccessSession {
  session_id:string; subject:string; resource:string; scope:string;
  policy_id:string; issued_at:string; expires_at:string;
}
export function sessionMatchesAuthorization(
  s:AccessSession,a:Authorization,now=Date.now()
):boolean {
  return s.subject===a.subject && s.resource===a.resource && s.scope===a.scope &&
    s.policy_id===a.policy && Date.parse(s.issued_at)>=Date.parse(a.issued_at) &&
    Date.parse(s.expires_at)<=Date.parse(a.expiration) &&
    now<Date.parse(s.expires_at);
}
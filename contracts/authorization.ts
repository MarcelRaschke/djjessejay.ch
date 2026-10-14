export interface Authorization {
  subject:string; resource:string; scope:string; policy:string;
  issued_at:string; expiration:string;
}
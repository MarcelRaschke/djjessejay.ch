export interface VerifiedIdentity {
  valid: true;
  subject: string;
  domain: string;
  chain_id: number;
  nonce: string;
}
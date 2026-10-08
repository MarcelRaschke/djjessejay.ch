export const PROTOCOL = "DJJJ-ACCESS/v1" as const;

export interface AccessRequest {
  protocol: typeof PROTOCOL;
  domain: string;
  wallet: string;
  chain_id: number;
  resource: string;
  scope: string;
  nonce: string;
  issued_at: string;
  expiration: string;
  signature: string;
}

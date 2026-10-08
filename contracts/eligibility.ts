export interface Eligibility {
  valid: true;
  assets: Readonly<Record<string,{balance:string;required:string}>>;
}
import { z } from 'zod';

const schema = z.object({
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(3100),
  DATABASE_URL: z.string().min(1),
  CANONICAL_PROFILE_PATH: z.string().default('/repo/artist-profile.json'),
  CORS_ORIGIN: z.string().default('https://djjessejay.ch'),
  KEYCLOAK_ISSUER: z.string().url(),
  KEYCLOAK_JWKS_URL: z.string().url(),
  KEYCLOAK_AUDIENCE: z.string().min(1).default('djjessejay-control-center')
});

export const env = schema.parse(process.env);

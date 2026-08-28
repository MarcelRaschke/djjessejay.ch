import type { FastifyReply, FastifyRequest } from 'fastify';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { env } from './env.js';

export type AppRole = 'viewer' | 'editor' | 'admin';

export type AuthContext = {
  subject: string;
  roles: AppRole[];
  token: JWTPayload;
};

declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthContext;
  }
}

const jwks = createRemoteJWKSet(new URL(env.KEYCLOAK_JWKS_URL));

function extractRoles(payload: JWTPayload): AppRole[] {
  const realmAccess = payload.realm_access as { roles?: unknown } | undefined;
  const raw = Array.isArray(realmAccess?.roles) ? realmAccess?.roles : [];
  return raw.filter((role): role is AppRole => role === 'viewer' || role === 'editor' || role === 'admin');
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return void reply.code(401).send({ error: 'unauthorized' });
  }

  try {
    const token = header.slice('Bearer '.length);
    const { payload } = await jwtVerify(token, jwks, {
      issuer: env.KEYCLOAK_ISSUER,
      audience: env.KEYCLOAK_AUDIENCE
    });

    request.auth = {
      subject: payload.sub ?? 'unknown',
      roles: extractRoles(payload),
      token: payload
    };
  } catch (error) {
    request.log.warn({ error }, 'JWT validation failed');
    return void reply.code(401).send({ error: 'invalid_token' });
  }
}

export function requireRole(...allowed: AppRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    await authenticate(request, reply);
    if (reply.sent) return;

    const roles = request.auth?.roles ?? [];
    if (!roles.some((role) => allowed.includes(role))) {
      return void reply.code(403).send({ error: 'forbidden', requiredAnyRole: allowed });
    }
  };
}

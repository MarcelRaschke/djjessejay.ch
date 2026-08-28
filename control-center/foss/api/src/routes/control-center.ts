import fs from 'node:fs/promises';
import type { FastifyPluginAsync } from 'fastify';
import { asc, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { requireRole } from '../auth.js';
import { env } from '../env.js';
import { db, pool } from '../db/client.js';
import { analyticsDaily, auditLog, events, radioEntities, releases, sourceRecords, visualAssets } from '../db/schema.js';

type CanonicalProfile = {
  artistName?: string;
  radio?: Record<string, unknown>;
  [key: string]: unknown;
};

const verifySourceSchema = z.object({
  operationId: z.string().uuid(),
  verificationStatus: z.enum(['verified', 'qualified', 'rejected']),
  evidenceClass: z.enum(['P0', 'P1', 'P2', 'P3', 'P4']).optional()
});

async function readCanonicalProfile(): Promise<CanonicalProfile> {
  const raw = await fs.readFile(env.CANONICAL_PROFILE_PATH, 'utf8');
  return JSON.parse(raw) as CanonicalProfile;
}

export const controlCenterRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async (_request, reply) => {
    try {
      await pool.query('select 1');
      return { status: 'healthy', database: 'connected', runtime: 'fastify-drizzle' };
    } catch {
      return reply.code(503).send({ status: 'degraded', database: 'unavailable', runtime: 'fastify-drizzle' });
    }
  });

  const readGuard = { preHandler: requireRole('viewer', 'editor', 'admin') };

  app.get('/profile', readGuard, async (_request, reply) => {
    try {
      const profile = await readCanonicalProfile();
      return {
        source: {
          type: 'git-repository',
          repository: 'MarcelRaschke/djjessejay.ch',
          path: 'artist-profile.json',
          evidenceClass: 'P1',
          mode: 'read-only-mounted-source'
        },
        data: profile
      };
    } catch (error) {
      app.log.error(error);
      return reply.code(503).send({ error: 'canonical_profile_unavailable', data: null });
    }
  });

  app.get('/sources', readGuard, async () => {
    const rows = await db.select().from(sourceRecords).orderBy(desc(sourceRecords.fetchedAt));
    return {
      generatedAt: new Date().toISOString(),
      policy: 'Evidence → Staging → Human Review → Curated Data → Publication',
      sources: rows
    };
  });

  app.get('/visuals', readGuard, async () => ({
    source: 'curated-postgresql',
    items: await db.select().from(visualAssets).orderBy(asc(visualAssets.name))
  }));

  app.get('/analytics', readGuard, async () => {
    const rows = await db.select().from(analyticsDaily).orderBy(desc(analyticsDaily.metricDate));
    return rows.length === 0
      ? { status: 'not_connected_or_empty', metrics: [] }
      : { status: 'connected', metrics: rows };
  });

  app.get('/radio', readGuard, async (_request, reply) => {
    let profile: CanonicalProfile;
    try {
      profile = await readCanonicalProfile();
    } catch {
      return reply.code(503).send({ error: 'canonical_profile_unavailable' });
    }

    const verifiedLive = await db.select().from(radioEntities)
      .where(eq(radioEntities.verificationStatus, 'verified'))
      .orderBy(desc(radioEntities.startsAt));

    return {
      identity: profile.radio ?? null,
      live: verifiedLive,
      warning: verifiedLive.length === 0
        ? 'No verified live radio metadata is available.'
        : undefined
    };
  });

  app.get('/music', readGuard, async () => ({
    source: 'curated-postgresql',
    releases: await db.select().from(releases).orderBy(desc(releases.releaseDate))
  }));

  app.get('/events', readGuard, async () => ({
    source: 'curated-postgresql',
    events: await db.select().from(events).orderBy(desc(events.startsAt))
  }));

  app.post('/commands/sources/:id/verification', {
    preHandler: requireRole('editor', 'admin')
  }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    const body = verifySourceSchema.safeParse(request.body);
    if (!params.success || !body.success) {
      return reply.code(400).send({ error: 'invalid_request' });
    }

    const [before] = await db.select().from(sourceRecords).where(eq(sourceRecords.id, params.data.id)).limit(1);
    if (!before) return reply.code(404).send({ error: 'source_not_found' });

    const [existingOperation] = await db.select().from(auditLog)
      .where(eq(auditLog.operationId, body.data.operationId)).limit(1);
    if (existingOperation) {
      return reply.code(409).send({ error: 'operation_id_reused' });
    }

    const [updated] = await db.transaction(async (tx) => {
      const rows = await tx.update(sourceRecords)
        .set({
          verificationStatus: body.data.verificationStatus,
          evidenceClass: body.data.evidenceClass ?? before.evidenceClass,
          verifiedAt: body.data.verificationStatus === 'verified' ? new Date() : null
        })
        .where(eq(sourceRecords.id, params.data.id))
        .returning();

      await tx.insert(auditLog).values({
        actorSubject: request.auth?.subject ?? 'unknown',
        action: 'set_source_verification',
        resourceType: 'source_record',
        resourceId: params.data.id,
        operationId: body.data.operationId,
        effect: body.data.verificationStatus === 'rejected' ? 'reject' : 'approve',
        beforeState: before,
        afterState: rows[0] ?? null
      });

      return rows;
    });

    return reply.code(200).send({ status: 'applied', operationId: body.data.operationId, source: updated });
  });
};

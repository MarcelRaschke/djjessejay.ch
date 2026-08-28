import type { FastifyPluginAsync } from 'fastify';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { importResidentAdvisor, importSoundCloud, type ExternalImport } from '../adapters/public-imports.js';
import { requireRole } from '../auth.js';
import { db } from '../db/client.js';
import { auditLog, importStaging, sourceRecords } from '../db/schema.js';

const importBody = z.object({
  operationId: z.string().uuid(),
  url: z.string().url().max(2048)
});

const reviewBody = z.object({
  operationId: z.string().uuid(),
  decision: z.enum(['approved', 'rejected']),
  note: z.string().trim().max(2000).optional()
});

async function ensureUnusedOperation(operationId: string): Promise<boolean> {
  const [existing] = await db.select({ id: auditLog.id }).from(auditLog)
    .where(eq(auditLog.operationId, operationId)).limit(1);
  return !existing;
}

async function persistImport(requestSubject: string, operationId: string, imported: ExternalImport) {
  return db.transaction(async (tx) => {
    const [createdSource] = await tx.insert(sourceRecords).values({
      sourceType: imported.sourceType,
      sourceUri: imported.sourceUri,
      sourceRevision: imported.sourceRevision,
      evidenceClass: imported.sourceType === 'resident-advisor' ? 'P3' : 'P2',
      verificationStatus: 'unverified',
      contentSha256: imported.contentSha256,
      metadata: imported.metadata
    }).onConflictDoNothing().returning();

    const source = createdSource ?? (await tx.select().from(sourceRecords).where(and(
      eq(sourceRecords.sourceType, imported.sourceType),
      eq(sourceRecords.sourceUri, imported.sourceUri),
      eq(sourceRecords.sourceRevision, imported.sourceRevision)
    )).limit(1))[0];

    if (!source) throw new Error('source_record_resolution_failed');

    const [createdStaging] = await tx.insert(importStaging).values({
      sourceRecordId: source.id,
      entityType: imported.entityType,
      externalKey: imported.externalKey,
      payload: imported.payload,
      status: 'pending'
    }).onConflictDoNothing().returning();

    const staging = createdStaging ?? (await tx.select().from(importStaging).where(and(
      eq(importStaging.sourceRecordId, source.id),
      eq(importStaging.entityType, imported.entityType),
      eq(importStaging.externalKey, imported.externalKey)
    )).limit(1))[0];

    if (!staging) throw new Error('staging_record_resolution_failed');

    await tx.insert(auditLog).values({
      actorSubject: requestSubject,
      action: `import_${imported.sourceType}_to_staging`,
      resourceType: 'import_staging',
      resourceId: staging.id,
      operationId,
      effect: 'import',
      beforeState: null,
      afterState: {
        stagingId: staging.id,
        sourceRecordId: source.id,
        sourceUri: source.sourceUri,
        sourceRevision: source.sourceRevision,
        status: staging.status
      }
    });

    return { source, staging };
  });
}

export const importRoutes: FastifyPluginAsync = async (app) => {
  const readGuard = { preHandler: requireRole('viewer', 'editor', 'admin') };
  const writeGuard = { preHandler: requireRole('editor', 'admin') };

  app.get('/staging', readGuard, async () => ({
    policy: 'External evidence enters staging only; approval does not publish or mutate curated entities.',
    items: await db.select().from(importStaging).orderBy(desc(importStaging.createdAt))
  }));

  app.post('/commands/imports/soundcloud', writeGuard, async (request, reply) => {
    const body = importBody.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid_request' });
    if (!(await ensureUnusedOperation(body.data.operationId))) {
      return reply.code(409).send({ error: 'operation_id_reused' });
    }

    try {
      const imported = await importSoundCloud(body.data.url);
      const result = await persistImport(request.auth?.subject ?? 'unknown', body.data.operationId, imported);
      return reply.code(201).send({ status: 'staged', operationId: body.data.operationId, ...result });
    } catch (error) {
      request.log.warn({ error }, 'SoundCloud staging import failed');
      return reply.code(502).send({ error: 'source_import_failed' });
    }
  });

  app.post('/commands/imports/resident-advisor', writeGuard, async (request, reply) => {
    const body = importBody.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid_request' });
    if (!(await ensureUnusedOperation(body.data.operationId))) {
      return reply.code(409).send({ error: 'operation_id_reused' });
    }

    try {
      const imported = await importResidentAdvisor(body.data.url);
      const result = await persistImport(request.auth?.subject ?? 'unknown', body.data.operationId, imported);
      return reply.code(201).send({ status: 'staged', operationId: body.data.operationId, ...result });
    } catch (error) {
      request.log.warn({ error }, 'Resident Advisor staging import failed');
      return reply.code(502).send({ error: 'source_import_failed' });
    }
  });

  app.post('/commands/staging/:id/review', writeGuard, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    const body = reviewBody.safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ error: 'invalid_request' });
    if (!(await ensureUnusedOperation(body.data.operationId))) {
      return reply.code(409).send({ error: 'operation_id_reused' });
    }

    const [before] = await db.select().from(importStaging).where(eq(importStaging.id, params.data.id)).limit(1);
    if (!before) return reply.code(404).send({ error: 'staging_record_not_found' });

    const [updated] = await db.transaction(async (tx) => {
      const rows = await tx.update(importStaging).set({
        status: body.data.decision,
        reviewNote: body.data.note ?? null,
        reviewedBy: request.auth?.subject ?? 'unknown',
        reviewedAt: new Date()
      }).where(eq(importStaging.id, params.data.id)).returning();

      await tx.insert(auditLog).values({
        actorSubject: request.auth?.subject ?? 'unknown',
        action: 'review_import_staging',
        resourceType: 'import_staging',
        resourceId: params.data.id,
        operationId: body.data.operationId,
        effect: body.data.decision === 'approved' ? 'approve' : 'reject',
        beforeState: before,
        afterState: rows[0] ?? null
      });

      return rows;
    });

    return reply.send({
      status: 'reviewed',
      operationId: body.data.operationId,
      staging: updated,
      curatedMutation: false
    });
  });
};

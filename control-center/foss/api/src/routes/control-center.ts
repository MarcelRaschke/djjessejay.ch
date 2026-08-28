import fs from 'node:fs/promises';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { asc, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { requireRole } from '../auth.js';
import { env } from '../env.js';
import { db, pool } from '../db/client.js';
import {
  analyticsDaily,
  auditLog,
  cmsPages,
  events,
  radioEntities,
  releases,
  sourceRecords,
  visualAssets
} from '../db/schema.js';

type CanonicalProfile = {
  artistName?: string;
  radio?: Record<string, unknown>;
  [key: string]: unknown;
};

const operationSchema = z.object({ operationId: z.string().uuid() });
const idParamsSchema = z.object({ id: z.string().uuid() });
const publicationStatusSchema = z.enum(['draft', 'review', 'published', 'archived']);
const sourceRecordIdSchema = z.string().uuid().nullable().optional();
const jsonObjectSchema = z.record(z.string(), z.unknown());

const verifySourceSchema = operationSchema.extend({
  verificationStatus: z.enum(['verified', 'qualified', 'rejected']),
  evidenceClass: z.enum(['P0', 'P1', 'P2', 'P3', 'P4']).optional()
});

const cmsCreateSchema = operationSchema.extend({
  slug: z.string().min(1).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(1).max(240),
  body: jsonObjectSchema.default({}),
  seo: jsonObjectSchema.default({}),
  status: publicationStatusSchema.default('draft'),
  sourceRecordId: sourceRecordIdSchema
});

const cmsUpdateSchema = operationSchema.extend({
  slug: z.string().min(1).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  title: z.string().min(1).max(240).optional(),
  body: jsonObjectSchema.optional(),
  seo: jsonObjectSchema.optional(),
  status: publicationStatusSchema.optional(),
  sourceRecordId: sourceRecordIdSchema
}).refine((value) => Object.keys(value).some((key) => key !== 'operationId'), { message: 'no_changes' });

const releaseCreateSchema = operationSchema.extend({
  title: z.string().min(1).max(240),
  releaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  label: z.string().max(240).nullable().optional(),
  catalogueNumber: z.string().max(120).nullable().optional(),
  status: publicationStatusSchema.default('draft'),
  metadata: jsonObjectSchema.default({}),
  sourceRecordId: sourceRecordIdSchema
});

const releaseUpdateSchema = operationSchema.extend({
  title: z.string().min(1).max(240).optional(),
  releaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  label: z.string().max(240).nullable().optional(),
  catalogueNumber: z.string().max(120).nullable().optional(),
  status: publicationStatusSchema.optional(),
  metadata: jsonObjectSchema.optional(),
  sourceRecordId: sourceRecordIdSchema
}).refine((value) => Object.keys(value).some((key) => key !== 'operationId'), { message: 'no_changes' });

const eventCreateSchema = operationSchema.extend({
  title: z.string().min(1).max(240),
  venue: z.string().max(240).nullable().optional(),
  city: z.string().max(160).nullable().optional(),
  startsAt: z.string().datetime({ offset: true }).nullable().optional(),
  externalUrl: z.string().url().nullable().optional(),
  status: publicationStatusSchema.default('draft'),
  metadata: jsonObjectSchema.default({}),
  sourceRecordId: sourceRecordIdSchema
});

const eventUpdateSchema = operationSchema.extend({
  title: z.string().min(1).max(240).optional(),
  venue: z.string().max(240).nullable().optional(),
  city: z.string().max(160).nullable().optional(),
  startsAt: z.string().datetime({ offset: true }).nullable().optional(),
  externalUrl: z.string().url().nullable().optional(),
  status: publicationStatusSchema.optional(),
  metadata: jsonObjectSchema.optional(),
  sourceRecordId: sourceRecordIdSchema
}).refine((value) => Object.keys(value).some((key) => key !== 'operationId'), { message: 'no_changes' });

async function readCanonicalProfile(): Promise<CanonicalProfile> {
  const raw = await fs.readFile(env.CANONICAL_PROFILE_PATH, 'utf8');
  return JSON.parse(raw) as CanonicalProfile;
}

async function operationAlreadyUsed(operationId: string): Promise<boolean> {
  const [existing] = await db.select({ id: auditLog.id }).from(auditLog)
    .where(eq(auditLog.operationId, operationId)).limit(1);
  return Boolean(existing);
}

function canPublish(request: FastifyRequest): boolean {
  return request.auth?.roles.includes('admin') ?? false;
}

function mutationEffect(status: string | undefined, fallback: 'create' | 'update'): 'create' | 'update' | 'publish' {
  return status === 'published' ? 'publish' : fallback;
}

function dbError(reply: FastifyReply, error: unknown) {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String((error as { code?: unknown }).code) : '';
  if (code === '23505') return reply.code(409).send({ error: 'conflict_or_operation_id_reused' });
  if (code === '23503') return reply.code(409).send({ error: 'referenced_source_not_found' });
  throw error;
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
  const editGuard = { preHandler: requireRole('editor', 'admin') };
  const adminGuard = { preHandler: requireRole('admin') };

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

  app.get('/sources', readGuard, async () => ({
    generatedAt: new Date().toISOString(),
    policy: 'Evidence → Staging → Human Review → Curated Data → Publication',
    sources: await db.select().from(sourceRecords).orderBy(desc(sourceRecords.fetchedAt))
  }));

  app.get('/cms', readGuard, async () => ({
    source: 'curated-postgresql',
    pages: await db.select().from(cmsPages).orderBy(asc(cmsPages.slug))
  }));

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
      warning: verifiedLive.length === 0 ? 'No verified live radio metadata is available.' : undefined
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

  app.post('/commands/sources/:id/verification', editGuard, async (request, reply) => {
    const params = idParamsSchema.safeParse(request.params);
    const body = verifySourceSchema.safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ error: 'invalid_request' });
    if (await operationAlreadyUsed(body.data.operationId)) return reply.code(409).send({ error: 'operation_id_reused' });

    const [before] = await db.select().from(sourceRecords).where(eq(sourceRecords.id, params.data.id)).limit(1);
    if (!before) return reply.code(404).send({ error: 'source_not_found' });

    try {
      const [updated] = await db.transaction(async (tx) => {
        const rows = await tx.update(sourceRecords).set({
          verificationStatus: body.data.verificationStatus,
          evidenceClass: body.data.evidenceClass ?? before.evidenceClass,
          verifiedAt: body.data.verificationStatus === 'verified' ? new Date() : null
        }).where(eq(sourceRecords.id, params.data.id)).returning();

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
    } catch (error) {
      return dbError(reply, error);
    }
  });

  app.post('/commands/cms', editGuard, async (request, reply) => {
    const body = cmsCreateSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid_request', issues: body.error.issues });
    if (body.data.status === 'published' && !canPublish(request)) return reply.code(403).send({ error: 'admin_required_to_publish' });
    if (await operationAlreadyUsed(body.data.operationId)) return reply.code(409).send({ error: 'operation_id_reused' });
    const { operationId, ...values } = body.data;

    try {
      const [created] = await db.transaction(async (tx) => {
        const rows = await tx.insert(cmsPages).values(values).returning();
        await tx.insert(auditLog).values({ actorSubject: request.auth?.subject ?? 'unknown', action: 'create_cms_page', resourceType: 'cms_page', resourceId: rows[0]?.id, operationId, effect: mutationEffect(values.status, 'create'), beforeState: null, afterState: rows[0] ?? null });
        return rows;
      });
      return reply.code(201).send({ status: 'applied', operationId, page: created });
    } catch (error) { return dbError(reply, error); }
  });

  app.patch('/commands/cms/:id', editGuard, async (request, reply) => {
    const params = idParamsSchema.safeParse(request.params);
    const body = cmsUpdateSchema.safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ error: 'invalid_request' });
    if (body.data.status === 'published' && !canPublish(request)) return reply.code(403).send({ error: 'admin_required_to_publish' });
    if (await operationAlreadyUsed(body.data.operationId)) return reply.code(409).send({ error: 'operation_id_reused' });
    const [before] = await db.select().from(cmsPages).where(eq(cmsPages.id, params.data.id)).limit(1);
    if (!before) return reply.code(404).send({ error: 'cms_page_not_found' });
    const { operationId, ...changes } = body.data;

    try {
      const [updated] = await db.transaction(async (tx) => {
        const rows = await tx.update(cmsPages).set({ ...changes, updatedAt: new Date() }).where(eq(cmsPages.id, params.data.id)).returning();
        await tx.insert(auditLog).values({ actorSubject: request.auth?.subject ?? 'unknown', action: 'update_cms_page', resourceType: 'cms_page', resourceId: params.data.id, operationId, effect: mutationEffect(changes.status, 'update'), beforeState: before, afterState: rows[0] ?? null });
        return rows;
      });
      return { status: 'applied', operationId, page: updated };
    } catch (error) { return dbError(reply, error); }
  });

  app.delete('/commands/cms/:id', adminGuard, async (request, reply) => {
    const params = idParamsSchema.safeParse(request.params);
    const body = operationSchema.safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ error: 'invalid_request' });
    if (await operationAlreadyUsed(body.data.operationId)) return reply.code(409).send({ error: 'operation_id_reused' });
    const [before] = await db.select().from(cmsPages).where(eq(cmsPages.id, params.data.id)).limit(1);
    if (!before) return reply.code(404).send({ error: 'cms_page_not_found' });
    try {
      await db.transaction(async (tx) => {
        await tx.delete(cmsPages).where(eq(cmsPages.id, params.data.id));
        await tx.insert(auditLog).values({ actorSubject: request.auth?.subject ?? 'unknown', action: 'delete_cms_page', resourceType: 'cms_page', resourceId: params.data.id, operationId: body.data.operationId, effect: 'delete', beforeState: before, afterState: null });
      });
      return reply.code(200).send({ status: 'applied', operationId: body.data.operationId, deletedId: params.data.id });
    } catch (error) { return dbError(reply, error); }
  });

  app.post('/commands/releases', editGuard, async (request, reply) => {
    const body = releaseCreateSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid_request', issues: body.error.issues });
    if (body.data.status === 'published' && !canPublish(request)) return reply.code(403).send({ error: 'admin_required_to_publish' });
    if (await operationAlreadyUsed(body.data.operationId)) return reply.code(409).send({ error: 'operation_id_reused' });
    const { operationId, ...values } = body.data;
    try {
      const [created] = await db.transaction(async (tx) => {
        const rows = await tx.insert(releases).values(values).returning();
        await tx.insert(auditLog).values({ actorSubject: request.auth?.subject ?? 'unknown', action: 'create_release', resourceType: 'release', resourceId: rows[0]?.id, operationId, effect: mutationEffect(values.status, 'create'), beforeState: null, afterState: rows[0] ?? null });
        return rows;
      });
      return reply.code(201).send({ status: 'applied', operationId, release: created });
    } catch (error) { return dbError(reply, error); }
  });

  app.patch('/commands/releases/:id', editGuard, async (request, reply) => {
    const params = idParamsSchema.safeParse(request.params);
    const body = releaseUpdateSchema.safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ error: 'invalid_request' });
    if (body.data.status === 'published' && !canPublish(request)) return reply.code(403).send({ error: 'admin_required_to_publish' });
    if (await operationAlreadyUsed(body.data.operationId)) return reply.code(409).send({ error: 'operation_id_reused' });
    const [before] = await db.select().from(releases).where(eq(releases.id, params.data.id)).limit(1);
    if (!before) return reply.code(404).send({ error: 'release_not_found' });
    const { operationId, ...changes } = body.data;
    try {
      const [updated] = await db.transaction(async (tx) => {
        const rows = await tx.update(releases).set({ ...changes, updatedAt: new Date() }).where(eq(releases.id, params.data.id)).returning();
        await tx.insert(auditLog).values({ actorSubject: request.auth?.subject ?? 'unknown', action: 'update_release', resourceType: 'release', resourceId: params.data.id, operationId, effect: mutationEffect(changes.status, 'update'), beforeState: before, afterState: rows[0] ?? null });
        return rows;
      });
      return { status: 'applied', operationId, release: updated };
    } catch (error) { return dbError(reply, error); }
  });

  app.delete('/commands/releases/:id', adminGuard, async (request, reply) => {
    const params = idParamsSchema.safeParse(request.params);
    const body = operationSchema.safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ error: 'invalid_request' });
    if (await operationAlreadyUsed(body.data.operationId)) return reply.code(409).send({ error: 'operation_id_reused' });
    const [before] = await db.select().from(releases).where(eq(releases.id, params.data.id)).limit(1);
    if (!before) return reply.code(404).send({ error: 'release_not_found' });
    try {
      await db.transaction(async (tx) => {
        await tx.delete(releases).where(eq(releases.id, params.data.id));
        await tx.insert(auditLog).values({ actorSubject: request.auth?.subject ?? 'unknown', action: 'delete_release', resourceType: 'release', resourceId: params.data.id, operationId: body.data.operationId, effect: 'delete', beforeState: before, afterState: null });
      });
      return { status: 'applied', operationId: body.data.operationId, deletedId: params.data.id };
    } catch (error) { return dbError(reply, error); }
  });

  app.post('/commands/events', editGuard, async (request, reply) => {
    const body = eventCreateSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid_request', issues: body.error.issues });
    if (body.data.status === 'published' && !canPublish(request)) return reply.code(403).send({ error: 'admin_required_to_publish' });
    if (await operationAlreadyUsed(body.data.operationId)) return reply.code(409).send({ error: 'operation_id_reused' });
    const { operationId, startsAt, ...rest } = body.data;
    const values = { ...rest, startsAt: startsAt ? new Date(startsAt) : startsAt ?? null };
    try {
      const [created] = await db.transaction(async (tx) => {
        const rows = await tx.insert(events).values(values).returning();
        await tx.insert(auditLog).values({ actorSubject: request.auth?.subject ?? 'unknown', action: 'create_event', resourceType: 'event', resourceId: rows[0]?.id, operationId, effect: mutationEffect(values.status, 'create'), beforeState: null, afterState: rows[0] ?? null });
        return rows;
      });
      return reply.code(201).send({ status: 'applied', operationId, event: created });
    } catch (error) { return dbError(reply, error); }
  });

  app.patch('/commands/events/:id', editGuard, async (request, reply) => {
    const params = idParamsSchema.safeParse(request.params);
    const body = eventUpdateSchema.safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ error: 'invalid_request' });
    if (body.data.status === 'published' && !canPublish(request)) return reply.code(403).send({ error: 'admin_required_to_publish' });
    if (await operationAlreadyUsed(body.data.operationId)) return reply.code(409).send({ error: 'operation_id_reused' });
    const [before] = await db.select().from(events).where(eq(events.id, params.data.id)).limit(1);
    if (!before) return reply.code(404).send({ error: 'event_not_found' });
    const { operationId, startsAt, ...rest } = body.data;
    const changes = { ...rest, ...(startsAt !== undefined ? { startsAt: startsAt ? new Date(startsAt) : null } : {}), updatedAt: new Date() };
    try {
      const [updated] = await db.transaction(async (tx) => {
        const rows = await tx.update(events).set(changes).where(eq(events.id, params.data.id)).returning();
        await tx.insert(auditLog).values({ actorSubject: request.auth?.subject ?? 'unknown', action: 'update_event', resourceType: 'event', resourceId: params.data.id, operationId, effect: mutationEffect(rest.status, 'update'), beforeState: before, afterState: rows[0] ?? null });
        return rows;
      });
      return { status: 'applied', operationId, event: updated };
    } catch (error) { return dbError(reply, error); }
  });

  app.delete('/commands/events/:id', adminGuard, async (request, reply) => {
    const params = idParamsSchema.safeParse(request.params);
    const body = operationSchema.safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ error: 'invalid_request' });
    if (await operationAlreadyUsed(body.data.operationId)) return reply.code(409).send({ error: 'operation_id_reused' });
    const [before] = await db.select().from(events).where(eq(events.id, params.data.id)).limit(1);
    if (!before) return reply.code(404).send({ error: 'event_not_found' });
    try {
      await db.transaction(async (tx) => {
        await tx.delete(events).where(eq(events.id, params.data.id));
        await tx.insert(auditLog).values({ actorSubject: request.auth?.subject ?? 'unknown', action: 'delete_event', resourceType: 'event', resourceId: params.data.id, operationId: body.data.operationId, effect: 'delete', beforeState: before, afterState: null });
      });
      return { status: 'applied', operationId: body.data.operationId, deletedId: params.data.id };
    } catch (error) { return dbError(reply, error); }
  });
};

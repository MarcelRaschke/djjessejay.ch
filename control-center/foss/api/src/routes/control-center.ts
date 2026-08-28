import fs from 'node:fs/promises';
import type { FastifyPluginAsync } from 'fastify';
import { asc, desc, eq } from 'drizzle-orm';
import { env } from '../env.js';
import { db, pool } from '../db/client.js';
import { analyticsDaily, events, radioEntities, releases, sourceRecords, visualAssets } from '../db/schema.js';

type CanonicalProfile = {
  artistName?: string;
  radio?: Record<string, unknown>;
  [key: string]: unknown;
};

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

  app.get('/profile', async (_request, reply) => {
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

  app.get('/sources', async () => {
    const rows = await db.select().from(sourceRecords).orderBy(desc(sourceRecords.fetchedAt));
    return {
      generatedAt: new Date().toISOString(),
      policy: 'Evidence → Staging → Human Review → Curated Data → Publication',
      sources: rows
    };
  });

  app.get('/visuals', async () => ({
    source: 'curated-postgresql',
    items: await db.select().from(visualAssets).orderBy(asc(visualAssets.name))
  }));

  app.get('/analytics', async () => {
    const rows = await db.select().from(analyticsDaily).orderBy(desc(analyticsDaily.metricDate));
    return rows.length === 0
      ? { status: 'not_connected_or_empty', metrics: [] }
      : { status: 'connected', metrics: rows };
  });

  app.get('/radio', async (_request, reply) => {
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

  app.get('/music', async () => ({
    source: 'curated-postgresql',
    releases: await db.select().from(releases).orderBy(desc(releases.releaseDate))
  }));

  app.get('/events', async () => ({
    source: 'curated-postgresql',
    events: await db.select().from(events).orderBy(desc(events.startsAt))
  }));
};

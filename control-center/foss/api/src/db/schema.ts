import { date, jsonb, numeric, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const evidenceClass = pgEnum('evidence_class', ['P0','P1','P2','P3','P4']);
export const verificationStatus = pgEnum('verification_status', ['verified','qualified','unverified','rejected']);
export const publicationStatus = pgEnum('publication_status', ['draft','review','published','archived']);

export const sourceRecords = pgTable('source_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  sourceType: text('source_type').notNull(),
  sourceUri: text('source_uri').notNull(),
  sourceRevision: text('source_revision'),
  evidenceClass: evidenceClass('evidence_class').notNull().default('P4'),
  verificationStatus: verificationStatus('verification_status').notNull().default('unverified'),
  fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  contentSha256: text('content_sha256'),
  metadata: jsonb('metadata').notNull().default({})
});

export const releases = pgTable('releases', {
  id: uuid('id').defaultRandom().primaryKey(), title: text('title').notNull(), releaseDate: date('release_date'),
  label: text('label'), catalogueNumber: text('catalogue_number'), status: publicationStatus('status').notNull().default('draft'),
  metadata: jsonb('metadata').notNull().default({}), sourceRecordId: uuid('source_record_id').references(() => sourceRecords.id)
});

export const events = pgTable('events', {
  id: uuid('id').defaultRandom().primaryKey(), title: text('title').notNull(), venue: text('venue'), city: text('city'),
  startsAt: timestamp('starts_at', { withTimezone: true }), externalUrl: text('external_url'),
  status: publicationStatus('status').notNull().default('draft'), metadata: jsonb('metadata').notNull().default({}),
  sourceRecordId: uuid('source_record_id').references(() => sourceRecords.id)
});

export const radioEntities = pgTable('radio_entities', {
  id: uuid('id').defaultRandom().primaryKey(), entityType: text('entity_type').notNull(), name: text('name').notNull(),
  startsAt: timestamp('starts_at', { withTimezone: true }), endsAt: timestamp('ends_at', { withTimezone: true }),
  liveData: jsonb('live_data'), sourceRecordId: uuid('source_record_id').references(() => sourceRecords.id),
  verificationStatus: verificationStatus('verification_status').notNull().default('unverified')
});

export const visualAssets = pgTable('visual_assets', {
  id: uuid('id').defaultRandom().primaryKey(), name: text('name').notNull(), objectKey: text('object_key'), externalUri: text('external_uri'),
  mimeType: text('mime_type'), sha256: text('sha256'), metadata: jsonb('metadata').notNull().default({}),
  sourceRecordId: uuid('source_record_id').references(() => sourceRecords.id)
});

export const analyticsDaily = pgTable('analytics_daily', {
  id: uuid('id').defaultRandom().primaryKey(), metricDate: date('metric_date').notNull(), source: text('source').notNull(),
  metric: text('metric').notNull(), value: numeric('value').notNull(), sourceRecordId: uuid('source_record_id').references(() => sourceRecords.id)
});

export const auditLog = pgTable('audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  actorSubject: text('actor_subject').notNull(),
  action: text('action').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id'),
  operationId: uuid('operation_id').notNull(),
  effect: text('effect').notNull(),
  beforeState: jsonb('before_state'),
  afterState: jsonb('after_state'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

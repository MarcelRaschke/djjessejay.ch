import { date, integer, jsonb, numeric, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

export const evidenceClass = pgEnum('evidence_class', ['P0', 'P1', 'P2', 'P3', 'P4']);
export const verificationStatus = pgEnum('verification_status', ['verified', 'qualified', 'unverified', 'rejected']);
export const publicationStatus = pgEnum('publication_status', ['draft', 'review', 'published', 'archived']);
export const stagingStatus = pgEnum('staging_status', ['pending', 'approved', 'rejected']);

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
}, (table) => ({
  identity: uniqueIndex('uq_source_records_identity').on(table.sourceType, table.sourceUri, table.sourceRevision)
}));

export const importStaging = pgTable('import_staging', {
  id: uuid('id').defaultRandom().primaryKey(),
  sourceRecordId: uuid('source_record_id').notNull().references(() => sourceRecords.id, { onDelete: 'cascade' }),
  entityType: text('entity_type').notNull(),
  externalKey: text('external_key').notNull(),
  payload: jsonb('payload').notNull(),
  status: stagingStatus('status').notNull().default('pending'),
  reviewNote: text('review_note'),
  reviewedBy: text('reviewed_by'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  sourceEntity: uniqueIndex('uq_import_staging_source_entity').on(table.sourceRecordId, table.entityType, table.externalKey)
}));

export const cmsPages = pgTable('cms_pages', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  body: jsonb('body').notNull().default({}),
  status: publicationStatus('status').notNull().default('draft'),
  seo: jsonb('seo').notNull().default({}),
  sourceRecordId: uuid('source_record_id').references(() => sourceRecords.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const releases = pgTable('releases', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  releaseDate: date('release_date'),
  label: text('label'),
  catalogueNumber: text('catalogue_number'),
  status: publicationStatus('status').notNull().default('draft'),
  metadata: jsonb('metadata').notNull().default({}),
  sourceRecordId: uuid('source_record_id').references(() => sourceRecords.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const tracks = pgTable('tracks', {
  id: uuid('id').defaultRandom().primaryKey(),
  releaseId: uuid('release_id').references(() => releases.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  position: integer('position'),
  durationSeconds: integer('duration_seconds'),
  metadata: jsonb('metadata').notNull().default({}),
  sourceRecordId: uuid('source_record_id').references(() => sourceRecords.id)
});

export const events = pgTable('events', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  venue: text('venue'),
  city: text('city'),
  startsAt: timestamp('starts_at', { withTimezone: true }),
  externalUrl: text('external_url'),
  status: publicationStatus('status').notNull().default('draft'),
  metadata: jsonb('metadata').notNull().default({}),
  sourceRecordId: uuid('source_record_id').references(() => sourceRecords.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const radioEntities = pgTable('radio_entities', {
  id: uuid('id').defaultRandom().primaryKey(),
  entityType: text('entity_type').notNull(),
  name: text('name').notNull(),
  startsAt: timestamp('starts_at', { withTimezone: true }),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  liveData: jsonb('live_data'),
  sourceRecordId: uuid('source_record_id').references(() => sourceRecords.id),
  verificationStatus: verificationStatus('verification_status').notNull().default('unverified'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const visualAssets = pgTable('visual_assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  objectKey: text('object_key'),
  externalUri: text('external_uri'),
  mimeType: text('mime_type'),
  sha256: text('sha256'),
  metadata: jsonb('metadata').notNull().default({}),
  sourceRecordId: uuid('source_record_id').references(() => sourceRecords.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const analyticsDaily = pgTable('analytics_daily', {
  id: uuid('id').defaultRandom().primaryKey(),
  metricDate: date('metric_date').notNull(),
  source: text('source').notNull(),
  metric: text('metric').notNull(),
  value: numeric('value').notNull(),
  sourceRecordId: uuid('source_record_id').references(() => sourceRecords.id)
}, (table) => ({
  metricIdentity: uniqueIndex('uq_analytics_daily_metric').on(table.metricDate, table.source, table.metric)
}));

export const auditLog = pgTable('audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  actorSubject: text('actor_subject').notNull(),
  action: text('action').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id'),
  operationId: uuid('operation_id').notNull().unique(),
  effect: text('effect').notNull(),
  beforeState: jsonb('before_state'),
  afterState: jsonb('after_state'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

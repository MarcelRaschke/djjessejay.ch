create extension if not exists pgcrypto;

do $$ begin
  create type evidence_class as enum ('P0','P1','P2','P3','P4');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type verification_status as enum ('verified','qualified','unverified','rejected');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type publication_status as enum ('draft','review','published','archived');
exception when duplicate_object then null;
end $$;

create table if not exists source_records (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  source_uri text not null,
  source_revision text,
  evidence_class evidence_class not null default 'P4',
  verification_status verification_status not null default 'unverified',
  fetched_at timestamptz not null default now(),
  verified_at timestamptz,
  content_sha256 text,
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists uq_source_records_identity
  on source_records(source_type, source_uri, coalesce(source_revision, ''));

create table if not exists cms_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  body jsonb not null default '{}'::jsonb,
  status publication_status not null default 'draft',
  seo jsonb not null default '{}'::jsonb,
  source_record_id uuid references source_records(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists releases (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  release_date date,
  label text,
  catalogue_number text,
  status publication_status not null default 'draft',
  metadata jsonb not null default '{}'::jsonb,
  source_record_id uuid references source_records(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tracks (
  id uuid primary key default gen_random_uuid(),
  release_id uuid references releases(id) on delete cascade,
  title text not null,
  position integer,
  duration_seconds integer,
  metadata jsonb not null default '{}'::jsonb,
  source_record_id uuid references source_records(id)
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  venue text,
  city text,
  starts_at timestamptz,
  external_url text,
  status publication_status not null default 'draft',
  metadata jsonb not null default '{}'::jsonb,
  source_record_id uuid references source_records(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists radio_entities (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('station','show','episode','schedule','now_playing')),
  name text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  live_data jsonb,
  source_record_id uuid references source_records(id),
  verification_status verification_status not null default 'unverified',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists visual_assets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  object_key text,
  external_uri text,
  mime_type text,
  sha256 text,
  metadata jsonb not null default '{}'::jsonb,
  source_record_id uuid references source_records(id),
  created_at timestamptz not null default now()
);

create table if not exists analytics_daily (
  id uuid primary key default gen_random_uuid(),
  metric_date date not null,
  source text not null,
  metric text not null,
  value numeric not null,
  source_record_id uuid references source_records(id),
  unique(metric_date, source, metric)
);

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_subject text not null,
  action text not null,
  resource_type text not null,
  resource_id text,
  operation_id uuid not null default gen_random_uuid(),
  effect text not null check (effect in ('read','create','update','delete','publish','import','approve','reject')),
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_source_records_uri on source_records(source_uri);
create index if not exists idx_source_records_verification on source_records(verification_status, evidence_class);
create index if not exists idx_audit_log_resource on audit_log(resource_type, resource_id, created_at desc);

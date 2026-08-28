DO $$ BEGIN
 CREATE TYPE "public"."staging_status" AS ENUM('pending', 'approved', 'rejected');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "import_staging" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "source_record_id" uuid NOT NULL,
  "entity_type" text NOT NULL,
  "external_key" text NOT NULL,
  "payload" jsonb NOT NULL,
  "status" "staging_status" DEFAULT 'pending' NOT NULL,
  "review_note" text,
  "reviewed_by" text,
  "reviewed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_import_staging_source_entity" ON "import_staging" USING btree ("source_record_id","entity_type","external_key");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "import_staging" ADD CONSTRAINT "import_staging_source_record_id_source_records_id_fk" FOREIGN KEY ("source_record_id") REFERENCES "public"."source_records"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

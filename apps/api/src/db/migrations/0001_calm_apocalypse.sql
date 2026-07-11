CREATE TYPE "public"."contact_status" AS ENUM('active', 'unsubscribed', 'bounced', 'suppressed');--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "first_name" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "last_name" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "custom_fields" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "status" "contact_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_email_unique_idx" ON "contacts" USING btree ("email");
CREATE TYPE "public"."campaign_audience_type" AS ENUM('list', 'tags', 'contacts');--> statement-breakpoint
ALTER TABLE "campaigns" ALTER COLUMN "list_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "audience_type" "campaign_audience_type" DEFAULT 'list' NOT NULL;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "tag_ids" uuid[];--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "contact_ids" uuid[];
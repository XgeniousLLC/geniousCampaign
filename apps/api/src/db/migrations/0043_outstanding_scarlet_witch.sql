CREATE TYPE "public"."unsub_format" AS ENUM('text', 'link');--> statement-breakpoint
ALTER TABLE "sequence_settings" ADD COLUMN "unsub_format" "unsub_format" DEFAULT 'text' NOT NULL;--> statement-breakpoint
ALTER TABLE "sequence_settings" ADD COLUMN "unsub_message" text;--> statement-breakpoint
ALTER TABLE "sequence_settings" ADD COLUMN "unsub_header" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "sequence_settings" ADD COLUMN "unsub_on_reply" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "sequence_settings" ADD COLUMN "unsub_keywords" text DEFAULT 'stop' NOT NULL;
CREATE TYPE "public"."custom_field_input_type" AS ENUM('text', 'number', 'date', 'url', 'boolean', 'select');--> statement-breakpoint
CREATE TABLE "custom_field_defs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"input_type" "custom_field_input_type" DEFAULT 'text' NOT NULL,
	"options" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "custom_field_defs_key_unique_idx" ON "custom_field_defs" USING btree ("key");
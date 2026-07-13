CREATE TYPE "public"."error_log_source" AS ENUM('frontend', 'backend');--> statement-breakpoint
CREATE TABLE "error_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" "error_log_source" NOT NULL,
	"message" text NOT NULL,
	"stack" text,
	"path" text,
	"context" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

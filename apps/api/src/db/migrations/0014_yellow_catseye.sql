CREATE TYPE "public"."verification_provider" AS ENUM('reoon', 'neverbounce');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('valid', 'invalid', 'risky', 'unknown');--> statement-breakpoint
CREATE TABLE "verification_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"status" "verification_status" NOT NULL,
	"is_deliverable" boolean NOT NULL,
	"provider" "verification_provider" NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "verification_results_email_unique_idx" ON "verification_results" USING btree ("email");
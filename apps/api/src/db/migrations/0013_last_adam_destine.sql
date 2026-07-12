CREATE TYPE "public"."sender_provider" AS ENUM('ses', 'gmail');--> statement-breakpoint
CREATE TABLE "sender_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" "sender_provider" NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"daily_send_limit" integer NOT NULL,
	"sent_today" integer DEFAULT 0 NOT NULL,
	"sent_today_date" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"gmail_refresh_token_encrypted" text,
	"gmail_last_bounce_scan_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "sender_accounts_email_unique_idx" ON "sender_accounts" USING btree ("email");
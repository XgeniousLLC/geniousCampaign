CREATE TABLE "gmail_oauth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" text NOT NULL,
	"client_secret_encrypted" text NOT NULL,
	"redirect_uri" text NOT NULL,
	"is_custom" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sender_accounts" ADD COLUMN "gmail_client_id" text;--> statement-breakpoint
ALTER TABLE "sender_accounts" ADD COLUMN "gmail_client_secret_encrypted" text;--> statement-breakpoint
ALTER TABLE "sender_accounts" ADD COLUMN "gmail_redirect_uri" text;
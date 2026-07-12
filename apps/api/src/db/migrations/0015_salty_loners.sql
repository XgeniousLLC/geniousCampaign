CREATE TABLE "breaker_evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"window_size" integer NOT NULL,
	"bounce_or_complaint_count" integer NOT NULL,
	"total_count" integer NOT NULL,
	"rate_pct" double precision NOT NULL,
	"threshold_pct" double precision NOT NULL,
	"tripped" boolean NOT NULL,
	"paused_enrollment_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "breaker_resets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reset_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "send_to_email" text;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "large_send_confirmed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "breaker_resets" ADD CONSTRAINT "breaker_resets_reset_by_user_id_users_id_fk" FOREIGN KEY ("reset_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
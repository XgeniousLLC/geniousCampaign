CREATE TYPE "public"."scheduled_reply_status" AS ENUM('pending', 'sent', 'cancelled');--> statement-breakpoint
CREATE TABLE "scheduled_replies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"html" text NOT NULL,
	"text" text NOT NULL,
	"cc" text,
	"bcc" text,
	"send_at" timestamp with time zone NOT NULL,
	"status" "scheduled_reply_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scheduled_replies" ADD CONSTRAINT "scheduled_replies_thread_id_email_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."email_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scheduled_replies_thread_idx" ON "scheduled_replies" USING btree ("thread_id");
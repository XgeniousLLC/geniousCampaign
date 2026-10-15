CREATE TYPE "public"."sending_priority" AS ENUM('followups', 'new', 'balanced', 'aggressive');--> statement-breakpoint
CREATE TYPE "public"."text_only_mode" AS ENUM('off', 'first_only', 'all');--> statement-breakpoint
CREATE TYPE "public"."email_message_dir" AS ENUM('out', 'in');--> statement-breakpoint
CREATE TYPE "public"."subsequence_trigger" AS ENUM('reply', 'positive', 'open', 'click', 'ooo', 'custom_text');--> statement-breakpoint
CREATE TYPE "public"."thread_status" AS ENUM('uncategorized', 'interested', 'not_interested', 'meeting_booked', 'out_of_office', 'closed');--> statement-breakpoint
CREATE TYPE "public"."thread_status_source" AS ENUM('auto', 'manual', 'ai');--> statement-breakpoint
CREATE TABLE "sending_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"days" boolean[] DEFAULT '{true,true,true,true,true,false,false}' NOT NULL,
	"start_min" integer DEFAULT 540 NOT NULL,
	"end_min" integer DEFAULT 1020 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sequence_settings" (
	"sequence_id" uuid PRIMARY KEY NOT NULL,
	"stop_on_reply" boolean DEFAULT true NOT NULL,
	"track_open" boolean DEFAULT true NOT NULL,
	"track_click" boolean DEFAULT true NOT NULL,
	"strip_styling" boolean DEFAULT false NOT NULL,
	"text_only_mode" text_only_mode DEFAULT 'off' NOT NULL,
	"trigger_once" boolean DEFAULT true NOT NULL,
	"priority" "sending_priority" DEFAULT 'followups' NOT NULL,
	"daily_cap" integer,
	"enroll_per_day" integer,
	"schedule_id" uuid,
	"deal_value" integer DEFAULT 0 NOT NULL,
	"verify_before_send" boolean DEFAULT false NOT NULL,
	"cc" text,
	"bcc" text,
	"unsub_footer" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"provider_message_id" text NOT NULL,
	"dir" "email_message_dir" NOT NULL,
	"from_email" text,
	"to_email" text,
	"snippet" text,
	"body_text" text,
	"body_html" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_messages_provider_message_id_unique" UNIQUE("provider_message_id")
);
--> statement-breakpoint
CREATE TABLE "email_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_thread_id" text NOT NULL,
	"enrollment_id" uuid,
	"sequence_id" uuid,
	"contact_id" uuid,
	"sender_account_id" uuid,
	"subject" text,
	"status" "thread_status" DEFAULT 'uncategorized' NOT NULL,
	"status_source" "thread_status_source" DEFAULT 'auto' NOT NULL,
	"status_confidence" text,
	"is_finished" boolean DEFAULT false NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"is_starred" boolean DEFAULT false NOT NULL,
	"last_inbound_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_threads_provider_thread_id_unique" UNIQUE("provider_thread_id")
);
--> statement-breakpoint
CREATE TABLE "subsequences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_sequence_id" uuid NOT NULL,
	"name" text NOT NULL,
	"trigger" "subsequence_trigger" DEFAULT 'reply' NOT NULL,
	"match_text" text,
	"child_sequence_id" uuid NOT NULL,
	"delay_ms" text DEFAULT '0' NOT NULL,
	"stop_parent" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subsequences_parent_child_trigger_unique" UNIQUE("parent_sequence_id","child_sequence_id","trigger")
);
--> statement-breakpoint
ALTER TABLE "sends" ADD COLUMN "provider_thread_id" text;--> statement-breakpoint
ALTER TABLE "sends" ADD COLUMN "cc" text;--> statement-breakpoint
ALTER TABLE "sends" ADD COLUMN "bcc" text;--> statement-breakpoint
ALTER TABLE "sequence_settings" ADD CONSTRAINT "sequence_settings_sequence_id_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."sequences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sequence_settings" ADD CONSTRAINT "sequence_settings_schedule_id_sending_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."sending_schedules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_thread_id_email_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."email_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_threads" ADD CONSTRAINT "email_threads_enrollment_id_sequence_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."sequence_enrollments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_threads" ADD CONSTRAINT "email_threads_sequence_id_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."sequences"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_threads" ADD CONSTRAINT "email_threads_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_threads" ADD CONSTRAINT "email_threads_sender_account_id_sender_accounts_id_fk" FOREIGN KEY ("sender_account_id") REFERENCES "public"."sender_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subsequences" ADD CONSTRAINT "subsequences_parent_sequence_id_sequences_id_fk" FOREIGN KEY ("parent_sequence_id") REFERENCES "public"."sequences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subsequences" ADD CONSTRAINT "subsequences_child_sequence_id_sequences_id_fk" FOREIGN KEY ("child_sequence_id") REFERENCES "public"."sequences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_messages_thread_sent_idx" ON "email_messages" USING btree ("thread_id","sent_at");--> statement-breakpoint
CREATE INDEX "email_threads_sender_inbound_idx" ON "email_threads" USING btree ("sender_account_id","last_inbound_at");--> statement-breakpoint
CREATE INDEX "email_threads_sequence_idx" ON "email_threads" USING btree ("sequence_id");--> statement-breakpoint
CREATE INDEX "email_threads_contact_idx" ON "email_threads" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "subsequences_parent_idx" ON "subsequences" USING btree ("parent_sequence_id");
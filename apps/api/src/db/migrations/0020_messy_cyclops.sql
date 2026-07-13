CREATE TABLE "trigger_evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trigger_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"enrolled" boolean NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trigger_evaluations" ADD CONSTRAINT "trigger_evaluations_trigger_id_triggers_id_fk" FOREIGN KEY ("trigger_id") REFERENCES "public"."triggers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trigger_evaluations" ADD CONSTRAINT "trigger_evaluations_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;
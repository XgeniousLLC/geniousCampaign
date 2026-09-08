ALTER TYPE "public"."email_event_type" ADD VALUE 'delivery';--> statement-breakpoint
ALTER TYPE "public"."send_status" ADD VALUE 'delivered';--> statement-breakpoint
CREATE TABLE "sequence_step_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sequence_step_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sequence_step_templates_step_template_unique" UNIQUE("sequence_step_id","template_id")
);
--> statement-breakpoint
ALTER TABLE "templates" DROP CONSTRAINT "templates_parent_template_id_templates_id_fk";
--> statement-breakpoint
ALTER TABLE "sequence_steps" DROP CONSTRAINT "sequence_steps_template_id_templates_id_fk";
--> statement-breakpoint
ALTER TABLE "template_versions" ADD COLUMN "subject_lines" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "template_versions" ADD COLUMN "preview_text_lines" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "subject_lines" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "preview_text_lines" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "sends" ADD COLUMN "resolved_preview_text" text;--> statement-breakpoint
ALTER TABLE "sequence_step_templates" ADD CONSTRAINT "sequence_step_templates_sequence_step_id_sequence_steps_id_fk" FOREIGN KEY ("sequence_step_id") REFERENCES "public"."sequence_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sequence_step_templates" ADD CONSTRAINT "sequence_step_templates_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sequence_step_templates_step_idx" ON "sequence_step_templates" USING btree ("sequence_step_id");--> statement-breakpoint
UPDATE "templates" SET "subject_lines" = jsonb_build_array("subject");--> statement-breakpoint
UPDATE "template_versions" SET "subject_lines" = jsonb_build_array("subject");--> statement-breakpoint
INSERT INTO "sequence_step_templates" ("sequence_step_id", "template_id") SELECT "id", "template_id" FROM "sequence_steps" WHERE "template_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "template_versions" DROP COLUMN "subject";--> statement-breakpoint
ALTER TABLE "templates" DROP COLUMN "subject";--> statement-breakpoint
ALTER TABLE "templates" DROP COLUMN "parent_template_id";--> statement-breakpoint
ALTER TABLE "sequence_steps" DROP COLUMN "template_id";
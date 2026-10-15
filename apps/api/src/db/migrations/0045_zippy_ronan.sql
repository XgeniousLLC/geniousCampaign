ALTER TABLE "sequence_steps" ADD COLUMN "threaded_reply" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sequence_settings" DROP COLUMN "threaded_replies";
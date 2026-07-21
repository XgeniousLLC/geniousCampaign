ALTER TABLE "sequence_steps" ADD COLUMN "sender_account_id" uuid;--> statement-breakpoint
ALTER TABLE "sequence_steps" ADD COLUMN "from_name" text;--> statement-breakpoint
ALTER TABLE "sequence_steps" ADD COLUMN "reply_to" text;--> statement-breakpoint
ALTER TABLE "sequence_steps" ADD CONSTRAINT "sequence_steps_sender_account_id_sender_accounts_id_fk" FOREIGN KEY ("sender_account_id") REFERENCES "public"."sender_accounts"("id") ON DELETE set null ON UPDATE no action;
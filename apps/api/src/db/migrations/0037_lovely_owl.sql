ALTER TABLE "sequence_steps" DROP CONSTRAINT "sequence_steps_sender_account_id_sender_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "sequences" ADD COLUMN "sender_account_id" uuid;--> statement-breakpoint
ALTER TABLE "sequences" ADD COLUMN "from_name" text;--> statement-breakpoint
ALTER TABLE "sequences" ADD COLUMN "reply_to" text;--> statement-breakpoint
ALTER TABLE "sequences" ADD CONSTRAINT "sequences_sender_account_id_sender_accounts_id_fk" FOREIGN KEY ("sender_account_id") REFERENCES "public"."sender_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sequence_steps" DROP COLUMN "sender_account_id";--> statement-breakpoint
ALTER TABLE "sequence_steps" DROP COLUMN "from_name";--> statement-breakpoint
ALTER TABLE "sequence_steps" DROP COLUMN "reply_to";
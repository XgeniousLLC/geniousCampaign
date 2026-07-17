ALTER TABLE "campaigns" ADD COLUMN "sender_account_id" uuid;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "from_name" text;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "reply_to" text;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_sender_account_id_sender_accounts_id_fk" FOREIGN KEY ("sender_account_id") REFERENCES "public"."sender_accounts"("id") ON DELETE set null ON UPDATE no action;
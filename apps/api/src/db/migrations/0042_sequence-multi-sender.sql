CREATE TABLE "sequence_senders" (
	"sequence_id" uuid NOT NULL,
	"sender_account_id" uuid NOT NULL,
	CONSTRAINT "sequence_senders_sequence_account_unique" UNIQUE("sequence_id","sender_account_id")
);
--> statement-breakpoint
ALTER TABLE "sequence_enrollments" ADD COLUMN "sender_account_id" uuid;--> statement-breakpoint
ALTER TABLE "sends" ADD COLUMN "sender_account_id" uuid;--> statement-breakpoint
ALTER TABLE "sequence_senders" ADD CONSTRAINT "sequence_senders_sequence_id_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."sequences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sequence_senders" ADD CONSTRAINT "sequence_senders_sender_account_id_sender_accounts_id_fk" FOREIGN KEY ("sender_account_id") REFERENCES "public"."sender_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sequence_senders_sequence_idx" ON "sequence_senders" USING btree ("sequence_id");--> statement-breakpoint
ALTER TABLE "sequence_enrollments" ADD CONSTRAINT "sequence_enrollments_sender_account_id_sender_accounts_id_fk" FOREIGN KEY ("sender_account_id") REFERENCES "public"."sender_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sends" ADD CONSTRAINT "sends_sender_account_id_sender_accounts_id_fk" FOREIGN KEY ("sender_account_id") REFERENCES "public"."sender_accounts"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "subsequences" DROP CONSTRAINT "subsequences_parent_child_trigger_unique";--> statement-breakpoint
ALTER TABLE "sequences" ADD COLUMN "parent_sequence_id" uuid;--> statement-breakpoint
ALTER TABLE "subsequences" ADD COLUMN "conditions" jsonb DEFAULT '{"kind":"group","combinator":"and","children":[]}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "sequences" ADD CONSTRAINT "sequences_parent_sequence_id_sequences_id_fk" FOREIGN KEY ("parent_sequence_id") REFERENCES "public"."sequences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subsequences" ADD CONSTRAINT "subsequences_parent_child_unique" UNIQUE("parent_sequence_id","child_sequence_id");
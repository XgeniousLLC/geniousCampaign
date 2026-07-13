UPDATE "campaigns" SET "list_ids" = ARRAY["list_id"] WHERE "list_id" IS NOT NULL AND "list_ids" IS NULL;
--> statement-breakpoint
ALTER TABLE "campaigns" DROP CONSTRAINT "campaigns_list_id_lists_id_fk";
--> statement-breakpoint
ALTER TABLE "campaigns" DROP COLUMN "list_id";
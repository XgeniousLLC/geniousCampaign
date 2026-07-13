ALTER TABLE "triggers" ADD COLUMN "webhook_endpoint_id" uuid;--> statement-breakpoint
ALTER TABLE "sender_accounts" ADD COLUMN "aws_region" text;--> statement-breakpoint
ALTER TABLE "sender_accounts" ADD COLUMN "aws_access_key_id" text;--> statement-breakpoint
ALTER TABLE "sender_accounts" ADD COLUMN "aws_secret_access_key_encrypted" text;--> statement-breakpoint
ALTER TABLE "sender_accounts" ADD COLUMN "ses_configuration_set" text;--> statement-breakpoint
ALTER TABLE "triggers" ADD CONSTRAINT "triggers_webhook_endpoint_id_webhook_endpoints_id_fk" FOREIGN KEY ("webhook_endpoint_id") REFERENCES "public"."webhook_endpoints"("id") ON DELETE set null ON UPDATE no action;
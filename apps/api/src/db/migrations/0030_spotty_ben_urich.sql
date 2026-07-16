CREATE INDEX "contacts_status_idx" ON "contacts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "email_events_send_id_idx" ON "email_events" USING btree ("send_id");--> statement-breakpoint
CREATE INDEX "sends_contact_id_idx" ON "sends" USING btree ("contact_id");
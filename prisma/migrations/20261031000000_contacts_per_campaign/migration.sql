-- Contacts are now unique per campaign instead of per café.
DROP INDEX "smart_contacts_venue_id_email_key";
DROP INDEX "smart_contacts_experience_id_idx";
CREATE UNIQUE INDEX "smart_contacts_experience_id_email_key" ON "smart_contacts"("experience_id", "email");
CREATE INDEX "smart_contacts_venue_id_idx" ON "smart_contacts"("venue_id");

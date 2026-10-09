-- Per-host outreach sender config on venues
ALTER TABLE "venues" ADD COLUMN "outreach_from_email" TEXT;
ALTER TABLE "venues" ADD COLUMN "outreach_reply_to" TEXT;

-- Sent-email log + daily-cap source
CREATE TABLE "outreach_emails" (
    "id" TEXT NOT NULL,
    "venue_id" TEXT NOT NULL,
    "prospect_id" TEXT NOT NULL,
    "to_email" TEXT NOT NULL,
    "from_email" TEXT NOT NULL,
    "reply_to" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outreach_emails_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "outreach_emails_venue_id_sent_at_idx" ON "outreach_emails"("venue_id", "sent_at");
CREATE INDEX "outreach_emails_prospect_id_idx" ON "outreach_emails"("prospect_id");

ALTER TABLE "outreach_emails" ADD CONSTRAINT "outreach_emails_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outreach_emails" ADD CONSTRAINT "outreach_emails_prospect_id_fkey" FOREIGN KEY ("prospect_id") REFERENCES "prospects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Match the project convention: RLS on, no policies. Prisma connects as the
-- postgres role (BYPASSRLS) so the app is unaffected; anon/PostgREST is blocked.
ALTER TABLE "outreach_emails" ENABLE ROW LEVEL SECURITY;

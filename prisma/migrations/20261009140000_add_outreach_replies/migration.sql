-- Inbound outreach replies (Resend email.received webhook)
CREATE TABLE "outreach_replies" (
    "id" TEXT NOT NULL,
    "venue_id" TEXT NOT NULL,
    "prospect_id" TEXT,
    "provider_id" TEXT,
    "from_email" TEXT NOT NULL,
    "to_email" TEXT NOT NULL,
    "subject" TEXT,
    "text" TEXT,
    "html" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outreach_replies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "outreach_replies_provider_id_key" ON "outreach_replies"("provider_id");
CREATE INDEX "outreach_replies_venue_id_received_at_idx" ON "outreach_replies"("venue_id", "received_at");
CREATE INDEX "outreach_replies_prospect_id_idx" ON "outreach_replies"("prospect_id");

ALTER TABLE "outreach_replies" ADD CONSTRAINT "outreach_replies_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outreach_replies" ADD CONSTRAINT "outreach_replies_prospect_id_fkey" FOREIGN KEY ("prospect_id") REFERENCES "prospects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Project convention: RLS on, no policies (Prisma connects as postgres/BYPASSRLS).
ALTER TABLE "outreach_replies" ENABLE ROW LEVEL SECURITY;

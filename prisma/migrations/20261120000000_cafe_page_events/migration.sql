-- Café page (link hub) + event space settings on venues, and café events.
ALTER TABLE "venues" ADD COLUMN "cafe_page" JSONB, ADD COLUMN "event_space" JSONB;

CREATE TABLE "cafe_events" (
    "id" TEXT NOT NULL,
    "venue_id" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'request',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "title" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "party_size" INTEGER NOT NULL DEFAULT 0,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT NOT NULL DEFAULT '',
    "host_name" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "reply_note" TEXT NOT NULL DEFAULT '',
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "cafe_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "cafe_events_venue_id_date_idx" ON "cafe_events"("venue_id", "date");
ALTER TABLE "cafe_events" ADD CONSTRAINT "cafe_events_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- Same as every other public table: the app reaches data through Prisma only.
ALTER TABLE "cafe_events" ENABLE ROW LEVEL SECURITY;

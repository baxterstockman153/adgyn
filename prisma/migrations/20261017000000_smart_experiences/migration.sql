CREATE TABLE "smart_experiences" (
  "id" TEXT NOT NULL,
  "venue_id" TEXT NOT NULL,
  "config" JSONB NOT NULL,
  "published" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "smart_experiences_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "smart_experiences_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "smart_events" (
  "id" TEXT NOT NULL,
  "experience_id" TEXT NOT NULL,
  "kind" TEXT NOT NULL CHECK ("kind" IN ('visit', 'click')),
  "channel" TEXT NOT NULL CHECK ("channel" IN ('qr', 'email', 'social', 'direct')),
  "session_key" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "smart_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "smart_events_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "smart_experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "smart_claims" (
  "id" TEXT NOT NULL,
  "experience_id" TEXT NOT NULL,
  "visitor_key" TEXT NOT NULL,
  "headline" TEXT NOT NULL,
  "business" TEXT NOT NULL,
  "expires_on" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "redeemed_at" TIMESTAMP(3),
  CONSTRAINT "smart_claims_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "smart_claims_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "smart_experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "smart_experiences_venue_id_idx" ON "smart_experiences"("venue_id");
CREATE INDEX "smart_events_experience_id_kind_channel_created_at_idx" ON "smart_events"("experience_id", "kind", "channel", "created_at");
CREATE INDEX "smart_events_session_key_created_at_idx" ON "smart_events"("session_key", "created_at");
CREATE UNIQUE INDEX "smart_claims_experience_id_visitor_key_key" ON "smart_claims"("experience_id", "visitor_key");
CREATE INDEX "smart_claims_experience_id_created_at_idx" ON "smart_claims"("experience_id", "created_at");

ALTER TABLE "smart_experiences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "smart_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "smart_claims" ENABLE ROW LEVEL SECURITY;

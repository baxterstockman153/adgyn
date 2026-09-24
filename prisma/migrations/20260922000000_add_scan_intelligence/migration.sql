-- Scan intelligence: richer capture on scans/clicks + conversion attribution.
-- All additive (nullable columns / new table), safe to apply to a live DB.

-- ── Scans ──
ALTER TABLE "scans"
  ADD COLUMN IF NOT EXISTS "language"   TEXT,
  ADD COLUMN IF NOT EXISTS "is_bot"     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "bot_reason" TEXT;

CREATE INDEX IF NOT EXISTS "scans_campaign_id_idx" ON "scans" ("campaign_id");
CREATE INDEX IF NOT EXISTS "scans_visitor_id_idx"  ON "scans" ("visitor_id");

-- ── Clicks ──
ALTER TABLE "clicks"
  ADD COLUMN IF NOT EXISTS "language"   TEXT,
  ADD COLUMN IF NOT EXISTS "slot"       INTEGER,
  ADD COLUMN IF NOT EXISTS "dwell_ms"   INTEGER,
  ADD COLUMN IF NOT EXISTS "is_bot"     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "bot_reason" TEXT;

CREATE INDEX IF NOT EXISTS "clicks_placement_id_idx" ON "clicks" ("placement_id");
CREATE INDEX IF NOT EXISTS "clicks_visitor_id_idx"   ON "clicks" ("visitor_id");

-- ── Conversions ──
CREATE TABLE IF NOT EXISTS "conversions" (
  "id"           TEXT NOT NULL,
  "click_id"     TEXT,
  "placement_id" TEXT NOT NULL,
  "value"        INTEGER,
  "city"         TEXT,
  "region"       TEXT,
  "country"      TEXT,
  "converted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "conversions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "conversions_placement_id_idx" ON "conversions" ("placement_id");
CREATE INDEX IF NOT EXISTS "conversions_click_id_idx"     ON "conversions" ("click_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'conversions_click_id_fkey'
  ) THEN
    ALTER TABLE "conversions"
      ADD CONSTRAINT "conversions_click_id_fkey"
      FOREIGN KEY ("click_id") REFERENCES "clicks" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'conversions_placement_id_fkey'
  ) THEN
    ALTER TABLE "conversions"
      ADD CONSTRAINT "conversions_placement_id_fkey"
      FOREIGN KEY ("placement_id") REFERENCES "placements" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Match the security posture of every other public table (RLS on, no policies;
-- Prisma connects as the table owner / BYPASSRLS role).
ALTER TABLE "conversions" ENABLE ROW LEVEL SECURITY;

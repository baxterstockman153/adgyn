-- Smart Sleeves V1: campaigns with several QR codes, customer contacts,
-- Community Board sponsors, and sleeve order requests. Additive only.

ALTER TABLE "venues"
  ADD COLUMN "street" TEXT,
  ADD COLUMN "suite" TEXT,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "state" TEXT,
  ADD COLUMN "zip" TEXT,
  ADD COLUMN "icon_url" TEXT;

ALTER TABLE "smart_experiences"
  ADD COLUMN "launched_at" TIMESTAMP(3),
  ADD COLUMN "archived_at" TIMESTAMP(3),
  ADD COLUMN "invite_token" TEXT NOT NULL DEFAULT gen_random_uuid()::text;
CREATE UNIQUE INDEX "smart_experiences_invite_token_key" ON "smart_experiences"("invite_token");
-- Anything published before this migration counts as launched.
UPDATE "smart_experiences" SET "launched_at" = "created_at" WHERE "published" = true;

CREATE TABLE "smart_qr_codes" (
  "id" TEXT NOT NULL,
  "experience_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "placement" TEXT NOT NULL,
  "label" TEXT NOT NULL DEFAULT '',
  "archived_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "smart_qr_codes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "smart_qr_codes_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "smart_experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "smart_qr_codes_experience_id_idx" ON "smart_qr_codes"("experience_id");
-- Existing printed codes point at /q/<experience id>: give each experience a
-- primary QR code with the same id so those codes keep resolving.
INSERT INTO "smart_qr_codes" ("id", "experience_id", "name", "placement")
SELECT "id", "id", 'Primary', COALESCE("config"->>'surface', 'sleeve') FROM "smart_experiences";

ALTER TABLE "smart_events" ADD COLUMN "qr_code_id" TEXT;
ALTER TABLE "smart_events" ADD CONSTRAINT "smart_events_qr_code_id_fkey" FOREIGN KEY ("qr_code_id") REFERENCES "smart_qr_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "smart_events_qr_code_id_idx" ON "smart_events"("qr_code_id");
UPDATE "smart_events" SET "qr_code_id" = "experience_id" WHERE "channel" = 'qr';
ALTER TABLE "smart_events" DROP CONSTRAINT IF EXISTS "smart_events_kind_check";
ALTER TABLE "smart_events" ADD CONSTRAINT "smart_events_kind_check" CHECK ("kind" IN ('visit', 'click', 'signup'));

CREATE TABLE "smart_contacts" (
  "id" TEXT NOT NULL,
  "venue_id" TEXT NOT NULL,
  "experience_id" TEXT,
  "name" TEXT NOT NULL DEFAULT '',
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL DEFAULT '',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "smart_contacts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "smart_contacts_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "smart_contacts_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "smart_experiences"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "smart_contacts_venue_id_email_key" ON "smart_contacts"("venue_id", "email");
CREATE INDEX "smart_contacts_experience_id_idx" ON "smart_contacts"("experience_id");

CREATE TABLE "smart_sponsors" (
  "id" TEXT NOT NULL,
  "venue_id" TEXT NOT NULL,
  "experience_id" TEXT NOT NULL,
  "token" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "status" TEXT NOT NULL DEFAULT 'invited' CHECK ("status" IN ('invited', 'requested', 'approved', 'declined')),
  "business_name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "price_cents" INTEGER NOT NULL DEFAULT 0,
  "offer" TEXT NOT NULL DEFAULT '',
  "url" TEXT NOT NULL DEFAULT '',
  "logo_url" TEXT,
  "paid_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "smart_sponsors_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "smart_sponsors_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "smart_sponsors_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "smart_experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "smart_sponsors_token_key" ON "smart_sponsors"("token");
CREATE INDEX "smart_sponsors_experience_id_idx" ON "smart_sponsors"("experience_id");

CREATE TABLE "sleeve_orders" (
  "id" TEXT NOT NULL,
  "venue_id" TEXT NOT NULL,
  "experience_id" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "size" TEXT NOT NULL,
  "design" TEXT NOT NULL,
  "instructions" TEXT NOT NULL DEFAULT '',
  "subtotal_cents" INTEGER NOT NULL,
  "shipping_cents" INTEGER NOT NULL,
  "tax_cents" INTEGER NOT NULL,
  "total_cents" INTEGER NOT NULL,
  "ship_to" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'requested' CHECK ("status" IN ('requested', 'in_production', 'shipped', 'delivered', 'canceled')),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sleeve_orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sleeve_orders_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "sleeve_orders_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "smart_experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "sleeve_orders_venue_id_idx" ON "sleeve_orders"("venue_id");

ALTER TABLE "smart_qr_codes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "smart_contacts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "smart_sponsors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sleeve_orders" ENABLE ROW LEVEL SECURITY;

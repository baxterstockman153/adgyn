-- Outreach module: prospects a venue can recruit as guest brands.

-- CreateEnum
CREATE TYPE "ProspectStatus" AS ENUM ('new', 'contacted', 'interested', 'won', 'lost');

-- AlterTable: "did the host open their outreach list" signal
ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "last_outreach_open_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "prospects" (
    "id" TEXT NOT NULL,
    "venue_id" TEXT NOT NULL,
    "business_name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "contact_name" TEXT,
    "contact_title" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "outreach_message" TEXT,
    "status" "ProspectStatus" NOT NULL DEFAULT 'new',
    "status_updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prospects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "prospects_venue_id_idx" ON "prospects"("venue_id");

-- AddForeignKey
ALTER TABLE "prospects" ADD CONSTRAINT "prospects_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Match the RLS posture of every other public table (see 20260918000000_enable_rls):
-- Supabase auto-exposes new public tables via PostgREST with the anon key.
-- Prisma connects as the postgres role (BYPASSRLS), so enabling RLS with no
-- policies blocks anon/authenticated API access while leaving the app working.
ALTER TABLE "prospects" ENABLE ROW LEVEL SECURITY;

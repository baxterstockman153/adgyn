-- Add an optional website URL to venues (e.g. the venue logo links here).
ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "website_url" TEXT;

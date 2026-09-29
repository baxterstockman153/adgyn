-- Enrich IP-derived location on scans & clicks: ZIP/postal, ISP/carrier name,
-- mobile-vs-wifi and VPN/proxy flags. Admin-only signals; guest/host dashboards
-- still surface city only.
ALTER TABLE "scans" ADD COLUMN IF NOT EXISTS "postal_code" TEXT;
ALTER TABLE "scans" ADD COLUMN IF NOT EXISTS "isp" TEXT;
ALTER TABLE "scans" ADD COLUMN IF NOT EXISTS "is_mobile" BOOLEAN;
ALTER TABLE "scans" ADD COLUMN IF NOT EXISTS "is_proxy" BOOLEAN;

ALTER TABLE "clicks" ADD COLUMN IF NOT EXISTS "postal_code" TEXT;
ALTER TABLE "clicks" ADD COLUMN IF NOT EXISTS "isp" TEXT;
ALTER TABLE "clicks" ADD COLUMN IF NOT EXISTS "is_mobile" BOOLEAN;
ALTER TABLE "clicks" ADD COLUMN IF NOT EXISTS "is_proxy" BOOLEAN;

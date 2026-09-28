-- Track which physical surface drove a scan (coffee sleeve vs. table topper, etc.)
-- Null (or "sleeve") = the original coffee-sleeve QR. Captured from a `?src=` URL param.
ALTER TABLE "scans" ADD COLUMN IF NOT EXISTS "source" TEXT;

/**
 * Per-brand feature gating for metrics that could backfire if shown to a real
 * guest before we've proven ROI — e.g. cost-per-click / spend framing, which
 * can read as "look how much you're wasting" on a slow campaign.
 *
 * Kept to demo / pilot brands for now. Add brand IDs here, or via the
 * ADVANCED_METRICS_BRAND_IDS env var (comma-separated) to enable without a
 * deploy.
 */
const DEMO_ADVANCED_METRICS_BRANDS = new Set<string>([
  // Off everywhere for now — cost framing didn't look right. Re-enable a brand
  // by adding its ID here or via the ADVANCED_METRICS_BRAND_IDS env var.
]);

export function advancedMetricsEnabled(brandId: string): boolean {
  if (DEMO_ADVANCED_METRICS_BRANDS.has(brandId)) return true;
  const extra = (process.env.ADVANCED_METRICS_BRAND_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return extra.includes(brandId);
}

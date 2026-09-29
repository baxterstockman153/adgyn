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
  "117c1197-c951-45f3-ada4-d78690465a39", // Jimmy's Shoe Shining (demo)
]);

export function advancedMetricsEnabled(brandId: string): boolean {
  if (DEMO_ADVANCED_METRICS_BRANDS.has(brandId)) return true;
  const extra = (process.env.ADVANCED_METRICS_BRAND_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return extra.includes(brandId);
}

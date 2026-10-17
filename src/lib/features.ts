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

/**
 * The outreach module (host prospecting) is a pilot. It's gated per-venue so we
 * can switch it on for one host at a time and watch whether they actually work
 * the leads — NOT on for everyone. Enable a venue by adding its ID here, or via
 * the OUTREACH_VENUE_IDS env var (comma-separated) to flip it without a deploy.
 */
const OUTREACH_VENUES = new Set<string>([
  "2de087bf-f2af-4afe-aa7c-2ec18fb15d0d", // Gratitude Coffee Bar (pilot)
  "6fe24b2a-215d-437c-8ca7-bfd0d09ec038", // Bean & Gone (demo) — Walnut Creek prospects
  "480a5c1f-bb7f-4944-a885-536b8f3aaacd", // Nirvana Soul (demo) — San Jose prospects
]);

export function outreachEnabled(venueId: string): boolean {
  if (OUTREACH_VENUES.has(venueId)) return true;
  const extra = (process.env.OUTREACH_VENUE_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return extra.includes(venueId);
}

/**
 * In-app email *sending* for outreach. Deliberately a SEPARATE gate from
 * `outreachEnabled` — a venue can see + work its prospect list (copy-to-
 * clipboard) without being able to fire real emails from the app. Off for
 * everyone by default; flip a venue on by adding its ID here or via the
 * OUTREACH_SEND_VENUE_IDS env var (comma-separated). Sends are additionally
 * capped per host per day (see the outreach send action).
 */
const OUTREACH_SEND_VENUES = new Set<string>([
  // Demo venues only — for end-to-end testing of send + reply capture. Real
  // hosts (incl. Gratitude) stay OFF until we deliberately flip them on.
  "6fe24b2a-215d-437c-8ca7-bfd0d09ec038", // Bean & Gone (demo)
  "480a5c1f-bb7f-4944-a885-536b8f3aaacd", // Nirvana Soul (demo) — send ON for pilot
]);

export function outreachSendEnabled(venueId: string): boolean {
  if (OUTREACH_SEND_VENUES.has(venueId)) return true;
  const extra = (process.env.OUTREACH_SEND_VENUE_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return extra.includes(venueId);
}

// Max emails a single host may send from the outreach module per day (UTC).
// Mirrors the Resend free-tier daily ceiling and acts as an anti-abuse guard.
export const OUTREACH_DAILY_SEND_LIMIT = 100;

/**
 * Smart Sleeves demo (the pivot: café orders sleeves + controls what the QR
 * points to — community board / ads / custom link — plus standalone QR codes).
 * This is a FRONTEND-ONLY sales prototype built for a specific prospect to
 * explore via a real login, so it's gated per-venue and OFF for everyone except
 * the demo venue. Nothing behind the modules is wired to a backend. Enable a
 * venue by adding its ID here or via the SMART_SLEEVE_VENUE_IDS env var
 * (comma-separated) to flip it without a deploy.
 */
const SMART_SLEEVE_VENUES = new Set<string>([
  "480a5c1f-bb7f-4944-a885-536b8f3aaacd", // Nirvana Soul (demo) — Smart Sleeves prototype
]);

export function smartSleeveEnabled(venueId: string): boolean {
  if (SMART_SLEEVE_VENUES.has(venueId)) return true;
  const extra = (process.env.SMART_SLEEVE_VENUE_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return extra.includes(venueId);
}

/**
 * Static demo data for the Smart Sleeves prototype. This is a FRONTEND-ONLY
 * sales demo — nothing here is persisted or wired to a backend. All numbers are
 * illustrative. Branded for Nirvana Soul (the prospect reviewing the demo) so
 * it reads as their own café. Approximated from their public brand (joyful,
 * community-driven, orange→purple gradient, downtown San Jose).
 */

export type QrExperience = "board" | "ads" | "link";

// ── Café brand ──
export const CAFE = {
  name: "Nirvana Soul",
  tagline: "Coffee. Community. Culture.",
  city: "San Jose",
  // Signature orange→purple gradient.
  gradientFrom: "#F6933B",
  gradientTo: "#6D28D9",
  accent: "#6D28D9",
  locations: [
    "Downtown — 315 S 1st St",
    "Hotel De Anza Express",
    "MLK Jr. Library @ SJSU",
    "Main Street Cupertino",
    "San Francisco — Townsend St",
  ],
  // Their existing primary QR destination (their ordering app).
  appUrl: "https://nirvanasoulcoffee.com/app",
};

// ── Fake top-line analytics for the control-plane home ──
export const ANALYTICS = {
  scans: 2847,
  clicks: 1163,
  views: 4019,
  // 30-day sparkline-ish weekly scan counts.
  weeklyScans: [412, 538, 601, 647, 649],
  topDestinationLabel: "Community Board",
};

// ── Community board entries (the "View" state) ──
export type BoardEntry = {
  id: string;
  name: string;
  category: string;
  blurb: string;
  kind: "business" | "nonprofit" | "event";
  url: string;
  // A "featured" listing is pinned to the top with a sponsored badge — the
  // revenue hook Leti floated (e.g. downtown tech companies paying for
  // visibility during conferences).
  featured?: boolean;
};

export const BOARD_ENTRIES: BoardEntry[] = [
  {
    id: "b1",
    name: "San Jose Jazz",
    category: "Nonprofit · Music",
    blurb: "Summer Fest tickets + free Boom Box pop-ups downtown.",
    kind: "nonprofit",
    url: "#",
  },
  {
    id: "b2",
    name: "Recycle Book Store",
    category: "Local Business · Books",
    blurb: "Three floors of used books on The Alameda since 1973.",
    kind: "business",
    url: "#",
  },
  {
    id: "b3",
    name: "Sacred Heart Community Service",
    category: "Nonprofit · Community",
    blurb: "Food, clothing & volunteer sign-ups for South Bay families.",
    kind: "nonprofit",
    url: "#",
  },
  {
    id: "b4",
    name: "First Fridays Art Walk",
    category: "Event · SoFA District",
    blurb: "Galleries, makers & music the first Friday of every month.",
    kind: "event",
    url: "#",
  },
  {
    id: "b5",
    name: "San Pedro Square Market",
    category: "Local Business · Food Hall",
    blurb: "20+ local vendors a two-minute walk from campus.",
    kind: "business",
    url: "#",
  },
  {
    id: "b6",
    name: "Bellano Coffee",
    category: "Local Business · Roaster",
    blurb: "South Bay roaster — wholesale beans & brewing classes.",
    kind: "business",
    url: "#",
  },
  {
    id: "b7",
    name: "Bay Area Dev Summit",
    category: "Event · Tech Conference",
    blurb: "Downtown SJ, Nov 12–13 — free day passes for Nirvana Soul regulars.",
    kind: "event",
    url: "#",
    featured: true,
  },
];

// ── Ads module: local businesses a café could invite as sponsors ──
// Mirrors the real "invite advisor" concept — each has a suggested monthly price
// the café can edit.
export type AdProspect = {
  id: string;
  name: string;
  category: string;
  distance: string;
  suggestedPrice: number; // monthly, USD
  invited: boolean;
};

export const AD_PROSPECTS: AdProspect[] = [
  { id: "a1", name: "Urban Putt", category: "Entertainment · Mini Golf", distance: "0.3 mi", suggestedPrice: 250, invited: true },
  { id: "a2", name: "Breathe Together Yoga", category: "Fitness · Yoga", distance: "0.5 mi", suggestedPrice: 150, invited: true },
  { id: "a3", name: "Pizza Bocca Lupo", category: "Restaurant · Italian", distance: "0.2 mi", suggestedPrice: 200, invited: true },
  { id: "a4", name: "The Usuals Barbershop", category: "Grooming · Barber", distance: "0.4 mi", suggestedPrice: 125, invited: false },
  { id: "a5", name: "Bloom & Co. Florals", category: "Retail · Florist", distance: "0.6 mi", suggestedPrice: 150, invited: false },
  { id: "a6", name: "Streetlight Records", category: "Retail · Music", distance: "0.7 mi", suggestedPrice: 100, invited: false },
  { id: "a7", name: "Glow Skin Studio", category: "Beauty · Med Spa", distance: "0.5 mi", suggestedPrice: 275, invited: false },
  { id: "a8", name: "Pressed Juicery", category: "Food · Juice Bar", distance: "0.3 mi", suggestedPrice: 175, invited: false },
];

// Defaults shown in the sleeve preview for the Ads experience (the "advisors"
// a café has already brought on — the invited prospects above).
export const AD_SLEEVE_CARDS = [
  { name: "Urban Putt", tagline: "Downtown mini golf & cocktails", cta: "Book a tee time" },
  { name: "Breathe Together", tagline: "First class free for neighbors", cta: "Claim free class" },
  { name: "Pizza Bocca Lupo", tagline: "Wood-fired, two blocks away", cta: "See the menu" },
  { name: "Nirvana Soul", tagline: "Order ahead on our app", cta: "Open the app" },
];

// ── Custom-link suggestions ──
export const LINK_PRESETS = [
  { label: "Our ordering app", url: "https://nirvanasoulcoffee.com/app" },
  { label: "Join our rewards", url: "https://nirvanasoulcoffee.com/rewards" },
  { label: "Newsletter sign-up", url: "https://nirvanasoulcoffee.com/newsletter" },
  { label: "Leave a review", url: "https://g.page/nirvanasoul/review" },
];

// ── Sleeve ordering: designs, quantity tiers, platform plans ──
export type SleeveDesign = { id: string; name: string; note: string };
export const SLEEVE_DESIGNS: SleeveDesign[] = [
  { id: "d1", name: "Classic Kraft", note: "Natural brown, QR + your logo" },
  { id: "d2", name: "Gradient (brand)", note: "Your orange→purple, full color" },
  { id: "d3", name: "Minimal White", note: "Bright white, bold QR" },
  { id: "d4", name: "Seasonal", note: "Rotating artwork by local artists" },
];

// Per-sleeve price falls as quantity rises (demo tiers).
export type QtyTier = { qty: number; unitCents: number; label: string };
export const QTY_TIERS: QtyTier[] = [
  { qty: 300, unitCents: 22, label: "300 — pilot run" },
  { qty: 1000, unitCents: 18, label: "1,000 — one month" },
  { qty: 2500, unitCents: 15, label: "2,500 — best value" },
  { qty: 5000, unitCents: 12, label: "5,000 — multi-location" },
];

// Monthly platform subscription — the actual "will they pay?" ask.
export type Plan = { id: string; name: string; priceMonthly: number; features: string[]; highlight?: boolean };
export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    priceMonthly: 29,
    features: ["1 QR experience", "Custom link + community board", "Basic scan analytics"],
  },
  {
    id: "growth",
    name: "Growth",
    priceMonthly: 79,
    highlight: true,
    features: [
      "All QR experiences (board · ads · link)",
      "Invite & bill local advertisers",
      "Full engagement analytics",
      "Standalone QR codes (signs, cups, A-frames)",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 149,
    features: [
      "Everything in Growth",
      "Multi-location management",
      "Digital community board submissions",
      "Priority support",
    ],
  },
];

export function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// ── Surfaces: every physical touchpoint that carries a QR ──
// The differentiator vs. a café that already has QR tech: ONE place to manage
// and measure QR across all their physical surfaces, not just sleeves. Each
// surface has its own QR pointing at any destination, with its own scan count.
export type SurfaceType = "sleeve" | "cup" | "bag" | "aframe" | "cling" | "tabletop";

export const SURFACE_TYPES: Record<SurfaceType, { label: string; icon: string; note: string }> = {
  sleeve: { label: "Coffee sleeve", icon: "☕️", note: "Ordered through Adgyn" },
  cup: { label: "Cup / to-go lid", icon: "🥤", note: "Your own printed cups" },
  bag: { label: "To-go bag", icon: "🛍️", note: "Pastry & retail bags" },
  aframe: { label: "A-frame sign", icon: "🪧", note: "Sidewalk & entry" },
  cling: { label: "Window cling", icon: "🪟", note: "Storefront glass" },
  tabletop: { label: "Table tent", icon: "🪧", note: "In-café tables" },
};

export type Surface = {
  id: string;
  type: SurfaceType;
  label: string;
  destination: QrExperience; // where this surface's QR points
  customUrl?: string; // used when destination === "link"
  scans: number; // last 30 days (demo figure)
  active: boolean;
};

// Seeded so the "scans by surface" story lands immediately: the sidewalk
// A-frame out-scans the printed sleeve, which a café can only learn if every
// surface is measured in one place.
export const DEFAULT_SURFACES: Surface[] = [
  { id: "s1", type: "aframe", label: "S 1st St sidewalk sign", destination: "link", customUrl: CAFE.appUrl, scans: 1890, active: true },
  { id: "s2", type: "sleeve", label: "Downtown sleeves", destination: "board", scans: 1240, active: true },
  { id: "s3", type: "cup", label: "16oz hot cups", destination: "link", customUrl: "https://nirvanasoulcoffee.com/rewards", scans: 760, active: true },
  { id: "s4", type: "tabletop", label: "SoFA table tents", destination: "board", scans: 520, active: true },
  { id: "s5", type: "cling", label: "Hotel De Anza window", destination: "ads", scans: 410, active: true },
  { id: "s6", type: "bag", label: "Pastry bags", destination: "link", customUrl: "https://nirvanasoulcoffee.com/newsletter", scans: 230, active: false },
];

// Destination types we've sketched but not built — shown as disabled "Soon"
// tiles so Dap sees the roadmap without us having to fake the flows.
export const COMING_SOON_DESTINATIONS: { icon: string; label: string }[] = [
  { icon: "✉️", label: "Newsletter sign-up" },
  { icon: "📝", label: "Feedback survey" },
  { icon: "⭐️", label: "Loyalty / rewards" },
];

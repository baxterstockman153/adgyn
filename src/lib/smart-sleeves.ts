// Smart Sleeves: shared (client + server) types and helpers.
//
// A campaign is a `SmartExperience` row. Its `config` JSON is an `Experience`:
// what customers see when they scan any of the campaign's QR codes.

export type ExperienceKind = "board" | "link" | "offer" | "newsletter" | "loyalty";
export type Placement = "sleeve" | "signage" | "tabletop" | "window" | "counter" | "menu" | "bag" | "wifi" | "other";
export type Channel = "qr" | "email" | "social" | "direct";
export type CampaignStatus = "draft" | "active" | "paused" | "ended" | "archived";

export type Cafe = {
  id: string;
  name: string;
  slug: string;
  accent: string;
  logoUrl?: string | null;
};

// A café-curated Community Board listing (events, nonprofits, friends of the
// café). Paying/invited businesses are `SmartSponsor` rows, not listings.
export type Listing = {
  id: string;
  name: string;
  description: string;
  url: string;
  category: "Business" | "Event" | "Nonprofit";
};

export type Experience = {
  id: string;
  name: string;
  kind: ExperienceKind;
  location: string;
  endsOn: string; // "" = runs until you stop it
  headline: string;
  message: string;
  buttonLabel: string;
  url: string;
  // Smart Coupon
  business: string;
  terms: string;
  expiresOn: string;
  code: string;
  // Newsletter Signup
  incentive: string;
  // Loyalty Program
  reward: string;
  stampsNeeded: number;
  // Community Board
  entries: Listing[];
  suggestedPrice: number; // dollars, shown on the business invite page
};

// What the customer page needs to know about an approved Community Board sponsor.
export type PublicSponsor = { id: string; name: string; offer: string; url: string; logoUrl: string | null };

export type Claim = {
  id: string;
  headline: string;
  business: string;
  expiresOn: string;
  createdAt: string;
  redeemedAt: string | null;
};

export const EXPERIENCE_KINDS: Record<ExperienceKind, { label: string; description: string; icon: string; action: string }> = {
  board: { label: "Community Board", description: "Feature offers from neighborhood businesses that sponsor your sleeves.", icon: "grid", action: "Sponsor clicks" },
  link: { label: "App / Website Redirect", description: "Send customers straight to your app download or website.", icon: "arrow", action: "Link opens" },
  offer: { label: "Smart Coupon", description: "Discounts customers save to their phone, with every redemption tracked.", icon: "ticket", action: "Coupons claimed" },
  newsletter: { label: "Newsletter Signup", description: "Grow your email list with a quick, friendly signup.", icon: "mail", action: "Signups" },
  loyalty: { label: "Loyalty Program", description: "Invite regulars to join your rewards list.", icon: "heart", action: "Members joined" },
};

export const PLACEMENTS: Record<Placement, string> = {
  sleeve: "Cup sleeves", signage: "In-store signage", tabletop: "Tabletop", window: "Window decal",
  counter: "Counter card", menu: "Menu", bag: "Takeout bags", wifi: "Wi-Fi sign", other: "Other",
};

export const SLEEVE_DESIGNS = [
  { id: "Classic Kraft", description: "Natural kraft, espresso ink", background: "#c9a77c", color: "#2b1d14" },
  { id: "Espresso Band", description: "Dark band, caramel accents", background: "#2b1d14", color: "#e0a675" },
  { id: "Cream Minimal", description: "Light and airy, quiet type", background: "#f4ece0", color: "#5c4a3a" },
] as const;
export const SLEEVE_SIZES = [
  { id: "12 oz", description: "Fits 10–12 oz cups" },
  { id: "16 oz", description: "Fits 16–20 oz cups" },
] as const;
export const SLEEVE_TIERS = [
  { quantity: 500, unitPrice: 0.42 },
  { quantity: 1000, unitPrice: 0.36 },
  { quantity: 2500, unitPrice: 0.29 },
  { quantity: 5000, unitPrice: 0.24 },
] as const;
const SHIPPING = 24;
const TAX_BASIS_POINTS = 875; // 8.75%

export function sleeveQuote(quantity: number) {
  const tier = SLEEVE_TIERS.find(item => item.quantity === quantity) ?? SLEEVE_TIERS[1];
  const cents = (dollars: number) => Math.round(dollars * 100);
  const subtotal = cents(tier.quantity * tier.unitPrice);
  const shipping = cents(SHIPPING);
  const tax = Math.round(subtotal * TAX_BASIS_POINTS / 10_000);
  return { quantity: tier.quantity, unitPrice: tier.unitPrice, subtotal, shipping, tax, total: subtotal + shipping + tax };
}

export const ORDER_STATUSES: Record<string, string> = {
  requested: "Order received", in_production: "In production", shipped: "Shipped", delivered: "Delivered", canceled: "Canceled",
};

export function newExperience(kind: ExperienceKind, cafeName: string, location = ""): Experience {
  const base: Experience = {
    id: "", name: "", kind, location, endsOn: "", headline: "", message: "", buttonLabel: "", url: "",
    business: cafeName, terms: "", expiresOn: "", code: "", incentive: "", reward: "", stampsNeeded: 10,
    entries: [], suggestedPrice: 125,
  };
  switch (kind) {
    case "board": return { ...base, headline: "Your neighbors are saving you a seat", message: "A few local favorites, picked by us.", buttonLabel: "See local offers" };
    case "link": return { ...base, headline: "Order ahead, skip the line", message: "Your next coffee, one tap away.", buttonLabel: "Download the app" };
    case "offer": return { ...base, headline: "A little thank-you from us", message: "$1 off your next latte", terms: "Show this screen at the register to redeem. One per guest.", code: "THANKYOU" };
    case "newsletter": return { ...base, headline: "Be the first to know", message: "New drinks, events, and neighborhood news. No spam.", buttonLabel: "Sign me up" };
    case "loyalty": return { ...base, headline: "Every cup counts", message: "Join our regulars list and we’ll keep track of your visits.", reward: "10th drink free", buttonLabel: "Join" };
  }
}

/** Adds https:// to a bare address like "mycafe.com/menu"; leaves anything else alone. */
export function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || /^[a-z][a-z\d+.-]*:/i.test(trimmed)) return trimmed;
  return /^[^\s/]+\.[a-z]{2,}(?:[/?#:]\S*)?$/i.test(trimmed) ? `https://${trimmed}` : trimmed;
}

export function validUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password && value.length <= 2048;
  } catch {
    return false;
  }
}

export function validEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function pacificToday(now: number): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  return ["year", "month", "day"].map(type => parts.find(part => part.type === type)?.value).join("-");
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Today's date in Pacific time, as YYYY-MM-DD. */
export function todayPacific(now = Date.now()): string {
  return pacificToday(now);
}

/** "Nov 29, 2026" for a YYYY-MM-DD date. */
export function formatDay(value: string): string {
  return validDate(value) ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`)) : value;
}

/** True once the Pacific-time date has passed `date` (inclusive end date). Invalid dates count as expired. */
export function isExpired(date: string, now = Date.now()): boolean {
  return !validDate(date) || pacificToday(now) > date;
}

export function campaignStatus(record: { published: boolean; launchedAt: Date | string | null; archivedAt: Date | string | null }, experience: Pick<Experience, "endsOn">): CampaignStatus {
  if (record.archivedAt) return "archived";
  if (!record.launchedAt) return "draft";
  if (experience.endsOn && isExpired(experience.endsOn)) return "ended";
  return record.published ? "active" : "paused";
}

export const STATUS_LABELS: Record<CampaignStatus, string> = { draft: "Draft", active: "Active", paused: "Paused", ended: "Ended", archived: "Archived" };

/** Returns an error message, or null when the campaign is ready to go live. */
export function validateExperience(value: Experience): string | null {
  if (!value.name.trim()) return "Give your campaign a name so you can find it later.";
  if (value.name.length > 100 || value.headline.length > 200 || value.message.length > 500 || value.buttonLabel.length > 40 || value.business.length > 100 || value.terms.length > 1500 || value.code.length > 40 || value.location.length > 120 || value.incentive.length > 200 || value.reward.length > 120) return "Please shorten the text before saving.";
  if (!(value.kind in EXPERIENCE_KINDS)) return "Choose what customers should experience.";
  if (!value.headline.trim()) return "Add a headline.";
  if (value.endsOn && !validDate(value.endsOn)) return "Choose a valid end date.";
  if (value.endsOn && isExpired(value.endsOn)) return "Pick a last day that hasn’t passed yet. To stop a campaign now, pause or archive it.";
  if (value.kind === "link") {
    if (!validUrl(normalizeUrl(value.url))) return "Enter a website address, like yourcafe.com/order.";
    if (!value.buttonLabel.trim()) return "Add a button label.";
  }
  if (value.kind === "offer") {
    if (!value.message.trim() || !value.business.trim() || !value.terms.trim()) return "Add the offer, who honors it, and how to redeem it.";
    if (value.expiresOn && isExpired(value.expiresOn)) return "Choose an offer end date that hasn’t passed. Dates use Pacific time.";
  }
  if ((value.kind === "newsletter" || value.kind === "loyalty") && !value.buttonLabel.trim()) return "Add a button label.";
  if (value.kind === "loyalty" && !value.reward.trim()) return "Add the reward members are working toward.";
  if (value.kind === "board") {
    if (value.entries.length > 12) return "A board can carry up to twelve of your own listings.";
    if (value.entries.some(entry => !entry.name.trim() || entry.name.length > 100 || entry.description.length > 400 || (entry.url && !validUrl(normalizeUrl(entry.url))))) return "Each listing needs a name, and any link must be a website address.";
    if (!Number.isFinite(value.suggestedPrice) || value.suggestedPrice < 0 || value.suggestedPrice > 100000) return "Enter a valid suggested sponsorship.";
  }
  return null;
}

const STRING_FIELDS = ["name", "location", "endsOn", "headline", "message", "buttonLabel", "url", "business", "terms", "expiresOn", "code", "incentive", "reward"] as const;

/** Reads a stored or submitted config. Tolerates older configs (missing fields, the retired "ads" kind). */
export function parseExperience(input: unknown, id = ""): Experience | null {
  if (!input || typeof input !== "object") return null;
  const value = input as Record<string, unknown>;
  const kind = value.kind === "ads" ? "board" : value.kind;
  if (typeof kind !== "string" || !Object.hasOwn(EXPERIENCE_KINDS, kind)) return null;
  const strings = Object.fromEntries(STRING_FIELDS.map(key => [key, typeof value[key] === "string" ? value[key] : ""])) as Record<(typeof STRING_FIELDS)[number], string>;
  const entries = Array.isArray(value.entries) ? value.entries.flatMap((entry): Listing[] => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Record<string, unknown>;
    if (typeof item.id !== "string" || typeof item.name !== "string") return [];
    const category = item.category === "Event" || item.category === "Nonprofit" ? item.category : "Business";
    return [{ id: item.id, name: item.name, description: typeof item.description === "string" ? item.description : "", url: typeof item.url === "string" ? normalizeUrl(item.url) : "", category }];
  }).slice(0, 12) : [];
  const number = (raw: unknown, fallback: number) => typeof raw === "number" && Number.isFinite(raw) ? raw : fallback;
  // Older configs used `headline` for the offer itself; keep it readable.
  const message = strings.message || (kind === "offer" ? strings.headline : "");
  return { ...strings, url: normalizeUrl(strings.url), message, id: id || (typeof value.id === "string" ? value.id : ""), kind: kind as ExperienceKind, entries, stampsNeeded: number(value.stampsNeeded, 10), suggestedPrice: number(value.suggestedPrice, 125) };
}

export function currency(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

export function cents(value: number): string {
  return currency(value / 100);
}

export function qrPath(qrCodeId: string): string {
  return `/q/${encodeURIComponent(qrCodeId)}?channel=qr`;
}

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).map(part => part[0]).slice(0, 2).join("").toUpperCase();
}

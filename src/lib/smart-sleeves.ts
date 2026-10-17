export type ExperienceKind = "link" | "offer" | "board" | "ads";
export type SurfaceKind = "sleeve" | "tabletop" | "aframe" | "bag" | "window" | "cup";
export type Channel = "qr" | "email" | "social" | "direct";

export type Cafe = {
  id: string;
  name: string;
  slug: string;
  locations: string[];
  appUrl: string;
  accent: string;
};

export type Listing = {
  id: string;
  name: string;
  description: string;
  url: string;
  category: "Business" | "Event" | "Nonprofit" | "Sponsor";
};

export type Experience = {
  id: string;
  name: string;
  kind: ExperienceKind;
  surface: SurfaceKind;
  location: string;
  url: string;
  headline: string;
  business: string;
  terms: string;
  expiresOn: string;
  code: string;
  entries: Listing[];
  published: boolean;
  visits: number;
  clicks: number;
  claims: number;
  redemptions: number;
  channelVisits?: Partial<Record<Channel, number>>;
};

export type Claim = {
  id: string;
  experienceId: string;
  headline: string;
  business: string;
  expiresOn: string;
  createdAt: string;
  redeemedAt: string | null;
};

export type ScenarioSponsor = { id: string; name: string; amount: number; included: boolean };
export type Scenario = {
  sponsors: ScenarioSponsor[];
  months: number;
  monthlyFee: number;
  packaging: number;
  shipping: number;
  processing: number;
  other: number;
  costsComplete: boolean;
};

export const EXPERIENCE_KINDS: Record<ExperienceKind, { label: string; description: string; icon: string }> = {
  link: { label: "Open a link", description: "Your ordering app, rewards, or existing signup page.", icon: "arrow" },
  offer: { label: "Share an offer", description: "Give customers a clear reason to scan and visit.", icon: "ticket" },
  board: { label: "Community board", description: "A curated collection of local businesses and events.", icon: "grid" },
  ads: { label: "Feature sponsors", description: "Give your approved local partners a place to shine.", icon: "heart" },
};

export const SURFACES: Record<SurfaceKind, string> = {
  sleeve: "Coffee sleeves", tabletop: "Tabletop", aframe: "A-frame sign", bag: "Bags", window: "Window", cup: "Cups",
};

export const NIRVANA: Cafe = {
  id: "nirvana-demo", name: "Nirvana Soul", slug: "nirvana-soul", accent: "#8a4172",
  appUrl: "https://www.nirvanasoulcoffee.com/app",
  locations: ["Downtown San Jose", "Hotel De Anza", "SJSU Library", "Cupertino", "San Francisco"],
};

export const GRATITUDE: Cafe = {
  id: "gratitude-demo", name: "Gratitude Coffee Bar", slug: "gratitude", accent: "#2f5d4c",
  appUrl: "https://orderatgratitude.square.site/", locations: ["Concord"],
};

export function newExperience(cafe: Cafe, kind: ExperienceKind = "link"): Experience {
  return {
    id: crypto.randomUUID(), name: "", kind, surface: "sleeve", location: cafe.locations[0],
    url: cafe.appUrl, headline: "", business: cafe.name, terms: "", expiresOn: "", code: "",
    entries: [], published: false, visits: 0, clicks: 0, claims: 0, redemptions: 0,
  };
}

export function sampleExperiences(cafe: Cafe): Experience[] {
  const base = {
    surface: "sleeve" as const, location: cafe.locations[0], url: cafe.appUrl,
    terms: "Sample offer only. Not valid for redemption.", expiresOn: "2027-12-31", code: "NEIGHBORS",
    entries: [], published: false, visits: 0, clicks: 0, claims: 0, redemptions: 0,
  };
  return [
    { ...base, id: "sample-app", name: "Order ahead", kind: "link", surface: "aframe", headline: "Your next coffee, one tap away.", business: cafe.name },
    { ...base, id: "sample-offer", name: "A little something for our neighbors", kind: "offer", headline: "Enjoy 15% off your first visit", business: "Your local partner" },
    { ...base, id: "sample-board", name: "Good things in the neighborhood", kind: "board", surface: "tabletop", headline: "Meet your neighborhood.", business: cafe.name,
      entries: [
        { id: "sample-event", name: "Friday community night", category: "Event", description: "A sample listing for your next neighborhood get-together.", url: "" },
        { id: "sample-nonprofit", name: "A local cause you love", category: "Nonprofit", description: "Make room for the organizations making a difference.", url: "" },
      ],
    },
  ];
}

export function initialScenario(): Scenario {
  return {
    sponsors: [
      { id: "scenario-1", name: "Local partner 1", amount: 250, included: true },
      { id: "scenario-2", name: "Local partner 2", amount: 250, included: true },
      { id: "scenario-3", name: "Local partner 3", amount: 250, included: false },
    ],
    months: 1, monthlyFee: 249, packaging: 0, shipping: 0, processing: 0, other: 0, costsComplete: false,
  };
}

export function calculateScenario(scenario: Scenario) {
  const months = Math.max(1, Math.min(12, Number(scenario.months) || 1));
  const fee = Math.max(0, Number(scenario.monthlyFee) || 0);
  const included = scenario.sponsors.filter(sponsor => sponsor.included);
  const income = included.reduce((total, sponsor) => total + Math.max(0, Number(sponsor.amount) || 0), 0);
  const subscription = months * fee;
  const otherCosts = [scenario.packaging, scenario.shipping, scenario.processing, scenario.other]
    .reduce((total, value) => total + Math.max(0, Number(value) || 0), 0);
  const average = included.length ? income / included.length : 0;
  return { months, income, subscription, otherCosts, remaining: income - subscription - otherCosts, threshold: average > 0 ? Math.ceil((subscription + otherCosts) / average) : null };
}

export function validUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password && value.length <= 2048;
  } catch {
    return false;
  }
}

export function isExpired(expiresOn: string, now = Date.now()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expiresOn)) return true;
  const parsed = new Date(`${expiresOn}T12:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== expiresOn) return true;
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const current = ["year", "month", "day"].map(type => parts.find(part => part.type === type)?.value).join("-");
  return current > expiresOn;
}

export function validateExperience(value: Experience): string | null {
  if (!value.name.trim()) return "Give this experience a name so you can find it later.";
  if (value.name.length > 100 || value.headline.length > 200 || value.business.length > 100 || value.terms.length > 1500 || value.code.length > 40 || value.location.length > 120) return "Please shorten the text before publishing.";
  if (!value.location.trim()) return "Choose a location.";
  if (!(value.kind in EXPERIENCE_KINDS) || !(value.surface in SURFACES)) return "Choose an experience and a placement.";
  if (value.kind === "link" && !validUrl(value.url)) return "Enter a full website address, starting with https://.";
  if (value.kind === "offer") {
    if (!value.headline.trim() || !value.business.trim() || !value.terms.trim()) return "Add the offer, participating business, and terms.";
    if (isExpired(value.expiresOn)) return "Choose an expiry date that has not passed. Dates use Pacific time.";
  }
  if (value.kind === "board" || value.kind === "ads") {
    if (!value.entries.length || value.entries.length > 12) return "Add between one and twelve approved listings.";
    if (value.entries.some(entry => !entry.name.trim() || !entry.description.trim() || entry.name.length > 100 || entry.description.length > 400 || !validUrl(entry.url))) return "Each listing needs a name, description, and full website address.";
  }
  return null;
}

export function parseExperience(input: unknown): Experience | null {
  if (!input || typeof input !== "object") return null;
  const value = input as Record<string, unknown>;
  if (!["id", "name", "kind", "surface", "location", "url", "headline", "business", "terms", "expiresOn", "code"].every(key => typeof value[key] === "string")) return null;
  if (!Object.hasOwn(EXPERIENCE_KINDS, value.kind as string) || !Object.hasOwn(SURFACES, value.surface as string)) return null;
  if (!Array.isArray(value.entries) || value.entries.length > 12 || value.entries.some(entry => !entry || typeof entry !== "object" || !["id", "name", "description", "url", "category"].every(key => typeof entry[key] === "string") || !["Business", "Event", "Nonprofit", "Sponsor"].includes(entry.category))) return null;
  return { ...value, published: false, visits: 0, clicks: 0, claims: 0, redemptions: 0 } as Experience;
}

export function currency(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

export function experiencePath(id: string, channel: Channel = "qr"): string {
  return `/q/${encodeURIComponent(id)}?channel=${channel}`;
}

export function campaignText(cafe: Cafe, introduction: string, experiences: Experience[], channel: Channel, origin: string): string {
  return [cafe.name, introduction.trim(), ...experiences.map(experience => {
    const description = experience.headline || EXPERIENCE_KINDS[experience.kind].label;
    const link = experience.published ? `${origin}${experiencePath(experience.id, channel)}` : "[Publish this experience to add its link]";
    return `${experience.name}\n${description}${experience.kind === "offer" ? `\n${experience.business} · ${experience.terms}\nValid through ${experience.expiresOn} (Pacific time)` : ""}\n${link}`;
  })].filter(Boolean).join("\n\n");
}

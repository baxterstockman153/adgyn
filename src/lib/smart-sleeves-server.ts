import "server-only";

import { cache } from "react";
import { createHash, randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { outreachEnabled, smartSleeveEnabled } from "@/lib/features";
import { campaignStatus, parseExperience, type Cafe, type CampaignStatus, type Channel, type Experience } from "@/lib/smart-sleeves";

const DAY = 86_400_000;

/** The signed-in user's Smart Sleeves café, for pages. Redirects when there isn't one. */
export const loadWorkspace = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");
  const account = await prisma.user.findUnique({ where: { email: user.email }, include: { memberships: { where: { orgType: "venue" } } } });
  const membership = account?.memberships.find(item => smartSleeveEnabled(item.orgId));
  if (!account || !membership) redirect("/dashboard/venue");
  const venue = await prisma.venue.findUnique({ where: { id: membership.orgId } });
  if (!venue) redirect("/dashboard");
  const cafe: Cafe = { id: venue.id, name: venue.name, slug: venue.slug, accent: "#2f5d4c", logoUrl: venue.iconUrl ?? venue.logoUrl };
  return { account, venue, cafe, isOwner: membership.role === "owner", hasOutreach: outreachEnabled(venue.id) };
});

/** The venue id the signed-in owner may change, for server actions. Throws otherwise. */
export async function workspaceOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("Please sign in to continue.");
  const account = await prisma.user.findUnique({ where: { email: user.email }, include: { memberships: { where: { orgType: "venue", role: "owner" } } } });
  const membership = account?.memberships.find(item => smartSleeveEnabled(item.orgId));
  if (!membership) throw new Error("Only an owner of an enabled café can make this change.");
  return membership.orgId;
}

export function shipToText(venue: { name: string; street: string | null; suite: string | null; city: string | null; state: string | null; zip: string | null; address: string | null }): string {
  if (venue.street && venue.city && venue.state && venue.zip) return [venue.name, [venue.street, venue.suite].filter(Boolean).join(", "), `${venue.city}, ${venue.state} ${venue.zip}`].join("\n");
  return venue.address ? `${venue.name}\n${venue.address}` : "";
}

export type CampaignSummary = {
  id: string;
  experience: Experience;
  status: CampaignStatus;
  createdAt: string;
  scans: number;
  scans30: number;
  actions: number;
  qrCodes: number;
  sponsors: number;
  revenueCents: number;
  contacts: number;
  latestOrder: { quantity: number; status: string } | null;
};

export async function loadCampaignSummaries(venueId: string, { includeArchived = false } = {}): Promise<CampaignSummary[]> {
  const since = new Date(Date.now() - 30 * DAY);
  const records = await prisma.smartExperience.findMany({
    where: { venueId, ...(includeArchived ? {} : { archivedAt: null }) },
    orderBy: { createdAt: "desc" },
    include: {
      events: { select: { kind: true, createdAt: true } },
      claims: { select: { id: true } },
      qrCodes: { where: { archivedAt: null }, select: { id: true } },
      sponsors: { where: { status: "approved" }, select: { priceCents: true, paidAt: true } },
      contacts: { select: { id: true } },
      orders: { orderBy: { createdAt: "desc" }, take: 1, select: { quantity: true, status: true } },
    },
  });
  return records.flatMap(record => {
    const experience = parseExperience(record.config, record.id);
    if (!experience) return [];
    const visits = record.events.filter(event => event.kind === "visit");
    const clicks = record.events.filter(event => event.kind === "click").length;
    const actions = experience.kind === "offer" ? record.claims.length : experience.kind === "newsletter" || experience.kind === "loyalty" ? record.contacts.length : clicks;
    return [{
      id: record.id, experience, status: campaignStatus(record, experience), createdAt: record.createdAt.toISOString(),
      scans: visits.length, scans30: visits.filter(event => event.createdAt >= since).length, actions,
      qrCodes: record.qrCodes.length, sponsors: record.sponsors.length,
      revenueCents: record.sponsors.reduce((total, sponsor) => total + (sponsor.paidAt ? sponsor.priceCents : 0), 0),
      contacts: record.contacts.length, latestOrder: record.orders[0] ?? null,
    }];
  });
}

/** Daily scan counts (oldest first) for the last `days` days, Pacific dates. */
export function dailySeries(dates: Date[], days: number): { date: string; count: number }[] {
  const key = (value: Date | number) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(value);
  const counts = new Map<string, number>();
  for (const date of dates) counts.set(key(date), (counts.get(key(date)) ?? 0) + 1);
  return Array.from({ length: days }, (_, index) => {
    const date = key(Date.now() - (days - 1 - index) * DAY);
    return { date, count: counts.get(date) ?? 0 };
  });
}

export async function loadCampaignDetail(venueId: string, id: string, days: number) {
  const record = await prisma.smartExperience.findFirst({
    where: { id, venueId },
    include: {
      qrCodes: { where: { archivedAt: null }, orderBy: { createdAt: "asc" } },
      sponsors: { orderBy: { createdAt: "desc" } },
      contacts: { orderBy: { createdAt: "desc" }, take: 500 },
      claims: { orderBy: { createdAt: "desc" }, take: 100 },
      orders: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!record) return null;
  const experience = parseExperience(record.config, record.id);
  if (!experience) return null;
  const since = new Date(Date.now() - days * DAY);
  const events = await prisma.smartEvent.findMany({ where: { experienceId: id, createdAt: { gte: since } }, select: { kind: true, qrCodeId: true, createdAt: true } });
  const visits = events.filter(event => event.kind === "visit");
  const clicks = events.filter(event => event.kind === "click").length;
  const inRange = (date: Date) => date >= since;
  const actions = experience.kind === "offer" ? record.claims.filter(claim => inRange(claim.createdAt)).length
    : experience.kind === "newsletter" || experience.kind === "loyalty" ? record.contacts.filter(contact => inRange(contact.createdAt)).length
    : clicks;
  return {
    experience,
    status: campaignStatus(record, experience),
    inviteToken: record.inviteToken,
    scans: visits.length,
    actions,
    series: dailySeries(visits.map(event => event.createdAt), days),
    qrCodes: record.qrCodes.map(code => ({ id: code.id, name: code.name, placement: code.placement, label: code.label, createdAt: code.createdAt.toISOString(), scans: visits.filter(event => event.qrCodeId === code.id).length })),
    sponsors: record.sponsors.map(sponsor => ({ id: sponsor.id, token: sponsor.token, status: sponsor.status, businessName: sponsor.businessName, email: sponsor.email, priceCents: sponsor.priceCents, offer: sponsor.offer, url: sponsor.url, logoUrl: sponsor.logoUrl, paid: !!sponsor.paidAt })),
    contacts: record.contacts.map(contact => ({ id: contact.id, name: contact.name, email: contact.email, phone: contact.phone, createdAt: contact.createdAt.toISOString() })),
    claims: record.claims.map(claim => ({ id: claim.id, headline: claim.headline, business: claim.business, expiresOn: claim.expiresOn, createdAt: claim.createdAt.toISOString(), redeemedAt: claim.redeemedAt?.toISOString() ?? null })),
    orders: record.orders.map(order => ({ id: order.id, quantity: order.quantity, size: order.size, design: order.design, totalCents: order.totalCents, status: order.status, createdAt: order.createdAt.toISOString() })),
  };
}
export type CampaignDetail = NonNullable<Awaited<ReturnType<typeof loadCampaignDetail>>>;

export async function visitorKey(): Promise<string> {
  const store = await cookies();
  let token = store.get("adgyn_session")?.value;
  if (!token || !/^[a-f0-9-]{36}$/.test(token)) {
    token = randomUUID();
    store.set("adgyn_session", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 90 * 86400, path: "/" });
  }
  return createHash("sha256").update(token).digest("hex");
}

/** The visitor's coupon for this campaign, if they already saved one. Read-only, so pages can call it. */
export async function existingClaimId(experienceId: string): Promise<string | undefined> {
  const token = (await cookies()).get("adgyn_session")?.value;
  if (!token || !/^[a-f0-9-]{36}$/.test(token)) return undefined;
  const visitor = createHash("sha256").update(token).digest("hex");
  const claim = await prisma.smartClaim.findUnique({ where: { experienceId_visitorKey: { experienceId, visitorKey: visitor } }, select: { id: true } });
  return claim?.id;
}

export function requestChannel(value: string | null): Channel {
  return value === "qr" || value === "email" || value === "social" ? value : "direct";
}

/** Resolves a QR code id that belongs to this campaign, or null. */
export async function campaignQrCode(experienceId: string, qrCodeId: string | null | undefined): Promise<string | null> {
  if (!qrCodeId || qrCodeId.length > 64) return null;
  const code = await prisma.smartQrCode.findFirst({ where: { id: qrCodeId, experienceId }, select: { id: true } });
  return code?.id ?? null;
}

export async function recordExperienceEvent(experienceId: string, kind: "visit" | "click" | "signup", channel: Channel, qrCodeId: string | null = null) {
  const requestHeaders = await headers();
  if (/bot|crawler|spider|preview|facebookexternalhit|headless/i.test(requestHeaders.get("user-agent") ?? "")) return;
  const sessionKey = await visitorKey();
  const existing = await prisma.smartEvent.findFirst({ where: { experienceId, kind, channel, sessionKey, createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) } }, select: { id: true } });
  if (!existing) await prisma.smartEvent.create({ data: { experienceId, kind, channel, sessionKey, qrCodeId } });
}

/** Approved Community Board sponsors, as customers see them. */
export async function publicSponsors(experienceId: string) {
  const sponsors = await prisma.smartSponsor.findMany({ where: { experienceId, status: "approved" }, orderBy: { createdAt: "asc" } });
  return sponsors.map(sponsor => ({ id: sponsor.id, name: sponsor.businessName, offer: sponsor.offer, url: sponsor.url, logoUrl: sponsor.logoUrl }));
}

/** Scans across every campaign for one café, as a daily series. */
export async function loadVenueScans(venueId: string, days: number) {
  const visits = await prisma.smartEvent.findMany({ where: { kind: "visit", createdAt: { gte: new Date(Date.now() - days * DAY) }, experience: { venueId } }, select: { createdAt: true } });
  return { total: visits.length, series: dailySeries(visits.map(visit => visit.createdAt), days) };
}

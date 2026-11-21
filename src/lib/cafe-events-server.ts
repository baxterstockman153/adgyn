import "server-only";

import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { sendTextEmail } from "@/lib/email";
import { smartSleeveEnabled } from "@/lib/features";
import { campaignStatus, parseExperience, todayPacific, type Cafe } from "@/lib/smart-sleeves";
import { formatEventDate, formatTimeRange, googleCalendarUrl, icsFile, LINK_KINDS, parseCafePage, parseEventSpace, type CafeEventView, type EventStatus } from "@/lib/cafe-page";
import type { CafeEvent, Venue } from "@/generated/prisma/client";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.adgyn.com";

export function eventView(event: CafeEvent): CafeEventView {
  return {
    id: event.id, source: event.source === "cafe" ? "cafe" : "request", status: event.status as EventStatus, title: event.title, eventType: event.eventType,
    date: event.date, startTime: event.startTime, endTime: event.endTime, partySize: event.partySize, isPublic: event.isPublic, description: event.description,
    hostName: event.hostName, email: event.email, phone: event.phone, notes: event.notes, replyNote: event.replyNote, createdAt: event.createdAt.toISOString(),
  };
}

export function venueAddress(venue: Pick<Venue, "name" | "street" | "suite" | "city" | "state" | "zip" | "address">): string {
  if (venue.street && venue.city && venue.state) return `${venue.name}, ${[venue.street, venue.suite].filter(Boolean).join(" ")}, ${venue.city}, ${venue.state} ${venue.zip ?? ""}`.trim();
  return venue.address ? `${venue.name}, ${venue.address}` : venue.name;
}

export function cafeOf(venue: Venue): Cafe {
  return { id: venue.id, name: venue.name, slug: venue.slug, accent: "#2f5d4c", logoUrl: venue.iconUrl ?? venue.logoUrl };
}

/** A café's public page data, or null when the venue isn't on Smart Sleeves. */
export const loadPublicCafe = cache(async (slug: string) => {
  const venue = await prisma.venue.findUnique({ where: { slug } });
  if (!venue || !smartSleeveEnabled(venue.id)) return null;
  return { venue, page: parseCafePage(venue.cafePage, venue.websiteUrl), space: parseEventSpace(venue.eventSpace) };
});

export async function upcomingPublicEvents(venueId: string, take = 20) {
  const events = await prisma.cafeEvent.findMany({ where: { venueId, status: "approved", isPublic: true, date: { gte: todayPacific() } }, orderBy: [{ date: "asc" }, { startTime: "asc" }], take });
  return events.map(eventView);
}

export type ResolvedLink = { id: string; kind: keyof typeof LINK_KINDS; label: string; href: string; detail: string };

/** The café page links customers actually see: visible, and with somewhere to go. */
export async function resolvePageLinks(venue: Venue, page = parseCafePage(venue.cafePage, venue.websiteUrl), space = parseEventSpace(venue.eventSpace)): Promise<ResolvedLink[]> {
  const [boards, events] = await Promise.all([
    prisma.smartExperience.findMany({ where: { venueId: venue.id, archivedAt: null }, orderBy: { createdAt: "desc" }, include: { qrCodes: { where: { archivedAt: null }, orderBy: { createdAt: "asc" }, take: 1 } } }),
    upcomingPublicEvents(venue.id, 1),
  ]);
  // With no board picked, link the newest active Community Board.
  const liveBoards = boards.filter(record => { const experience = parseExperience(record.config, record.id); return experience?.kind === "board" && campaignStatus(record, experience) === "active" && record.qrCodes.length; });
  return page.links.flatMap((link): ResolvedLink[] => {
    if (!link.visible) return [];
    const base = { id: link.id, kind: link.kind, label: link.label };
    if (link.kind === "events") {
      if (!space.enabled && !events.length) return [];
      const next = events[0];
      return [{ ...base, href: `/${venue.slug}/events`, detail: next ? `Next up: ${next.title} · ${formatEventDate(next.date)}` : `Host your event in our ${space.name.toLowerCase()}` }];
    }
    if (link.kind === "board") {
      const board = link.campaignId ? liveBoards.find(record => record.id === link.campaignId) : liveBoards[0];
      return board ? [{ ...base, href: `/q/${board.qrCodes[0].id}?channel=direct`, detail: "Offers from our neighbors" }] : [];
    }
    return link.url ? [{ ...base, href: link.url, detail: link.kind === "instagram" ? "Follow along" : new URL(link.url).hostname.replace(/^www\./, "") }] : [];
  });
}

/** Café owners' emails: who hears about new requests, and the reply-to for customer emails. */
async function ownerEmails(venueId: string): Promise<string[]> {
  const owners = await prisma.membership.findMany({ where: { orgId: venueId, orgType: "venue", role: "owner" }, include: { user: { select: { email: true } } } });
  return owners.map(owner => owner.user.email);
}

function when(event: CafeEventView) {
  return `${formatEventDate(event.date, { long: true })}, ${formatTimeRange(event.startTime, event.endTime)}`;
}

function calendarFor(event: CafeEventView, venue: Venue) {
  return { id: event.id, title: `${event.title} at ${venue.name}`, date: event.date, startTime: event.startTime, endTime: event.endTime, description: [event.description, event.replyNote].filter(Boolean).join("\n\n") || `Your event at ${venue.name}.`, location: venueAddress(venue) };
}

export async function emailNewRequest(event: CafeEventView, venue: Venue) {
  const owners = await ownerEmails(venue.id);
  const results = await Promise.all([
    owners.length ? sendTextEmail({
      to: owners, replyTo: event.email,
      subject: `New event request: ${event.eventType}, ${formatEventDate(event.date)} (${event.partySize} people)`,
      text: [`${event.hostName} would like to host an event at ${venue.name}.`, "",
        `What: ${event.eventType}${event.title && !event.title.startsWith(event.eventType) ? ` — ${event.title}` : ""}`, `When: ${when(event)}`, `Party size: ${event.partySize}`,
        `Open to the public: ${event.isPublic ? "yes" : "no"}`, `Contact: ${event.hostName} · ${event.email}${event.phone ? ` · ${event.phone}` : ""}`,
        ...(event.notes ? ["", "Notes:", event.notes] : []), "", `Approve or decline it here: ${APP_URL}/dashboard/venue/smart-sleeve/events`].join("\n"),
    }) : Promise.resolve({ sent: true }),
    sendTextEmail({
      to: event.email, replyTo: owners[0],
      subject: `We got your event request — ${venue.name}`,
      text: [`Hi ${event.hostName},`, "", `Thanks for asking to host your ${event.eventType.toLowerCase()} at ${venue.name}. Here’s what we received:`, "",
        `When: ${when(event)}`, `Party size: ${event.partySize}`, "", `${venue.name} will review it and you’ll get an email once they’ve decided. Questions? Just reply to this email.`, "", `— ${venue.name}, via Adgyn`].join("\n"),
    }),
  ]);
  for (const result of results) if (!result.sent) console.error("Event request email not sent", "error" in result ? result.error : "");
}

/** Tells the host about the café's decision. Returns whether the email went out. */
export async function emailDecision(event: CafeEventView, venue: Venue): Promise<boolean> {
  if (!event.email) return false;
  const owners = await ownerEmails(venue.id);
  const note = event.replyNote ? ["", `A note from ${venue.name}:`, event.replyNote] : [];
  const calendar = calendarFor(event, venue);
  const result = event.status === "approved" ? await sendTextEmail({
    to: event.email, replyTo: owners[0],
    subject: `You’re booked: ${event.title} at ${venue.name}`,
    text: [`Hi ${event.hostName || "there"},`, "", `Good news — ${venue.name} approved your event.`, "", `When: ${when(event)}`, `Where: ${venueAddress(venue)}`, ...(event.partySize ? [`Party size: ${event.partySize}`] : []), ...note, "",
      "The calendar invite is attached. To add it to Google Calendar instead:", googleCalendarUrl(calendar), "", "Questions or changes? Just reply to this email.", "", `— ${venue.name}, via Adgyn`].join("\n"),
    attachments: [{ filename: "event.ics", content: icsFile(calendar), contentType: "text/calendar" }],
  }) : await sendTextEmail({
    to: event.email, replyTo: owners[0],
    subject: event.status === "canceled" ? `Your event at ${venue.name} was canceled` : `About your event request at ${venue.name}`,
    text: [`Hi ${event.hostName || "there"},`, "", event.status === "canceled" ? `${venue.name} had to cancel your event on ${when(event)}.` : `Thanks for thinking of ${venue.name}. Unfortunately we can’t host your event on ${when(event)}.`, ...note, "",
      `You’re welcome to request another date: ${APP_URL}/${venue.slug}/events/host`, "", `— ${venue.name}, via Adgyn`].join("\n"),
  });
  if (!result.sent) console.error("Event decision email not sent", result.error);
  return result.sent;
}

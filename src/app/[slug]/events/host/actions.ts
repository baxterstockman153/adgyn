"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { cleanEvent, overlaps, type EventInput } from "@/lib/cafe-page";
import { emailNewRequest, eventView, loadPublicCafe } from "@/lib/cafe-events-server";

// Limits that keep one person (or a bot) from flooding a café's inbox.
const PENDING_PER_EMAIL = 3;
const PENDING_PER_CAFE = 60;

export async function requestEvent(slug: string, input: Partial<EventInput> & { website?: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    // `website` is a hidden field people never see; bots fill it in.
    if (input.website) return { ok: true };
    const cafe = await loadPublicCafe(String(slug));
    if (!cafe?.space.enabled) return { ok: false, error: "This café isn’t taking event requests right now." };
    const { venue, space } = cafe;
    const event = cleanEvent(input, space, { request: true });
    if (typeof event === "string") return { ok: false, error: event };
    const [mine, pending, booked] = await Promise.all([
      prisma.cafeEvent.count({ where: { venueId: venue.id, email: event.email, status: "pending" } }),
      prisma.cafeEvent.count({ where: { venueId: venue.id, status: "pending" } }),
      prisma.cafeEvent.findMany({ where: { venueId: venue.id, date: event.date, status: "approved" }, select: { date: true, startTime: true, endTime: true } }),
    ]);
    if (mine >= PENDING_PER_EMAIL) return { ok: false, error: `You already have ${mine} requests waiting with ${venue.name}. They’ll reply soon.` };
    if (pending >= PENDING_PER_CAFE) return { ok: false, error: `${venue.name} has a lot of requests right now. Please try again in a few days.` };
    if (booked.some(other => overlaps(event, other))) return { ok: false, error: "That time is already booked. Please pick a different time or day." };
    const created = await prisma.cafeEvent.create({ data: { venueId: venue.id, source: "request", status: "pending", ...event } });
    await emailNewRequest(eventView(created), venue);
    revalidatePath("/dashboard/venue/smart-sleeve", "layout");
    return { ok: true };
  } catch (error) {
    console.error("Event request failed", error);
    return { ok: false, error: "Your request didn’t go through. Please try again." };
  }
}

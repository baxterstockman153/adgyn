import { prisma } from "@/lib/prisma";
import { addDays, parseEventSpace } from "@/lib/cafe-page";
import { todayPacific } from "@/lib/smart-sleeves";
import { loadWorkspace } from "@/lib/smart-sleeves-server";
import { eventView, venueAddress } from "@/lib/cafe-events-server";
import { EventsView } from "./events-view";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.adgyn.com";

export default async function EventsPage() {
  const { venue, isOwner } = await loadWorkspace();
  // Pending requests, plus booked events from the last 60 days onward (for the calendar).
  const events = await prisma.cafeEvent.findMany({
    where: { venueId: venue.id, OR: [{ status: "pending" }, { status: "approved", date: { gte: addDays(todayPacific(), -60) } }] },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
  return <EventsView canEdit={isOwner} events={events.map(eventView)} space={parseEventSpace(venue.eventSpace)} publicUrl={`${APP_URL}/${venue.slug}/events`} location={venueAddress(venue)} />;
}

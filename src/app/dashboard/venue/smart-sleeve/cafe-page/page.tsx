import { prisma } from "@/lib/prisma";
import { parseCafePage, parseEventSpace } from "@/lib/cafe-page";
import { loadCampaignSummaries, loadWorkspace } from "@/lib/smart-sleeves-server";
import { upcomingPublicEvents } from "@/lib/cafe-events-server";
import { PageEditor } from "./page-editor";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.adgyn.com";

export default async function CafePagePage() {
  const { venue, cafe, isOwner } = await loadWorkspace();
  const [campaigns, events, legacy] = await Promise.all([
    loadCampaignSummaries(venue.id),
    upcomingPublicEvents(venue.id, 1),
    // The original sleeve page also lives at /<slug>; turning the café page on replaces it.
    prisma.campaign.count({ where: { venueId: venue.id, status: "active" } }),
  ]);
  const boards = campaigns.filter(campaign => campaign.experience.kind === "board" && campaign.status === "active").map(campaign => ({ id: campaign.id, name: campaign.experience.name }));
  const space = parseEventSpace(venue.eventSpace);
  return <PageEditor canEdit={isOwner} cafe={cafe} initial={parseCafePage(venue.cafePage, venue.websiteUrl)} boards={boards} eventsLive={space.enabled || events.length > 0} spaceName={space.name} nextEvent={events[0] ? `Next up: ${events[0].title}` : ""} publicUrl={`${APP_URL}/${venue.slug}`} replacesLegacy={legacy > 0} />;
}

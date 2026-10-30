import { loadWorkspace, shipToText } from "@/lib/smart-sleeves-server";
import { NewCampaign } from "./new-campaign";

export default async function NewCampaignPage() {
  const { cafe, venue, isOwner } = await loadWorkspace();
  return <NewCampaign cafe={cafe} location={venue.city ? `${venue.street}, ${venue.city}` : venue.address || venue.name} shipTo={venue.street ? shipToText(venue) : ""} canCreate={isOwner} />;
}

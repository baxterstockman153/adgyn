import { loadWorkspace } from "@/lib/smart-sleeves-server";
import { Settings } from "./settings";

export default async function SettingsPage() {
  const { account, venue, isOwner } = await loadWorkspace();
  return <Settings canEdit={isOwner} profile={{ name: account.name ?? "", email: account.email }} business={{ name: venue.name, websiteUrl: venue.websiteUrl ?? "", street: venue.street ?? "", suite: venue.suite ?? "", city: venue.city ?? "", state: venue.state ?? "", zip: venue.zip ?? "" }} legacyAddress={venue.street ? "" : venue.address ?? ""} branding={{ logoUrl: venue.logoUrl, iconUrl: venue.iconUrl }} />;
}

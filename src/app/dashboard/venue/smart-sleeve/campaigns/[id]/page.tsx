import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { loadCampaignDetail, loadWorkspace, shipToText } from "@/lib/smart-sleeves-server";
import { CampaignView } from "./campaign-view";

const RANGES = [7, 30, 90];

export default async function CampaignPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ range?: string; created?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const days = RANGES.includes(Number(query.range)) ? Number(query.range) : 30;
  const { cafe, venue, isOwner } = await loadWorkspace();
  const detail = await loadCampaignDetail(venue.id, id, days);
  if (!detail) notFound();
  const host = (await headers()).get("host") ?? "app.adgyn.com";
  const origin = `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
  return <CampaignView key={id} cafe={cafe} detail={detail} days={days} origin={origin} shipTo={venue.street ? shipToText(venue) : ""} canEdit={isOwner} created={query.created === "sleeves" || query.created === "qr" ? query.created : null} />;
}

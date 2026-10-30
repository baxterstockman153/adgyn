import Link from "next/link";
import { loadCampaignSummaries, loadWorkspace } from "@/lib/smart-sleeves-server";
import { CampaignRow } from "../parts";
import { Icon } from "../ui";

const BASE = "/dashboard/venue/smart-sleeve";

export default async function CampaignsPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { venue } = await loadWorkspace();
  const { show } = await searchParams;
  const archived = show === "archived";
  const campaigns = (await loadCampaignSummaries(venue.id, { includeArchived: archived })).filter(campaign => archived ? campaign.status === "archived" : true);
  return <>
    <div className="ss-heading"><div><div className="ss-eyebrow">Campaigns</div><h1>Campaigns</h1><p>Manage Smart Sleeves, QR codes, and sleeve orders from one place.</p></div><Link className="ss-button ss-button-primary" href={`${BASE}/campaigns/new`}><Icon name="plus" size={15} /> New campaign</Link></div>
    <div className="ss-filter-tabs ss-section-tabs"><Link href={`${BASE}/campaigns`} aria-current={!archived ? "page" : undefined}>Current</Link><Link href={`${BASE}/campaigns?show=archived`} aria-current={archived ? "page" : undefined}>Archived</Link></div>
    <div className="ss-card">{campaigns.length ? campaigns.map(campaign => <CampaignRow key={campaign.id} campaign={campaign} />) : <div className="ss-empty"><Icon name={archived ? "archive" : "qr"} size={32} /><h3>{archived ? "No archived campaigns" : "No campaigns yet"}</h3><p>{archived ? "Campaigns you archive will show up here." : "Each campaign gets a permanent QR code. Change what it shows anytime without reprinting."}</p>{!archived && <Link className="ss-button ss-button-primary" href={`${BASE}/campaigns/new`}>New campaign</Link>}</div>}</div>
  </>;
}

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { cents } from "@/lib/smart-sleeves";
import { loadCampaignSummaries, loadVenueScans, loadWorkspace, shipToText } from "@/lib/smart-sleeves-server";
import { CampaignRow, ScanChart } from "./parts";
import { Icon } from "./ui";

const BASE = "/dashboard/venue/smart-sleeve";

export default async function DashboardPage() {
  const { venue, account } = await loadWorkspace();
  const [campaigns, scans, contacts] = await Promise.all([
    loadCampaignSummaries(venue.id),
    loadVenueScans(venue.id, 30),
    prisma.smartContact.findMany({ where: { venueId: venue.id }, distinct: ["email"], select: { email: true } }).then(rows => rows.length),
  ]);
  const live = campaigns.filter(campaign => campaign.status === "active");
  const sponsors = campaigns.reduce((total, campaign) => total + campaign.sponsors, 0);
  const revenue = campaigns.reduce((total, campaign) => total + campaign.revenueCents, 0);
  const firstName = account.name?.split(" ")[0];
  const setup = [
    { done: !!shipToText(venue) && !!venue.street, label: "Add your business details", hint: "Your address is where sleeves ship.", href: `${BASE}/settings` },
    { done: !!venue.logoUrl, label: "Upload your logo", hint: "Shown on your customer pages and sleeves.", href: `${BASE}/settings` },
    { done: campaigns.length > 0, label: "Launch your first campaign", hint: "Pick what customers see when they scan.", href: `${BASE}/campaigns/new` },
  ];
  const remaining = setup.filter(step => !step.done);
  return <>
    <div className="ss-heading"><div><div className="ss-eyebrow">Dashboard</div><h1>{firstName ? `Welcome back, ${firstName}` : "Welcome back"}</h1><p>How your QR codes are doing across every campaign.</p></div></div>
    {remaining.length > 0 && <div className="ss-card ss-card-pad ss-setup"><h3>Finish setting up</h3><div className="ss-progress-track"><div style={{ width: `${((setup.length - remaining.length) / setup.length) * 100}%` }} /></div><div className="ss-checklist">{setup.map(step => <Link key={step.label} href={step.href}><span className={`ss-check-circle${step.done ? " ss-check-circle-done" : ""}`}>{step.done && <Icon name="check" size={13} />}</span><span><strong>{step.label}</strong><small>{step.hint}</small></span></Link>)}</div></div>}
    <div className="ss-stats ss-stats-4">
      <div className="ss-stat"><span>Scans</span><strong>{scans.total.toLocaleString()}</strong><small>Last 30 days</small></div>
      <div className="ss-stat"><span>Active campaigns</span><strong>{live.length}</strong><small>{campaigns.length} total</small></div>
      <div className="ss-stat"><span>Sponsor revenue</span><strong>{cents(revenue)}</strong><small>{sponsors} active {sponsors === 1 ? "sponsor" : "sponsors"}</small></div>
      <div className="ss-stat"><span>Customer contacts</span><strong>{contacts.toLocaleString()}</strong><small>From signups</small></div>
    </div>
    <div className="ss-card ss-section"><div className="ss-card-header"><div><h3>Scans in the last 30 days</h3><p>Every QR code, every campaign.</p></div></div><div className="ss-card-pad"><ScanChart series={scans.series} label="Scans in the last 30 days" /></div></div>
    <div className="ss-card ss-section"><div className="ss-card-header"><div><h3>Your campaigns</h3><p>Open one to see its QR codes, sponsors, and results.</p></div><Link className="ss-button ss-button-secondary" href={`${BASE}/campaigns`}>View all</Link></div>
      {campaigns.length ? campaigns.slice(0, 6).map(campaign => <CampaignRow key={campaign.id} campaign={campaign} />) : <div className="ss-empty"><Icon name="qr" size={32} /><h3>No campaigns yet</h3><p>Create a campaign to get a QR code for your sleeves, signs, and tables.</p><Link className="ss-button ss-button-primary" href={`${BASE}/campaigns/new`}>New campaign</Link></div>}
    </div>
  </>;
}

import type { Metadata } from "next";
import Image from "next/image";
import { cents, initials } from "@/lib/smart-sleeves";
import { resolveJoinToken } from "./resolve";
import { JoinForm } from "./join-form";
import "@/app/dashboard/venue/smart-sleeve/workspace.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Community Board invite · Adgyn", robots: { index: false, follow: false } };

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const resolved = await resolveJoinToken(token);
  if (!resolved) return <div className="ss"><main className="ss-public"><div className="ss-card ss-card-pad ss-empty"><h1>This invite link isn’t active</h1><p>Ask the café for a new link.</p></div></main></div>;
  const { sponsor, experience, venue } = resolved;
  const price = sponsor ? sponsor.priceCents / 100 : experience.suggestedPrice;
  const city = venue.city ? ` in ${venue.city}` : "";
  return <div className="ss"><main className="ss-join">
    <header className="ss-join-header">{venue.logoUrl ? <Image src={venue.logoUrl} alt="" width={56} height={56} unoptimized /> : <div className="ss-customer-monogram">{initials(venue.name)}</div>}<div className="ss-eyebrow">Community Board invite</div><h1>Put your business in front of {venue.name}’s customers</h1><p>{venue.name}{city} features a few neighborhood businesses on the page customers see when they scan the QR code on their cups and signs. {sponsor ? (sponsor.priceCents ? `Your placement is ${cents(sponsor.priceCents)} for this campaign.` : "There’s no cost to be featured.") : price ? `Suggested sponsorship for this campaign: ${cents(price * 100)}.` : ""} Takes about a minute.</p></header>
    {sponsor?.status === "approved" ? <div className="ss-card ss-card-pad ss-empty"><h3>You’re on the board</h3><p>{sponsor.businessName} is live on {venue.name}’s Community Board. To change your offer, contact the café.</p></div>
      : <JoinForm token={token} cafeName={venue.name} invited={!!sponsor} initial={{ businessName: sponsor?.businessName ?? "", email: sponsor?.email ?? "", offer: sponsor?.offer ?? "", url: sponsor?.url ?? "", logoUrl: sponsor?.logoUrl ?? null, price }} submitted={sponsor?.status === "requested"} />}
    <p className="ss-join-footer">Powered by <strong>adgyn</strong></p>
  </main></div>;
}

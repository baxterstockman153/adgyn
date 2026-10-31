import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { campaignStatus, parseExperience, type Cafe } from "@/lib/smart-sleeves";
import { existingClaimId, publicSponsors, requestChannel } from "@/lib/smart-sleeves-server";
import { PublicExperience } from "./public-experience";
import "@/app/dashboard/venue/smart-sleeve/workspace.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "A little closer to your neighborhood · Adgyn", robots: { index: false, follow: false } };

// `id` is a QR code id. Each campaign's first QR code shares the campaign's id,
// so codes printed before campaigns had several QR codes keep working.
export default async function ExperiencePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ channel?: string; preview?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const code = await prisma.smartQrCode.findUnique({ where: { id }, include: { experience: { include: { venue: { select: { name: true, slug: true, logoUrl: true, iconUrl: true } } } } } });
  if (!code) notFound();
  const record = code.experience;
  const experience = parseExperience(record.config, record.id);
  if (!experience) notFound();
  const cafe: Cafe = { id: record.venueId, name: record.venue.name, slug: record.venue.slug, accent: "#2f5d4c", logoUrl: record.venue.iconUrl ?? record.venue.logoUrl };
  const preview = query.preview === "1";
  if (code.archivedAt) return <div className="ss"><main className="ss-public"><div className="ss-card ss-card-pad ss-empty"><h1>{cafe.name}</h1><p>This QR code is no longer in use. Thanks for scanning!</p></div></main></div>;
  const status = campaignStatus(record, experience);
  if (status !== "active" && !preview) return <div className="ss"><main className="ss-public"><div className="ss-card ss-card-pad ss-empty"><h1>{cafe.name}</h1><p>{status === "ended" || status === "archived" ? "This campaign has wrapped up. Thanks for scanning!" : "This page is taking a little break. Please check back soon."}</p></div></main></div>;
  const channel = requestChannel(query.channel ?? null);
  if (experience.kind === "link" && !preview) redirect(`/q/${id}/go?channel=${channel}`);
  const sponsors = experience.kind === "board" ? await publicSponsors(record.id) : [];
  const savedClaim = experience.kind === "offer" && !preview ? await existingClaimId(record.id) : undefined;
  return <div className="ss">{preview && <div className="ss-public-banner">Customer preview · no activity is recorded</div>}<main className="ss-public"><PublicExperience cafe={cafe} experience={experience} sponsors={sponsors} qrCodeId={code.id} channel={channel} preview={preview} savedClaim={savedClaim} /></main></div>;
}

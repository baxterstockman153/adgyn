import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseExperience, type Cafe } from "@/lib/smart-sleeves";
import { requestChannel } from "@/lib/smart-sleeves-server";
import { PublicExperience } from "./public-experience";
import "@/app/dashboard/venue/smart-sleeve/workspace.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "A little closer to your neighborhood · Adgyn", robots: { index: false, follow: false } };

export default async function ExperiencePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ channel?: string; preview?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const record = await prisma.smartExperience.findUnique({ where: { id }, include: { venue: { select: { name: true, slug: true } } } });
  if (!record) notFound();
  const experience = parseExperience(record.config);
  if (!experience) notFound();
  if (!record.published) return <div className="ss ss-public"><div className="ss-card ss-card-pad ss-empty"><h1>{record.venue.name}</h1><p>This experience is taking a little break. Please check back soon.</p></div></div>;
  const channel = requestChannel(query.channel ?? null);
  const preview = query.preview === "1";
  if (experience.kind === "link" && !preview) redirect(`/q/${id}/go?channel=${channel}`);
  const cafe: Cafe = { id: record.venueId, name: record.venue.name, slug: record.venue.slug, locations: [experience.location], accent: record.venue.slug === "nirvana-soul" ? "#8a4172" : "#2f5d4c", appUrl: "" };
  return <div className="ss">{preview && <div className="ss-public-banner">Customer preview · no activity is recorded</div>}<main className="ss-public"><PublicExperience cafe={cafe} experience={{ ...experience, id: record.id, published: true }} channel={channel} preview={preview} /></main></div>;
}

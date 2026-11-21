export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { cafeOf, loadPublicCafe, resolvePageLinks } from "@/lib/cafe-events-server";
import { CafePageView } from "@/app/dashboard/venue/smart-sleeve/cafe-page-view";
import { SleevePageClient } from "./client";
import "@/app/dashboard/venue/smart-sleeve/workspace.css";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const cafe = await loadPublicCafe((await params).slug);
  if (!cafe?.page.enabled) return {};
  return { title: cafe.venue.name, description: cafe.page.tagline || `Events, menu, and more from ${cafe.venue.name}.` };
}

export default async function VenueSleevePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Smart Sleeves cafés that turned on their café page get the link hub here.
  const cafe = await loadPublicCafe(slug);
  if (cafe?.page.enabled) {
    const { venue, page, space } = cafe;
    const links = await resolvePageLinks(venue, page, space);
    return <div className="ss"><main className="ss-public"><CafePageView cafe={cafeOf(venue)} tagline={page.tagline} links={links} /></main></div>;
  }

  const venue = await prisma.venue.findUnique({
    where: { slug },
    include: {
      campaigns: {
        where: { status: "active" },
        take: 1,
        include: {
          placements: {
            include: { brand: true },
            orderBy: { slot: "asc" },
          },
        },
      },
    },
  });

  if (!venue) notFound();

  const campaign = venue.campaigns[0];

  if (!campaign) {
    return (
      <div className="min-h-screen bg-[#F5F0EB] flex flex-col items-center justify-center px-4 text-center">
        <div className="font-serif text-2xl font-bold mb-2">{venue.name}</div>
        <p className="text-gray-500">{venue.fallbackMessage}</p>
        <p className="text-xs text-gray-300 mt-8">Powered by <strong>adgyn</strong></p>
      </div>
    );
  }

  const placements = campaign.placements.map((p) => ({
    id: p.id,
    slot: p.slot,
    brandName: p.brand.name,
    logoUrl: p.logoUrl || p.brand.defaultLogoUrl,
    tagline: p.tagline,
    ctaText: p.ctaText,
    ctaUrl: p.ctaUrl,
    buttonColor: p.buttonColor,
  }));

  return (
    <SleevePageClient
      venue={{ name: venue.name, logoUrl: venue.logoUrl, websiteUrl: venue.websiteUrl }}
      campaignId={campaign.id}
      placements={placements}
    />
  );
}

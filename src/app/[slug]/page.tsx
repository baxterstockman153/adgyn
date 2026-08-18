export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { SleevePageClient } from "./client";

export default async function VenueSleevePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

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
    brandName: p.brand.name,
    logoUrl: p.logoUrl || p.brand.defaultLogoUrl,
    tagline: p.tagline,
    ctaText: p.ctaText,
    ctaUrl: p.ctaUrl,
    buttonColor: p.buttonColor,
  }));

  return (
    <SleevePageClient
      venue={{ name: venue.name, logoUrl: venue.logoUrl }}
      campaignId={campaign.id}
      placements={placements}
    />
  );
}

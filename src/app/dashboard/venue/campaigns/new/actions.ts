"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export type AdSlot = {
  businessName: string;
  logoUrl: string;
  tagline: string;
  ctaText: string;
  ctaUrl: string;
  buttonColor: string;
};

export type CreateCampaignInput = {
  name: string;
  sleeveCount: number;
  revenueTarget: number; // dollars, converted to cents
  ads: AdSlot[];
};

export async function createCampaign(input: CreateCampaignInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email! },
    include: { memberships: { where: { orgType: "venue" } } },
  });

  const venueId = dbUser?.memberships[0]?.orgId;
  if (!venueId) throw new Error("No venue found");

  const revenueTargetCents = Math.round(input.revenueTarget * 100);
  const pricePerPlacementCents =
    input.ads.length > 0
      ? Math.round(revenueTargetCents / input.ads.length)
      : 0;

  // Create campaign
  const campaign = await prisma.campaign.create({
    data: {
      venueId,
      name: input.name,
      status: "draft",
      maxPlacements: 4,
      sleeveCount: input.sleeveCount,
      revenueTarget: revenueTargetCents,
      pricePerPlacement: pricePerPlacementCents,
    },
  });

  // Create brands + placements for each ad slot
  for (let i = 0; i < input.ads.length; i++) {
    const ad = input.ads[i];

    // Upsert brand by name (simple match)
    let brand = await prisma.brand.findFirst({
      where: { name: ad.businessName },
    });

    if (!brand) {
      brand = await prisma.brand.create({
        data: {
          name: ad.businessName,
          websiteUrl: ad.ctaUrl,
          defaultLogoUrl: ad.logoUrl || null,
        },
      });
    }

    await prisma.placement.create({
      data: {
        campaignId: campaign.id,
        brandId: brand.id,
        slot: i + 1,
        logoUrl: ad.logoUrl || null,
        tagline: ad.tagline,
        ctaText: ad.ctaText,
        ctaUrl: ad.ctaUrl,
        buttonColor: ad.buttonColor,
        status: "pending",
      },
    });
  }

  redirect(`/dashboard/venue?campaign=${campaign.id}`);
}

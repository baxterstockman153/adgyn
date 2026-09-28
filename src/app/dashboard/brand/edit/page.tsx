import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ProfileForm } from "../profile-form";

export const dynamic = "force-dynamic";

export default async function BrandProfileEditPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email! },
    include: { memberships: { where: { orgType: "brand" } } },
  });
  const brandId = dbUser?.memberships[0]?.orgId;
  if (!brandId) redirect("/dashboard");

  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    include: {
      placements: {
        where: { campaign: { status: { not: "completed" } } },
        orderBy: { createdAt: "desc" },
        include: { campaign: { include: { venue: true } } },
      },
    },
  });
  if (!brand) redirect("/dashboard");

  const initialPlacements = brand.placements.map((p) => ({
    id: p.id,
    logoUrl: p.logoUrl ?? "",
    tagline: p.tagline ?? "",
    ctaText: p.ctaText ?? "",
    ctaUrl: p.ctaUrl ?? "",
    buttonColor: p.buttonColor ?? "#1a1a1a",
    venueName: p.campaign.venue.name,
    campaignName: p.campaign.name,
    slot: p.slot,
  }));

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/brand"
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          &larr; Back to dashboard
        </Link>
        <h1 className="font-serif text-2xl font-bold mt-2">Edit your profile</h1>
      </div>
      <ProfileForm
        brandName={brand.name}
        initialWebsiteUrl={brand.websiteUrl ?? ""}
        initialLogoUrl={brand.defaultLogoUrl ?? ""}
        initialPlacements={initialPlacements}
      />
    </div>
  );
}

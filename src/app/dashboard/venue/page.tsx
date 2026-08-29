import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CampaignDashboard } from "./campaign-dashboard";

export const dynamic = "force-dynamic";

export default async function VenueDashboard({
  searchParams,
}: {
  searchParams: Promise<{ campaign?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { campaign: selectedCampaignId } = await searchParams;

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email! },
    include: {
      memberships: { where: { orgType: "venue" } },
    },
  });

  const venueId = dbUser?.memberships[0]?.orgId;
  if (!venueId) redirect("/dashboard");

  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    include: {
      campaigns: {
        orderBy: { createdAt: "desc" },
        include: {
          placements: {
            include: {
              brand: true,
              _count: { select: { clicks: true } },
            },
            orderBy: { slot: "asc" },
          },
          scans: {
            select: {
              id: true,
              visitorId: true,
              sessionHash: true,
              city: true,
              country: true,
              deviceType: true,
              os: true,
              isReturning: true,
              scannedAt: true,
            },
          },
          _count: { select: { scans: true } },
        },
      },
    },
  });

  if (!venue) redirect("/dashboard");

  // Pick which campaign to show
  const currentCampaign = selectedCampaignId
    ? venue.campaigns.find((c) => c.id === selectedCampaignId)
    : venue.campaigns.find((c) => c.status === "active") || venue.campaigns[0];

  // Compute analytics for the selected campaign
  let analytics = null;
  if (currentCampaign) {
    const scans = currentCampaign.scans;
    const uniqueVisitors = new Set(scans.map((s) => s.visitorId || s.sessionHash).filter(Boolean));
    const totalClicks = currentCampaign.placements.reduce(
      (sum, p) => sum + p._count.clicks, 0
    );

    const returningCount = scans.filter((s) => s.isReturning).length;
    const newCount = scans.length - returningCount;

    const cityCounts: Record<string, number> = {};
    for (const s of scans) {
      if (s.city) cityCounts[s.city] = (cityCounts[s.city] || 0) + 1;
    }
    const topCities = Object.entries(cityCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const deviceCounts: Record<string, number> = {};
    for (const s of scans) {
      const d = s.deviceType || "unknown";
      deviceCounts[d] = (deviceCounts[d] || 0) + 1;
    }

    const osCounts: Record<string, number> = {};
    for (const s of scans) {
      const o = s.os || "unknown";
      osCounts[o] = (osCounts[o] || 0) + 1;
    }

    const hourCounts = new Array(24).fill(0);
    for (const s of scans) {
      hourCounts[new Date(s.scannedAt).getHours()]++;
    }
    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));

    // Sort placements by clicks (most popular first), mapped to plain objects
    const sortedPlacements = [...currentCampaign.placements]
      .sort((a, b) => b._count.clicks - a._count.clicks)
      .map((p) => ({
        id: p.id,
        slot: p.slot,
        brandName: p.brand.name,
        tagline: p.tagline,
        clicks: p._count.clicks,
      }));
    const topPlacement = sortedPlacements[0];

    analytics = {
      total: scans.length,
      unique: uniqueVisitors.size,
      totalClicks,
      ctr: scans.length > 0 ? ((totalClicks / scans.length) * 100).toFixed(1) : "0",
      newCount,
      returningCount,
      topCities,
      deviceCounts,
      osCounts,
      peakHour,
      sortedPlacements,
      topPlacementName: topPlacement?.brandName || null,
    };
  }

  // Build campaign list for the selector
  const campaignList = venue.campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    scans: c._count.scans,
    placements: c.placements.length,
    maxPlacements: c.maxPlacements,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-2xl font-bold">{venue.name}</h1>
          <p className="text-gray-500 text-sm mt-1">
            Sleeve URL:{" "}
            <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">
              adgyn.vercel.app/{venue.slug}
            </code>
          </p>
        </div>
        {process.env.NEXT_PUBLIC_FEATURE_CAMPAIGN_BUILDER === "true" && (
          <Link
            href="/dashboard/venue/campaigns/new"
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            + New Campaign
          </Link>
        )}
      </div>

      {/* Campaign Switcher */}
      {campaignList.length > 1 && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {campaignList.map((c) => {
            const isSelected = currentCampaign?.id === c.id;
            return (
              <Link
                key={c.id}
                href={`/dashboard/venue?campaign=${c.id}`}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  isSelected
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${
                  c.status === "active" ? "bg-green-400" :
                  c.status === "draft" ? "bg-yellow-400" : "bg-gray-400"
                }`} />
                {c.name}
              </Link>
            );
          })}
        </div>
      )}

      {/* Selected Campaign */}
      {currentCampaign && analytics ? (
        <CampaignDashboard
          campaign={{
            name: currentCampaign.name,
            status: currentCampaign.status,
            sleeveCount: currentCampaign.sleeveCount,
            maxPlacements: currentCampaign.maxPlacements,
            placements: currentCampaign.placements.map((p) => ({
              id: p.id,
              slot: p.slot,
              brandName: p.brand.name,
              tagline: p.tagline,
              clicks: p._count.clicks,
            })),
          }}
          analytics={analytics}
        />
      ) : (
        <section className="mb-10 bg-white rounded-2xl shadow-sm p-8 text-center">
          <p className="text-gray-400">No campaigns yet.</p>
          <p className="text-gray-300 text-sm mt-1">
            Create a campaign to get started.
          </p>
        </section>
      )}
    </div>
  );
}

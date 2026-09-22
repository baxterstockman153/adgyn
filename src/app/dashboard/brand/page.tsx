import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function BrandDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email! },
    include: {
      memberships: { where: { orgType: "brand" } },
    },
  });

  const brandId = dbUser?.memberships[0]?.orgId;
  if (!brandId) redirect("/dashboard");

  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    include: {
      placements: {
        orderBy: { createdAt: "desc" },
        include: {
          campaign: {
            include: {
              venue: true,
              _count: { select: { scans: true } },
            },
          },
          clicks: {
            select: {
              id: true,
              city: true,
              country: true,
              deviceType: true,
              os: true,
              clickedAt: true,
            },
          },
          _count: { select: { clicks: true } },
        },
      },
    },
  });

  if (!brand) redirect("/dashboard");

  const activePlacements = brand.placements.filter(
    (p) => p.campaign.status === "active"
  );
  const pastPlacements = brand.placements.filter(
    (p) => p.campaign.status === "completed"
  );

  const totalImpressions = brand.placements.reduce(
    (sum, p) => sum + p.campaign._count.scans, 0
  );
  const totalClicks = brand.placements.reduce(
    (sum, p) => sum + p._count.clicks, 0
  );
  const overallCtr = totalImpressions > 0
    ? ((totalClicks / totalImpressions) * 100).toFixed(1)
    : "0";

  // Aggregate click analytics across all placements
  const allClicks = brand.placements.flatMap((p) => p.clicks);

  const cityCounts: Record<string, number> = {};
  const deviceCounts: Record<string, number> = {};
  const osCounts: Record<string, number> = {};

  for (const c of allClicks) {
    if (c.city) cityCounts[c.city] = (cityCounts[c.city] || 0) + 1;
    const d = c.deviceType || "unknown";
    deviceCounts[d] = (deviceCounts[d] || 0) + 1;
    const o = c.os || "unknown";
    osCounts[o] = (osCounts[o] || 0) + 1;
  }

  const topCities = Object.entries(cityCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-bold">{brand.name}</h1>
        {brand.websiteUrl && (
          <Link
            href={brand.websiteUrl}
            className="text-sm text-purple-600 hover:underline"
            target="_blank"
          >
            {brand.websiteUrl} &rarr;
          </Link>
        )}
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard label="Active Campaigns" value={activePlacements.length} />
        <StatCard label="Total Impressions" value={totalImpressions} />
        <StatCard label="Total Clicks" value={totalClicks} />
        <StatCard
          label="Overall CTR"
          value={`${overallCtr}%`}
          tooltip="Click-through rate — the share of impressions (QR scans) that resulted in an ad tap (total clicks ÷ total impressions)."
        />
      </div>

      {/* Audience Insights (from clicks) */}
      {allClicks.length > 0 && (
        <section className="mb-10">
          <h2 className="font-serif text-lg font-bold mb-4">Your Audience</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Device breakdown */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="text-xs font-medium text-gray-400 mb-3">Devices</h3>
              {Object.entries(deviceCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([device, count]) => (
                  <div key={device} className="flex justify-between items-center mb-1.5">
                    <span className="text-sm capitalize">{device}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${(count / allClicks.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-8 text-right">
                        {Math.round((count / allClicks.length) * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
            </div>

            {/* OS breakdown */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="text-xs font-medium text-gray-400 mb-3">Platform</h3>
              {Object.entries(osCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([os, count]) => (
                  <div key={os} className="flex justify-between items-center mb-1.5">
                    <span className="text-sm">{os}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${(count / allClicks.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-8 text-right">
                        {Math.round((count / allClicks.length) * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
            </div>

            {/* Top cities */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="text-xs font-medium text-gray-400 mb-3">Top Cities</h3>
              {topCities.length > 0 ? (
                topCities.map(([city, count]) => (
                  <div key={city} className="flex justify-between items-center mb-1.5">
                    <span className="text-sm">{city}</span>
                    <span className="text-xs text-gray-400">{count} clicks</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-300">No location data yet</p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Active Placements */}
      <section className="mb-10">
        <h2 className="font-serif text-lg font-bold mb-4">Active Placements</h2>
        {activePlacements.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <p className="text-gray-400">No active placements right now.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activePlacements.map((p) => (
              <PlacementCard key={p.id} placement={p} />
            ))}
          </div>
        )}
      </section>

      {/* Past Placements */}
      {pastPlacements.length > 0 && (
        <section>
          <h2 className="font-serif text-lg font-bold mb-4">Past Placements</h2>
          <div className="space-y-3">
            {pastPlacements.map((p) => (
              <PlacementCard key={p.id} placement={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function InfoTooltip({ label, text }: { label: string; text: string }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={`What is ${label}?`}
        className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-gray-300 hover:text-gray-500 focus:text-gray-500 focus:outline-none"
      >
        <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
          <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3a.9.9 0 110 1.8A.9.9 0 018 4zm1 8H7a.5.5 0 010-1h.5V7.5H7a.5.5 0 010-1h1a.5.5 0 01.5.5V11H9a.5.5 0 010 1z" />
        </svg>
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 w-48 -translate-x-1/2 rounded-lg bg-gray-900 px-2.5 py-1.5 text-center text-[11px] leading-snug text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

function StatCard({
  label,
  value,
  tooltip,
}: {
  label: string;
  value: number | string;
  tooltip?: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <p className="text-2xl font-bold">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <div className="flex items-center gap-1 mt-1">
        <p className="text-xs text-gray-400">{label}</p>
        {tooltip && <InfoTooltip label={label} text={tooltip} />}
      </div>
    </div>
  );
}

function PlacementCard({
  placement,
}: {
  placement: {
    id: string;
    tagline: string;
    ctaText: string;
    ctaUrl: string;
    buttonColor: string;
    campaign: {
      name: string;
      status: string;
      venue: { name: string; slug: string };
      _count: { scans: number };
    };
    _count: { clicks: number };
  };
}) {
  const isActive = placement.campaign.status === "active";
  const ctr =
    placement.campaign._count.scans > 0
      ? ((placement._count.clicks / placement.campaign._count.scans) * 100).toFixed(1)
      : "0";

  return (
    <div className="bg-white rounded-xl shadow-sm px-4 py-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isActive ? "bg-green-500" : "bg-gray-300"
            }`}
          />
          <p className="font-medium text-sm">{placement.campaign.venue.name}</p>
        </div>
        <span className="text-xs text-gray-400">{placement.campaign.name}</span>
      </div>
      <p className="text-xs text-gray-400 mb-3">&ldquo;{placement.tagline}&rdquo;</p>
      <div className="grid grid-cols-3 gap-2">
        <MiniStat label="Impressions" value={placement.campaign._count.scans} />
        <MiniStat label="Clicks" value={placement._count.clicks} />
        <MiniStat
          label="CTR"
          value={`${ctr}%`}
          tooltip="Click-through rate — the share of this placement's impressions that resulted in an ad tap (clicks ÷ impressions)."
        />
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tooltip,
}: {
  label: string;
  value: number | string;
  tooltip?: string;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-2 text-center">
      <p className="text-sm font-bold">{typeof value === "number" ? value.toLocaleString() : value}</p>
      <div className="flex items-center justify-center gap-0.5">
        <p className="text-[10px] text-gray-400">{label}</p>
        {tooltip && <InfoTooltip label={label} text={tooltip} />}
      </div>
    </div>
  );
}

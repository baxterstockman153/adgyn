import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function VenueDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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
              sessionHash: true,
              city: true,
              country: true,
              deviceType: true,
              os: true,
              scannedAt: true,
            },
          },
          _count: { select: { scans: true } },
        },
      },
    },
  });

  if (!venue) redirect("/dashboard");

  const activeCampaign = venue.campaigns.find((c) => c.status === "active");
  const pastCampaigns = venue.campaigns.filter((c) => c.status === "completed");
  const draftCampaigns = venue.campaigns.filter((c) => c.status === "draft");

  // Compute analytics for active campaign
  let scanAnalytics = null;
  if (activeCampaign) {
    const scans = activeCampaign.scans;
    const uniqueHashes = new Set(scans.map((s) => s.sessionHash).filter(Boolean));
    const totalClicks = activeCampaign.placements.reduce(
      (sum, p) => sum + p._count.clicks, 0
    );

    // Top cities
    const cityCounts: Record<string, number> = {};
    for (const s of scans) {
      if (s.city) cityCounts[s.city] = (cityCounts[s.city] || 0) + 1;
    }
    const topCities = Object.entries(cityCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Device breakdown
    const deviceCounts: Record<string, number> = {};
    for (const s of scans) {
      const d = s.deviceType || "unknown";
      deviceCounts[d] = (deviceCounts[d] || 0) + 1;
    }

    // OS breakdown
    const osCounts: Record<string, number> = {};
    for (const s of scans) {
      const o = s.os || "unknown";
      osCounts[o] = (osCounts[o] || 0) + 1;
    }

    // Scans by hour of day
    const hourCounts = new Array(24).fill(0);
    for (const s of scans) {
      hourCounts[new Date(s.scannedAt).getHours()]++;
    }
    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));

    scanAnalytics = {
      total: scans.length,
      unique: uniqueHashes.size,
      totalClicks,
      ctr: scans.length > 0 ? ((totalClicks / scans.length) * 100).toFixed(1) : "0",
      topCities,
      deviceCounts,
      osCounts,
      peakHour,
    };
  }

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
      </div>

      {/* Active Campaign */}
      {activeCampaign && scanAnalytics ? (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            <h2 className="font-serif text-lg font-bold">Active: {activeCampaign.name}</h2>
            <span className="text-xs text-gray-400 ml-2">
              {activeCampaign.sleeveCount} sleeves
            </span>
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <StatCard label="Total Scans" value={scanAnalytics.total} />
            <StatCard label="Unique Scans" value={scanAnalytics.unique} />
            <StatCard label="Total Clicks" value={scanAnalytics.totalClicks} />
            <StatCard label="CTR" value={`${scanAnalytics.ctr}%`} />
          </div>

          {/* Insights row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {/* Device breakdown */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="text-xs font-medium text-gray-400 mb-3">Devices</h3>
              {Object.entries(scanAnalytics.deviceCounts).map(([device, count]) => (
                <div key={device} className="flex justify-between items-center mb-1.5">
                  <span className="text-sm capitalize">{device}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: `${(count / scanAnalytics.total) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-8 text-right">
                      {Math.round((count / scanAnalytics.total) * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* OS breakdown */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="text-xs font-medium text-gray-400 mb-3">Operating System</h3>
              {Object.entries(scanAnalytics.osCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([os, count]) => (
                  <div key={os} className="flex justify-between items-center mb-1.5">
                    <span className="text-sm">{os}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${(count / scanAnalytics.total) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-8 text-right">
                        {Math.round((count / scanAnalytics.total) * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
            </div>

            {/* Top cities & peak hour */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="text-xs font-medium text-gray-400 mb-3">Location & Timing</h3>
              {scanAnalytics.topCities.length > 0 ? (
                <>
                  {scanAnalytics.topCities.map(([city, count]) => (
                    <div key={city} className="flex justify-between items-center mb-1.5">
                      <span className="text-sm">{city}</span>
                      <span className="text-xs text-gray-400">{count} scans</span>
                    </div>
                  ))}
                </>
              ) : (
                <p className="text-xs text-gray-300 mb-2">No location data yet</p>
              )}
              <div className="mt-3 pt-3 border-t border-gray-50">
                <p className="text-xs text-gray-400">Peak hour</p>
                <p className="text-sm font-medium">
                  {scanAnalytics.total > 0
                    ? `${scanAnalytics.peakHour % 12 || 12}${scanAnalytics.peakHour < 12 ? "am" : "pm"}`
                    : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Placements */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50">
              <h3 className="text-sm font-medium text-gray-500">
                Placements ({activeCampaign.placements.length}/{activeCampaign.maxPlacements})
              </h3>
            </div>
            {activeCampaign.placements.length === 0 ? (
              <p className="p-4 text-sm text-gray-400">No placements yet.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {activeCampaign.placements.map((p) => {
                  const pCtr =
                    scanAnalytics.total > 0
                      ? ((p._count.clicks / scanAnalytics.total) * 100).toFixed(1)
                      : "0";
                  return (
                    <div key={p.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-300 w-4">#{p.slot}</span>
                        <div>
                          <p className="font-medium text-sm">{p.brand.name}</p>
                          <p className="text-xs text-gray-400">{p.tagline}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{p._count.clicks} clicks</p>
                        <p className="text-xs text-gray-400">{pCtr}% CTR</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className="mb-10 bg-white rounded-2xl shadow-sm p-8 text-center">
          <p className="text-gray-400">No active campaign.</p>
          <p className="text-gray-300 text-sm mt-1">
            Create a draft campaign to get started.
          </p>
        </section>
      )}

      {/* Draft Campaigns */}
      {draftCampaigns.length > 0 && (
        <section className="mb-10">
          <h2 className="font-serif text-lg font-bold mb-4">Drafts</h2>
          <div className="space-y-3">
            {draftCampaigns.map((c) => (
              <CampaignRow
                key={c.id}
                name={c.name}
                status="draft"
                placements={c.placements.length}
                maxPlacements={c.maxPlacements}
                scans={c._count.scans}
              />
            ))}
          </div>
        </section>
      )}

      {/* Past Campaigns */}
      {pastCampaigns.length > 0 && (
        <section>
          <h2 className="font-serif text-lg font-bold mb-4">Past Campaigns</h2>
          <div className="space-y-3">
            {pastCampaigns.map((c) => (
              <CampaignRow
                key={c.id}
                name={c.name}
                status="completed"
                placements={c.placements.length}
                maxPlacements={c.maxPlacements}
                scans={c._count.scans}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <p className="text-2xl font-bold">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
  );
}

function CampaignRow({
  name,
  status,
  placements,
  maxPlacements,
  scans,
}: {
  name: string;
  status: string;
  placements: number;
  maxPlacements: number;
  scans: number;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span
          className={`w-2 h-2 rounded-full ${
            status === "draft" ? "bg-yellow-400" : "bg-gray-300"
          }`}
        />
        <div>
          <p className="font-medium text-sm">{name}</p>
          <p className="text-xs text-gray-400">
            {placements}/{maxPlacements} placements
          </p>
        </div>
      </div>
      <p className="text-sm text-gray-400">{scans} scans</p>
    </div>
  );
}

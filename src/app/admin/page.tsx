import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AdminOverview() {
  // Platform-wide counts
  const [venueCount, brandCount, userCount, campaignCounts] = await Promise.all(
    [
      prisma.venue.count(),
      prisma.brand.count(),
      prisma.user.count(),
      prisma.campaign.groupBy({
        by: ["status"],
        _count: true,
      }),
    ]
  );

  const statusMap: Record<string, number> = {};
  for (const c of campaignCounts) {
    statusMap[c.status] = c._count;
  }

  // Scan & click totals
  const [totalScans, totalClicks] = await Promise.all([
    prisma.scan.count(),
    prisma.click.count(),
  ]);

  // Scans in last 7 days
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [recentScans, recentClicks] = await Promise.all([
    prisma.scan.count({ where: { scannedAt: { gte: weekAgo } } }),
    prisma.click.count({ where: { clickedAt: { gte: weekAgo } } }),
  ]);

  // Revenue overview
  const campaigns = await prisma.campaign.findMany({
    where: { revenueTarget: { not: null } },
    select: {
      id: true,
      name: true,
      status: true,
      revenueTarget: true,
      pricePerPlacement: true,
      placements: { select: { id: true } },
      venue: { select: { name: true } },
    },
  });

  const totalRevenueTarget = campaigns.reduce(
    (sum, c) => sum + (c.revenueTarget || 0),
    0
  );

  // Recent campaigns
  const recentCampaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      venue: { select: { name: true } },
      _count: { select: { placements: true, scans: true } },
    },
  });

  // Top venues by scan count
  const topVenues = await prisma.venue.findMany({
    include: {
      campaigns: {
        include: { _count: { select: { scans: true } } },
      },
    },
  });

  const venueStats = topVenues
    .map((v) => ({
      id: v.id,
      name: v.name,
      slug: v.slug,
      totalScans: v.campaigns.reduce((s, c) => s + c._count.scans, 0),
      campaignCount: v.campaigns.length,
      activeCampaigns: v.campaigns.filter((c) => c.status === "active").length,
    }))
    .sort((a, b) => b.totalScans - a.totalScans);

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold mb-6">Platform Overview</h1>

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <MetricCard label="Venues" value={venueCount} />
        <MetricCard label="Brands" value={brandCount} />
        <MetricCard label="Users" value={userCount} />
        <MetricCard
          label="Active Campaigns"
          value={statusMap["active"] || 0}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <MetricCard label="Total Scans" value={totalScans.toLocaleString()} />
        <MetricCard label="Total Clicks" value={totalClicks.toLocaleString()} />
        <MetricCard label="Scans (7d)" value={recentScans.toLocaleString()} />
        <MetricCard label="Clicks (7d)" value={recentClicks.toLocaleString()} />
      </div>

      {/* Campaign status breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-yellow-400" />
            <span className="text-sm text-gray-500">Draft</span>
          </div>
          <p className="text-2xl font-bold">{statusMap["draft"] || 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm text-gray-500">Active</span>
          </div>
          <p className="text-2xl font-bold">{statusMap["active"] || 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-gray-300" />
            <span className="text-sm text-gray-500">Completed</span>
          </div>
          <p className="text-2xl font-bold">{statusMap["completed"] || 0}</p>
        </div>
      </div>

      {/* Revenue target */}
      {totalRevenueTarget > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-8">
          <h3 className="text-xs font-medium text-gray-400 mb-1">
            Total Revenue Target (all campaigns)
          </h3>
          <p className="text-2xl font-bold text-green-600">
            ${(totalRevenueTarget / 100).toLocaleString()}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent campaigns */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500">
              Recent Campaigns
            </h3>
            <Link
              href="/admin/campaigns"
              className="text-xs text-purple-600 hover:text-purple-800"
            >
              View all →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentCampaigns.map((c) => (
              <div key={c.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-gray-400">{c.venue.name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">
                    {c._count.placements}/4 slots · {c._count.scans} scans
                  </span>
                  <StatusBadge status={c.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Venues by scans */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500">
              Venues by Scans
            </h3>
            <Link
              href="/admin/venues"
              className="text-xs text-purple-600 hover:text-purple-800"
            >
              View all →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {venueStats.map((v) => (
              <div key={v.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{v.name}</p>
                  <p className="text-xs text-gray-400">
                    {v.campaignCount} campaigns · {v.activeCampaigns} active
                  </p>
                </div>
                <span className="text-sm font-bold">{v.totalScans} scans</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-yellow-50 text-yellow-700",
    active: "bg-green-50 text-green-700",
    completed: "bg-gray-100 text-gray-500",
  };
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status] || styles.draft}`}
    >
      {status}
    </span>
  );
}

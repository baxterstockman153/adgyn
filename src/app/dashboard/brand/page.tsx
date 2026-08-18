import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

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
    (sum, p) => sum + p.campaign._count.scans,
    0
  );
  const totalClicks = brand.placements.reduce(
    (sum, p) => sum + p._count.clicks,
    0
  );

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
      <div className="grid grid-cols-3 gap-3 mb-10">
        <StatCard label="Active Campaigns" value={activePlacements.length} />
        <StatCard label="Total Impressions" value={totalImpressions} />
        <StatCard label="Total Clicks" value={totalClicks} />
      </div>

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

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <p className="text-2xl font-bold">{value.toLocaleString()}</p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
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
        <MiniStat label="CTR" value={`${ctr}%`} />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-2 text-center">
      <p className="text-sm font-bold">{typeof value === "number" ? value.toLocaleString() : value}</p>
      <p className="text-[10px] text-gray-400">{label}</p>
    </div>
  );
}

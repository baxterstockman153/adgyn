import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PlacementCard, type PlacementCardData } from "./placement-card";

type PlacementWithData = {
  id: string;
  tagline: string;
  campaign: {
    name: string;
    status: string;
    venue: { name: string };
    _count: { scans: number };
  };
  _count: { clicks: number };
  clicks: { city: string | null; deviceType: string | null; os: string | null }[];
};

/** Build the per-placement audience breakdown the client card renders. */
function toCardData(p: PlacementWithData): PlacementCardData {
  const tally = (vals: (string | null)[], fallback?: string) => {
    const counts: Record<string, number> = {};
    for (const v of vals) {
      const key = v || fallback;
      if (!key) continue;
      counts[key] = (counts[key] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count }));
  };
  const sleeveViews = p.campaign._count.scans;
  const clicks = p._count.clicks;
  return {
    id: p.id,
    venueName: p.campaign.venue.name,
    campaignName: p.campaign.name,
    isActive: p.campaign.status === "active",
    tagline: p.tagline,
    sleeveViews,
    clicks,
    ctr: sleeveViews > 0 ? ((clicks / sleeveViews) * 100).toFixed(1) : "0",
    clickTotal: p.clicks.length,
    devices: tally(p.clicks.map((c) => c.deviceType), "unknown"),
    platform: tally(p.clicks.map((c) => c.os), "unknown"),
    cities: tally(p.clicks.map((c) => c.city)).slice(0, 5),
  };
}

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

  // Onboarding completeness — based on editable (non-completed) placements.
  const editablePlacements = brand.placements.filter(
    (p) => p.campaign.status !== "completed"
  );
  const checklist = [
    { label: "Add your business logo", done: !!brand.defaultLogoUrl },
    { label: "Add your website", done: !!brand.websiteUrl },
    {
      label: "Write a tagline for each ad",
      done:
        editablePlacements.length > 0 &&
        editablePlacements.every((p) => !!p.tagline?.trim()),
    },
    {
      label: "Set where each ad links to",
      done:
        editablePlacements.length > 0 &&
        editablePlacements.every((p) => !!p.ctaUrl?.trim()),
    },
  ];
  const remaining = checklist.filter((c) => !c.done);
  const profileComplete = remaining.length === 0;

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
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
        <Link
          href="/dashboard/brand/edit"
          className="shrink-0 text-sm px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
        >
          Edit profile
        </Link>
      </div>

      {/* Onboarding checklist */}
      {!profileComplete && (
        <section className="mb-8 rounded-2xl border border-purple-100 bg-purple-50 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-base font-bold text-purple-900">
              Finish setting up your ads
            </h2>
            <span className="text-xs text-purple-500">
              {checklist.length - remaining.length}/{checklist.length} done
            </span>
          </div>
          <ul className="space-y-1.5 mb-4">
            {checklist.map((item) => (
              <li key={item.label} className="flex items-center gap-2 text-sm">
                <span
                  className={
                    item.done
                      ? "text-green-600"
                      : "text-purple-300"
                  }
                >
                  {item.done ? "✓" : "○"}
                </span>
                <span className={item.done ? "text-gray-400 line-through" : "text-gray-700"}>
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href="/dashboard/brand/edit"
            className="inline-block text-sm px-4 py-2 rounded-lg bg-purple-700 text-white font-medium hover:bg-purple-800"
          >
            Complete your profile
          </Link>
        </section>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard label="Active ads" value={activePlacements.length} />
        <StatCard
          label="Sleeve views"
          value={totalImpressions}
          tooltip="Total scans of the sleeves your ads are on, across all venues. A sleeve is shared by up to 4 businesses, so this is shared reach — not views of your ad alone."
        />
        <StatCard
          label="Your clicks"
          value={totalClicks}
          tooltip="Taps on your ad specifically, across all venues."
        />
        <StatCard
          label="Overall CTR"
          value={`${overallCtr}%`}
          tooltip="Click-through rate — your clicks ÷ sleeve views. The share of people who saw a sleeve and tapped your ad."
        />
      </div>

      {/* Active Placements */}
      <section className="mb-10">
        <h2 className="font-serif text-lg font-bold mb-1">Active Placements</h2>
        <p className="text-sm text-gray-400 mb-4">
          Each card is your ad on one venue&apos;s coffee sleeve. &ldquo;Sleeve
          views&rdquo; is how many scanned that sleeve; &ldquo;your clicks&rdquo;
          is taps on your ad there. Tap a card to see who&apos;s tapping — devices,
          platform, and cities.
        </p>
        {activePlacements.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <p className="text-gray-400">No active placements right now.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activePlacements.map((p) => (
              <PlacementCard key={p.id} placement={toCardData(p)} />
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
              <PlacementCard key={p.id} placement={toCardData(p)} />
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


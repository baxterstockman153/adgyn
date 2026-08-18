import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

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
          _count: { select: { scans: true } },
        },
      },
    },
  });

  if (!venue) redirect("/dashboard");

  const activeCampaign = venue.campaigns.find((c) => c.status === "active");
  const pastCampaigns = venue.campaigns.filter((c) => c.status === "completed");
  const draftCampaigns = venue.campaigns.filter((c) => c.status === "draft");

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
      {activeCampaign ? (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            <h2 className="font-serif text-lg font-bold">Active: {activeCampaign.name}</h2>
            <span className="text-xs text-gray-400 ml-2">
              {activeCampaign.sleeveCount} sleeves
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <StatCard
              label="Total Scans"
              value={activeCampaign._count.scans}
            />
            <StatCard
              label="Total Clicks"
              value={activeCampaign.placements.reduce(
                (sum, p) => sum + p._count.clicks,
                0
              )}
            />
          </div>

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
                {activeCampaign.placements.map((p) => (
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
                      <Link
                        href={p.ctaUrl}
                        className="text-xs text-purple-600 hover:underline"
                        target="_blank"
                      >
                        {p.ctaText} &rarr;
                      </Link>
                    </div>
                  </div>
                ))}
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

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <p className="text-2xl font-bold">{value.toLocaleString()}</p>
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

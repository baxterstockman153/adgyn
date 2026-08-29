import { prisma } from "@/lib/prisma";
import { CampaignActions } from "./campaign-actions";

export default async function AdminCampaigns() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      venue: { select: { name: true, slug: true } },
      placements: {
        include: {
          brand: { select: { name: true } },
          _count: { select: { clicks: true } },
        },
        orderBy: { slot: "asc" },
      },
      _count: { select: { scans: true } },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-bold">Campaigns</h1>
        <span className="text-sm text-gray-400">{campaigns.length} total</span>
      </div>

      <div className="space-y-4">
        {campaigns.map((c) => {
          const totalClicks = c.placements.reduce(
            (s, p) => s + p._count.clicks,
            0
          );
          const ctr =
            c._count.scans > 0
              ? ((totalClicks / c._count.scans) * 100).toFixed(1)
              : "0";

          return (
            <div
              key={c.id}
              className="bg-white rounded-2xl shadow-sm overflow-hidden"
            >
              {/* Campaign header */}
              <div className="px-5 py-4 flex items-center justify-between border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      c.status === "active"
                        ? "bg-green-500"
                        : c.status === "draft"
                        ? "bg-yellow-400"
                        : "bg-gray-300"
                    }`}
                  />
                  <div>
                    <h2 className="font-medium">{c.name}</h2>
                    <p className="text-xs text-gray-400">
                      {c.venue.name} · {c.sleeveCount} sleeves
                      {c.revenueTarget
                        ? ` · $${(c.revenueTarget / 100).toLocaleString()} target`
                        : ""}
                      {c.pricePerPlacement
                        ? ` · $${(c.pricePerPlacement / 100).toLocaleString()}/slot`
                        : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Stats */}
                  <div className="hidden sm:flex items-center gap-4 text-sm text-gray-500 mr-4">
                    <span>{c._count.scans} scans</span>
                    <span>{totalClicks} clicks</span>
                    <span>{ctr}% CTR</span>
                  </div>

                  <CampaignActions
                    campaignId={c.id}
                    status={c.status}
                  />
                </div>
              </div>

              {/* Placements */}
              <div className="px-5 py-3">
                {c.placements.length === 0 ? (
                  <p className="text-xs text-gray-300 py-2">
                    No placements yet
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    {c.placements.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg"
                      >
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                          style={{ backgroundColor: p.buttonColor }}
                        >
                          {p.slot}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">
                            {p.brand.name}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {p._count.clicks} clicks
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Dates */}
              <div className="px-5 py-2 border-t border-gray-50 text-[10px] text-gray-300 flex gap-4">
                <span>Created {c.createdAt.toLocaleDateString()}</span>
                {c.startedAt && (
                  <span>Started {c.startedAt.toLocaleDateString()}</span>
                )}
                {c.endedAt && (
                  <span>Ended {c.endedAt.toLocaleDateString()}</span>
                )}
                <span className="font-mono">{c.id}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

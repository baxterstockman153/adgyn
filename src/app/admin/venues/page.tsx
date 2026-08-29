import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AdminVenues() {
  const venues = await prisma.venue.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      campaigns: {
        include: {
          _count: { select: { scans: true, placements: true } },
        },
      },
    },
  });

  const venueStats = venues.map((v) => ({
    ...v,
    totalScans: v.campaigns.reduce((s, c) => s + c._count.scans, 0),
    totalCampaigns: v.campaigns.length,
    activeCampaigns: v.campaigns.filter((c) => c.status === "active").length,
    totalPlacements: v.campaigns.reduce((s, c) => s + c._count.placements, 0),
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-bold">Venues</h1>
        <span className="text-sm text-gray-400">{venues.length} total</span>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wider">
                <th className="px-4 py-3">Venue</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3 text-center">Campaigns</th>
                <th className="px-4 py-3 text-center">Active</th>
                <th className="px-4 py-3 text-center">Placements</th>
                <th className="px-4 py-3 text-center">Total Scans</th>
                <th className="px-4 py-3">Page</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {venueStats.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {v.logoUrl ? (
                        <img
                          src={v.logoUrl}
                          alt=""
                          className="w-8 h-8 rounded-full object-contain bg-gray-50"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400">
                          {v.name[0]}
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{v.name}</p>
                        {v.address && (
                          <p className="text-xs text-gray-400">{v.address}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-xs bg-gray-50 px-2 py-0.5 rounded">
                      {v.slug}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-center">{v.totalCampaigns}</td>
                  <td className="px-4 py-3 text-center">
                    {v.activeCampaigns > 0 ? (
                      <span className="inline-flex items-center gap-1 text-green-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        {v.activeCampaigns}
                      </span>
                    ) : (
                      <span className="text-gray-300">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">{v.totalPlacements}</td>
                  <td className="px-4 py-3 text-center font-medium">
                    {v.totalScans.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/${v.slug}`}
                      target="_blank"
                      className="text-xs text-purple-600 hover:text-purple-800"
                    >
                      View page ↗
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

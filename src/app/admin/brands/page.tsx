import { prisma } from "@/lib/prisma";
import { createBrand } from "../actions";

export default async function AdminBrands() {
  const brands = await prisma.brand.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      placements: {
        include: {
          campaign: {
            select: { name: true, status: true, venue: { select: { name: true } } },
          },
          _count: { select: { clicks: true } },
        },
      },
    },
  });

  const brandStats = brands.map((b) => ({
    ...b,
    totalPlacements: b.placements.length,
    totalClicks: b.placements.reduce((s, p) => s + p._count.clicks, 0),
    activePlacements: b.placements.filter(
      (p) => p.campaign.status === "active"
    ).length,
    venues: [
      ...new Set(b.placements.map((p) => p.campaign.venue.name)),
    ],
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-bold">Brands</h1>
        <span className="text-sm text-gray-400">{brands.length} total</span>
      </div>

      {/* Quick add */}
      <form
        action={createBrand}
        className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-end"
      >
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs text-gray-400 mb-1">Name</label>
          <input
            name="name"
            required
            placeholder="Business name"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs text-gray-400 mb-1">Website</label>
          <input
            name="websiteUrl"
            type="url"
            placeholder="https://..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs text-gray-400 mb-1">Logo URL</label>
          <input
            name="logoUrl"
            type="url"
            placeholder="https://..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          + Add Brand
        </button>
      </form>

      {/* Brand table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wider">
                <th className="px-4 py-3">Brand</th>
                <th className="px-4 py-3">Website</th>
                <th className="px-4 py-3 text-center">Placements</th>
                <th className="px-4 py-3 text-center">Active</th>
                <th className="px-4 py-3 text-center">Total Clicks</th>
                <th className="px-4 py-3">Venues</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {brandStats.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {b.defaultLogoUrl ? (
                        <img
                          src={b.defaultLogoUrl}
                          alt=""
                          className="w-7 h-7 rounded-full object-contain bg-gray-50"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400">
                          {b.name[0]}
                        </div>
                      )}
                      <span className="font-medium">{b.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {b.websiteUrl ? (
                      <a
                        href={b.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-purple-600 hover:text-purple-800 truncate block max-w-[200px]"
                      >
                        {b.websiteUrl.replace(/^https?:\/\//, "")}
                      </a>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {b.totalPlacements}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {b.activePlacements > 0 ? (
                      <span className="text-green-600">{b.activePlacements}</span>
                    ) : (
                      <span className="text-gray-300">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center font-medium">
                    {b.totalClicks.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-400">
                      {b.venues.join(", ") || "—"}
                    </span>
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

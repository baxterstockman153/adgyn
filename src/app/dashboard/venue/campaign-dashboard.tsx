"use client";

interface Placement {
  id: string;
  slot: number;
  brandName: string;
  tagline: string;
  clicks: number;
}

interface Analytics {
  total: number;
  unique: number;
  totalClicks: number;
  ctr: string;
  newCount: number;
  returningCount: number;
  topCities: [string, number][];
  deviceCounts: Record<string, number>;
  osCounts: Record<string, number>;
  peakHour: number;
  sortedPlacements: Placement[];
  topPlacementName: string | null;
}

interface Campaign {
  name: string;
  status: string;
  sleeveCount: number;
  maxPlacements: number;
  placements: Placement[];
}

const RANK_COLORS = [
  "bg-yellow-400 text-yellow-900", // 1st - gold
  "bg-gray-300 text-gray-700",     // 2nd - silver
  "bg-amber-600 text-amber-100",   // 3rd - bronze
  "bg-gray-100 text-gray-500",     // 4th
];

export function CampaignDashboard({
  campaign,
  analytics,
}: {
  campaign: Campaign;
  analytics: Analytics;
}) {
  const maxClicks = Math.max(...analytics.sortedPlacements.map((p) => p.clicks), 1);

  return (
    <section className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        <span
          className={`w-2 h-2 rounded-full ${
            campaign.status === "active"
              ? "bg-green-500"
              : campaign.status === "draft"
              ? "bg-yellow-400"
              : "bg-gray-300"
          }`}
        />
        <h2 className="font-serif text-lg font-bold">{campaign.name}</h2>
        <span className="text-xs text-gray-400 ml-2 capitalize">
          {campaign.status} · {campaign.sleeveCount} sleeves
        </span>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatCard label="Total Scans" value={analytics.total} />
        <StatCard label="Unique Visitors" value={analytics.unique} />
        <StatCard label="Total Clicks" value={analytics.totalClicks} />
        <StatCard label="CTR" value={`${analytics.ctr}%`} />
      </div>

      {/* New vs Returning */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center text-green-600 text-sm font-bold">
            N
          </div>
          <div>
            <p className="text-lg font-bold">{analytics.newCount}</p>
            <p className="text-xs text-gray-400">New visitors</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 text-sm font-bold">
            R
          </div>
          <div>
            <p className="text-lg font-bold">{analytics.returningCount}</p>
            <p className="text-xs text-gray-400">Returning visitors</p>
          </div>
        </div>
      </div>

      {/* Guest Performance Ranking */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-500">
            Guest Performance
          </h3>
          <span className="text-xs text-gray-400">
            Ranked by clicks
          </span>
        </div>
        {analytics.sortedPlacements.length === 0 ? (
          <p className="p-4 text-sm text-gray-400">No placements yet.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {analytics.sortedPlacements.map((p, i) => {
              const pCtr =
                analytics.total > 0
                  ? ((p.clicks / analytics.total) * 100).toFixed(1)
                  : "0";
              const barWidth = maxClicks > 0 ? (p.clicks / maxClicks) * 100 : 0;

              return (
                <div key={p.id} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          RANK_COLORS[i] || RANK_COLORS[3]
                        }`}
                      >
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-medium text-sm">{p.brandName}</p>
                        <p className="text-xs text-gray-400">{p.tagline}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{p.clicks}</p>
                      <p className="text-xs text-gray-400">{pCtr}% CTR</p>
                    </div>
                  </div>
                  {/* Click bar */}
                  <div className="ml-8 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        i === 0 ? "bg-purple-500" : "bg-purple-300"
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Insights row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Device breakdown */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="text-xs font-medium text-gray-400 mb-3">Devices</h3>
          {Object.entries(analytics.deviceCounts).map(([device, count]) => (
            <div key={device} className="flex justify-between items-center mb-1.5">
              <span className="text-sm capitalize">{device}</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${(count / analytics.total) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-8 text-right">
                  {Math.round((count / analytics.total) * 100)}%
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* OS breakdown */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="text-xs font-medium text-gray-400 mb-3">Operating System</h3>
          {Object.entries(analytics.osCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([os, count]) => (
              <div key={os} className="flex justify-between items-center mb-1.5">
                <span className="text-sm">{os}</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${(count / analytics.total) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-8 text-right">
                    {Math.round((count / analytics.total) * 100)}%
                  </span>
                </div>
              </div>
            ))}
        </div>

        {/* Top cities & peak hour */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="text-xs font-medium text-gray-400 mb-3">Location & Timing</h3>
          {analytics.topCities.length > 0 ? (
            analytics.topCities.map(([city, count]) => (
              <div key={city} className="flex justify-between items-center mb-1.5">
                <span className="text-sm">{city}</span>
                <span className="text-xs text-gray-400">{count} scans</span>
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-300 mb-2">No location data yet</p>
          )}
          <div className="mt-3 pt-3 border-t border-gray-50">
            <p className="text-xs text-gray-400">Peak hour</p>
            <p className="text-sm font-medium">
              {analytics.total > 0
                ? `${analytics.peakHour % 12 || 12}${analytics.peakHour < 12 ? "am" : "pm"}`
                : "—"}
            </p>
          </div>
        </div>
      </div>
    </section>
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

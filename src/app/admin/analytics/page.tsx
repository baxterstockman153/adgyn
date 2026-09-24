export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";

/**
 * Internal intelligence dashboard. This is the data we collect but do NOT
 * necessarily surface to venues or brands: data quality, position bias,
 * dwell/engagement quality, cross-venue reach, audience mix, sleeve decay and
 * conversion attribution. Admin-only.
 */
export default async function AnalyticsPage() {
  const [scans, clicks, conversions, campaigns, placements, brands] =
    await Promise.all([
      prisma.scan.findMany({
        select: {
          visitorId: true,
          isReturning: true,
          isBot: true,
          botReason: true,
          language: true,
          deviceType: true,
          scannedAt: true,
          campaignId: true,
        },
      }),
      prisma.click.findMany({
        select: {
          slot: true,
          dwellMs: true,
          isBot: true,
          placementId: true,
          clickedAt: true,
        },
      }),
      prisma.conversion.findMany({
        select: { value: true, placementId: true, clickId: true },
      }),
      prisma.campaign.findMany({ select: { id: true, name: true, venueId: true } }),
      prisma.placement.findMany({ select: { id: true, campaignId: true, brandId: true } }),
      prisma.brand.findMany({ select: { id: true, name: true } }),
    ]);

  // ── Lookup maps ──
  const brandName = new Map(brands.map((b) => [b.id, b.name]));
  const campaignVenue = new Map(campaigns.map((c) => [c.id, c.venueId]));
  const placementInfo = new Map(
    placements.map((p) => [p.id, { campaignId: p.campaignId, brandId: p.brandId }])
  );

  // ── Data quality (bot filtering) ──
  const humanScans = scans.filter((s) => !s.isBot);
  const botScans = scans.filter((s) => s.isBot);
  const botReasons: Record<string, number> = {};
  for (const s of botScans) {
    const r = s.botReason || "unknown";
    botReasons[r] = (botReasons[r] || 0) + 1;
  }
  const humanClicks = clicks.filter((c) => !c.isBot);
  const botClickCount = clicks.length - humanClicks.length;
  const botSharePct = scans.length
    ? Math.round((botScans.length / scans.length) * 100)
    : 0;

  // ── Position bias (slot CTR) ──
  // Every scan shows all slots, so human-scans is a fair shared denominator.
  const slotClicks: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const c of humanClicks) {
    if (c.slot && slotClicks[c.slot] !== undefined) slotClicks[c.slot]++;
  }
  const slotRows = [1, 2, 3, 4].map((slot) => ({
    slot,
    clicks: slotClicks[slot],
    ctr: humanScans.length ? (slotClicks[slot] / humanScans.length) * 100 : 0,
  }));
  const maxSlotClicks = Math.max(1, ...slotRows.map((r) => r.clicks));

  // ── Dwell / engagement quality ──
  const dwellValues = humanClicks
    .map((c) => c.dwellMs)
    .filter((d): d is number => d != null && d >= 0)
    .sort((a, b) => a - b);
  const medianDwell = dwellValues.length
    ? dwellValues[Math.floor(dwellValues.length / 2)]
    : null;
  const avgDwell = dwellValues.length
    ? Math.round(dwellValues.reduce((s, d) => s + d, 0) / dwellValues.length)
    : null;
  const dwellBuckets = [
    { label: "< 2s (impulse)", min: 0, max: 2000, n: 0 },
    { label: "2–5s", min: 2000, max: 5000, n: 0 },
    { label: "5–15s (considered)", min: 5000, max: 15000, n: 0 },
    { label: "> 15s", min: 15000, max: Infinity, n: 0 },
  ];
  for (const d of dwellValues) {
    const b = dwellBuckets.find((x) => d >= x.min && d < x.max);
    if (b) b.n++;
  }

  // ── Cross-venue visitor graph ──
  const visitorVenues = new Map<string, Set<string>>();
  for (const s of humanScans) {
    if (!s.visitorId) continue;
    const venueId = campaignVenue.get(s.campaignId);
    if (!venueId) continue;
    if (!visitorVenues.has(s.visitorId)) visitorVenues.set(s.visitorId, new Set());
    visitorVenues.get(s.visitorId)!.add(venueId);
  }
  const knownVisitors = visitorVenues.size;
  const crossVenueVisitors = [...visitorVenues.values()].filter((s) => s.size >= 2).length;
  const crossVenuePct = knownVisitors
    ? Math.round((crossVenueVisitors / knownVisitors) * 100)
    : 0;

  // ── New vs returning ──
  const returningScans = humanScans.filter((s) => s.isReturning).length;
  const returningPct = humanScans.length
    ? Math.round((returningScans / humanScans.length) * 100)
    : 0;

  // ── Audience mix: language ──
  const langCounts: Record<string, number> = {};
  for (const s of humanScans) {
    if (!s.language) continue;
    langCounts[s.language] = (langCounts[s.language] || 0) + 1;
  }
  const topLangs = Object.entries(langCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxLang = Math.max(1, ...topLangs.map(([, n]) => n));

  // ── Time-of-day heatmap (UTC) ──
  const hourCounts = new Array(24).fill(0);
  const dowCounts = new Array(7).fill(0);
  for (const s of humanScans) {
    hourCounts[s.scannedAt.getUTCHours()]++;
    dowCounts[s.scannedAt.getUTCDay()]++;
  }
  const maxHour = Math.max(1, ...hourCounts);
  const dowLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const maxDow = Math.max(1, ...dowCounts);

  // ── Scan volume by day (last 14 days) — sleeve decay proxy ──
  const days = lastNDays(14);
  const dayCounts = new Map<string, number>(days.map((d) => [d, 0]));
  for (const s of humanScans) {
    const key = s.scannedAt.toISOString().slice(0, 10);
    if (dayCounts.has(key)) dayCounts.set(key, dayCounts.get(key)! + 1);
  }
  const maxDay = Math.max(1, ...[...dayCounts.values()]);

  // ── Per-brand: impressions vs clicks ("viewed but ignored") ──
  // Impressions for a placement ≈ human scans of its campaign.
  const scansByCampaign: Record<string, number> = {};
  for (const s of humanScans) {
    scansByCampaign[s.campaignId] = (scansByCampaign[s.campaignId] || 0) + 1;
  }
  const clicksByPlacement: Record<string, number> = {};
  for (const c of humanClicks) {
    clicksByPlacement[c.placementId] = (clicksByPlacement[c.placementId] || 0) + 1;
  }
  const brandAgg = new Map<string, { impressions: number; clicks: number }>();
  for (const p of placements) {
    const impr = scansByCampaign[p.campaignId] || 0;
    const clk = clicksByPlacement[p.id] || 0;
    const cur = brandAgg.get(p.brandId) || { impressions: 0, clicks: 0 };
    cur.impressions += impr;
    cur.clicks += clk;
    brandAgg.set(p.brandId, cur);
  }
  const brandRows = [...brandAgg.entries()]
    .map(([brandId, v]) => ({
      name: brandName.get(brandId) || "?",
      impressions: v.impressions,
      clicks: v.clicks,
      ctr: v.impressions ? (v.clicks / v.impressions) * 100 : 0,
    }))
    .filter((r) => r.impressions > 0)
    .sort((a, b) => a.ctr - b.ctr); // worst first — coaching signal

  // ── Conversions ──
  const convCount = conversions.length;
  const convValueCents = conversions.reduce((s, c) => s + (c.value || 0), 0);
  const convMatched = conversions.filter((c) => c.clickId).length;
  const clickToConv = humanClicks.length
    ? ((convCount / humanClicks.length) * 100).toFixed(1)
    : "0";
  const convByBrand: Record<string, number> = {};
  for (const c of conversions) {
    const info = placementInfo.get(c.placementId);
    const name = info ? brandName.get(info.brandId) || "?" : "?";
    convByBrand[name] = (convByBrand[name] || 0) + 1;
  }
  const topConvBrands = Object.entries(convByBrand).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-bold">Intelligence</h1>
        <p className="text-sm text-gray-500 mt-1">
          Internal signals we collect from scans &amp; clicks — not shown to venues or brands.
        </p>
      </div>

      {/* Data quality */}
      <SectionTitle>Data Quality</SectionTitle>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Metric label="Human scans" value={humanScans.length.toLocaleString()} />
        <Metric label="Bot / dup scans" value={botScans.length.toLocaleString()} sub={`${botSharePct}% of all`} />
        <Metric label="Human clicks" value={humanClicks.length.toLocaleString()} />
        <Metric label="Bot clicks" value={botClickCount.toLocaleString()} />
      </div>
      {botScans.length > 0 && (
        <Card className="mb-8">
          <CardHead>Why traffic was flagged</CardHead>
          {Object.entries(botReasons)
            .sort((a, b) => b[1] - a[1])
            .map(([reason, n]) => (
              <Row key={reason} label={reason} value={n} max={botScans.length} />
            ))}
        </Card>
      )}

      {/* Position bias + dwell */}
      <SectionTitle>Engagement Quality</SectionTitle>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardHead>Position bias — clicks by card slot</CardHead>
          {slotRows.map((r) => (
            <div key={r.slot} className="flex items-center gap-3 mb-2">
              <span className="text-sm text-gray-500 w-14">Slot {r.slot}</span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full"
                  style={{ width: `${(r.clicks / maxSlotClicks) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-400 w-24 text-right">
                {r.clicks} · {r.ctr.toFixed(1)}% CTR
              </span>
            </div>
          ))}
          <p className="text-[11px] text-gray-400 mt-2">
            CTR = clicks in slot ÷ human scans. A consistent slot-1 premium is a pricing lever.
          </p>
        </Card>

        <Card>
          <CardHead>Dwell before tap</CardHead>
          <div className="flex gap-6 mb-3">
            <div>
              <p className="text-2xl font-bold">{fmtMs(medianDwell)}</p>
              <p className="text-xs text-gray-400">median</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{fmtMs(avgDwell)}</p>
              <p className="text-xs text-gray-400">average</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{dwellValues.length}</p>
              <p className="text-xs text-gray-400">timed clicks</p>
            </div>
          </div>
          {dwellBuckets.map((b) => (
            <Row key={b.label} label={b.label} value={b.n} max={Math.max(1, dwellValues.length)} />
          ))}
        </Card>
      </div>

      {/* Reach & audience */}
      <SectionTitle>Reach &amp; Audience</SectionTitle>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Metric label="Known visitors" value={knownVisitors.toLocaleString()} />
        <Metric
          label="Cross-venue visitors"
          value={crossVenueVisitors.toLocaleString()}
          sub={`${crossVenuePct}% seen at 2+ venues`}
        />
        <Metric label="Returning scans" value={`${returningPct}%`} />
        <Metric label="Languages seen" value={Object.keys(langCounts).length} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardHead>Language mix</CardHead>
          {topLangs.length === 0 ? (
            <Empty>No language data yet</Empty>
          ) : (
            topLangs.map(([lang, n]) => <Row key={lang} label={lang} value={n} max={maxLang} />)
          )}
        </Card>
        <Card>
          <CardHead>Day of week (UTC)</CardHead>
          {dowCounts.map((n, i) => (
            <Row key={i} label={dowLabels[i]} value={n} max={maxDow} />
          ))}
        </Card>
      </div>

      {/* Time of day */}
      <Card className="mb-8">
        <CardHead>Scans by hour of day (UTC)</CardHead>
        <div className="flex items-end gap-[3px] h-28 mt-2">
          {hourCounts.map((n, h) => (
            <div key={h} className="flex-1 flex flex-col items-center justify-end h-full" title={`${h}:00 — ${n} scans`}>
              <div
                className="w-full bg-purple-400 rounded-sm"
                style={{ height: `${(n / maxHour) * 100}%`, minHeight: n > 0 ? 2 : 0 }}
              />
              {h % 3 === 0 && <span className="text-[9px] text-gray-400 mt-1">{h}</span>}
            </div>
          ))}
        </div>
      </Card>

      {/* Sleeve decay */}
      <Card className="mb-8">
        <CardHead>Scan volume — last 14 days (sleeve decay)</CardHead>
        <div className="flex items-end gap-1 h-28 mt-2">
          {days.map((key) => {
            const n = dayCounts.get(key) || 0;
            return (
              <div key={key} className="flex-1 flex flex-col items-center justify-end h-full" title={`${key} — ${n} scans`}>
                <div
                  className="w-full bg-green-400 rounded-sm"
                  style={{ height: `${(n / maxDay) * 100}%`, minHeight: n > 0 ? 2 : 0 }}
                />
                <span className="text-[9px] text-gray-400 mt-1">{key.slice(5)}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Conversions */}
      <SectionTitle>Conversion Attribution</SectionTitle>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Metric label="Conversions" value={convCount.toLocaleString()} sub={`${convMatched} click-matched`} />
        <Metric label="Reported value" value={`$${(convValueCents / 100).toLocaleString()}`} />
        <Metric label="Click → conversion" value={`${clickToConv}%`} />
        <Metric label="Brands converting" value={Object.keys(convByBrand).length} />
      </div>
      <Card className="mb-8">
        <CardHead>Conversions by brand</CardHead>
        {topConvBrands.length === 0 ? (
          <Empty>
            No conversions yet. Brands add a pixel to their thank-you page:
            <code className="block mt-1 text-[11px] bg-gray-50 p-2 rounded text-gray-600 break-all">
              {`<img src="https://app.adgyn.com/api/conversion?ref=ADGYN_REF" />`}
            </code>
            The <code>adgyn_ref</code> token is appended to every outbound click URL.
          </Empty>
        ) : (
          topConvBrands.map(([name, n]) => (
            <Row key={name} label={name} value={n} max={Math.max(...topConvBrands.map((x) => x[1]))} />
          ))
        )}
      </Card>

      {/* Creative performance */}
      <SectionTitle>Creative Performance (coaching signal)</SectionTitle>
      <Card>
        <CardHead>Brands by CTR — weakest first</CardHead>
        {brandRows.length === 0 ? (
          <Empty>No impressions yet</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                  <th className="py-2 font-medium">Brand</th>
                  <th className="py-2 font-medium text-right">Impressions</th>
                  <th className="py-2 font-medium text-right">Clicks</th>
                  <th className="py-2 font-medium text-right">CTR</th>
                </tr>
              </thead>
              <tbody>
                {brandRows.slice(0, 15).map((r) => (
                  <tr key={r.name} className="border-b border-gray-50">
                    <td className="py-2">{r.name}</td>
                    <td className="py-2 text-right text-gray-500">{r.impressions.toLocaleString()}</td>
                    <td className="py-2 text-right text-gray-500">{r.clicks.toLocaleString()}</td>
                    <td className="py-2 text-right font-medium">{r.ctr.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

/** YYYY-MM-DD keys for the last n days, oldest first. Outside the component so
 *  the impure Date read isn't flagged as render-time impurity. */
function lastNDays(n: number): string[] {
  const now = Date.now();
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    out.push(new Date(now - i * 86400000).toISOString().slice(0, 10));
  }
  return out;
}

function fmtMs(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-serif text-lg font-bold mb-3 mt-2">{children}</h2>;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-xl shadow-sm p-4 ${className}`}>{children}</div>;
}

function CardHead({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-medium text-gray-400 mb-3">{children}</h3>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-gray-400">{children}</p>;
}

function Metric({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
      {sub && <p className="text-[11px] text-gray-300 mt-0.5">{sub}</p>}
    </div>
  );
}

function Row({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="flex items-center gap-3 mb-1.5">
      <span className="text-sm w-32 truncate" title={label}>{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(value / max) * 100}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-10 text-right">{value}</span>
    </div>
  );
}

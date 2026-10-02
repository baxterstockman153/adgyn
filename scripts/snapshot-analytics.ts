import { writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { makePrisma } from "./_db";

/**
 * Read-only analytics snapshot.
 *
 * Dumps every scan (view) and click — joined with venue / campaign / brand
 * names — to timestamped CSV + JSON files in ~/Downloads/adgyn-snapshots.
 * Run anytime you want an archive, and ALWAYS before any destructive reset.
 *
 *   npx tsx scripts/snapshot-analytics.ts            # all venues
 *   npx tsx scripts/snapshot-analytics.ts gratitude  # only venues whose slug contains "gratitude"
 */
const prisma = makePrisma();

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = v instanceof Date ? v.toISOString() : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}

async function main() {
  const slugFilter = process.argv[2]?.toLowerCase();
  const venueWhere = slugFilter
    ? { slug: { contains: slugFilter, mode: "insensitive" as const } }
    : undefined;

  const campaigns = await prisma.campaign.findMany({
    where: venueWhere ? { venue: venueWhere } : undefined,
    select: { id: true, name: true, venue: { select: { name: true, slug: true } } },
  });
  const campaignIds = campaigns.map((c) => c.id);
  const cMap = new Map(campaigns.map((c) => [c.id, c]));

  const placements = await prisma.placement.findMany({
    where: { campaignId: { in: campaignIds } },
    select: { id: true, campaignId: true, brand: { select: { name: true } } },
  });
  const pMap = new Map(placements.map((p) => [p.id, p]));

  const scans = await prisma.scan.findMany({
    where: { campaignId: { in: campaignIds } },
    orderBy: { scannedAt: "asc" },
  });
  const clicks = await prisma.click.findMany({
    where: { placementId: { in: placements.map((p) => p.id) } },
    orderBy: { clickedAt: "asc" },
  });

  const scanRows = scans.map((s) => {
    const c = cMap.get(s.campaignId);
    return { venue: c?.venue.slug ?? "?", campaign: c?.name ?? "?", ...s };
  });
  const clickRows = clicks.map((cl) => {
    const p = pMap.get(cl.placementId);
    const c = p ? cMap.get(p.campaignId) : undefined;
    return { venue: c?.venue.slug ?? "?", campaign: c?.name ?? "?", brand: p?.brand.name ?? "?", ...cl };
  });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const tag = slugFilter ? `-${slugFilter}` : "-all";
  const dir = join(homedir(), "Downloads", "adgyn-snapshots");
  mkdirSync(dir, { recursive: true });

  const base = join(dir, `snapshot${tag}-${stamp}`);
  writeFileSync(`${base}.json`, JSON.stringify({ scans: scanRows, clicks: clickRows }, null, 2));
  writeFileSync(`${base}.scans.csv`, toCsv(scanRows));
  writeFileSync(`${base}.clicks.csv`, toCsv(clickRows));

  console.log(`Snapshot written to ${dir}:`);
  console.log(`  ${base.split("/").pop()}.json`);
  console.log(`  ${base.split("/").pop()}.scans.csv   (${scanRows.length} scans)`);
  console.log(`  ${base.split("/").pop()}.clicks.csv  (${clickRows.length} clicks)`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());

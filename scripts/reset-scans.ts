import { writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { makePrisma } from "./_db";

/**
 * EXPORT-FIRST reset of a venue's scans (views) + clicks.
 *
 * ALWAYS snapshots the rows to ~/Downloads/adgyn-snapshots BEFORE deleting, so
 * a reset can never silently lose data again. Dry-run by default.
 *
 *   npx tsx scripts/reset-scans.ts --venue=gratitude            # dry run: show + snapshot, no delete
 *   npx tsx scripts/reset-scans.ts --venue=gratitude --apply    # snapshot THEN delete
 *
 * --venue matches venues whose slug contains the given text (case-insensitive).
 */
const prisma = makePrisma();

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.split("=")[1];
}

async function main() {
  const slug = arg("venue")?.toLowerCase();
  const apply = process.argv.includes("--apply");
  if (!slug) throw new Error("Pass --venue=<slug-substring> (refusing to reset all venues)");

  const venues = await prisma.venue.findMany({
    where: { slug: { contains: slug, mode: "insensitive" } },
    include: { campaigns: { include: { placements: { select: { id: true } } } } },
  });
  if (venues.length === 0) throw new Error(`No venue matches slug "${slug}"`);
  console.log(`Matched venues: ${venues.map((v) => v.slug).join(", ")}`);

  const campaignIds = venues.flatMap((v) => v.campaigns.map((c) => c.id));
  const placementIds = venues.flatMap((v) => v.campaigns.flatMap((c) => c.placements.map((p) => p.id)));

  const scans = await prisma.scan.findMany({ where: { campaignId: { in: campaignIds } }, orderBy: { scannedAt: "asc" } });
  const clicks = await prisma.click.findMany({ where: { placementId: { in: placementIds } }, orderBy: { clickedAt: "asc" } });
  console.log(`Scans: ${scans.length}, Clicks: ${clicks.length}`);

  // Snapshot first — unconditionally
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const dir = join(homedir(), "Downloads", "adgyn-snapshots");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `pre-reset-${slug}-${stamp}.json`);
  writeFileSync(file, JSON.stringify({ venues: venues.map((v) => v.slug), scans, clicks }, null, 2));
  console.log(`\nBackup written: ${file}`);

  if (!apply) {
    console.log("\n(dry run — pass --apply to delete AFTER this snapshot)");
    return;
  }

  const delClicks = await prisma.click.deleteMany({ where: { placementId: { in: placementIds } } });
  const delScans = await prisma.scan.deleteMany({ where: { campaignId: { in: campaignIds } } });
  console.log(`\nDeleted ${delClicks.count} clicks, ${delScans.count} scans. Backup is at:\n  ${file}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const cities = [
  { city: "Concord", region: "California", country: "United States" },
  { city: "Walnut Creek", region: "California", country: "United States" },
  { city: "Pleasant Hill", region: "California", country: "United States" },
  { city: "Martinez", region: "California", country: "United States" },
  { city: "San Francisco", region: "California", country: "United States" },
  { city: "Oakland", region: "California", country: "United States" },
];
const cityWeights = [32, 22, 16, 12, 10, 8];

function weightedRandom<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function randomDevice() {
  const r = Math.random();
  if (r < 0.68) return { deviceType: "mobile", os: "iOS", browser: "Safari" };
  if (r < 0.85) return { deviceType: "mobile", os: "Android", browser: "Chrome" };
  if (r < 0.92) return { deviceType: "desktop", os: "macOS", browser: "Chrome" };
  if (r < 0.97) return { deviceType: "desktop", os: "Windows", browser: "Chrome" };
  return { deviceType: "tablet", os: "iOS", browser: "Safari" };
}

function randomUA(device: { os: string }) {
  if (device.os === "iOS") return "Mozilla/5.0 (iPhone; CPU iPhone OS 18_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.4 Mobile/15E148 Safari/604.1";
  if (device.os === "Android") return "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36";
  if (device.os === "macOS") return "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
  return "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
}

// Spring campaign ran March–May 2026
function randomDate() {
  const start = new Date("2026-03-15");
  const end = new Date("2026-05-31");
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  const hour = weightedRandom(
    [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
    [8, 20, 25, 18, 10, 5, 4, 3, 2, 2, 1, 1]
  );
  d.setHours(hour, Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));
  return d;
}

function randomHash() {
  return Math.random().toString(36).slice(2, 18);
}

async function main() {
  const campaignId = "campaign-gratitude-spring-2026";

  console.log("Swapping Batch 5 — June brands for Gratitude Coffee Bar...\n");

  // 1. Find existing placements and delete their clicks
  const oldPlacements = await prisma.placement.findMany({
    where: { campaignId },
  });
  console.log(`Found ${oldPlacements.length} old placements`);

  for (const p of oldPlacements) {
    const deleted = await prisma.click.deleteMany({ where: { placementId: p.id } });
    console.log(`  Deleted ${deleted.count} clicks for placement ${p.id}`);
  }

  // Delete old scans for this campaign
  const deletedScans = await prisma.scan.deleteMany({ where: { campaignId } });
  console.log(`  Deleted ${deletedScans.count} scans`);

  // Delete old placements
  const deletedPlacements = await prisma.placement.deleteMany({ where: { campaignId } });
  console.log(`  Deleted ${deletedPlacements.count} placements\n`);

  // 2. Create 4 new brands — real Concord/Walnut Creek area businesses (different from summer campaign)
  const springBrands = [
    {
      id: "brand-todos-santos",
      name: "Todos Santos",
      websiteUrl: "https://www.todossantosplaza.com/",
    },
    {
      id: "brand-salt-craft",
      name: "Salt Craft Kitchen",
      websiteUrl: "https://www.saltcraftkitchen.com/",
    },
    {
      id: "brand-diablo-crossfit",
      name: "Diablo CrossFit",
      websiteUrl: "https://www.diablocrossfit.com/",
    },
    {
      id: "brand-bedrock-wines",
      name: "Bedrock Wine Co.",
      websiteUrl: "https://www.bedrockwineco.com/",
    },
  ];

  const brands = [];
  for (const b of springBrands) {
    const brand = await prisma.brand.upsert({
      where: { id: b.id },
      update: {},
      create: { id: b.id, name: b.name, websiteUrl: b.websiteUrl },
    });
    brands.push(brand);
    console.log(`Created brand: ${brand.name}`);
  }

  // 3. Create new placements
  const placementConfigs = [
    { brand: brands[0], slot: 1, tagline: "Live music every Friday on the plaza.", ctaText: "See Events", ctaUrl: "https://www.todossantosplaza.com/", buttonColor: "#B45309" },
    { brand: brands[1], slot: 2, tagline: "Farm-to-fork brunch. Reservations open.", ctaText: "Book a Table", ctaUrl: "https://www.saltcraftkitchen.com/", buttonColor: "#DC2626" },
    { brand: brands[2], slot: 3, tagline: "First class free. All fitness levels.", ctaText: "Try a Class", ctaUrl: "https://www.diablocrossfit.com/", buttonColor: "#2563EB" },
    { brand: brands[3], slot: 4, tagline: "Award-winning wines. Tastings Sat & Sun.", ctaText: "Book Tasting", ctaUrl: "https://www.bedrockwineco.com/", buttonColor: "#7C3AED" },
  ];

  console.log("");
  const placements = [];
  for (const pc of placementConfigs) {
    const p = await prisma.placement.create({
      data: {
        campaignId,
        brandId: pc.brand.id,
        slot: pc.slot,
        tagline: pc.tagline,
        ctaText: pc.ctaText,
        ctaUrl: pc.ctaUrl,
        buttonColor: pc.buttonColor,
        status: "completed",
      },
    });
    placements.push(p);
    console.log(`  Placement #${pc.slot}: ${pc.brand.name}`);
  }

  // 4. Generate scans
  console.log("\nGenerating scan data...");
  const scanCount = 152;
  const scanData = [];
  for (let i = 0; i < scanCount; i++) {
    const geo = weightedRandom(cities, cityWeights);
    const device = randomDevice();
    scanData.push({
      campaignId,
      sessionHash: randomHash(),
      userAgent: randomUA(device),
      city: geo.city,
      region: geo.region,
      country: geo.country,
      deviceType: device.deviceType,
      os: device.os,
      browser: device.browser,
      isReturning: Math.random() < 0.15,
      scannedAt: randomDate(),
    });
  }
  await prisma.scan.createMany({ data: scanData });
  console.log(`  Created ${scanCount} scans`);

  // 5. Generate clicks — Salt Craft Kitchen is the winner (brunch + coffee = perfect cross-sell)
  console.log("Generating click data...");
  const ctrs = [0.10, 0.26, 0.15, 0.18]; // Todos Santos, Salt Craft (winner!), Diablo, Bedrock
  let totalClicks = 0;

  for (let i = 0; i < placements.length; i++) {
    const clickCount = Math.round(scanCount * ctrs[i]);
    const clickData = [];
    for (let j = 0; j < clickCount; j++) {
      const geo = weightedRandom(cities, cityWeights);
      const device = randomDevice();
      clickData.push({
        placementId: placements[i].id,
        sessionHash: randomHash(),
        userAgent: randomUA(device),
        city: geo.city,
        region: geo.region,
        country: geo.country,
        deviceType: device.deviceType,
        os: device.os,
        browser: device.browser,
        clickedAt: randomDate(),
      });
    }
    await prisma.click.createMany({ data: clickData });
    totalClicks += clickCount;
    console.log(`  ${brands[i].name}: ${clickCount} clicks (${(ctrs[i] * 100).toFixed(0)}% CTR)`);
  }
  console.log(`  Total: ${totalClicks} clicks`);

  console.log("\n✅ Batch 5 — June now has different brands!");
  console.log("Gratitude Coffee Bar campaigns:");
  console.log("  Batch 6 — August (active): Contra Costa Fitness, Yoga Sol, Jory's Flowers, Epidemic Ales");
  console.log("  Batch 5 — June (completed): Todos Santos, Salt Craft Kitchen, Diablo CrossFit, Bedrock Wine Co.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

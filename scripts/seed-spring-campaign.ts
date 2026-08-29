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
  console.log("Creating Spring 2026 campaign for Gratitude Coffee Bar...");

  const venue = await prisma.venue.findUnique({ where: { slug: "gratitude-coffee-bar" } });
  if (!venue) throw new Error("Venue not found");

  // Get existing brands
  const brands = await prisma.brand.findMany({
    where: {
      placements: { some: { campaign: { venueId: venue.id } } },
    },
  });

  // Use 4 brands — same ones but imagine it was a different round
  const brandIds = brands.map((b) => b.id);
  if (brandIds.length < 4) throw new Error("Need at least 4 brands");

  const campaignId = "campaign-gratitude-spring-2026";

  // Create the campaign (completed)
  const campaign = await prisma.campaign.upsert({
    where: { id: campaignId },
    update: {},
    create: {
      id: campaignId,
      venueId: venue.id,
      name: "Spring 2026",
      status: "completed",
      maxPlacements: 4,
      sleeveCount: 300,
      startedAt: new Date("2026-03-15"),
      endedAt: new Date("2026-05-31"),
    },
  });
  console.log(`  Campaign: ${campaign.name} (${campaign.status})`);

  // Create placements
  const placementConfigs = [
    { brandIdx: 0, slot: 1, tagline: brands[0].name === "Contra Costa Fitness" ? "New year, new you. Try a free class." : brands[0].name, ctaText: "Get Started", ctaUrl: "https://www.contracostafitness.com/", buttonColor: "#2563EB" },
    { brandIdx: 1, slot: 2, tagline: brands[1].name === "Yoga Sol" ? "Spring into yoga. First class free." : brands[1].name, ctaText: "Book Now", ctaUrl: "https://www.yogasol.com/", buttonColor: "#9333EA" },
    { brandIdx: 2, slot: 3, tagline: brands[2].name === "Jory's Flowers" ? "Mother's Day bouquets. Order early." : brands[2].name, ctaText: "Shop Flowers", ctaUrl: "https://www.jorysflowers.com/", buttonColor: "#DC2626" },
    { brandIdx: 3, slot: 4, tagline: brands[3].name === "Epidemic Ales" ? "Patio season is here. $5 pints Tuesdays." : brands[3].name, ctaText: "See Menu", ctaUrl: "https://www.epidemicales.com/", buttonColor: "#B45309" },
  ];

  const placements = [];
  for (const pc of placementConfigs) {
    const p = await prisma.placement.upsert({
      where: { campaignId_slot: { campaignId, slot: pc.slot } },
      update: {},
      create: {
        campaignId,
        brandId: brandIds[pc.brandIdx],
        slot: pc.slot,
        tagline: pc.tagline,
        ctaText: pc.ctaText,
        ctaUrl: pc.ctaUrl,
        buttonColor: pc.buttonColor,
        status: "completed",
      },
    });
    placements.push(p);
    console.log(`  #${pc.slot} ${brands[pc.brandIdx].name}`);
  }

  // Generate scans (slightly fewer than summer — spring is quieter)
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
      isReturning: Math.random() < 0.15, // 15% returning
      scannedAt: randomDate(),
    });
  }
  await prisma.scan.createMany({ data: scanData });
  console.log(`  Created ${scanCount} scans`);

  // Generate clicks — different CTR story than summer
  // In spring, Jory's Flowers killed it (Mother's Day) and Epidemic Ales was lower
  console.log("Generating click data...");
  const ctrs = [0.12, 0.09, 0.25, 0.14]; // Fitness, Yoga, Flowers (Mother's Day!), Ales
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

  console.log("\n✅ Spring 2026 campaign seeded!");
  console.log("Switch campaigns in the venue dashboard to compare.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

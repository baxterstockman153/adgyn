import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const cities = [
  { city: "Austin", region: "Texas", country: "United States" },
  { city: "Round Rock", region: "Texas", country: "United States" },
  { city: "Cedar Park", region: "Texas", country: "United States" },
  { city: "Georgetown", region: "Texas", country: "United States" },
  { city: "Pflugerville", region: "Texas", country: "United States" },
  { city: "San Marcos", region: "Texas", country: "United States" },
];
const cityWeights = [35, 18, 14, 12, 11, 10];

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
  if (r < 0.70) return { deviceType: "mobile", os: "iOS", browser: "Safari" };
  if (r < 0.87) return { deviceType: "mobile", os: "Android", browser: "Chrome" };
  if (r < 0.93) return { deviceType: "desktop", os: "macOS", browser: "Chrome" };
  if (r < 0.97) return { deviceType: "desktop", os: "Windows", browser: "Chrome" };
  return { deviceType: "tablet", os: "iOS", browser: "Safari" };
}

function randomUA(device: { os: string }) {
  if (device.os === "iOS") return "Mozilla/5.0 (iPhone; CPU iPhone OS 18_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.4 Mobile/15E148 Safari/604.1";
  if (device.os === "Android") return "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36";
  if (device.os === "macOS") return "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
  return "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
}

function randomDate() {
  const start = new Date("2026-03-01");
  const end = new Date("2026-05-15");
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  const hour = weightedRandom(
    [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
    [10, 22, 26, 16, 8, 5, 4, 3, 2, 2, 1, 1]
  );
  d.setHours(hour, Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));
  return d;
}

function randomHash() {
  return Math.random().toString(36).slice(2, 18);
}

async function main() {
  console.log("Creating Spring 2026 campaign for Sunrise Brew Co. (demo)...");

  const venue = await prisma.venue.findUnique({ where: { slug: "sunrise-brew-co" } });
  if (!venue) throw new Error("Demo venue not found. Run create-demo-v2.ts first.");

  // Create 4 different brands for the spring campaign
  const springBrands = [
    { id: "demo-brand-south-austin-cycling", name: "South Austin Cycling", websiteUrl: "https://southaustincycling.example.com" },
    { id: "demo-brand-lady-bird-bakery", name: "Lady Bird Bakery", websiteUrl: "https://ladybirdbakery.example.com" },
    { id: "demo-brand-barton-springs-yoga", name: "Barton Springs Yoga", websiteUrl: "https://bartonspringsyoga.example.com" },
    { id: "demo-brand-live-oak-brewing", name: "Live Oak Brewing", websiteUrl: "https://liveoakbrewing.example.com" },
  ];

  const brands = [];
  for (const b of springBrands) {
    const brand = await prisma.brand.upsert({
      where: { id: b.id },
      update: {},
      create: { id: b.id, name: b.name, websiteUrl: b.websiteUrl },
    });
    brands.push(brand);
    console.log(`  Brand: ${brand.name}`);
  }

  const campaignId = "demo-campaign-sunrise-spring-2026";

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
      startedAt: new Date("2026-03-01"),
      endedAt: new Date("2026-05-15"),
    },
  });
  console.log(`  Campaign: ${campaign.name} (${campaign.status})`);

  const placementConfigs = [
    { brand: brands[0], slot: 1, tagline: "Group rides every Saturday morning.", ctaText: "Join a Ride", ctaUrl: "https://southaustincycling.example.com", buttonColor: "#DC2626" },
    { brand: brands[1], slot: 2, tagline: "Sourdough & pastries baked fresh daily.", ctaText: "See the Menu", ctaUrl: "https://ladybirdbakery.example.com", buttonColor: "#D97706" },
    { brand: brands[2], slot: 3, tagline: "Outdoor classes overlooking the springs.", ctaText: "Book a Class", ctaUrl: "https://bartonspringsyoga.example.com", buttonColor: "#7C3AED" },
    { brand: brands[3], slot: 4, tagline: "Award-winning lagers. Taproom open daily.", ctaText: "Visit Taproom", ctaUrl: "https://liveoakbrewing.example.com", buttonColor: "#15803D" },
  ];

  const placements = [];
  for (const pc of placementConfigs) {
    const p = await prisma.placement.upsert({
      where: { campaignId_slot: { campaignId, slot: pc.slot } },
      update: {},
      create: {
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
    console.log(`  #${pc.slot} ${pc.brand.name}`);
  }

  // Generate scans
  console.log("\nGenerating scan data...");
  const scanCount = 198;
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
      isReturning: Math.random() < 0.12,
      scannedAt: randomDate(),
    });
  }
  await prisma.scan.createMany({ data: scanData });
  console.log(`  Created ${scanCount} scans`);

  // Generate clicks — Lady Bird Bakery was the star (pastries + coffee = match made in heaven)
  console.log("Generating click data...");
  const ctrs = [0.11, 0.28, 0.14, 0.19]; // Cycling, Bakery (winner!), Yoga, Brewing
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

  console.log("\n✅ Demo Spring 2026 campaign seeded!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

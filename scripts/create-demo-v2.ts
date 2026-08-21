import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// --- Helpers for realistic fake data ---

const cities = [
  { city: "Austin", region: "Texas", country: "United States" },
  { city: "Round Rock", region: "Texas", country: "United States" },
  { city: "Cedar Park", region: "Texas", country: "United States" },
  { city: "Georgetown", region: "Texas", country: "United States" },
  { city: "Pflugerville", region: "Texas", country: "United States" },
  { city: "San Marcos", region: "Texas", country: "United States" },
  { city: "Kyle", region: "Texas", country: "United States" },
  { city: "Dripping Springs", region: "Texas", country: "United States" },
];

const cityWeights = [35, 18, 12, 10, 8, 7, 5, 5];

function weightedRandom<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function randomCity() {
  return weightedRandom(cities, cityWeights);
}

function randomDevice() {
  const r = Math.random();
  if (r < 0.70) return { deviceType: "mobile", os: "iOS", browser: "Safari" };
  if (r < 0.86) return { deviceType: "mobile", os: "Android", browser: "Chrome" };
  if (r < 0.93) return { deviceType: "desktop", os: "macOS", browser: "Chrome" };
  if (r < 0.97) return { deviceType: "desktop", os: "Windows", browser: "Chrome" };
  return { deviceType: "tablet", os: "iOS", browser: "Safari" };
}

function randomDate(daysBack: number) {
  const now = new Date();
  const msBack = Math.random() * daysBack * 24 * 60 * 60 * 1000;
  const date = new Date(now.getTime() - msBack);
  const hour = weightedRandom(
    [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
    [10, 22, 28, 18, 8, 4, 3, 2, 2, 1, 1, 1]
  );
  date.setHours(hour, Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));
  return date;
}

function randomHash() {
  return Math.random().toString(36).slice(2, 18);
}

function randomUA(device: { os: string }) {
  if (device.os === "iOS") return "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.6 Mobile/15E148 Safari/604.1";
  if (device.os === "Android") return "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Mobile Safari/537.36";
  if (device.os === "macOS") return "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";
  return "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";
}

async function main() {
  // --- Step 1: Clean up old demo data from real campaign ---
  console.log("Cleaning up old demo data from real campaign...");

  // Delete demo scans/clicks that have non-real session hashes (the seeded ones)
  // The real scans have specific session hashes from actual users
  // Safest: delete all scans/clicks for the real campaign that came from the seed
  // We know the real campaign ID
  const realCampaignId = "campaign-gratitude-summer-2026";

  // Count before
  const scansBefore = await prisma.scan.count({ where: { campaignId: realCampaignId } });
  const clicksBefore = await prisma.click.count({
    where: { placement: { campaignId: realCampaignId } },
  });
  console.log(`  Real campaign has ${scansBefore} scans, ${clicksBefore} clicks`);

  // Delete all seeded scans (keep only the ones from real users - we know there were 2 real scans)
  // The real scans have specific sessionHashes we can identify
  // Actually, let's keep scans from the last real interaction and delete the bulk seeded ones
  // The seeded ones all have userAgent starting with "Mozilla/5.0 (" without full browser strings
  // Simpler: delete scans that don't have the DuckDuckGo or real Chrome UA
  await prisma.scan.deleteMany({
    where: {
      campaignId: realCampaignId,
      userAgent: { not: { contains: "Ddg/" } },
      // Keep ones with the real Chrome mobile UA too
      NOT: { userAgent: { contains: "CriOS" } },
      // Delete ones with our short fake UAs
      OR: [
        { userAgent: { startsWith: "Mozilla/5.0 (iOS" } },
        { userAgent: { startsWith: "Mozilla/5.0 (Android" } },
        { userAgent: { startsWith: "Mozilla/5.0 (Macintosh" } },
        { userAgent: { startsWith: "curl" } },
      ],
    },
  });

  // Also just delete by count - if there are more than 5, the extras are seeded
  // Simpler approach: delete ALL and re-count
  // Actually the cleanest approach: delete scans where the UA is the short seeded format
  // Let me just delete all with the exact seeded UA format

  // Bulk delete approach: delete everything, keep the 2 real ones by their IDs
  // Actually let's just wipe the seeded data completely
  const realScans = await prisma.scan.findMany({
    where: { campaignId: realCampaignId },
    orderBy: { scannedAt: "asc" },
    take: 3, // The first few are real
  });
  const realScanIds = realScans.map(s => s.id);

  await prisma.scan.deleteMany({
    where: {
      campaignId: realCampaignId,
      id: { notIn: realScanIds },
    },
  });

  // For clicks, the real ones used sendBeacon from actual phones
  const realClicks = await prisma.click.findMany({
    where: { placement: { campaignId: realCampaignId } },
    orderBy: { clickedAt: "asc" },
    take: 5,
  });
  // Keep clicks that have real mobile UAs (contain "Safari/604" or "CriOS")
  const realClickIds = realClicks
    .filter(c => c.userAgent?.includes("Safari/604") || c.userAgent?.includes("CriOS") || c.userAgent?.includes("Mobile/15E148"))
    .map(c => c.id);

  await prisma.click.deleteMany({
    where: {
      placement: { campaignId: realCampaignId },
      id: { notIn: realClickIds },
    },
  });

  const scansAfter = await prisma.scan.count({ where: { campaignId: realCampaignId } });
  const clicksAfter = await prisma.click.count({
    where: { placement: { campaignId: realCampaignId } },
  });
  console.log(`  After cleanup: ${scansAfter} scans, ${clicksAfter} clicks`);

  // --- Step 2: Create demo venue ---
  console.log("\nCreating demo venue...");
  const demoVenue = await prisma.venue.upsert({
    where: { slug: "sunrise-brew-co" },
    update: {},
    create: {
      name: "Sunrise Brew Co.",
      slug: "sunrise-brew-co",
      address: "214 S Congress Ave, Austin, TX 78704",
      fallbackMessage: "New campaign coming soon!",
    },
  });
  console.log(`  Venue: ${demoVenue.name} (${demoVenue.slug})`);

  // --- Step 3: Create demo brands ---
  console.log("\nCreating demo brands...");
  const brandData = [
    { name: "Peak Pilates Studio", websiteUrl: "https://peakpilates.example.com", defaultLogoUrl: null },
    { name: "Bloom Florist", websiteUrl: "https://bloomflorist.example.com", defaultLogoUrl: null },
    { name: "Craft & Cork Taproom", websiteUrl: "https://craftandcork.example.com", defaultLogoUrl: null },
    { name: "Paws & Play Pet Spa", websiteUrl: "https://pawsandplay.example.com", defaultLogoUrl: null },
  ];

  const demoBrands = [];
  for (const b of brandData) {
    const brand = await prisma.brand.upsert({
      where: { id: `demo-brand-${b.name.toLowerCase().replace(/[^a-z]/g, "-")}` },
      update: {},
      create: {
        id: `demo-brand-${b.name.toLowerCase().replace(/[^a-z]/g, "-")}`,
        ...b,
      },
    });
    demoBrands.push(brand);
    console.log(`  Brand: ${brand.name}`);
  }

  // --- Step 4: Create demo campaign ---
  console.log("\nCreating demo campaign...");
  const demoCampaignId = "demo-campaign-sunrise-summer-2026";
  const demoCampaign = await prisma.campaign.upsert({
    where: { id: demoCampaignId },
    update: {},
    create: {
      id: demoCampaignId,
      venueId: demoVenue.id,
      name: "Summer 2026",
      status: "active",
      maxPlacements: 4,
      sleeveCount: 300,
      startedAt: new Date("2026-07-07"),
    },
  });
  console.log(`  Campaign: ${demoCampaign.name} (${demoCampaign.status})`);

  // --- Step 5: Create placements ---
  console.log("\nCreating placements...");
  const placementConfigs = [
    { brand: demoBrands[0], slot: 1, tagline: "Reformer classes for all levels.", ctaText: "Book a Class", ctaUrl: "https://peakpilates.example.com", buttonColor: "#4F46E5" },
    { brand: demoBrands[1], slot: 2, tagline: "Handcrafted bouquets. Same-day delivery.", ctaText: "Order Flowers", ctaUrl: "https://bloomflorist.example.com", buttonColor: "#DB2777" },
    { brand: demoBrands[2], slot: 3, tagline: "30 taps. Live music Fridays.", ctaText: "See What's On Tap", ctaUrl: "https://craftandcork.example.com", buttonColor: "#B45309" },
    { brand: demoBrands[3], slot: 4, tagline: "Grooming, boarding & daycare.", ctaText: "Book Now", ctaUrl: "https://pawsandplay.example.com", buttonColor: "#059669" },
  ];

  const demoPlacements = [];
  for (const pc of placementConfigs) {
    const placement = await prisma.placement.upsert({
      where: {
        campaignId_slot: {
          campaignId: demoCampaignId,
          slot: pc.slot,
        },
      },
      update: {},
      create: {
        campaignId: demoCampaignId,
        brandId: pc.brand.id,
        slot: pc.slot,
        tagline: pc.tagline,
        ctaText: pc.ctaText,
        ctaUrl: pc.ctaUrl,
        buttonColor: pc.buttonColor,
        status: "active",
      },
    });
    demoPlacements.push(placement);
    console.log(`  #${pc.slot} ${pc.brand.name}`);
  }

  // --- Step 6: Update demo user memberships ---
  console.log("\nUpdating demo user memberships...");

  const venueUser = await prisma.user.findUnique({
    where: { email: "uxhuber+venue-demo@gmail.com" },
  });
  const brandUser = await prisma.user.findUnique({
    where: { email: "uxhuber+brand-demo@gmail.com" },
  });

  if (!venueUser || !brandUser) {
    throw new Error("Demo users not found. Run create-demo.ts first.");
  }

  // Delete old memberships to real venue/brand
  await prisma.membership.deleteMany({
    where: { userId: venueUser.id },
  });
  await prisma.membership.deleteMany({
    where: { userId: brandUser.id },
  });

  // Create new ones pointing to demo venue/brand
  await prisma.membership.create({
    data: {
      userId: venueUser.id,
      orgId: demoVenue.id,
      orgType: "venue",
      role: "owner",
    },
  });
  console.log(`  ${venueUser.email} → ${demoVenue.name}`);

  await prisma.membership.create({
    data: {
      userId: brandUser.id,
      orgId: demoBrands[0].id, // Peak Pilates
      orgType: "brand",
      role: "owner",
    },
  });
  console.log(`  ${brandUser.email} → ${demoBrands[0].name}`);

  // --- Step 7: Generate demo scans ---
  console.log("\nGenerating demo scans...");
  const scanCount = 243;
  const scanData = [];

  for (let i = 0; i < scanCount; i++) {
    const geo = randomCity();
    const device = randomDevice();
    scanData.push({
      campaignId: demoCampaignId,
      sessionHash: randomHash(),
      userAgent: randomUA(device),
      city: geo.city,
      region: geo.region,
      country: geo.country,
      deviceType: device.deviceType,
      os: device.os,
      browser: device.browser,
      scannedAt: randomDate(42),
    });
  }

  await prisma.scan.createMany({ data: scanData });
  console.log(`  Created ${scanCount} scans`);

  // --- Step 8: Generate demo clicks ---
  console.log("Generating demo clicks...");

  const ctrs = [0.18, 0.12, 0.20, 0.09]; // Pilates, Flowers, Taproom, Pet Spa
  let totalClicks = 0;

  for (let i = 0; i < demoPlacements.length; i++) {
    const clickCount = Math.round(scanCount * ctrs[i]);
    const clickData = [];

    for (let j = 0; j < clickCount; j++) {
      const geo = randomCity();
      const device = randomDevice();
      clickData.push({
        placementId: demoPlacements[i].id,
        sessionHash: randomHash(),
        userAgent: randomUA(device),
        city: geo.city,
        region: geo.region,
        country: geo.country,
        deviceType: device.deviceType,
        os: device.os,
        browser: device.browser,
        clickedAt: randomDate(42),
      });
    }

    await prisma.click.createMany({ data: clickData });
    totalClicks += clickCount;
    console.log(`  ${demoBrands[i].name}: ${clickCount} clicks (${(ctrs[i] * 100).toFixed(0)}% CTR)`);
  }

  console.log(`  Total: ${totalClicks} clicks`);

  console.log("\n✅ Demo data migrated to fictional venue & brands!");
  console.log("\nDemo venue page: adgyn.vercel.app/sunrise-brew-co");
  console.log("\nVenue login:  uxhuber+venue-demo@gmail.com / demo1234");
  console.log("Brand login:  uxhuber+brand-demo@gmail.com / demo1234");
  console.log("\nReal data (Gratitude Coffee Bar) is untouched.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function createSupabaseUser(email: string, password: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });

  if (!res.ok) {
    const err = await res.json();
    if (err.msg?.includes("already") || err.message?.includes("already")) {
      console.log(`  Auth user ${email} already exists, skipping`);
      return;
    }
    throw new Error(`Failed to create auth user ${email}: ${JSON.stringify(err)}`);
  }
  console.log(`  Auth user ${email} created`);
}

// --- Helpers for realistic fake data ---

const cities = [
  { city: "Concord", region: "California", country: "United States" },
  { city: "Walnut Creek", region: "California", country: "United States" },
  { city: "Pleasant Hill", region: "California", country: "United States" },
  { city: "Martinez", region: "California", country: "United States" },
  { city: "San Francisco", region: "California", country: "United States" },
  { city: "Oakland", region: "California", country: "United States" },
  { city: "Berkeley", region: "California", country: "United States" },
  { city: "Lafayette", region: "California", country: "United States" },
];

// Weight towards Concord/Walnut Creek (local coffee shop customers)
const cityWeights = [30, 20, 15, 10, 8, 7, 5, 5];

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
  if (r < 0.72) return { deviceType: "mobile", os: "iOS", browser: "Safari" };
  if (r < 0.88) return { deviceType: "mobile", os: "Android", browser: "Chrome" };
  if (r < 0.94) return { deviceType: "desktop", os: "macOS", browser: "Chrome" };
  if (r < 0.97) return { deviceType: "desktop", os: "Windows", browser: "Chrome" };
  return { deviceType: "tablet", os: "iOS", browser: "Safari" };
}

function randomDate(daysBack: number) {
  const now = new Date();
  const msBack = Math.random() * daysBack * 24 * 60 * 60 * 1000;
  const date = new Date(now.getTime() - msBack);
  // Weight towards morning hours (6am-10am) for coffee shop
  const hour = weightedRandom(
    [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
    [8, 20, 25, 18, 10, 5, 4, 3, 2, 2, 2, 1]
  );
  date.setHours(hour, Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));
  return date;
}

function randomHash() {
  return Math.random().toString(36).slice(2, 18);
}

async function main() {
  const password = "demo1234";

  // 1. Create auth users
  console.log("Creating Supabase auth users...");
  await createSupabaseUser("uxhuber+venue-demo@gmail.com", password);
  await createSupabaseUser("uxhuber+brand-demo@gmail.com", password);

  // 2. Create DB users
  console.log("\nCreating database users...");

  const venueUser = await prisma.user.upsert({
    where: { email: "uxhuber+venue-demo@gmail.com" },
    update: {},
    create: {
      email: "uxhuber+venue-demo@gmail.com",
      name: "Demo Venue Owner",
    },
  });
  console.log(`  DB user: ${venueUser.email}`);

  const brandUser = await prisma.user.upsert({
    where: { email: "uxhuber+brand-demo@gmail.com" },
    update: {},
    create: {
      email: "uxhuber+brand-demo@gmail.com",
      name: "Demo Brand Owner",
    },
  });
  console.log(`  DB user: ${brandUser.email}`);

  // 3. Get existing venue and brand
  const venue = await prisma.venue.findUnique({
    where: { slug: "gratitude-coffee-bar" },
  });
  const brand = await prisma.brand.findFirst({
    where: { name: "Contra Costa Fitness" },
  });

  if (!venue || !brand) {
    throw new Error("Venue or brand not found. Run the seed script first.");
  }

  // 4. Create memberships
  console.log("\nCreating memberships...");

  await prisma.membership.upsert({
    where: {
      userId_orgId_orgType: {
        userId: venueUser.id,
        orgId: venue.id,
        orgType: "venue",
      },
    },
    update: {},
    create: {
      userId: venueUser.id,
      orgId: venue.id,
      orgType: "venue",
      role: "owner",
    },
  });
  console.log(`  ${venueUser.email} → Venue owner (${venue.name})`);

  await prisma.membership.upsert({
    where: {
      userId_orgId_orgType: {
        userId: brandUser.id,
        orgId: brand.id,
        orgType: "brand",
      },
    },
    update: {},
    create: {
      userId: brandUser.id,
      orgId: brand.id,
      orgType: "brand",
      role: "owner",
    },
  });
  console.log(`  ${brandUser.email} → Brand owner (${brand.name})`);

  // 5. Get campaign and placements
  const campaign = await prisma.campaign.findUnique({
    where: { id: "campaign-gratitude-summer-2026" },
    include: { placements: true },
  });

  if (!campaign) {
    throw new Error("Campaign not found. Run the seed script first.");
  }

  // 6. Generate fake scans (simulate ~6 weeks of a 300-sleeve campaign)
  console.log("\nGenerating demo scan data...");

  const scanCount = 187; // realistic for 300 sleeves over 6 weeks
  const scanData = [];

  for (let i = 0; i < scanCount; i++) {
    const geo = randomCity();
    const device = randomDevice();
    scanData.push({
      campaignId: campaign.id,
      sessionHash: randomHash(),
      userAgent: `Mozilla/5.0 (${device.os === "iOS" ? "iPhone; CPU iPhone OS 18_6" : device.os === "Android" ? "Linux; Android 15" : "Macintosh; Intel Mac OS X 10_15_7"})`,
      city: geo.city,
      region: geo.region,
      country: geo.country,
      deviceType: device.deviceType,
      os: device.os,
      browser: device.browser,
      scannedAt: randomDate(42), // 6 weeks
    });
  }

  await prisma.scan.createMany({ data: scanData });
  console.log(`  Created ${scanCount} scans`);

  // 7. Generate fake clicks (CTR varies by placement: 8-22%)
  console.log("Generating demo click data...");

  const placementCtrs: Record<string, number> = {
    "placement-1": 0.15, // Contra Costa Fitness - 15% CTR
    "placement-2": 0.10, // Yoga Sol - 10%
    "placement-3": 0.08, // Jory's Flowers - 8%
    "placement-4": 0.22, // Epidemic Ales - 22% (highest — craft beer crowd!)
  };

  let totalClicks = 0;

  for (const placement of campaign.placements) {
    const ctr = placementCtrs[placement.id] || 0.12;
    const clickCount = Math.round(scanCount * ctr);
    const clickData = [];

    for (let i = 0; i < clickCount; i++) {
      const geo = randomCity();
      const device = randomDevice();
      clickData.push({
        placementId: placement.id,
        sessionHash: randomHash(),
        userAgent: `Mozilla/5.0 (${device.os === "iOS" ? "iPhone; CPU iPhone OS 18_6" : device.os === "Android" ? "Linux; Android 15" : "Macintosh; Intel Mac OS X 10_15_7"})`,
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
    console.log(`  ${placement.id}: ${clickCount} clicks (${(ctr * 100).toFixed(0)}% CTR)`);
  }

  console.log(`  Total: ${totalClicks} clicks across all placements`);

  console.log("\n✅ Demo accounts ready!");
  console.log("\nVenue demo login:");
  console.log("  Email: uxhuber+venue-demo@gmail.com");
  console.log("  Password: demo1234");
  console.log("\nBrand demo login:");
  console.log("  Email: uxhuber+brand-demo@gmail.com");
  console.log("  Password: demo1234");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

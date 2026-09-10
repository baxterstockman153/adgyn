import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Find the active campaign for Gratitude Coffee Bar
  const venue = await prisma.venue.findUnique({ where: { slug: "gratitude-coffee-bar" } });
  if (!venue) throw new Error("Venue not found");

  const campaign = await prisma.campaign.findFirst({
    where: { venueId: venue.id, status: "active" },
    include: { placements: { include: { brand: true } } },
  });
  if (!campaign) throw new Error("No active campaign found");

  console.log(`Campaign: ${campaign.name}`);
  console.log(`Current placements:`);
  for (const p of campaign.placements) {
    console.log(`  Slot ${p.slot}: ${p.brand.name}`);
  }

  // Create (or find) the 3 new brands
  const cbfit = await prisma.brand.upsert({
    where: { id: "cbfit-placeholder" }, // won't match, will create
    update: {},
    create: {
      name: "CBFit",
      websiteUrl: "https://www.cbfit.com",
      defaultLogoUrl: "/brands/cbfit-logo.png",
    },
  }).catch(() =>
    prisma.brand.create({
      data: {
        name: "CBFit",
        websiteUrl: "https://www.cbfit.com",
        defaultLogoUrl: "/brands/cbfit-logo.png",
      },
    })
  );

  const gabbys = await prisma.brand.create({
    data: {
      name: "Gabby's Good Dogs",
      websiteUrl: "https://www.gabbysgooddogs.com",
      defaultLogoUrl: "/brands/gabbys-good-dogs-logo.png",
    },
  });

  const tintworld = await prisma.brand.create({
    data: {
      name: "Tint World",
      websiteUrl: "https://www.tintworld.com",
      defaultLogoUrl: "/brands/tintworld-logo.png",
    },
  });

  console.log(`\nCreated brands: ${cbfit.name}, ${gabbys.name}, ${tintworld.name}`);

  // Delete old placements
  await prisma.placement.deleteMany({ where: { campaignId: campaign.id } });
  console.log(`Deleted ${campaign.placements.length} old placements`);

  // Create new placements (3 slots)
  const newPlacements = [
    {
      campaignId: campaign.id,
      brandId: cbfit.id,
      slot: 1,
      logoUrl: "/brands/cbfit-logo.png",
      tagline: "Lagree, Climb & Bootcamp. East Bay's best workout.",
      ctaText: "Book a Class",
      ctaUrl: "https://www.cbfit.com",
      buttonColor: "#e02020",
      status: "active" as const,
    },
    {
      campaignId: campaign.id,
      brandId: gabbys.id,
      slot: 2,
      logoUrl: "/brands/gabbys-good-dogs-logo.png",
      tagline: "Dog training with empathy. Board & train, private sessions.",
      ctaText: "Learn More",
      ctaUrl: "https://www.gabbysgooddogs.com",
      buttonColor: "#f08080",
      status: "active" as const,
    },
    {
      campaignId: campaign.id,
      brandId: tintworld.id,
      slot: 3,
      logoUrl: "/brands/tintworld-logo.png",
      tagline: "Auto tinting, detailing & styling. Trusted since 1982.",
      ctaText: "Find a Location",
      ctaUrl: "https://www.tintworld.com",
      buttonColor: "#d4a017",
      status: "active" as const,
    },
  ];

  for (const p of newPlacements) {
    await prisma.placement.create({ data: p });
  }

  console.log(`\nCreated 3 new placements:`);
  for (const p of newPlacements) {
    console.log(`  Slot ${p.slot}: ${p.tagline.split(".")[0]}`);
  }

  console.log("\nDone! Visit https://app.adgyn.com/gratitude-coffee-bar to verify.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

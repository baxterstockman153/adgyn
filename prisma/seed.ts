import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Create venue
  const venue = await prisma.venue.upsert({
    where: { slug: "gratitude-coffee-bar" },
    update: {},
    create: {
      name: "Gratitude Coffee Bar",
      slug: "gratitude-coffee-bar",
      logoUrl:
        "https://images.squarespace-cdn.com/content/v1/63b792d30042a12abd5ebf3f/8a7067ad-5972-44e7-8e0f-43dd92cc72ba/Original.jpg",
      address: "Concord, CA",
    },
  });
  console.log("Venue:", venue.name);

  // Create brands
  const brands = await Promise.all([
    prisma.brand.upsert({
      where: { id: "brand-contra-costa-fitness" },
      update: {},
      create: {
        id: "brand-contra-costa-fitness",
        name: "Contra Costa Fitness",
        websiteUrl: "https://www.contracostafitness.com/",
        defaultLogoUrl:
          "https://static.wixstatic.com/media/e7693c_93e1793fca1040038a4be426d5494ab1~mv2_d_2304_2304_s_2.jpg/v1/fill/w_196,h_196,al_c,q_80,usm_0.66_1.00_0.01/greenandblackcircle.webp",
      },
    }),
    prisma.brand.upsert({
      where: { id: "brand-yoga-sol" },
      update: {},
      create: {
        id: "brand-yoga-sol",
        name: "Yoga Sol",
        websiteUrl: "https://www.yogasol.net/",
      },
    }),
    prisma.brand.upsert({
      where: { id: "brand-jorys-flowers" },
      update: {},
      create: {
        id: "brand-jorys-flowers",
        name: "Jory's Flowers",
        websiteUrl: "https://jorysflowers.com/",
        defaultLogoUrl:
          "https://asset.bloomnation.com/c_fit,dpr_2,f_auto,h_571,q_auto,w_400/v1/vendor/698/profile/20260209052640_file_698a18d061081.jpg",
      },
    }),
    prisma.brand.upsert({
      where: { id: "brand-epidemic-ales" },
      update: {},
      create: {
        id: "brand-epidemic-ales",
        name: "Epidemic Ales",
        websiteUrl: "https://www.epidemicales.com/",
      },
    }),
  ]);
  console.log("Brands:", brands.map((b) => b.name).join(", "));

  // Create campaign
  const campaign = await prisma.campaign.upsert({
    where: { id: "campaign-gratitude-summer-2026" },
    update: {},
    create: {
      id: "campaign-gratitude-summer-2026",
      venueId: venue.id,
      name: "Summer 2026",
      status: "active",
      sleeveCount: 300,
      startedAt: new Date(),
    },
  });
  console.log("Campaign:", campaign.name, `(${campaign.status})`);

  // Create placements
  const placementData = [
    {
      id: "placement-1",
      brandId: "brand-contra-costa-fitness",
      slot: 1,
      tagline: "Strength training & yoga for every body.",
      ctaText: "Join a Class",
      ctaUrl: "https://www.contracostafitness.com/",
      buttonColor: "#2D5016",
    },
    {
      id: "placement-2",
      brandId: "brand-yoga-sol",
      slot: 2,
      tagline: "Find your flow. Beginner-friendly.",
      ctaText: "Browse Classes",
      ctaUrl: "https://www.yogasol.net/",
      buttonColor: "#1B2A4A",
    },
    {
      id: "placement-3",
      brandId: "brand-jorys-flowers",
      slot: 3,
      tagline: "Fresh arrangements since 1940. Same-day delivery.",
      ctaText: "Send Flowers",
      ctaUrl: "https://jorysflowers.com/",
      buttonColor: "#9B4D60",
    },
    {
      id: "placement-4",
      brandId: "brand-epidemic-ales",
      slot: 4,
      tagline: "Woman & Asian-owned. Community first.",
      ctaText: "Visit Taproom",
      ctaUrl: "https://www.epidemicales.com/",
      buttonColor: "#8B5E1A",
    },
  ];

  for (const p of placementData) {
    await prisma.placement.upsert({
      where: { id: p.id },
      update: {},
      create: {
        ...p,
        campaignId: campaign.id,
        status: "active",
      },
    });
  }
  console.log("Placements: 4 created");

  console.log("\nDone! Visit /gratitude-coffee-bar to see the live page.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

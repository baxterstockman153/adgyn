import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Real venue — Gratitude Coffee Bar
  await prisma.campaign.update({
    where: { id: "campaign-gratitude-summer-2026" },
    data: { name: "Batch 6 — August" },
  });
  console.log("Gratitude: 'Summer 2026' → 'Batch 6 — August'");

  await prisma.campaign.update({
    where: { id: "campaign-gratitude-spring-2026" },
    data: { name: "Batch 5 — June" },
  });
  console.log("Gratitude: 'Spring 2026' → 'Batch 5 — June'");

  // Demo venue — Sunrise Brew Co.
  await prisma.campaign.update({
    where: { id: "demo-campaign-sunrise-summer-2026" },
    data: { name: "Batch 8 — August" },
  });
  console.log("Sunrise: 'Summer 2026' → 'Batch 8 — August'");

  await prisma.campaign.update({
    where: { id: "demo-campaign-sunrise-spring-2026" },
    data: { name: "Batch 7 — June" },
  });
  console.log("Sunrise: 'Spring 2026' → 'Batch 7 — June'");

  console.log("\n✅ Campaigns renamed. Implies monthly batches — 12+/year.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

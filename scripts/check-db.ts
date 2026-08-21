import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const clicks = await prisma.click.findMany({ orderBy: { clickedAt: "desc" }, take: 5 });
  console.log("Recent clicks:", JSON.stringify(clicks, null, 2));

  const scans = await prisma.scan.findMany({ orderBy: { scannedAt: "desc" }, take: 5 });
  console.log("Recent scans:", JSON.stringify(scans, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

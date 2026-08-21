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
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    // User might already exist
    if (err.msg?.includes("already") || err.message?.includes("already")) {
      console.log(`  Auth user ${email} already exists, skipping`);
      return;
    }
    throw new Error(`Failed to create auth user ${email}: ${JSON.stringify(err)}`);
  }

  console.log(`  Auth user ${email} created`);
}

async function main() {
  const password = "test1234";

  // 1. Create Supabase auth users
  console.log("Creating Supabase auth users...");
  await createSupabaseUser("mark.huber153@gmail.com", password);
  await createSupabaseUser("uxhuber@gmail.com", password);

  // 2. Create database User records
  console.log("\nCreating database users...");

  const venueUser = await prisma.user.upsert({
    where: { email: "mark.huber153@gmail.com" },
    update: {},
    create: {
      email: "mark.huber153@gmail.com",
      name: "Mark Huber",
    },
  });
  console.log(`  DB user: ${venueUser.email} (${venueUser.id})`);

  const brandUser = await prisma.user.upsert({
    where: { email: "uxhuber@gmail.com" },
    update: {},
    create: {
      email: "uxhuber@gmail.com",
      name: "Mark Huber (Brand)",
    },
  });
  console.log(`  DB user: ${brandUser.email} (${brandUser.id})`);

  // 3. Get venue and brand IDs
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

  console.log("\nDone! Both accounts can now log in at /login with password: test1234");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

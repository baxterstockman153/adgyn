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
    throw new Error(`Failed to create auth user: ${JSON.stringify(err)}`);
  }
  console.log(`  Auth user ${email} created`);
}

async function main() {
  const email = "uxhuber+admin-demo@gmail.com";
  const password = "demo1234";

  console.log("Creating demo admin account...\n");

  // 1. Create Supabase auth user
  await createSupabaseUser(email, password);

  // 2. Create DB user record
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Demo Admin" },
  });
  console.log(`  DB user created: ${email}`);

  console.log(`
✅ Demo admin account ready!

   Email:    ${email}
   Password: ${password}
   URL:      adgyn.vercel.app/admin

   Note: You also need to add this email to src/lib/admin.ts
`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

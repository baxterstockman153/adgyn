/**
 * Stand up the Nirvana Soul demo venue for the Smart Sleeves prototype:
 * auth user + venue + owner membership. The Smart Sleeves experience is
 * frontend-only, so no campaigns/prospects are needed — just a venue the flag
 * can target and a login to reach it.
 *
 * This creates a PREVIEW login for Mark now; Dap's real account can be added as
 * a second owner on the same venue once we have his email. Idempotent.
 *   npx tsx scripts/create-nirvana-demo.ts
 */
import "dotenv/config";
import { makePrisma } from "./_db";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const PREVIEW_EMAIL = "mark.huber153+nirvana@gmail.com";
const PREVIEW_PW = "Nirvana2026!";
const VENUE_NAME = "Nirvana Soul";
const VENUE_SLUG = "nirvana-soul";

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
      console.log(`  Auth user ${email} already exists — skipping create`);
      return;
    }
    throw new Error(`Failed to create auth user ${email}: ${JSON.stringify(err)}`);
  }
  console.log(`  Auth user ${email} created`);
}

async function main() {
  const prisma = makePrisma();
  try {
    await createSupabaseUser(PREVIEW_EMAIL, PREVIEW_PW);

    const user = await prisma.user.upsert({
      where: { email: PREVIEW_EMAIL },
      update: {},
      create: { email: PREVIEW_EMAIL, name: "Nirvana Soul (demo)" },
    });
    const venue = await prisma.venue.upsert({
      where: { slug: VENUE_SLUG },
      update: {},
      create: { name: VENUE_NAME, slug: VENUE_SLUG },
    });
    await prisma.membership.upsert({
      where: {
        userId_orgId_orgType: { userId: user.id, orgId: venue.id, orgType: "venue" },
      },
      update: {},
      create: { userId: user.id, orgId: venue.id, orgType: "venue", role: "owner" },
    });

    console.log(`\n=== NIRVANA SOUL DEMO READY ===`);
    console.log(`  Venue:    ${VENUE_NAME} (slug ${VENUE_SLUG})`);
    console.log(`  VENUE ID: ${venue.id}   <-- add to SMART_SLEEVE_VENUES in features.ts`);
    console.log(`  Preview login: ${PREVIEW_EMAIL} / ${PREVIEW_PW}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

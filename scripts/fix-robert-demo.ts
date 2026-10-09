/**
 * Correction: Robert should NOT have his own account/venue — he'll use Mark's
 * demo login. So:
 *  (1) tear down the separate "The Daily Pour (demo)" venue + robert auth user,
 *  (2) on the Bean & Gone demo (Mark's login), add two test prospects so send +
 *      reply can be exercised: one to Mark's inbox, one to Robert's inbox.
 * Idempotent.
 *   npx tsx scripts/fix-robert-demo.ts
 */
import "dotenv/config";
import { makePrisma } from "./_db";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const BEAN_AND_GONE = "6fe24b2a-215d-437c-8ca7-bfd0d09ec038"; // Mark's demo venue
const ROBERT_EMAIL = "robert@edpursuit.com";
const DAILY_POUR_SLUG = "robert-demo";

async function deleteSupabaseUser(email: string) {
  const list = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users?filter=${encodeURIComponent(email)}`,
    { headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, apikey: SERVICE_ROLE_KEY } }
  );
  if (!list.ok) {
    console.log(`  Couldn't list auth users (${list.status}) — skipping auth delete`);
    return;
  }
  const { users } = (await list.json()) as { users: { id: string; email: string }[] };
  const u = users?.find((x) => x.email?.toLowerCase() === email.toLowerCase());
  if (!u) {
    console.log(`  No auth user ${email} — nothing to delete`);
    return;
  }
  const del = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${u.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, apikey: SERVICE_ROLE_KEY },
  });
  console.log(`  Auth user ${email} delete: ${del.ok ? "ok" : del.status}`);
}

async function addTestProspect(
  prisma: ReturnType<typeof makePrisma>,
  businessName: string,
  contactName: string,
  email: string
) {
  const existing = await prisma.prospect.findFirst({
    where: { venueId: BEAN_AND_GONE, businessName },
    select: { id: true },
  });
  if (existing) {
    await prisma.prospect.update({ where: { id: existing.id }, data: { email, status: "new" } });
    console.log(`  Updated "${businessName}" → ${email}`);
  } else {
    await prisma.prospect.create({
      data: { venueId: BEAN_AND_GONE, businessName, contactName, email, city: "Walnut Creek", status: "new" },
    });
    console.log(`  Created "${businessName}" → ${email}`);
  }
}

async function main() {
  const prisma = makePrisma();
  try {
    // (1) Tear down the separate Robert venue + user
    const venue = await prisma.venue.findUnique({ where: { slug: DAILY_POUR_SLUG }, select: { id: true } });
    if (venue) {
      const dbUser = await prisma.user.findUnique({ where: { email: ROBERT_EMAIL }, select: { id: true } });
      if (dbUser) {
        await prisma.membership.deleteMany({ where: { userId: dbUser.id, orgId: venue.id } });
      }
      await prisma.venue.delete({ where: { id: venue.id } }); // cascades prospects
      console.log(`Deleted venue ${DAILY_POUR_SLUG} (+ its prospects/membership)`);
    } else {
      console.log(`Venue ${DAILY_POUR_SLUG} not found — already gone`);
    }
    await prisma.user.deleteMany({ where: { email: ROBERT_EMAIL } });
    await deleteSupabaseUser(ROBERT_EMAIL);

    // (2) Test prospects on Mark's Bean & Gone demo
    console.log(`\nTest prospects on Bean & Gone demo:`);
    await addTestProspect(prisma, "🧪 Test — Mark (you)", "Mark", "mark.huber153@gmail.com");
    await addTestProspect(prisma, "🧪 Test — Robert", "Robert", ROBERT_EMAIL);

    console.log(`\nDone. Log in as the demo owner (mark.huber153+outreachdemo@gmail.com) to use them.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

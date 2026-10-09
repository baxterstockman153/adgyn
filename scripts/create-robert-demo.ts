/**
 * (1) Clean up the reply-test cruft on the Bean & Gone demo venue, and
 * (2) stand up a fresh outreach demo for Robert: auth user + venue + owner
 * membership + the 46 Walnut Creek prospects.
 *
 * List-only demo (no send flag) so there's no risk of real emails going to the
 * real businesses. Idempotent.
 *   npx tsx scripts/create-robert-demo.ts
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { makePrisma } from "./_db";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const BEAN_AND_GONE = "6fe24b2a-215d-437c-8ca7-bfd0d09ec038"; // demo, to tidy
const WC_FILE =
  "/private/tmp/claude-501/-Users-markhuber-adgyn/cb26665a-7cce-499d-87a1-c3942e05c743/scratchpad/wc_prospects.json";

const ROBERT_EMAIL = "robert@edpursuit.com";
const ROBERT_PW = "OutreachDemo2026!";
const VENUE_NAME = "The Daily Pour (demo)";
const VENUE_SLUG = "robert-demo";

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
    // --- (1) Clean up reply-test cruft on Bean & Gone (demo) ---
    const delReplies = await prisma.outreachReply.deleteMany({ where: { venueId: BEAN_AND_GONE } });
    const delEmails = await prisma.outreachEmail.deleteMany({ where: { venueId: BEAN_AND_GONE } });
    const delTest = await prisma.prospect.deleteMany({
      where: { venueId: BEAN_AND_GONE, businessName: "🧪 Reply Test (demo)" },
    });
    console.log(
      `Cleanup (Bean & Gone): ${delReplies.count} replies, ${delEmails.count} sent-logs, ${delTest.count} test prospect`
    );

    // --- (2) Robert's demo ---
    console.log(`\nCreating Robert's demo…`);
    await createSupabaseUser(ROBERT_EMAIL, ROBERT_PW);

    const user = await prisma.user.upsert({
      where: { email: ROBERT_EMAIL },
      update: {},
      create: { email: ROBERT_EMAIL, name: "Robert" },
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

    const existing = await prisma.prospect.count({ where: { venueId: venue.id } });
    if (existing === 0) {
      const rows = JSON.parse(readFileSync(WC_FILE, "utf8"));
      const created = await prisma.prospect.createMany({
        data: rows.map((r: Record<string, string | null>) => ({
          venueId: venue.id,
          businessName: r.businessName!,
          address: r.address ?? null,
          city: r.city ?? null,
          phone: r.phone ?? null,
          website: r.website ?? null,
          contactName: r.contactName ?? null,
          contactTitle: r.contactTitle ?? null,
          email: r.email ?? null,
        })),
      });
      console.log(`  Seeded ${created.count} prospects`);
    } else {
      console.log(`  Venue already has ${existing} prospects — skipping seed`);
    }

    console.log(`\n=== ROBERT DEMO READY ===`);
    console.log(`  Venue:    ${VENUE_NAME} (slug ${VENUE_SLUG})`);
    console.log(`  VENUE ID: ${venue.id}   <-- add to OUTREACH_VENUES in features.ts`);
    console.log(`  Login:    ${ROBERT_EMAIL} / ${ROBERT_PW}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

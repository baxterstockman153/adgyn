/**
 * Wire the demo venue for an end-to-end send+reply test using Resend's managed
 * receiving address (zero DNS):
 *  - set the demo venue's reply address to the managed inbox
 *  - add a clearly-labeled test prospect whose email is a controllable inbox
 *
 * Idempotent. Demo-only data.
 *   npx tsx scripts/setup-reply-test.ts
 */
import { makePrisma } from "./_db";

const DEMO_VENUE_ID = "6fe24b2a-215d-437c-8ca7-bfd0d09ec038"; // Bean & Gone (demo)
const MANAGED_REPLY = "outreachdemo@thiheleori.resend.app"; // Resend managed inbox
const TEST_PROSPECT = "🧪 Reply Test (demo)";
const TEST_EMAIL = "mark.huber153+outreachtest@gmail.com"; // a controllable inbox

async function main() {
  const prisma = makePrisma();
  try {
    await prisma.venue.update({
      where: { id: DEMO_VENUE_ID },
      data: { outreachReplyTo: MANAGED_REPLY },
    });
    console.log(`Set demo venue reply address → ${MANAGED_REPLY}`);

    const existing = await prisma.prospect.findFirst({
      where: { venueId: DEMO_VENUE_ID, businessName: TEST_PROSPECT },
      select: { id: true },
    });
    if (existing) {
      await prisma.prospect.update({
        where: { id: existing.id },
        data: { email: TEST_EMAIL, status: "new" },
      });
      console.log(`Updated test prospect (${TEST_EMAIL})`);
    } else {
      await prisma.prospect.create({
        data: {
          venueId: DEMO_VENUE_ID,
          businessName: TEST_PROSPECT,
          contactName: "Mark",
          email: TEST_EMAIL,
          city: "Walnut Creek",
          status: "new",
        },
      });
      console.log(`Created test prospect "${TEST_PROSPECT}" (${TEST_EMAIL})`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

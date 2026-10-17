/**
 * Turn the Nirvana Soul demo venue into a working outreach pilot:
 *   - set the in-app reply address (managed Resend inbound, like Bean & Gone)
 *   - seed real downtown-San-Jose businesses as prospects
 *   - add two safe TEST prospects (our own addresses) to exercise send→reply
 *
 * IMPORTANT: outreach SEND is enabled for this venue, so the real businesses are
 * seeded with NO email on purpose — a send is blocked until a verified address
 * is added (via /admin/prospects). This prevents real mail going to a guessed
 * address. Only the two test prospects (our inboxes) can actually be emailed.
 *
 * Idempotent. Run AFTER scripts/create-nirvana-demo.ts.
 *   npx tsx scripts/seed-nirvana-outreach.ts
 */
import "dotenv/config";
import { makePrisma } from "./_db";

const NIRVANA_ID = "480a5c1f-bb7f-4944-a885-536b8f3aaacd";
const REPLY_TO = "nirvanasoul@thiheleori.resend.app"; // managed Resend inbound

// Real, recognizable downtown / SoFA / Japantown San Jose businesses. Contact
// details are intentionally omitted (not fabricated) — add verified emails in
// /admin/prospects before actually pitching one.
const PROSPECTS: { businessName: string; address: string }[] = [
  { businessName: "Urban Putt", address: "SoFA District" },
  { businessName: "Original Joe's", address: "S 1st St, Downtown" },
  { businessName: "Café Stritch", address: "S 1st St, SoFA" },
  { businessName: "Paper Plane", address: "S 1st St, Downtown" },
  { businessName: "Pizza Bocca Lupo", address: "San Pedro Square" },
  { businessName: "San Pedro Square Market", address: "W St John St" },
  { businessName: "Recycle Book Store", address: "The Alameda" },
  { businessName: "Streetlight Records", address: "Willow Glen" },
  { businessName: "Academic Coffee", address: "S 1st St, Downtown" },
  { businessName: "Roy's Station Coffee", address: "Japantown" },
  { businessName: "Haberdasher", address: "S 1st St, Downtown" },
  { businessName: "SP2 Communal Bar + Restaurant", address: "San Pedro Square" },
  { businessName: "The Farmers Union", address: "S 1st St, Downtown" },
  { businessName: "Smoking Pig BBQ", address: "Keyes St" },
  { businessName: "Falafel Drive-In", address: "Stevens Creek Blvd" },
  { businessName: "Vitamina Açaí", address: "Santana Row" },
  { businessName: "B2 Coffee", address: "The Alameda" },
  { businessName: "Bel Bacio Caffè", address: "S 2nd St, Downtown" },
  { businessName: "Miniboss", address: "SoFA District" },
  { businessName: "Good Karma Vegan Café", address: "S 1st St, SoFA" },
  { businessName: "The Spread", address: "W Santa Clara St" },
  { businessName: "Teaspoon", address: "Santana Row" },
  { businessName: "Pama Beauty Bar", address: "Downtown" },
  { businessName: "SoFA Market", address: "S 1st St, SoFA" },
];

// Safe test prospects — our own addresses, so send + reply can be verified
// without emailing a real business. Matches the Bean & Gone demo convention.
const TEST_PROSPECTS: { businessName: string; contactName: string; email: string }[] = [
  { businessName: "🧪 Test — Mark (you)", contactName: "Mark", email: "mark.huber153@gmail.com" },
  { businessName: "🧪 Test — Robert", contactName: "Robert", email: "robert@edpursuit.com" },
];

async function main() {
  const prisma = makePrisma();
  try {
    await prisma.venue.update({
      where: { id: NIRVANA_ID },
      data: { outreachReplyTo: REPLY_TO },
    });
    console.log(`Reply-To set to ${REPLY_TO}`);

    const existing = await prisma.prospect.count({ where: { venueId: NIRVANA_ID } });
    if (existing > 0) {
      console.log(`Venue already has ${existing} prospects — skipping seed.`);
    } else {
      const real = await prisma.prospect.createMany({
        data: PROSPECTS.map((p) => ({
          venueId: NIRVANA_ID,
          businessName: p.businessName,
          address: p.address,
          city: "San Jose",
        })),
      });
      const tests = await prisma.prospect.createMany({
        data: TEST_PROSPECTS.map((p) => ({
          venueId: NIRVANA_ID,
          businessName: p.businessName,
          contactName: p.contactName,
          email: p.email,
          city: "San Jose",
        })),
      });
      console.log(`Seeded ${real.count} real prospects (no email) + ${tests.count} test prospects.`);
    }

    console.log(`\n=== NIRVANA OUTREACH READY ===`);
    console.log(`  Add venue id to OUTREACH_VENUES + OUTREACH_SEND_VENUES in features.ts:`);
    console.log(`  ${NIRVANA_ID}`);
    console.log(`  From:      Nirvana Soul <nirvana-soul@adgyn.com>`);
    console.log(`  Reply-To:  ${REPLY_TO} (captured in-app)`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

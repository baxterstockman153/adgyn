/**
 * Replace the demo venue's prospect list with a curated set of real,
 * consumer-facing Walnut Creek businesses (the kind that actually make sense on
 * a coffee sleeve), superseding the earlier trades/B2B license-record seed.
 *
 * Idempotent-ish: deletes the demo venue's existing prospects, then inserts the
 * curated set from scratchpad/wc_prospects.json. Demo-only data — safe to rerun.
 *
 *   npx tsx scripts/seed-walnut-creek.ts
 */
import { readFileSync } from "node:fs";
import { makePrisma } from "./_db";

const DEMO_VENUE_ID = "6fe24b2a-215d-437c-8ca7-bfd0d09ec038"; // Bean & Gone (demo)
const DATA_FILE =
  "/private/tmp/claude-501/-Users-markhuber-adgyn/cb26665a-7cce-499d-87a1-c3942e05c743/scratchpad/wc_prospects.json";

type Row = {
  businessName: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  website: string | null;
  contactName: string | null;
  contactTitle: string | null;
  email: string | null;
  category?: string | null;
};

async function main() {
  const prisma = makePrisma();
  try {
    const venue = await prisma.venue.findUnique({
      where: { id: DEMO_VENUE_ID },
      select: { id: true, name: true },
    });
    if (!venue) throw new Error(`Demo venue ${DEMO_VENUE_ID} not found`);

    const rows: Row[] = JSON.parse(readFileSync(DATA_FILE, "utf8"));
    console.log(`Loaded ${rows.length} Walnut Creek prospects`);

    const deleted = await prisma.prospect.deleteMany({
      where: { venueId: DEMO_VENUE_ID },
    });
    console.log(`Deleted ${deleted.count} existing prospects on "${venue.name}"`);

    const created = await prisma.prospect.createMany({
      data: rows.map((r) => ({
        venueId: DEMO_VENUE_ID,
        businessName: r.businessName,
        address: r.address ?? null,
        city: r.city ?? null,
        phone: r.phone ?? null,
        website: r.website ?? null,
        contactName: r.contactName ?? null,
        contactTitle: r.contactTitle ?? null,
        email: r.email ?? null,
        // notes + outreachMessage left null: notes are the host's scratchpad,
        // and the UI generates a tailored default pitch when message is null.
      })),
    });
    console.log(`Inserted ${created.count} prospects`);

    const withEmail = rows.filter((r) => r.email).length;
    console.log(`  ${withEmail} have a real public email, ${rows.length - withEmail} don't`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

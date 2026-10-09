import { makePrisma } from "./_db";

const DEMO_VENUE_ID = "6fe24b2a-215d-437c-8ca7-bfd0d09ec038";

async function main() {
  const prisma = makePrisma();
  try {
    const sent = await prisma.outreachEmail.findMany({
      where: { venueId: DEMO_VENUE_ID },
      orderBy: { sentAt: "desc" },
      take: 3,
    });
    console.log(`\n=== Sent (${sent.length}) ===`);
    for (const e of sent) {
      console.log(`  → ${e.toEmail} | from ${e.fromEmail} | ${e.sentAt.toISOString()}`);
    }

    const replies = await prisma.outreachReply.findMany({
      where: { venueId: DEMO_VENUE_ID },
      orderBy: { receivedAt: "desc" },
      take: 5,
    });
    console.log(`\n=== Replies (${replies.length}) ===`);
    for (const r of replies) {
      console.log(
        `  ← from ${r.fromEmail} → ${r.toEmail} | prospect:${r.prospectId ? "matched" : "UNMATCHED"} | ${r.receivedAt.toISOString()}`
      );
      console.log(`    subject: ${r.subject ?? "(none)"}`);
      console.log(`    body: ${(r.text ?? r.html ?? "(empty)").slice(0, 120).replace(/\n/g, " ")}`);
    }
    if (replies.length === 0) console.log("  (none yet)");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

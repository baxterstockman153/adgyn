import { prisma } from "@/lib/prisma";
import { extractAnalytics } from "@/lib/analytics";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { campaignId, visitorId } = await request.json();

  if (!campaignId) {
    return NextResponse.json({ error: "campaignId required" }, { status: 400 });
  }

  const analytics = await extractAnalytics(request);

  // Check if this visitor has scanned this campaign before
  let isReturning = false;
  if (visitorId) {
    const previousScan = await prisma.scan.findFirst({
      where: { campaignId, visitorId },
      select: { id: true },
    });
    isReturning = !!previousScan;
  }

  // Integrity: flag rapid-repeat scans from the same session as duplicates so
  // they can be excluded from billable/reported numbers. Only override when the
  // UA heuristic hasn't already flagged the scan for a stronger reason.
  let { isBot, botReason } = analytics;
  if (!isBot) {
    const tenSecondsAgo = new Date(Date.now() - 10_000);
    const recent = await prisma.scan.findFirst({
      where: {
        campaignId,
        sessionHash: analytics.sessionHash,
        scannedAt: { gte: tenSecondsAgo },
      },
      select: { id: true },
    });
    if (recent) {
      isBot = true;
      botReason = "rapid-repeat";
    }
  }

  const scan = await prisma.scan.create({
    data: { campaignId, visitorId, isReturning, ...analytics, isBot, botReason },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, scanId: scan.id });
}

import { prisma } from "@/lib/prisma";
import { extractAnalytics } from "@/lib/analytics";
import { NextRequest, NextResponse } from "next/server";

/**
 * Normalize the `?src=` scan-source tag into a short safe slug (e.g.
 * "table-topper"). Anything empty/"sleeve" is treated as the default coffee
 * sleeve and stored as null so untagged legacy QR scans stay consistent.
 */
function normalizeSource(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 32);
  if (!slug || slug === "sleeve") return null;
  return slug;
}

export async function POST(request: NextRequest) {
  const { campaignId, visitorId, source } = await request.json();

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
    data: {
      campaignId,
      visitorId,
      isReturning,
      ...analytics,
      isBot,
      botReason,
      source: normalizeSource(source),
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, scanId: scan.id });
}

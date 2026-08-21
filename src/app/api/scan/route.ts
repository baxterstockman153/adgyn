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

  await prisma.scan.create({
    data: { campaignId, visitorId, isReturning, ...analytics },
  });

  return NextResponse.json({ ok: true });
}

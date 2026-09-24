import { prisma } from "@/lib/prisma";
import { extractAnalytics } from "@/lib/analytics";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { placementId, visitorId, slot, dwellMs } = await request.json();

  if (!placementId) {
    return NextResponse.json({ error: "placementId required" }, { status: 400 });
  }

  // Click has no `referrer` column — drop it from the shared analytics bag.
  const { referrer, ...analytics } = await extractAnalytics(request);
  void referrer;

  await prisma.click.create({
    data: {
      placementId,
      visitorId: visitorId || null,
      ...analytics,
      slot: Number.isInteger(slot) ? slot : null,
      dwellMs: Number.isInteger(dwellMs) && dwellMs >= 0 ? dwellMs : null,
    },
  });

  return NextResponse.json({ ok: true });
}

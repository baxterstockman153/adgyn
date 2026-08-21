import { prisma } from "@/lib/prisma";
import { extractAnalytics } from "@/lib/analytics";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { campaignId } = await request.json();

  if (!campaignId) {
    return NextResponse.json({ error: "campaignId required" }, { status: 400 });
  }

  const analytics = await extractAnalytics(request);

  await prisma.scan.create({
    data: { campaignId, ...analytics },
  });

  return NextResponse.json({ ok: true });
}

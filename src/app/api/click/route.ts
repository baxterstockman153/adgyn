import { prisma } from "@/lib/prisma";
import { extractAnalytics } from "@/lib/analytics";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { placementId } = await request.json();

  if (!placementId) {
    return NextResponse.json({ error: "placementId required" }, { status: 400 });
  }

  const analytics = await extractAnalytics(request);

  await prisma.click.create({
    data: { placementId, ...analytics },
  });

  return NextResponse.json({ ok: true });
}

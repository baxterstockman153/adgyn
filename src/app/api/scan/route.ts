import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

export async function POST(request: NextRequest) {
  const { campaignId } = await request.json();

  if (!campaignId) {
    return NextResponse.json({ error: "campaignId required" }, { status: 400 });
  }

  const userAgent = request.headers.get("user-agent") || undefined;
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const sessionHash = createHash("sha256")
    .update(`${ip}-${userAgent}-${new Date().toISOString().slice(0, 13)}`)
    .digest("hex")
    .slice(0, 16);

  await prisma.scan.create({
    data: { campaignId, sessionHash, userAgent },
  });

  return NextResponse.json({ ok: true });
}

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

export async function POST(request: NextRequest) {
  const { placementId } = await request.json();

  if (!placementId) {
    return NextResponse.json({ error: "placementId required" }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const userAgent = request.headers.get("user-agent") || "";
  const sessionHash = createHash("sha256")
    .update(`${ip}-${userAgent}-${new Date().toISOString().slice(0, 13)}`)
    .digest("hex")
    .slice(0, 16);

  await prisma.click.create({
    data: { placementId, sessionHash },
  });

  return NextResponse.json({ ok: true });
}

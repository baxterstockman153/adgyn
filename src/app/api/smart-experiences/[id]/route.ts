import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isExpired, parseExperience } from "@/lib/smart-sleeves";
import { recordExperienceEvent, requestChannel, visitorKey } from "@/lib/smart-sleeves-server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Please open this experience on its original website." }, { status: 403 });
  try {
    const { id } = await params;
    const body = await request.json();
    if (!body || !["visit", "claim"].includes(body.action)) return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    const record = await prisma.smartExperience.findUnique({ where: { id } });
    const experience = record ? parseExperience(record.config) : null;
    if (!record?.published || !experience) return NextResponse.json({ error: "This experience is not available." }, { status: 404 });
    const channel = requestChannel(typeof body.channel === "string" ? body.channel : null);
    if (body.action === "visit") {
      await recordExperienceEvent(id, "visit", channel);
      return NextResponse.json({ ok: true });
    }
    if (experience.kind !== "offer" || isExpired(experience.expiresOn)) return NextResponse.json({ error: "This offer has ended." }, { status: 410 });
    const visitor = await visitorKey();
    const claim = await prisma.smartClaim.upsert({
      where: { experienceId_visitorKey: { experienceId: id, visitorKey: visitor } }, update: {},
      create: { experienceId: id, visitorKey: visitor, headline: experience.headline, business: experience.business, expiresOn: experience.expiresOn },
    });
    return NextResponse.json({ id: claim.id }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Customer experience action failed", error);
    return NextResponse.json({ error: "We couldn’t save that just now. Please try again." }, { status: 500 });
  }
}

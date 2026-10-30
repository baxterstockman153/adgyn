import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { campaignStatus, isExpired, parseExperience, validEmail } from "@/lib/smart-sleeves";
import { campaignQrCode, recordExperienceEvent, requestChannel, visitorKey } from "@/lib/smart-sleeves-server";

// Customer actions on a scan page: count a visit, save a coupon, or sign up
// (newsletter / loyalty). `qr` attributes the action to the scanned QR code.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Please open this page from its QR code." }, { status: 403 });
  try {
    const { id } = await params;
    const body = await request.json();
    if (!body || !["visit", "claim", "signup"].includes(body.action)) return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    const record = await prisma.smartExperience.findUnique({ where: { id } });
    const experience = record ? parseExperience(record.config, record.id) : null;
    if (!record || !experience || campaignStatus(record, experience) !== "active") return NextResponse.json({ error: "This campaign isn’t running right now." }, { status: 404 });
    const channel = requestChannel(typeof body.channel === "string" ? body.channel : null);
    const qrCodeId = await campaignQrCode(id, typeof body.qr === "string" ? body.qr : null);
    if (body.action === "visit") {
      await recordExperienceEvent(id, "visit", channel, qrCodeId);
      return NextResponse.json({ ok: true });
    }
    if (body.action === "signup") {
      if (experience.kind !== "newsletter" && experience.kind !== "loyalty") return NextResponse.json({ error: "Signups aren’t open here." }, { status: 400 });
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
      const phone = typeof body.phone === "string" ? body.phone.trim().slice(0, 30) : "";
      if (!validEmail(email)) return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
      await prisma.smartContact.upsert({
        where: { venueId_email: { venueId: record.venueId, email } },
        update: { ...(name ? { name } : {}), ...(phone ? { phone } : {}) },
        create: { venueId: record.venueId, experienceId: id, email, name, phone },
      });
      await recordExperienceEvent(id, "signup", channel, qrCodeId);
      return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    }
    if (experience.kind !== "offer" || (experience.expiresOn && isExpired(experience.expiresOn))) return NextResponse.json({ error: "This offer has ended." }, { status: 410 });
    const visitor = await visitorKey();
    const claim = await prisma.smartClaim.upsert({
      where: { experienceId_visitorKey: { experienceId: id, visitorKey: visitor } }, update: {},
      create: { experienceId: id, visitorKey: visitor, headline: experience.message || experience.headline, business: experience.business, expiresOn: experience.expiresOn },
    });
    return NextResponse.json({ id: claim.id }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Customer experience action failed", error);
    return NextResponse.json({ error: "We couldn’t save that just now. Please try again." }, { status: 500 });
  }
}

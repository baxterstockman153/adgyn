import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { campaignStatus, parseExperience, validUrl } from "@/lib/smart-sleeves";
import { recordExperienceEvent, requestChannel } from "@/lib/smart-sleeves-server";

// Outbound hop for links on a customer page (and the whole page for "link"
// campaigns), so clicks are counted against the QR code that was scanned.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const code = await prisma.smartQrCode.findUnique({ where: { id }, include: { experience: { include: { venue: { select: { slug: true } } } } } });
  const record = code?.experience;
  const experience = record ? parseExperience(record.config, record.id) : null;
  if (!code || code.archivedAt || !record || !experience || campaignStatus(record, experience) !== "active") return NextResponse.redirect(new URL(`/q/${id}`, request.url));
  const entryId = request.nextUrl.searchParams.get("entry");
  let target: string | undefined;
  if (experience.kind === "link") target = experience.url;
  else if (experience.kind === "page") target = new URL(`/${record.venue.slug}`, request.url).toString();
  else if (entryId) {
    target = experience.entries.find(entry => entry.id === entryId)?.url;
    if (!target && experience.kind === "board") target = (await prisma.smartSponsor.findFirst({ where: { id: entryId, experienceId: record.id, status: "approved" }, select: { url: true } }))?.url;
  }
  if (!target || !validUrl(target)) return NextResponse.json({ error: "This destination is not available." }, { status: 404 });
  try {
    const channel = requestChannel(request.nextUrl.searchParams.get("channel"));
    if (experience.kind === "link" || experience.kind === "page") await recordExperienceEvent(record.id, "visit", channel, code.id);
    await recordExperienceEvent(record.id, "click", channel, code.id);
  } catch (error) { console.error("Experience redirect tracking failed", error); }
  return NextResponse.redirect(target, { headers: { "Cache-Control": "no-store" } });
}

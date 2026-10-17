import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseExperience, validUrl } from "@/lib/smart-sleeves";
import { recordExperienceEvent, requestChannel } from "@/lib/smart-sleeves-server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = await prisma.smartExperience.findUnique({ where: { id } });
  const experience = record ? parseExperience(record.config) : null;
  if (!record?.published || !experience) return NextResponse.redirect(new URL(`/q/${id}`, request.url));
  const entryId = request.nextUrl.searchParams.get("entry");
  const target = experience.kind === "link" ? experience.url : experience.entries.find(entry => entry.id === entryId)?.url;
  if (!target || !validUrl(target)) return NextResponse.json({ error: "This destination is not available." }, { status: 404 });
  try {
    const channel = requestChannel(request.nextUrl.searchParams.get("channel"));
    if (experience.kind === "link") await recordExperienceEvent(id, "visit", channel);
    await recordExperienceEvent(id, "click", channel);
  } catch (error) { console.error("Experience redirect tracking failed", error); }
  return NextResponse.redirect(target, { headers: { "Cache-Control": "no-store" } });
}

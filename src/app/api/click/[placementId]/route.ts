import { prisma } from "@/lib/prisma";
import { extractAnalytics } from "@/lib/analytics";
import { NextRequest, NextResponse } from "next/server";

// GET /api/click/[placementId]?url=...&slot=...&dwell=...
// Records the click server-side, then redirects to the target URL with an
// attribution token (adgyn_ref) appended so a conversion pixel can tie back.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ placementId: string }> }
) {
  const { placementId } = await params;
  const url = request.nextUrl.searchParams.get("url");

  if (!placementId || !url) {
    return NextResponse.json({ error: "placementId and url required" }, { status: 400 });
  }

  // Only allow http(s) redirect targets.
  let target: URL;
  try {
    target = new URL(url);
    if (target.protocol !== "http:" && target.protocol !== "https:") {
      throw new Error("bad protocol");
    }
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }

  // Record the click (never block the redirect on a tracking failure)
  try {
    // Click has no `referrer` column — drop it from the shared analytics bag.
    const { referrer, ...analytics } = await extractAnalytics(request);
    void referrer;
    const visitorId = request.cookies.get("adgyn_vid")?.value || null;

    const slotRaw = request.nextUrl.searchParams.get("slot");
    const dwellRaw = request.nextUrl.searchParams.get("dwell");
    const slot = slotRaw ? Number.parseInt(slotRaw, 10) : null;
    const dwellMs = dwellRaw ? Number.parseInt(dwellRaw, 10) : null;

    const click = await prisma.click.create({
      data: {
        placementId,
        visitorId,
        ...analytics,
        slot: Number.isFinite(slot as number) ? slot : null,
        dwellMs: Number.isFinite(dwellMs as number) && (dwellMs as number) >= 0 ? dwellMs : null,
      },
      select: { id: true },
    });

    target.searchParams.set("adgyn_ref", click.id);
  } catch (e) {
    // Tracking is best-effort; still send the visitor onward.
    console.error("Click tracking error:", e);
  }

  return NextResponse.redirect(target.toString());
}

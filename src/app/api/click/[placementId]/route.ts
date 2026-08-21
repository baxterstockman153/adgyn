import { prisma } from "@/lib/prisma";
import { extractAnalytics } from "@/lib/analytics";
import { NextRequest, NextResponse } from "next/server";

// GET /api/click/[placementId]?url=...
// Records the click server-side, then redirects to the target URL.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ placementId: string }> }
) {
  const { placementId } = await params;
  const url = request.nextUrl.searchParams.get("url");

  if (!placementId || !url) {
    return NextResponse.json({ error: "placementId and url required" }, { status: 400 });
  }

  // Record the click
  try {
    const analytics = await extractAnalytics(request);
    const visitorId = request.cookies.get("adgyn_vid")?.value || null;

    await prisma.click.create({
      data: { placementId, visitorId, ...analytics },
    });
  } catch (e) {
    // Don't block the redirect if tracking fails
    console.error("Click tracking error:", e);
  }

  // Redirect to the target URL
  return NextResponse.redirect(url);
}

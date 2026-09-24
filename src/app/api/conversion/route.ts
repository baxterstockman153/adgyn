import { prisma } from "@/lib/prisma";
import { geoFromIp } from "@/lib/analytics";
import { NextRequest, NextResponse } from "next/server";

// 1x1 transparent GIF
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

function pixelResponse() {
  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Content-Length": String(PIXEL.length),
    },
  });
}

/**
 * Conversion tracking pixel. A brand drops this on their post-purchase /
 * thank-you page:
 *
 *   <img src="https://app.adgyn.com/api/conversion?ref=ADGYN_REF[&value=1999]" />
 *
 * `ref` is the adgyn_ref token we append to the outbound click URL, which ties
 * the conversion back to a specific click -> placement -> campaign -> venue.
 * `value` is optional (order value in cents). Always returns a 1x1 pixel so it
 * never breaks the brand's page, even on bad input.
 */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const ref = params.get("ref");
    const valueRaw = params.get("value");
    const value =
      valueRaw && Number.isFinite(Number(valueRaw)) ? Math.round(Number(valueRaw)) : null;

    // Resolve the placement: prefer the click ref, fall back to explicit ?p=.
    let clickId: string | null = null;
    let placementId: string | null = params.get("p");

    if (ref) {
      const click = await prisma.click.findUnique({
        where: { id: ref },
        select: { id: true, placementId: true },
      });
      if (click) {
        clickId = click.id;
        placementId = click.placementId;
      }
    }

    if (!placementId) return pixelResponse();

    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const geo = await geoFromIp(ip);

    await prisma.conversion.create({
      data: { clickId, placementId, value, ...geo },
    });
  } catch (e) {
    console.error("Conversion tracking error:", e);
  }

  return pixelResponse();
}

import { createHash } from "crypto";
import { NextRequest } from "next/server";

/** Parse User-Agent into device type, OS, and browser */
export function parseUserAgent(ua: string | null) {
  if (!ua) return { deviceType: null, os: null, browser: null };

  // Device type
  let deviceType = "desktop";
  if (/tablet|ipad/i.test(ua)) deviceType = "tablet";
  else if (/mobile|iphone|android(?!.*tablet)/i.test(ua)) deviceType = "mobile";

  // OS
  let os: string | null = null;
  if (/iPhone|iPad|iOS/i.test(ua)) os = "iOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/Mac OS X/i.test(ua)) os = "macOS";
  else if (/Windows/i.test(ua)) os = "Windows";
  else if (/Linux/i.test(ua)) os = "Linux";
  else if (/CrOS/i.test(ua)) os = "ChromeOS";

  // Browser
  let browser: string | null = null;
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\//i.test(ua)) browser = "Opera";
  else if (/SamsungBrowser/i.test(ua)) browser = "Samsung Internet";
  else if (/Chrome/i.test(ua)) browser = "Chrome";
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
  else if (/Firefox/i.test(ua)) browser = "Firefox";

  return { deviceType, os, browser };
}

/** Geo-locate IP using free ip-api.com (45 req/min, no key needed) */
export async function geoFromIp(ip: string): Promise<{
  city: string | null;
  region: string | null;
  country: string | null;
}> {
  if (!ip || ip === "unknown" || ip === "::1" || ip === "127.0.0.1") {
    return { city: null, region: null, country: null };
  }

  try {
    const cleanIp = ip.split(",")[0].trim(); // x-forwarded-for can have multiple
    const res = await fetch(
      `http://ip-api.com/json/${cleanIp}?fields=city,regionName,country`,
      { signal: AbortSignal.timeout(2000) }
    );
    if (!res.ok) return { city: null, region: null, country: null };
    const data = await res.json();
    return {
      city: data.city || null,
      region: data.regionName || null,
      country: data.country || null,
    };
  } catch {
    return { city: null, region: null, country: null };
  }
}

/** Extract common analytics fields from a request */
export async function extractAnalytics(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") || undefined;
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const referrer = request.headers.get("referer") || undefined;

  const sessionHash = createHash("sha256")
    .update(`${ip}-${userAgent}-${new Date().toISOString().slice(0, 13)}`)
    .digest("hex")
    .slice(0, 16);

  const { deviceType, os, browser } = parseUserAgent(userAgent || null);

  // Fire geo lookup but don't block on failure
  const geo = await geoFromIp(ip);

  return {
    sessionHash,
    userAgent,
    referrer,
    deviceType,
    os,
    browser,
    ...geo,
  };
}

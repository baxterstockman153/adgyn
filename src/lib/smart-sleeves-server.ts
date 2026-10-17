import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { smartSleeveEnabled } from "@/lib/features";
import { parseExperience, type Channel, type Claim, type Experience } from "@/lib/smart-sleeves";

export async function workspaceOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("Please sign in to continue.");
  const account = await prisma.user.findUnique({ where: { email: user.email }, include: { memberships: { where: { orgType: "venue", role: "owner" } } } });
  const membership = account?.memberships.find(item => smartSleeveEnabled(item.orgId));
  if (!membership) throw new Error("Only an owner of an enabled café can make this change.");
  return membership.orgId;
}

export async function loadExperiences(venueId: string) {
  const records = await prisma.smartExperience.findMany({
    where: { venueId }, orderBy: { createdAt: "desc" },
    include: { events: { select: { kind: true, channel: true } }, claims: { select: { redeemedAt: true } } },
  });
  return records.flatMap(record => {
    const config = parseExperience(record.config);
    if (!config) return [];
    const channelVisits = { qr: 0, email: 0, social: 0, direct: 0 };
    for (const event of record.events) if (event.kind === "visit" && Object.hasOwn(channelVisits, event.channel)) channelVisits[event.channel as Channel]++;
    return [{ ...config, id: record.id, published: record.published, channelVisits,
      visits: record.events.filter(event => event.kind === "visit").length,
      clicks: record.events.filter(event => event.kind === "click").length,
      claims: record.claims.length, redemptions: record.claims.filter(claim => claim.redeemedAt).length,
    } satisfies Experience];
  });
}

export async function loadClaims(venueId: string): Promise<Claim[]> {
  const claims = await prisma.smartClaim.findMany({ where: { experience: { venueId } }, orderBy: { createdAt: "desc" }, take: 100 });
  return claims.map(claim => ({ id: claim.id, experienceId: claim.experienceId, headline: claim.headline, business: claim.business, expiresOn: claim.expiresOn, createdAt: claim.createdAt.toISOString(), redeemedAt: claim.redeemedAt?.toISOString() ?? null }));
}

export async function visitorKey(): Promise<string> {
  const store = await cookies();
  let token = store.get("adgyn_session")?.value;
  if (!token || !/^[a-f0-9-]{36}$/.test(token)) {
    token = randomUUID();
    store.set("adgyn_session", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 86400, path: "/" });
  }
  return createHash("sha256").update(token).digest("hex");
}

export function requestChannel(value: string | null): Channel {
  return value === "qr" || value === "email" || value === "social" ? value : "direct";
}

export async function recordExperienceEvent(experienceId: string, kind: "visit" | "click", channel: Channel) {
  const requestHeaders = await headers();
  if (/bot|crawler|spider|preview|facebookexternalhit|headless/i.test(requestHeaders.get("user-agent") ?? "")) return;
  const sessionKey = await visitorKey();
  const existing = await prisma.smartEvent.findFirst({ where: { experienceId, kind, channel, sessionKey, createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) } }, select: { id: true } });
  if (!existing) await prisma.smartEvent.create({ data: { experienceId, kind, channel, sessionKey } });
}

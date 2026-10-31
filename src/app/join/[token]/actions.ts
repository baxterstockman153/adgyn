"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { sendTextEmail } from "@/lib/email";
import { normalizeUrl, validEmail, validUrl } from "@/lib/smart-sleeves";
import { resolveJoinToken } from "./resolve";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.adgyn.com";
const LOGO_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/`;

export async function submitSponsorProfile(token: string, input: { businessName: string; email: string; offer: string; url: string; logoUrl: string | null; price: number }): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const resolved = await resolveJoinToken(token);
    if (!resolved) return { ok: false, error: "This invite link isn’t active. Ask the café for a new link." };
    const { sponsor, campaign, venue } = resolved;
    if (sponsor?.status === "approved") return { ok: false, error: "You’re already on the board. Contact the café to make changes." };
    const businessName = String(input.businessName ?? "").trim();
    const email = String(input.email ?? "").trim().toLowerCase();
    const offer = String(input.offer ?? "").trim();
    const url = normalizeUrl(String(input.url ?? ""));
    const price = Number(input.price);
    if (!businessName || businessName.length > 100) return { ok: false, error: "Business name is required." };
    if (!offer || offer.length > 200) return { ok: false, error: "Add the offer customers will see." };
    if (url && !validUrl(url)) return { ok: false, error: "Enter a website address, like yourshop.com." };
    if (!validEmail(email)) return { ok: false, error: "Enter a valid email." };
    if (input.logoUrl && !input.logoUrl.startsWith(LOGO_PREFIX)) return { ok: false, error: "Please upload your logo again." };
    if (!sponsor && (!Number.isFinite(price) || price < 0 || price > 100000)) return { ok: false, error: "Enter a valid amount." };
    const data = { businessName, email, offer, url, logoUrl: input.logoUrl || null, status: "requested" };
    if (sponsor) await prisma.smartSponsor.update({ where: { id: sponsor.id }, data });
    else await prisma.smartSponsor.create({ data: { ...data, venueId: venue.id, experienceId: campaign.id, priceCents: Math.round(price * 100) } });

    // Let the café's owners know there's a business to review.
    const owners = await prisma.membership.findMany({ where: { orgId: venue.id, orgType: "venue", role: "owner" }, include: { user: { select: { email: true } } } });
    const to = owners.map(owner => owner.user.email);
    if (to.length) {
      const sent = await sendTextEmail({ to, replyTo: email, subject: `${businessName} wants to join your Community Board`,
        text: [`${businessName} finished their Community Board profile.`, "", `Offer: ${offer}`, url ? `Link: ${url}` : "", `Contact: ${email}`, "", `Review and approve it: ${APP_URL}/dashboard/venue/smart-sleeve/campaigns/${campaign.id}`].filter(line => line !== "").join("\n") });
      if (!sent.sent) console.error("Sponsor review email not sent", sent.error);
    }
    revalidatePath(`/dashboard/venue/smart-sleeve/campaigns/${campaign.id}`);
    return { ok: true };
  } catch (error) {
    console.error("Sponsor profile submit failed", error);
    return { ok: false, error: "We couldn’t send your request. Please try again." };
  }
}

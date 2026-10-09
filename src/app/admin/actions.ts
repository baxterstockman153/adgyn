"use server";

import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { sendInviteEmail } from "@/lib/email";
import { OUTREACH_EMAIL_DOMAIN } from "@/lib/outreach";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

// Base URL used to build invite links in server-sent emails (mirrors the
// client-side window.location.origin fallback in invite-form.tsx).
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.adgyn.com";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) {
    throw new Error("Unauthorized");
  }
  return user;
}

// ── Campaign Actions ──

export async function activateCampaign(campaignId: string) {
  await requireAdmin();
  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: "active",
      startedAt: new Date(),
    },
  });
  // Also activate all placements
  await prisma.placement.updateMany({
    where: { campaignId },
    data: { status: "active" },
  });
  revalidatePath("/admin/campaigns");
  revalidatePath("/admin");
}

export async function completeCampaign(campaignId: string) {
  await requireAdmin();
  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: "completed",
      endedAt: new Date(),
    },
  });
  await prisma.placement.updateMany({
    where: { campaignId },
    data: { status: "completed" },
  });
  revalidatePath("/admin/campaigns");
  revalidatePath("/admin");
}

export async function revertToDraft(campaignId: string) {
  await requireAdmin();
  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: "draft",
      startedAt: null,
      endedAt: null,
    },
  });
  await prisma.placement.updateMany({
    where: { campaignId },
    data: { status: "pending" },
  });
  revalidatePath("/admin/campaigns");
  revalidatePath("/admin");
}

// ── Venue Actions ──

export async function createVenue(formData: FormData) {
  await requireAdmin();
  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;
  const address = (formData.get("address") as string) || null;
  const logoUrl = (formData.get("logoUrl") as string) || null;

  if (!name || !slug) throw new Error("Name and slug are required");

  await prisma.venue.create({
    data: { name, slug, address, logoUrl },
  });
  revalidatePath("/admin/venues");
  revalidatePath("/admin");
}

// ── Brand Actions ──

export async function createBrand(formData: FormData) {
  await requireAdmin();
  const name = formData.get("name") as string;
  const websiteUrl = (formData.get("websiteUrl") as string) || null;
  const defaultLogoUrl = (formData.get("logoUrl") as string) || null;

  if (!name) throw new Error("Name is required");

  await prisma.brand.create({
    data: { name, websiteUrl, defaultLogoUrl },
  });
  revalidatePath("/admin/brands");
  revalidatePath("/admin");
}

// ── Prospect Actions (outreach module) ──

export async function createProspect(formData: FormData) {
  await requireAdmin();
  const venueId = formData.get("venueId") as string;
  const businessName = (formData.get("businessName") as string)?.trim();
  if (!venueId || !businessName) {
    throw new Error("Venue and business name are required");
  }

  const str = (k: string) => {
    const v = (formData.get(k) as string)?.trim();
    return v ? v : null;
  };

  await prisma.prospect.create({
    data: {
      venueId,
      businessName,
      address: str("address"),
      city: str("city"),
      phone: str("phone"),
      website: str("website"),
      contactName: str("contactName"),
      contactTitle: str("contactTitle"),
      email: str("email"),
      outreachMessage: str("outreachMessage"),
    },
  });
  revalidatePath("/admin/prospects");
  revalidatePath("/dashboard/venue/outreach");
}

export async function deleteProspect(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  if (!id) throw new Error("Prospect id required");
  await prisma.prospect.delete({ where: { id } });
  revalidatePath("/admin/prospects");
  revalidatePath("/dashboard/venue/outreach");
}

// Per-venue outreach From identity: display name + @adgyn.com local-part. The
// address domain is always forced to adgyn.com (our verified send domain).
export async function updateVenueOutreachSender(formData: FormData) {
  await requireAdmin();
  const venueId = formData.get("venueId") as string;
  if (!venueId) throw new Error("Venue id required");

  const fromName = (formData.get("fromName") as string)?.trim() || null;
  const rawLocal = (formData.get("fromLocal") as string)?.trim().toLowerCase();
  const local = rawLocal
    ? rawLocal.replace(/@.*$/, "").replace(/[^a-z0-9._-]/g, "").replace(/^[._-]+|[._-]+$/g, "")
    : "";
  const fromEmail = local ? `${local}@${OUTREACH_EMAIL_DOMAIN}` : null;

  await prisma.venue.update({
    where: { id: venueId },
    data: { outreachFromName: fromName, outreachFromEmail: fromEmail },
  });
  revalidatePath("/admin/prospects");
  revalidatePath("/dashboard/venue/outreach");
}

// ── User Actions ──

export async function createUser(formData: FormData) {
  await requireAdmin();
  const email = formData.get("email") as string;
  const name = (formData.get("name") as string) || null;
  const orgId = formData.get("orgId") as string;
  const orgType = formData.get("orgType") as "venue" | "brand";

  if (!email || !orgId || !orgType) {
    throw new Error("Email, org, and type are required");
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name },
  });

  await prisma.membership.upsert({
    where: {
      userId_orgId_orgType: {
        userId: user.id,
        orgId,
        orgType,
      },
    },
    update: {},
    create: {
      userId: user.id,
      orgId,
      orgType,
      role: "owner",
    },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin");
}

// ── Invite Actions ──

export async function createInvite(formData: FormData) {
  await requireAdmin();
  const orgId = formData.get("orgId") as string;
  const orgType = formData.get("orgType") as "venue" | "brand";
  const role = (formData.get("role") as "owner" | "member") || "owner";
  const email = (formData.get("email") as string) || null;

  if (!orgId || !orgType) throw new Error("Org and type are required");

  const token = crypto.randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invite = await prisma.invite.create({
    data: {
      token,
      orgId,
      orgType,
      role,
      email,
      expiresAt,
    },
  });

  // If an email was supplied, send the invite link. Sending failures never
  // block invite creation — the link is still returned for manual sharing.
  let emailSent = false;
  if (email) {
    const org =
      orgType === "venue"
        ? await prisma.venue.findUnique({ where: { id: orgId }, select: { name: true } })
        : await prisma.brand.findUnique({ where: { id: orgId }, select: { name: true } });
    const result = await sendInviteEmail({
      to: email,
      inviteUrl: `${APP_URL}/invite/${token}`,
      orgName: org?.name ?? "your organization",
      orgType,
      role,
    });
    emailSent = result.sent;
    if (!result.sent) {
      console.error("Invite email failed:", result.error);
    }
  }

  revalidatePath("/admin/users");
  return { ...invite, emailSent };
}

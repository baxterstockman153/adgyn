"use server";

import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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

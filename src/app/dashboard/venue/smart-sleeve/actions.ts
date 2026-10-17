"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { parseExperience, validateExperience, isExpired } from "@/lib/smart-sleeves";
import { workspaceOwner } from "@/lib/smart-sleeves-server";

export async function publishExperience(input: unknown): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const venueId = await workspaceOwner();
    const config = parseExperience(input);
    if (!config) return { ok: false, error: "This draft could not be read. Please check its details." };
    const error = validateExperience(config);
    if (error) return { ok: false, error };
    const existing = await prisma.smartExperience.findUnique({ where: { id: config.id }, select: { venueId: true } });
    if (existing && existing.venueId !== venueId) return { ok: false, error: "This experience belongs to a different café." };
    const payload = { ...config, published: true } as Prisma.InputJsonValue;
    const result = existing
      ? await prisma.smartExperience.update({ where: { id: config.id }, data: { config: payload, published: true } })
      : await prisma.smartExperience.create({ data: { venueId, config: payload } });
    revalidatePath("/dashboard/venue/smart-sleeve");
    revalidatePath(`/q/${result.id}`);
    return { ok: true, id: result.id };
  } catch (error) {
    console.error("Experience publishing failed", error);
    return { ok: false, error: "We couldn’t publish this experience. Your draft is still here. Please try again." };
  }
}

export async function pauseExperience(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const venueId = await workspaceOwner();
    const result = await prisma.smartExperience.updateMany({ where: { id, venueId }, data: { published: false } });
    if (!result.count) return { ok: false, error: "Experience not found for this café." };
    revalidatePath("/dashboard/venue/smart-sleeve");
    revalidatePath(`/q/${id}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "We couldn’t pause this experience. Please try again." };
  }
}

export async function confirmRedemption(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const venueId = await workspaceOwner();
    const claim = await prisma.smartClaim.findFirst({ where: { id, experience: { venueId } } });
    if (!claim) return { ok: false, error: "Claim not found for this café." };
    if (isExpired(claim.expiresOn)) return { ok: false, error: "This offer has expired and cannot be redeemed." };
    await prisma.smartClaim.updateMany({ where: { id, redeemedAt: null, experience: { venueId } }, data: { redeemedAt: new Date() } });
    revalidatePath("/dashboard/venue/smart-sleeve");
    return { ok: true };
  } catch {
    return { ok: false, error: "We couldn’t confirm the redemption. Please try again." };
  }
}

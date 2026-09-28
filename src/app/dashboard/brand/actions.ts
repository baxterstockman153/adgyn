"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Errors thrown from a Server Action are redacted to a generic "React error
// #441" in production, so friendly messages are *returned*, not thrown.
export type SaveProfileResult =
  | { ok: true }
  | { ok: false; error: string };

export type PlacementEdit = {
  id: string;
  logoUrl: string;
  tagline: string;
  ctaText: string;
  ctaUrl: string;
  buttonColor: string;
};

export type SaveProfileInput = {
  websiteUrl: string;
  defaultLogoUrl: string;
  placements: PlacementEdit[];
};

function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withProto);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

export async function saveGuestProfile(
  input: SaveProfileInput
): Promise<SaveProfileResult> {
  // 1. Authenticate + resolve the caller's brand
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please log in again." };

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email! },
    include: { memberships: { where: { orgType: "brand" } } },
  });
  const brandId = dbUser?.memberships[0]?.orgId;
  if (!brandId) return { ok: false, error: "No brand found for your account." };

  // 2. Validate brand-level fields
  const websiteUrl = normalizeUrl(input.websiteUrl);
  if (input.websiteUrl.trim() && !websiteUrl) {
    return { ok: false, error: "Your website link doesn't look like a valid URL." };
  }
  const defaultLogoUrl = input.defaultLogoUrl.trim() || null;

  // 3. Only allow editing placements that belong to this brand and whose
  //    campaign isn't completed. Guard against tampering with the id list.
  const ownPlacements = await prisma.placement.findMany({
    where: {
      brandId,
      id: { in: input.placements.map((p) => p.id) },
      campaign: { status: { not: "completed" } },
    },
    select: { id: true },
  });
  const editableIds = new Set(ownPlacements.map((p) => p.id));

  for (const p of input.placements) {
    if (!editableIds.has(p.id)) continue;
    if (!p.tagline.trim()) {
      return { ok: false, error: "Each ad needs a tagline." };
    }
    if (!p.ctaText.trim()) {
      return { ok: false, error: "Each ad needs button text." };
    }
    const ctaUrl = normalizeUrl(p.ctaUrl);
    if (!ctaUrl) {
      return { ok: false, error: "Each ad needs a valid destination link." };
    }
  }

  // 4. Persist everything in one transaction
  try {
    await prisma.$transaction([
      prisma.brand.update({
        where: { id: brandId },
        data: { websiteUrl, defaultLogoUrl },
      }),
      ...input.placements
        .filter((p) => editableIds.has(p.id))
        .map((p) =>
          prisma.placement.update({
            where: { id: p.id },
            data: {
              logoUrl: p.logoUrl.trim() || defaultLogoUrl,
              tagline: p.tagline.trim(),
              ctaText: p.ctaText.trim(),
              ctaUrl: normalizeUrl(p.ctaUrl)!,
              buttonColor: /^#[0-9a-fA-F]{6}$/.test(p.buttonColor.trim())
                ? p.buttonColor.trim()
                : "#1a1a1a",
            },
          })
        ),
    ]);
  } catch (e) {
    console.error("saveGuestProfile failed:", e);
    return { ok: false, error: "Couldn't save your changes. Please try again." };
  }

  revalidatePath("/dashboard/brand");
  revalidatePath("/dashboard/brand/edit");
  return { ok: true };
}

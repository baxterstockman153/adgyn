"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { outreachEnabled } from "@/lib/features";
import { revalidatePath } from "next/cache";

// Errors thrown from a Server Action are redacted to a generic "React error
// #441" in production, so friendly messages are *returned*, not thrown.
export type ActionResult = { ok: true } | { ok: false; error: string };

const STATUSES = ["new", "contacted", "interested", "won", "lost"] as const;
type Status = (typeof STATUSES)[number];

// Resolve the caller's venue, gated by the outreach feature flag. Returns the
// venue id only when the user is a logged-in venue owner with outreach enabled.
async function requireOutreachVenue(): Promise<
  { ok: true; venueId: string } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please log in again." };

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email! },
    include: { memberships: { where: { orgType: "venue" } } },
  });
  const venueId = dbUser?.memberships[0]?.orgId;
  if (!venueId) return { ok: false, error: "No venue found for your account." };
  if (!outreachEnabled(venueId)) {
    return { ok: false, error: "Outreach isn't enabled for your venue." };
  }
  return { ok: true, venueId };
}

export async function updateProspectStatus(
  prospectId: string,
  status: string
): Promise<ActionResult> {
  const auth = await requireOutreachVenue();
  if (!auth.ok) return auth;

  if (!STATUSES.includes(status as Status)) {
    return { ok: false, error: "Unknown status." };
  }

  // Scope the update to the caller's own venue so a prospect id from another
  // venue can't be touched.
  const res = await prisma.prospect.updateMany({
    where: { id: prospectId, venueId: auth.venueId },
    data: { status: status as Status, statusUpdatedAt: new Date() },
  });
  if (res.count === 0) return { ok: false, error: "Prospect not found." };

  revalidatePath("/dashboard/venue/outreach");
  return { ok: true };
}

export async function saveProspectNote(
  prospectId: string,
  notes: string
): Promise<ActionResult> {
  const auth = await requireOutreachVenue();
  if (!auth.ok) return auth;

  const trimmed = notes.trim();
  const res = await prisma.prospect.updateMany({
    where: { id: prospectId, venueId: auth.venueId },
    data: { notes: trimmed || null },
  });
  if (res.count === 0) return { ok: false, error: "Prospect not found." };

  revalidatePath("/dashboard/venue/outreach");
  return { ok: true };
}

// Stamp "the host opened their outreach list" so we can tell looked-but-did-
// nothing apart from never-looked. Best-effort: failures never surface.
export async function markOutreachOpened(): Promise<void> {
  const auth = await requireOutreachVenue();
  if (!auth.ok) return;
  try {
    await prisma.venue.update({
      where: { id: auth.venueId },
      data: { lastOutreachOpenAt: new Date() },
    });
  } catch (e) {
    console.error("markOutreachOpened failed:", e);
  }
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  outreachEnabled,
  outreachSendEnabled,
  OUTREACH_DAILY_SEND_LIMIT,
} from "@/lib/features";
import { sendOutreachEmail } from "@/lib/email";
import { revalidatePath } from "next/cache";

// Errors thrown from a Server Action are redacted to a generic "React error
// #441" in production, so friendly messages are *returned*, not thrown.
export type ActionResult = { ok: true } | { ok: false; error: string };

const STATUSES = ["new", "contacted", "interested", "won", "lost"] as const;
type Status = (typeof STATUSES)[number];

// Resolve the caller's venue, gated by the outreach feature flag. Returns the
// venue id (and the caller's email, used as a reply-to fallback) only when the
// user is a logged-in venue owner with outreach enabled.
async function requireOutreachVenue(): Promise<
  { ok: true; venueId: string; userEmail: string } | { ok: false; error: string }
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
  return { ok: true, venueId, userEmail: user.email! };
}

// Build the venue's "From" identity on our verified adgyn.com domain. Uses the
// configured outreach_from_email when it's an @adgyn.com address, otherwise
// derives a local part from the slug. The domain is always forced to adgyn.com
// so a host can never send as a domain we haven't authenticated.
function venueSender(venue: {
  name: string;
  slug: string;
  outreachFromEmail: string | null;
}): string {
  const configured = venue.outreachFromEmail?.trim().toLowerCase();
  const rawLocal =
    configured && configured.endsWith("@adgyn.com")
      ? configured.slice(0, configured.indexOf("@"))
      : venue.slug;
  const local =
    rawLocal
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, "")
      .replace(/^[._-]+|[._-]+$/g, "") || "host";
  const displayName = venue.name.replace(/["<>\r\n]/g, "").trim();
  return `${displayName} <${local}@adgyn.com>`;
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

// Fallback pitch when no custom outreachMessage is stored — kept in sync with
// the client preview in outreach-board.tsx.
function defaultMessage(
  venueName: string,
  p: { businessName: string; contactName: string | null }
): string {
  const first = p.contactName?.trim().split(/\s+/)[0];
  const greeting = first ? `Hi ${first},` : "Hi there,";
  const who = p.businessName;
  return `${greeting}

I'm reaching out from ${venueName} — a local coffee spot right around the corner from ${who}. We feature a handful of nearby businesses on our coffee sleeves, and I think ${who} would be a great fit to get in front of our regulars.

Would you be open to a quick chat about featuring your business on our next run?

Thanks,
${venueName}`;
}

export type SendResult =
  | { ok: true; remaining: number; movedToContacted: boolean }
  | { ok: false; error: string };

// Send an outreach email on the host's behalf: From their @adgyn.com sender,
// Reply-To their real inbox. Capped at OUTREACH_DAILY_SEND_LIMIT per venue per
// UTC day. A row is written only on a successful send, so failures don't burn
// the daily quota.
export async function sendProspectEmail(prospectId: string): Promise<SendResult> {
  const auth = await requireOutreachVenue();
  if (!auth.ok) return auth;
  if (!outreachSendEnabled(auth.venueId)) {
    return { ok: false, error: "Email sending isn't enabled for your venue." };
  }

  const venue = await prisma.venue.findUnique({
    where: { id: auth.venueId },
    select: {
      name: true,
      slug: true,
      outreachFromEmail: true,
      outreachReplyTo: true,
    },
  });
  if (!venue) return { ok: false, error: "Venue not found." };

  const prospect = await prisma.prospect.findFirst({
    where: { id: prospectId, venueId: auth.venueId },
    select: {
      id: true,
      businessName: true,
      contactName: true,
      email: true,
      status: true,
      outreachMessage: true,
    },
  });
  if (!prospect) return { ok: false, error: "Prospect not found." };
  if (!prospect.email) {
    return { ok: false, error: "This prospect has no email address." };
  }

  // Per-host daily cap, counted since UTC midnight.
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const sentToday = await prisma.outreachEmail.count({
    where: { venueId: auth.venueId, sentAt: { gte: since } },
  });
  if (sentToday >= OUTREACH_DAILY_SEND_LIMIT) {
    return {
      ok: false,
      error: `Daily limit reached — you can send ${OUTREACH_DAILY_SEND_LIMIT} emails per day. Try again tomorrow.`,
    };
  }

  const from = venueSender(venue);
  const replyTo = venue.outreachReplyTo?.trim() || auth.userEmail;
  const subject = `Would ${prospect.businessName} like to be on our coffee sleeves?`;
  const body =
    prospect.outreachMessage?.trim() || defaultMessage(venue.name, prospect);

  const res = await sendOutreachEmail({
    to: prospect.email,
    from,
    replyTo,
    subject,
    text: body,
  });
  if (!res.sent) {
    return {
      ok: false,
      error: res.error
        ? `Couldn't send: ${res.error}`
        : "Couldn't send the email. Please try again.",
    };
  }

  // Log the send (powers the daily cap + audit) and nudge a brand-new prospect
  // to "contacted" so the pipeline reflects reality.
  await prisma.outreachEmail.create({
    data: {
      venueId: auth.venueId,
      prospectId: prospect.id,
      toEmail: prospect.email,
      fromEmail: from,
      replyTo,
      subject,
      body,
    },
  });

  let movedToContacted = false;
  if (prospect.status === "new") {
    await prisma.prospect.updateMany({
      where: { id: prospect.id, venueId: auth.venueId },
      data: { status: "contacted", statusUpdatedAt: new Date() },
    });
    movedToContacted = true;
  }

  revalidatePath("/dashboard/venue/outreach");
  return {
    ok: true,
    remaining: OUTREACH_DAILY_SEND_LIMIT - sentToday - 1,
    movedToContacted,
  };
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

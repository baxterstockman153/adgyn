import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { outreachReplyAddress } from "@/lib/outreach";
import { getReceivedEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Resend delivers inbound mail (the `email.received` webhook) signed with Svix.
// We verify the signature with RESEND_WEBHOOK_SECRET, match the reply to a venue
// by the @adgyn.com address it was sent to (and to a prospect by the sender),
// and store it. A missing secret fails closed so we never insert unverified
// data. Always returns 2xx on a handled event so Resend doesn't retry forever.

const FIVE_MIN_MS = 5 * 60 * 1000;

// Verify a Svix-signed payload. `signature` header holds one or more
// space-separated `v1,<base64>` entries; any match counts.
function verifySvix(
  secret: string,
  body: string,
  id: string | null,
  timestamp: string | null,
  signature: string | null
): boolean {
  if (!id || !timestamp || !signature) return false;

  // Reject stale timestamps (replay protection).
  const ts = Number(timestamp) * 1000;
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > FIVE_MIN_MS) {
    return false;
  }

  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", secretBytes)
    .update(`${id}.${timestamp}.${body}`)
    .digest("base64");
  const expectedBuf = Buffer.from(expected);

  return signature.split(" ").some((part) => {
    const sig = part.includes(",") ? part.split(",")[1] : part;
    const sigBuf = Buffer.from(sig);
    return (
      sigBuf.length === expectedBuf.length &&
      timingSafeEqual(sigBuf, expectedBuf)
    );
  });
}

// Pull a bare email out of "Name <a@b.com>" or "a@b.com" or { address }.
function bareEmail(input: unknown): string | null {
  if (!input) return null;
  if (typeof input === "object") {
    const addr = (input as { address?: unknown }).address;
    if (typeof addr === "string") return bareEmail(addr);
    return null;
  }
  if (typeof input !== "string") return null;
  const angled = input.match(/<([^>]+)>/);
  const candidate = angled ? angled[1] : input;
  const m = candidate.match(/[^\s<>,;]+@[^\s<>,;]+/);
  return m ? m[0].trim().toLowerCase() : null;
}

function toAddressList(input: unknown): string[] {
  const arr = Array.isArray(input) ? input : [input];
  return arr.map(bareEmail).filter((e): e is string => !!e);
}

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("inbound webhook: RESEND_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  const body = await req.text();
  const ok = verifySvix(
    secret,
    body,
    req.headers.get("svix-id"),
    req.headers.get("svix-timestamp"),
    req.headers.get("svix-signature")
  );
  if (!ok) {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  let payload: { type?: string; data?: Record<string, unknown> };
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  // Only act on inbound-received events; ack anything else so Resend is happy.
  if (!payload.type || !payload.type.includes("received")) {
    return NextResponse.json({ ok: true, ignored: payload.type ?? null });
  }

  const data = payload.data ?? {};
  const fromEmail = bareEmail(data.from);
  const toList = toAddressList(data.to);
  if (!fromEmail || toList.length === 0) {
    return NextResponse.json({ ok: true, ignored: "missing from/to" });
  }
  const providerId =
    (typeof data.email_id === "string" && data.email_id) ||
    (typeof data.id === "string" && data.id) ||
    null;

  // Dedupe webhook retries.
  if (providerId) {
    const existing = await prisma.outreachReply.findUnique({
      where: { providerId },
      select: { id: true },
    });
    if (existing) return NextResponse.json({ ok: true, deduped: true });
  }

  // Match the recipient address back to a venue. The venue table is tiny, so
  // deriving each reply address in memory is cheap. We match either the derived
  // inbound.adgyn.com address or an explicit outreach_reply_to override (e.g. a
  // managed <id>.resend.app address) — mirroring what the send side uses as
  // Reply-To, so a configured override is still captured.
  const venues = await prisma.venue.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      outreachFromEmail: true,
      outreachReplyTo: true,
    },
  });
  const toSet = new Set(toList);
  const venueMatch = venues
    .map((v) => ({
      venue: v,
      addr: [outreachReplyAddress(v).toLowerCase(), v.outreachReplyTo?.trim().toLowerCase()]
        .filter((a): a is string => !!a)
        .find((a) => toSet.has(a)),
    }))
    .find((m) => m.addr);
  if (!venueMatch) {
    // Not addressed to any venue's reply inbox — nothing to attach it to.
    return NextResponse.json({ ok: true, ignored: "no venue match" });
  }
  const venue = venueMatch.venue;

  // Best-effort prospect match by sender email within that venue.
  const prospect = await prisma.prospect.findFirst({
    where: {
      venueId: venue.id,
      email: { equals: fromEmail, mode: "insensitive" },
    },
    select: { id: true },
  });

  // The webhook is metadata-only — fetch the actual body by email id.
  const full = providerId ? await getReceivedEmail(providerId) : null;
  const subject =
    (typeof data.subject === "string" && data.subject) || full?.subject || null;

  await prisma.outreachReply.create({
    data: {
      venueId: venue.id,
      prospectId: prospect?.id ?? null,
      providerId,
      fromEmail,
      toEmail: venueMatch.addr!,
      subject,
      text: full?.text ?? null,
      html: full?.html ?? null,
    },
  });

  return NextResponse.json({ ok: true, matchedProspect: !!prospect });
}

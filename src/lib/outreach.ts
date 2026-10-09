/**
 * Shared derivation of a venue's outreach sender identity on our verified
 * Resend domain. Used by the send action (From line), the dashboard page
 * (display), and the inbound webhook (matching a reply's To address back to a
 * venue) — keep them in sync by importing from here, not re-deriving.
 */
export const OUTREACH_EMAIL_DOMAIN = "adgyn.com";

// Replies are received on a dedicated subdomain: Resend inbound requires the MX
// record on `inbound.<domain>`, so mail is captured at <local>@inbound.adgyn.com
// while sending stays on the verified apex (best deliverability). We set that
// subdomain as Reply-To; the inbound webhook matches against it.
export const OUTREACH_REPLY_DOMAIN = `inbound.${OUTREACH_EMAIL_DOMAIN}`;

type SenderVenue = { slug: string; outreachFromEmail: string | null };

// The local part of the sender, e.g. "gratitude_cafe". Uses the configured
// outreach_from_email when it's an @adgyn.com address, otherwise the slug,
// sanitized to a safe email local part.
export function outreachLocalPart(venue: SenderVenue): string {
  const configured = venue.outreachFromEmail?.trim().toLowerCase();
  const rawLocal =
    configured && configured.endsWith(`@${OUTREACH_EMAIL_DOMAIN}`)
      ? configured.slice(0, configured.indexOf("@"))
      : venue.slug;
  return (
    rawLocal
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, "")
      .replace(/^[._-]+|[._-]+$/g, "") || "host"
  );
}

// The bare sender address, e.g. "gratitude_cafe@adgyn.com" (the From line).
export function outreachSenderAddress(venue: SenderVenue): string {
  return `${outreachLocalPart(venue)}@${OUTREACH_EMAIL_DOMAIN}`;
}

// The reply/receiving address on the inbound subdomain, e.g.
// "gratitude_cafe@inbound.adgyn.com" (Reply-To + inbound-webhook matching).
export function outreachReplyAddress(venue: SenderVenue): string {
  return `${outreachLocalPart(venue)}@${OUTREACH_REPLY_DOMAIN}`;
}

// The full From header, e.g. `Amber <amber@adgyn.com>`. Display name comes from
// outreachFromName when set, otherwise the venue name. Domain is always forced
// to adgyn.com so a host can never send as a domain we haven't authenticated.
export function outreachSenderFrom(
  venue: SenderVenue & { name: string; outreachFromName?: string | null }
): string {
  const raw = venue.outreachFromName?.trim() || venue.name;
  const displayName = raw.replace(/["<>\r\n]/g, "").trim();
  return `${displayName} <${outreachSenderAddress(venue)}>`;
}
